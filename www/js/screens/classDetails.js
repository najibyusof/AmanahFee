/**
 * Student/Sponsor class detail (mockups s1–s2) — scls.* strings.
 * GET /classes/{id}, GET /{r}/payment-schedules?class_id={id}, GET /{r}/payments?class_id={id}
 */
import { t } from '../i18n/index.js';
import { api } from '../api.js';
import { store } from '../store.js';
import {
  appbar, icon, esc, attr, rm, fmtDate, fmtDateTime, statusChip, dayName, freqLabel,
  skeletonList, errorState, emptyState, bindPTR, shareContent, banner,
} from '../ui.js';
import { selfPrefix } from './studentDashboard.js';

export function classDetailsScreen(ctx) {
  const id = ctx.params.id;
  let cls = null;
  let schedules = [];
  let payments = [];
  let err = null;

  const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
  /* Includes the generator's `upcoming` current-period rows whose due date
     has arrived (the daily scheduler has not flipped them to pending yet),
     unless a payment has already been made/verified for that row. */
  const dueSchedule = () =>
    schedules.find((s) =>
      ['pending', 'overdue', 'partially_paid'].includes(s.status) ||
      (s.status === 'upcoming' && s.due_date && new Date(s.due_date) <= endOfToday() &&
        !['paid', 'verified'].includes(s.payment_status)),
    ) || null;
  const lastPaid = () => payments.filter((p) => p.status === 'paid').sort((a, b) => String(b.paid_at || '').localeCompare(String(a.paid_at || '')))[0] || null;

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t('scls.title'), back: true, bell: true, unread: store.unread, avatar: true })}
      <div class="content pad">${body}</div>
    </div>`;

  const render = () => {
    if (err) { ctx.root.innerHTML = shell(`<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`); bind(); return; }
    if (!cls) { ctx.root.innerHTML = shell(skeletonList(3, true)); return; }

    const setting = cls.payment_setting || {};
    const org = cls.organization || {};
    const due = dueSchedule();
    const paid = lastPaid();
    const fee = cls.payment_amount || setting.required_amount || '0.00';
    const when = [cls.day_of_week !== undefined && cls.day_of_week !== null ? dayName(cls.day_of_week) : '',
      (cls.start_time || '').slice(0, 5), cls.end_time ? `– ${String(cls.end_time).slice(0, 5)}` : ''].filter(Boolean).join(' ');

    ctx.root.innerHTML = shell(`
      <div class="hero mt4" style="align-items:flex-start">
        <div class="hero-row">
          <div>
            <div class="eyebrow">${esc(org.name || t('scls.program'))}</div>
            <div class="hero-title" style="font-size:20px">${esc(cls.name)}</div>
            <div class="hero-sub">${icon('user', 13)} ${esc(cls.teacher_name || '—')}</div>
          </div>
          ${statusChip(cls.status || 'active')}
        </div>
        <div class="stat-grid mt3" style="gap:10px">
          <div>
            <div class="stat-label" style="color:rgba(255,255,255,.65)">${esc(t('scls.feeNow'))}</div>
            <div class="money" style="font-size:19px">${esc(rm(fee))}</div>
          </div>
          <div>
            <div class="stat-label" style="color:rgba(255,255,255,.65)">${esc(t('cls.freq'))}</div>
            <div class="strong" style="font-size:15px">${esc(freqLabel(cls.frequency || setting.payment_frequency))}</div>
          </div>
        </div>
      </div>

      <div class="section" style="margin-top:16px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('calendar', 15)} ${esc(t('scls.session'))}</h2>
          <span class="chip info">${esc(t('scls.sessionTag', { y: new Date().getFullYear() }))}</span>
        </div>
        <div class="card">
          <div class="kv">
            <div class="kv-row"><span class="kv-k">${icon('user', 13)} ${esc(t('scls.teacher'))}</span><span class="kv-v">${esc(cls.teacher_name || '—')}</span></div>
            <div class="kv-row"><span class="kv-k">${icon('clock', 13)} ${esc(t('scls.when'))}</span><span class="kv-v">${esc(when || '—')}</span></div>
            <div class="kv-row"><span class="kv-k">${icon('refresh', 13)} ${esc(t('scls.freqAmt'))}</span><span class="kv-v">${esc(freqLabel(cls.frequency || setting.payment_frequency))} · ${esc(rm(fee))}</span></div>
            <div class="kv-row"><span class="kv-k">${icon('building', 13)} ${esc(t('payDetail.pOrg'))}</span><span class="kv-v">${esc(org.name || '—')}</span></div>
          </div>
        </div>
      </div>

      ${due ? `
      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('alert', 15)} ${esc(t('scls.arrears', { period: monthLabel(due.period_start) }))}</h2>
          ${statusChip(due.status)}
        </div>
        <div class="card" style="background:var(--primary-soft-2);box-shadow:none">
          <div class="flex between items-center">
            <div>
              <div class="eyebrow">${esc(t('stu.totalDue'))}</div>
              <div class="num-xl">${esc(rm(due.required_amount))}</div>
            </div>
            <div class="right">
              <div class="small red-txt bold">${icon('calendar', 12)} ${esc(t('scls.dueBy'))} ${esc(fmtDate(due.due_date))}</div>
              ${paid ? `<div class="small muted" style="text-align:right;margin-top:4px">${esc(t('scls.lastPay'))}<br>${esc(t('scls.lastPayVal', { date: fmtDate(paid.paid_at), amount: rm(paid.total_amount), status: t('st.paid') }))}</div>` : ''}
            </div>
          </div>
          <button class="btn btn-primary btn-block mt3" data-go="#/pay/${due.id}">
            ${icon('dollar', 17)} ${esc(t('scls.pay', { amount: rm(due.required_amount) }))}
          </button>
        </div>
      </div>` : `
      <div class="card mt3">${banner('', esc(schedules.length ? t('stu.paidAll') : t('scls.noSched')), schedules.length ? 'checkCircle' : 'calendar')}</div>`}

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon('receipt', 15)} ${esc(t('scls.history'))}</h2>
          <span class="chip info">${esc(t('scls.historyTag'))}</span>
        </div>
        ${payments.length ? `<div class="list">${payments.map(historyRow).join('')}</div>
          <button class="btn btn-soft btn-block mt3" data-go="#/history">${icon('receipt', 16)} ${esc(t('scls.viewAll'))}</button>`
          : `<div class="card">${emptyState({ ic: 'receipt', title: t('scls.noHistory') })}</div>`}
      </div>

      <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
        <div class="flex gap2 items-center">${icon('shieldCheck', 16)}<span class="strong small">${esc(t('scls.audit'))}</span></div>
        <p class="small muted" style="margin:8px 0 0">${esc(t('scls.auditText'))}</p>
      </div>
      <div style="height:20px"></div>`);

    bind();
  };

  function historyRow(p) {
    const isPaid = p.status === 'paid';
    // self-service payment payloads omit created_at; fall back to the schedule's due date
    const sch = schedules.find((s) => String(s.id) === String(p.payment_schedule_id));
    return `
      <div class="row-item" style="cursor:default;align-items:flex-start">
        <span class="row-tile ${isPaid ? 'green' : 'amber'}">${icon(isPaid ? 'checkCircle' : 'clock', 17)}</span>
        <span class="row-body">
          <span class="row-title">${esc(fmtDate(p.paid_at || p.created_at || (sch && sch.due_date) || ''))}</span>
          <span class="row-sub mono">${esc(t('scls.receiptNo', { ref: p.reference_number || `#${p.id}` }))}</span>
          <span class="mt2" style="display:inline-block">${statusChip(p.status)}</span>
        </span>
        <span class="row-right"><span class="money" style="font-size:15px">${esc(rm(p.total_amount))}</span></span>
        ${isPaid ? `<span style="width:100%;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line-2)">
          <button class="btn btn-light btn-sm" data-receipt="${attr(p.id)}">${icon('download', 14)} ${esc(t('scls.download'))}</button>
        </span>` : ''}
      </div>`;
  }

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    ctx.root.querySelectorAll('[data-receipt]').forEach((b) => b.addEventListener('click', () => {
      const p = payments.find((x) => String(x.id) === b.dataset.receipt);
      if (!p) return;
      shareContent({
        subject: `${t('scls.receiptNo', { ref: p.reference_number || p.id })}`,
        text: `${cls ? cls.name : ''}\n${t('scls.receiptNo', { ref: p.reference_number || `#${p.id}` })}\n${rm(p.total_amount)} — ${t('st.paid')}\n${fmtDateTime(p.paid_at)}`,
      });
    }));
    const content = ctx.root.querySelector('.content');
    if (content) bindPTR(null, content, load);
  }

  async function load() {
    err = null; cls = null; render();
    try {
      const pre = selfPrefix();
      // GET /classes/{id} requires enrolment ("Enrolled or Org Admin"), so a
      // sponsor viewing a sponsored student's class gets 403 even though the
      // self-service class list includes it. Fall back to that list for the
      // class header so the screen still renders; schedules/payments are
      // already self-service scoped and load normally.
      const detail = (async () => {
        try { return await api.get(`/classes/${id}`); } catch (eDetail) {
          if (!eDetail.isForbidden && !eDetail.isNotFound) throw eDetail;
          try {
            const list = await api.list(`${pre}/classes`, 'classes', { per_page: 100 });
            const found = (list.items || []).find((x) => String(x.id) === String(id));
            if (found) return { data: found };
          } catch (eList) { /* keep the original error */ }
          throw eDetail;
        }
      })();
      // The self-service class payload carries only `organization_id` (no
      // `organization` object), so resolve the org name from the role's own
      // org list in parallel — decorative, never fatal.
      const orgs = api
        .list(`${pre}/organizations`, 'organizations', { per_page: 100 })
        .catch(() => null);
      const [c, sch, pay, orgList] = await Promise.all([
        detail,
        api.list(`${pre}/payment-schedules`, 'payment_schedules', { class_id: id, per_page: 100 }),
        api.list(`${pre}/payments`, 'payments', { class_id: id, per_page: 100 }),
        orgs,
      ]);
      cls = c.data;
      if (!cls.organization && cls.organization_id && orgList) {
        const found = (orgList.items || []).find((o) => String(o.id) === String(cls.organization_id));
        if (found) cls = { ...cls, organization: found };
      }
      schedules = sch.items;
      payments = pay.items;
      render();
    } catch (e) { err = e; render(); }
  }
  load();
}

function monthLabel(iso) {
  if (!iso) return '';
  const months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const d = new Date(String(iso).slice(0, 10));
  if (Number.isNaN(d.getTime())) return '';
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
