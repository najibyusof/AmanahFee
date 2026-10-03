/**
 * Payment flow (mockups s3 → s4 → s5):
 *  payInfaqScreen     — Langkah 1/2: yuran wajib + infaq (BR-014/015)
 *  payTransferScreen  — Langkah 2/2: kaedah pindahan + muat naik bukti (pilihan, BR-016)
 *  paySuccessScreen   — resit digital, rujukan sistem
 * Endpoints: GET /{r}/payment-schedules/{id},
 *            POST /{r}/payment-schedules/{id}/payments {additional_infaq, payment_method},
 *            POST /payments/{id}/proofs (multipart `file`),
 *            GET /{r}/payments/{id}, GET /payments/{id}/proofs
 */
import { t } from '../i18n/index.js';
import { api } from '../api.js';
import { config } from '../config.js';
import { store } from '../store.js';
import {
  appbar, icon, esc, attr, rm, fmtDate, fmtDateTime, methodLabel, statusChip,
  field, formValues, showErrors, clearErrors, setLoading, toast, skeletonList,
  errorState, banner, copyText, pickProof, pickImage, isValidProof, fmtBytes,
  confirmDialog,
} from '../ui.js';
import { go } from '../router.js';
import { selfPrefix, selfRole } from './studentDashboard.js';

/** shared state between step 1 and step 2 (same session, no server draft yet) */
const flow = { scheduleId: null, infaq: 0, method: null, className: null, submittedAt: null };

/* ---------------- s3: Payment & Infaq ---------------- */
export function payInfaqScreen(ctx) {
  const scheduleId = ctx.params.scheduleId;
  let sch = null;
  let err = null;
  let sel = 'none';           // none | 5 | 10 | 20 | other
  let custom = '';

  if (String(flow.scheduleId) !== String(scheduleId)) {
    flow.scheduleId = scheduleId;
    flow.infaq = 0;
    flow.method = null;
    sel = 'none'; custom = '';
  }

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t('pay3.title'), sub: t('pay3.step', { n: 1 }), back: true, avatar: true })}
      <div class="content with-foot pad">${body}</div>
    </div>`;

  const infaqValue = () => {
    if (sel === 'none') return 0;
    if (sel === 'other') { const v = parseFloat(custom); return Number.isFinite(v) ? v : 0; }
    return parseFloat(sel);
  };

  const render = () => {
    if (err) { ctx.root.innerHTML = shell(`<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`); bind(); return; }
    if (!sch) { ctx.root.innerHTML = shell(skeletonList(3, true)); return; }

    const opts = sch.payment_options || {};
    const cls = sch.class || {};
    const infaqAllowed = opts.allow_additional_infaq !== false;
    const fee = parseFloat(sch.required_amount || opts.required_amount || 0);
    const infaq = infaqValue();
    const total = fee + infaq;

    ctx.root.innerHTML = shell(`
      <div class="card mt3">
        <div class="flex between items-center">
          <div>
            <div class="eyebrow">${esc(t('pay3.head'))}</div>
            <div class="strong" style="font-size:16.5px">${esc(cls.name || '—')}</div>
            <div class="small muted">${icon('calendar', 12)} ${esc(t('pay3.dueBy'))} ${esc(fmtDate(sch.due_date))}</div>
          </div>
          <span class="chip warn">${esc(t('pay3.must'))}</span>
        </div>
      </div>

      <div class="section" style="margin-top:16px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('dollar', 15)} ${esc(t('pay3.feeDue'))}</h2>
          <span class="chip info">${esc(freqShort(sch, opts))}</span>
        </div>
        <div class="card center">
          <div class="num-xl">${esc(rm(fee))}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('sparkle', 15)} ${esc(t('pay3.infaq'))}</h2>
          <span class="chip ${infaqAllowed ? 'ok' : 'muted'}">${esc(infaqAllowed ? t('pay3.infaqTag') : t('st.inactive'))}</span>
        </div>
        ${infaqAllowed ? `
          <p class="small muted" style="margin-top:-4px">${esc(t('pay3.infaqSub'))}</p>
          <div class="btn-row mt2" style="flex-wrap:wrap;gap:8px" id="infaq-chips">
            ${chipBtn('none', t('pay3.infaqNone'), sel)}
            ${chipBtn('5', 'RM 5', sel)}
            ${chipBtn('10', 'RM 10', sel)}
            ${chipBtn('20', 'RM 20', sel)}
            ${chipBtn('other', t('pay3.infaqOther'), sel)}
          </div>
          ${sel === 'other' ? `<div class="mt3">${field('infaq_other', { label: t('pay3.infaqAmount'), prefix: 'RM', inputmode: 'decimal', placeholder: '0.00', value: custom, id: 'infaq-other' })}</div>` : ''}
          <div class="mt2 small muted2 flex gap1 items-center">${icon('shieldCheck', 13)} ${esc(t('pay3.infaqNote'))}</div>
          ${opts.minimum_infaq && infaq > 0 && infaq < parseFloat(opts.minimum_infaq) ? `<div class="mt2 small red-txt">${icon('alert', 13)} ${esc(t('pay3.infaqMin', { min: opts.minimum_infaq }))}</div>` : ''}
          ${opts.maximum_infaq && infaq > parseFloat(opts.maximum_infaq) ? `<div class="mt2 small red-txt">${icon('alert', 13)} ${esc(t('pay3.infaqMax', { max: opts.maximum_infaq }))}</div>` : ''}
        ` : `<div class="banner grey">${icon('info', 16)}<div class="bt">${esc(t('pay3.infaqOff'))}</div></div>`}
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('receipt', 15)} ${esc(t('pay3.breakdown'))}</h2>
          <span class="section-sub">${esc(t('pay3.breakdownTag'))}</span>
        </div>
        <div class="card">
          <div class="kv">
            <div class="kv-row"><span class="kv-k">${esc(t('pay3.baseFee'))}</span><span class="kv-v money">${esc(rm(fee))}</span></div>
            <div class="kv-row"><span class="kv-k">${icon('sparkle', 13)} ${esc(t('pay3.infaqLine'))}</span><span class="kv-v money">${esc(rm(infaq))}</span></div>
            <div class="kv-row kv-total"><span class="kv-k">${esc(t('pay3.total'))}</span><span class="kv-v money" style="font-size:19px">${esc(rm(total))}</span></div>
          </div>
          <p class="small muted2 mt2" style="margin-bottom:0">${esc(t('pay3.formula', { fee: rm(fee), infaq: rm(infaq), total: rm(total) }))}</p>
        </div>
      </div>
      <div style="height:12px"></div>

      <div class="foot">
        <button class="btn btn-primary btn-block" id="cont-btn">${icon('arrowR', 17)} ${esc(t('pay3.continue', { total: rm(total) }))}</button>
        <button class="center-link" data-go="#/class/${esc(cls.id || '')}">${esc(t('pay3.backClass'))}</button>
      </div>`);

    bind();
  };

  function chipBtn(val, label, active) {
    return `<button class="btn btn-sm ${String(active) === String(val) ? 'btn-primary' : 'btn-soft'}" data-infaq="${attr(val)}">${esc(label)}</button>`;
  }

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    ctx.root.querySelectorAll('[data-infaq]').forEach((b) => b.addEventListener('click', () => {
      if (sel === 'other' && b.dataset.infaq !== 'other') { custom = ''; }
      sel = b.dataset.infaq;
      render();
      if (sel === 'other') { const i = ctx.root.querySelector('#infaq-other'); if (i) i.focus(); }
    }));
    const other = ctx.root.querySelector('#infaq-other');
    if (other) other.addEventListener('input', () => { custom = other.value.replace(/[^\d.]/g, ''); });

    const btn = ctx.root.querySelector('#cont-btn');
    if (btn) btn.addEventListener('click', async () => {
      const opts = sch.payment_options || {};
      const v = infaqValue();
      if (opts.allow_additional_infaq !== false) {
        if (opts.minimum_infaq && v > 0 && v < parseFloat(opts.minimum_infaq)) { toast(t('pay3.infaqMin', { min: opts.minimum_infaq }), 'err'); return; }
        if (opts.maximum_infaq && v > parseFloat(opts.maximum_infaq)) { toast(t('pay3.infaqMax', { max: opts.maximum_infaq }), 'err'); return; }
      }
      // A payment attempt for this schedule is already awaiting verification
      // (the backend does not block duplicate submissions) — confirm first.
      if (sch.payment_status === 'pending') {
        const again = await confirmDialog({
          title: t('pay3.dupTitle'), text: t('pay3.dupBody'),
          ok: t('pay3.dupYes'), cancel: t('pay3.dupNo'),
        });
        if (!again) return;
      }
      flow.infaq = opts.allow_additional_infaq === false ? 0 : v;
      flow.method = null;
      go(`#/pay/${scheduleId}/transfer`);
    });
  }

  async function load() {
    err = null; sch = null; render();
    try {
      const env = await api.get(`${selfPrefix()}/payment-schedules/${scheduleId}`);
      sch = env.data.payment_schedule || env.data; // live wraps nested; mock flat
      flow.className = (sch && sch.class && sch.class.name) || null; // self-service payment payloads omit class
      render();
    } catch (e) { err = e; render(); }
  }
  load();
}

/* ---------------- s4: Pindahan & Bukti ---------------- */
export function payTransferScreen(ctx) {
  const scheduleId = ctx.params.scheduleId;
  let sch = null;
  let err = null;
  let method = flow.method || 'qr';
  let proof = null; // { blob, name, type, size }
  let submitting = false;

  if (String(flow.scheduleId) !== String(scheduleId)) { flow.scheduleId = scheduleId; flow.infaq = 0; }

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t('pay4.title'), sub: t('pay3.step', { n: 2 }), back: true, avatar: true })}
      <div class="content with-foot pad">${body}</div>
    </div>`;

  const render = () => {
    if (err) { ctx.root.innerHTML = shell(`<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`); bind(); return; }
    if (!sch) { ctx.root.innerHTML = shell(skeletonList(3, true)); return; }

    const opts = sch.payment_options || {};
    const cls = sch.class || {};
    const fee = parseFloat(sch.required_amount || opts.required_amount || 0);
    const infaq = parseFloat(flow.infaq || 0);
    const total = fee + infaq;

    ctx.root.innerHTML = shell(`
      <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
        <div class="flex between items-center">
          <div>
            <div class="eyebrow">${esc(t('pay4.claim'))}</div>
            <div class="strong" style="font-size:16px">${esc(cls.name || '—')}</div>
            <div class="small muted">${esc(t('pay4.session', { y: new Date().getFullYear() }))} · ${esc(t('pay3.dueBy'))} ${esc(fmtDate(sch.due_date))}</div>
          </div>
          <div class="right">
            <div class="money" style="font-size:20px">${esc(rm(total))}</div>
            <div class="small muted" style="text-align:right">${esc(t('pay4.transferTotal'))}</div>
          </div>
        </div>
        <div class="kv mt3">
          <div class="kv-row"><span class="kv-k">${esc(t('pay4.fee', { m: freqShort(sch, opts) }))}</span><span class="kv-v money">${esc(rm(fee))}</span></div>
          <div class="kv-row"><span class="kv-k">${icon('sparkle', 13)} ${esc(t('pay4.infaq'))}</span><span class="kv-v money">${esc(rm(infaq))}</span></div>
        </div>
      </div>

      <div class="section" style="margin-top:16px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('swap', 15)} ${esc(t('pay4.method'))}</h2>
          <span class="section-sub">${esc(t('pay4.methodPick'))}</span>
        </div>
        <div class="segmented" id="method-seg">
          <button class="seg-btn ${method === 'qr' ? 'active' : ''}" data-m="qr">${icon('qr', 15)} ${esc(t('pay4.qrTab'))}</button>
          <button class="seg-btn ${method === 'bank_transfer' ? 'active' : ''}" data-m="bank_transfer">${icon('bank', 15)} ${esc(t('pay4.bankTab'))}</button>
        </div>

        <div class="card mt3">
          ${method === 'qr' ? `
            <div class="flex between items-center">
              <span class="strong small">${esc(t('pay4.qrBadge'))}</span>
              <span class="chip ok"><i class="dot"></i> ${esc(t('cls.verified'))}</span>
            </div>
            <div class="qr-frame mt2" style="padding:10px">
              ${opts.qr_code_url
                ? `<img src="${attr(opts.qr_code_url)}" alt="QR" style="width:100%;max-width:260px">`
                : `<div class="empty-ico" style="margin:10px auto">${icon('qr', 30)}</div>`}
              <div class="center small muted mt2">${esc(t('pay4.scanHint'))}</div>
            </div>`
          : `
            <div class="flex between items-center">
              <span class="strong small">${esc(opts.bank_name || t('pay4.bankName'))}</span>
              <span class="chip info"><i class="dot"></i> ${esc(t('cls.verified'))}</span>
            </div>
            <div class="kv mt2">
              <div class="kv-row"><span class="kv-k">${esc(t('pay4.bankHolder'))}</span><span class="kv-v">${esc(opts.bank_account_name || '—')}</span></div>
              <div class="kv-row"><span class="kv-k">${esc(t('pay4.bankNumber'))}</span><span class="kv-v mono">${esc(opts.bank_account_number || '—')}
                <button class="icon-btn" id="copy-acct" style="vertical-align:middle">${icon('copy', 15)}</button></span></div>
              <div class="kv-row"><span class="kv-k">${esc(t('pay3.total'))}</span><span class="kv-v money strong">${esc(rm(total))}</span></div>
            </div>`}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('upload', 15)} ${esc(t('pay4.upload'))}</h2>
          <span class="chip warn">${esc(t('pay4.uploadTag'))}</span>
        </div>
        <div class="card">
          <p class="small muted" style="margin-top:0">${esc(t('pay4.uploadFmt', { mb: config.PROOF_MAX_MB }))}</p>
          ${proof ? `
            <div class="file-chip">
              <span class="fc-ico">${icon(/pdf$/i.test(proof.type || '') ? 'file' : 'image', 17)}</span>
              <span class="grow">
                <span class="fc-name">${esc(proof.name)}</span>
                <span class="fc-sub">${esc(fmtBytes(proof.size))} · ${esc(t('pay4.fileReady'))}</span>
              </span>
              <button class="icon-btn" id="proof-rm" aria-label="${attr(t('common.remove'))}">${icon('x', 16)}</button>
            </div>`
          : `
            <div class="btn-row">
              <button class="btn btn-light btn-sm" id="pick-cam">${icon('camera', 15)} ${esc(t('pay4.pickCamera'))}</button>
              <button class="btn btn-light btn-sm" id="pick-file">${icon('file', 15)} ${esc(t('pay4.pickFile'))}</button>
            </div>`}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('edit', 15)} ${esc(t('pay4.notes'))}</h2>
          <span class="chip muted">${esc(t('pay4.notesTag'))}</span>
        </div>
        <div class="card" data-form>
          <form id="pay-form" novalidate>
            ${field('notes', { label: t('pay4.notes'), textarea: true, rows: 3, placeholder: t('pay4.notesPh'), hint: t('pay4.notesHint') })}
          </form>
        </div>
      </div>
      <div style="height:12px"></div>

      <div class="foot">
        <button class="btn btn-primary btn-block" id="submit-btn">${icon('upload', 16)} ${esc(t('pay4.submit'))}</button>
        <button class="center-link" data-go="#/pay/${scheduleId}">${icon('chevronL', 14)} ${esc(t('pay3.backClass'))}</button>
      </div>`);

    bind();
  };

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);

    ctx.root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { method = b.dataset.m; flow.method = method; render(); }));

    const cp = ctx.root.querySelector('#copy-acct');
    if (cp) cp.addEventListener('click', () => copyText((sch.payment_options || {}).bank_account_number || ''));

    const cam = ctx.root.querySelector('#pick-cam');
    if (cam) cam.addEventListener('click', () => choose(true));
    const file = ctx.root.querySelector('#pick-file');
    if (file) file.addEventListener('click', () => choose(false));
    const rmBtn = ctx.root.querySelector('#proof-rm');
    if (rmBtn) rmBtn.addEventListener('click', () => { proof = null; render(); });

    async function choose(useCamera) {
      try {
        const f = useCamera ? await pickImage({ camera: true }) : await pickProof();
        const cand = { blob: f.blob, name: f.name || 'bukti', type: f.type || f.blob.type || '', size: f.blob.size };
        const v = isValidProof(cand, config.PROOF_MAX_MB);
        if (!v.ok) { toast(v.okType ? t('pay4.tooBig', { mb: config.PROOF_MAX_MB }) : t('err.validation'), 'err'); return; }
        proof = cand;
        render();
      } catch (e) { /* user cancelled */ }
    }

    const btn = ctx.root.querySelector('#submit-btn');
    if (btn) btn.addEventListener('click', async () => {
      if (submitting) return;
      // proof is optional — the payment is created first; the proof file, if any,
      // is uploaded separately (POST /payments/{id}/proofs)
      submitting = true;
      setLoading(btn, true, proof ? t('pay4.uploading') : t('pay4.submitting'));
      const form = ctx.root.querySelector('#pay-form');
      const v = formValues(form);
      clearErrors(ctx.root);
      try {
        const pre = selfPrefix();
        const env = await api.post(`${pre}/payment-schedules/${scheduleId}/payments`, {
          additional_infaq: flow.infaq || 0,
          payment_method: method,
          notes: v.notes || undefined,
        });
        const d = env.data || {};
        const pay = d.payment || d;
        if (!pay || !pay.id) throw new Error('no payment');
        if (proof) {
          try {
            await api.upload(`/payments/${pay.id}/proofs`, {
              file: { field: 'file', blob: proof.blob, filename: proof.name },
            });
          } catch (eProof) {
            toast(eProof.message || t('pay4.needProof'), 'err');
          }
        }
        submitting = false;
        flow.scheduleId = null;
        flow.submittedAt = new Date().toISOString(); // self-service payloads omit created_at
        go(`#/pay-success/${pay.id}`, { replace: true });
      } catch (e) {
        submitting = false;
        setLoading(btn, false);
        showErrors(ctx.root, e.errors || {}, e.message || t('err.generic'));
      }
    });
  }

  async function load() {
    err = null; sch = null; render();
    try {
      const env = await api.get(`${selfPrefix()}/payment-schedules/${scheduleId}`);
      sch = env.data.payment_schedule || env.data; // live wraps nested; mock flat
      if (sch && sch.class && sch.class.name) flow.className = sch.class.name;
      render();
    } catch (e) { err = e; render(); }
  }
  load();
}

/* ---------------- s5: Kejayaan ---------------- */
export function paySuccessScreen(ctx) {
  const paymentId = ctx.params.paymentId;
  let pay = null;
  let proofs = [];
  let err = null;

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t('pay5.title'), back: false, avatar: true, bell: true, unread: store.unread })}
      <div class="content pad">${body}</div>
    </div>`;

  const render = () => {
    if (err) { ctx.root.innerHTML = shell(`<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`); bind(); return; }
    if (!pay) { ctx.root.innerHTML = shell(skeletonList(3, true)); return; }

    const proof = proofs[0] || null;
    const fee = parseFloat(pay.required_amount || 0);
    const infaq = parseFloat(pay.additional_infaq || 0);

    ctx.root.innerHTML = shell(`
      <div class="center mt6">
        <div class="success-ico">${icon('checkCircle', 38)}</div>
        <div class="h2 mt3">${esc(t('pay5.head'))}</div>
        <p class="small muted" style="max-width:320px;margin:8px auto 0">${esc(t('pay5.sub'))}</p>
      </div>

      <div class="card mt4 center">
        <div class="eyebrow">${esc(t('pay5.status'))}</div>
        <div class="mt2">${statusChip(pay.status)}</div>
        <div class="chip info mt2">${icon('clock', 12)} ${esc(t('pay5.within24'))}</div>
      </div>

      <div class="section" style="margin-top:16px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('receipt', 15)} ${esc(t('pay5.receipt'))}</h2>
        </div>
        <div class="card">
          <div class="flex between items-center">
            <div>
              <div class="eyebrow">${esc(t('pay5.ref'))}</div>
              <div class="mono strong">${esc(pay.reference_number || `#${pay.id}`)}</div>
            </div>
            <button class="btn btn-light btn-sm" id="copy-ref">${icon('copy', 14)} ${esc(t('pay5.copyRef'))}</button>
          </div>
          <div class="kv mt3">
            <div class="kv-row"><span class="kv-k">${esc(t('pay5.pName'))}</span><span class="kv-v">${esc((store.user && store.user.name) || (pay.payer && pay.payer.name) || '—')}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t('pay5.pClass'))}</span><span class="kv-v">${esc(pay.class && pay.class.name ? pay.class.name : (flow.className || '—'))}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t('pay5.pWhen'))}</span><span class="kv-v">${esc(fmtDateTime(pay.created_at || pay.paid_at || flow.submittedAt))}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t('pay5.pMethod'))}</span><span class="kv-v">${esc(methodLabel(pay.payment_method))}</span></div>
            <div class="kv-row">            <span class="kv-k">${esc(t('pay5.pProof'))}</span><span class="kv-v">${esc(proof ? proof.original_name : t('pay5.noProof'))}</span></div>
          </div>
          <div class="kv mt2">
            <div class="kv-row"><span class="kv-k">${esc(t('pay5.baseFee'))}</span><span class="kv-v money">${esc(rm(fee))}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t('pay5.infaq'))}</span><span class="kv-v money">${esc(rm(infaq))}</span></div>
            <div class="kv-row kv-total"><span class="kv-k">${esc(t('pay5.payTotal'))}</span><span class="kv-v money" style="font-size:18px">${esc(rm(pay.total_amount))}</span></div>
          </div>
        </div>
      </div>

      <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
        <div class="flex gap2 items-center">${icon('shieldCheck', 16)}<span class="strong small">${esc(t('pay5.auto'))}</span></div>
        <p class="small muted" style="margin:8px 0 0">${esc(t('pay5.autoText'))}</p>
      </div>

      <div class="mt4">
        <button class="btn btn-primary btn-block" data-nav="#/home">${icon('home', 16)} ${esc(t('pay5.home'))}</button>
        <button class="btn btn-soft btn-block mt2" data-nav="#/history">${icon('receipt', 16)} ${esc(t('pay5.seeHistory'))}</button>
      </div>
      <div style="height:24px"></div>`);

    bind();
  };

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    const cp = ctx.root.querySelector('#copy-ref');
    if (cp) cp.addEventListener('click', () => copyText((pay && pay.reference_number) || String(paymentId)));
  }

  async function load() {
    err = null; pay = null; render();
    try {
      const pre = selfPrefix();
      const env = await api.get(`${pre}/payments/${paymentId}`);
      pay = env.data && env.data.payment ? env.data.payment : env.data;
      try { const p = await api.get(`/payments/${paymentId}/proofs`); proofs = Array.isArray(p.data) ? p.data : (p.data && p.data.proofs) || []; } catch (eP) { proofs = []; }
      render();
    } catch (e) { err = e; render(); }
  }
  load();
}

function freqShort(sch, opts) {
  const f = (opts && opts.payment_frequency) || (sch.class && sch.class.frequency) || '';
  return { weekly: t('cls.freqWeekly'), fortnightly: t('cls.freqFortnightly'), monthly: t('cls.freqMonthly') }[f] || f || '—';
}
