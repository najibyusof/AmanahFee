/**
 * Student / Sponsor self-service screens.
 *  - studentDashboardScreen: hero + tunggakan + quick actions + kelas saya
 *  - myClassesScreen, myOrgsScreen, historyScreen
 * Endpoints: GET /{student|sponsor}/classes, /organizations,
 *            /payment-schedules, /payment-schedules/current, /payments
 */
import { t } from '../i18n/index.js';
import { api } from '../api.js';
import { store } from '../store.js';
import {
  appbar, bottomNav, STU_NAV, icon, esc, attr, rm, fmtDate, fmtDateTime, statusChip,
  skeletonList, errorState, emptyState, initials, bindPTR, debounce, freqLabel,
} from '../ui.js';

/** active self-service prefix ('student' | 'sponsor'). */
export const selfRole = () => (store.activeRole === 'sponsor' ? 'sponsor' : 'student');
export const selfPrefix = () => `/${selfRole()}`;

/* ---------------- dashboard ---------------- */
export function studentDashboardScreen(ctx) {
  let current = null;   // outstanding schedule (or null)
  let classes = [];
  let schedules = [];
  let err = null;
  let loaded = false;

  const outstandingList = () => {
    const list = (schedules || []).filter((s) => ['pending', 'overdue', 'partially_paid'].includes(s.status));
    /* The live generator labels the current period `upcoming` (statuses only
       flip on the daily scheduler run), and /current is the authoritative
       "pay this now" schedule — include it so the arrears summary and the
       hero's Bayar Sekarang button never disagree. */
    if (
      current &&
      !list.some((s) => String(s.id) === String(current.id)) &&
      !['paid', 'cancelled'].includes(current.status) &&
      !['paid', 'verified'].includes(current.payment_status)
    ) list.push(current);
    return list;
  };
  const totalDue = () => outstandingList().reduce((a, s) => a + parseFloat(s.required_amount || 0), 0);

  const render = () => {
    const name = store.user && store.user.name ? store.user.name.split(' ')[0] : '';
    const roleTag = store.activeRole === 'sponsor' ? t('part.typeSponsor') : t('part.typeStudent');

    if (err) {
      ctx.root.innerHTML = shell(`<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`);
      bind();
      return;
    }
    if (!loaded) {
      ctx.root.innerHTML = shell(`<div class="mt4">${skeletonList(1, true)}${skeletonList(3)}</div>`);
      return;
    }

    const due = totalDue();
    const unpaid = outstandingList().length;
    const heroBtn = current
      ? `<button class="btn btn-white btn-block mt3" data-go="#/pay/${current.id}">${icon('dollar', 17)} ${esc(t('stu.payNow', { amount: rm(current.required_amount) }))}</button>`
      : `<div class="flex items-center gap1 mt3" style="color:rgba(255,255,255,.85);font-weight:600">${icon('checkCircle', 16)} ${esc(t('stu.paidAll'))}</div>`;

    const recent = classes.slice(0, 4);

    ctx.root.innerHTML = shell(`
      <div class="pad">
        <div class="hero mt4">
          <div class="hero-row">
            <div>
              <div class="eyebrow">${esc(t('stu.badge'))}</div>
              <div class="hero-title">${esc(t('dash.hi', { name: name || '—' }))}</div>
              <div class="hero-sub">${esc(roleTag)} · ${esc(store.user ? store.user.phone || '' : '')}</div>
            </div>
            <span class="pill-light">${esc(roleTag)}</span>
          </div>

          <div class="card mt3" style="background:rgba(255,255,255,.1);box-shadow:none;color:#fff">
            <div class="eyebrow" style="color:rgba(255,255,255,.7)">${esc(t('stu.arrears'))}</div>
            <div class="money" style="font-size:26px;margin-top:4px">${esc(rm(due))}</div>
            <div class="small" style="color:rgba(255,255,255,.75);margin-top:2px">
              ${unpaid ? esc(t('stu.unpaid', { n: unpaid })) : esc(t('stu.paidAll'))}
              ${current ? ` · ${icon('calendar', 12)} ${esc(t('scls.dueBy'))} ${esc(fmtDate(current.due_date))}` : ''}
            </div>
            ${heroBtn}
          </div>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title">${esc(t('dash.stats'))}</h2>
            <span class="section-sub">${esc(t('stu.myClassesN', { n: classes.length }))}</span>
          </div>
          <div class="stat-grid">
            <div class="stat">
              <span class="stat-tile">${icon('book', 17)}</span>
              <div class="stat-num">${classes.length}</div>
              <div class="stat-label">${esc(t('stu.myClasses'))}</div>
            </div>
            <div class="stat">
              <span class="stat-tile amber">${icon('clock', 17)}</span>
              <div class="stat-num">${unpaid}</div>
              <div class="stat-label">${esc(t('pay.tabPending'))}</div>
            </div>
            <div class="stat">
              <span class="stat-tile green">${icon('checkCircle', 17)}</span>
              <div class="stat-num">${(schedules || []).filter((s) => s.status === 'paid').length}</div>
              <div class="stat-label">${esc(t('st.paid'))}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title">${esc(t('dash.quick'))}</h2>
            <span class="section-sub">${esc(t('dash.quickSub'))}</span>
          </div>
          <div class="qa-grid">
            <button class="qa-item" data-go="#/my-classes"><span class="qa-ico">${icon('book', 17)}</span><span class="qa-t">${esc(t('stu.myClasses'))}</span></button>
            <button class="qa-item" data-go="#/history"><span class="qa-ico">${icon('receipt', 17)}</span><span class="qa-t">${esc(t('hist.title'))}</span></button>
            <button class="qa-item" data-go="#/my-organizations"><span class="qa-ico">${icon('building', 17)}</span><span class="qa-t">${esc(t('stu.myOrgs'))}</span></button>
            <button class="qa-item" data-go="#/notifications"><span class="qa-ico">${icon('bell', 17)}</span><span class="qa-t">${esc(t('notif.title'))}</span></button>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title">${esc(t('stu.myClasses'))}</h2>
            <button class="section-link" data-go="#/my-classes">${esc(t('common.seeAll'))}</button>
          </div>
          ${recent.length ? `<div class="list">${recent.map(classRow).join('')}</div>`
            : `<div class="card">${emptyState({ ic: 'cap', title: t('stu.empty'), text: t('stu.emptySub') })}</div>`}
        </div>
        <div style="height:16px"></div>
      </div>`);
    bind();
  };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t('app.name'), sub: t('app.system'), bell: true, unread: store.unread, avatar: true })}
      <div class="content with-nav">
        ${body}
      </div>
      ${bottomNav('home', STU_NAV)}
    </div>`;

  const bind = () => {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    const content = ctx.root.querySelector('.content');
    if (content) bindPTR(null, content, load);
  };

  async function load() {
    err = null;
    render();
    try {
      const pre = selfPrefix();
      const [cur, cls, sch] = await Promise.all([
        api.get(`${pre}/payment-schedules/current`).catch(() => ({ data: null })),
        api.list(`${pre}/classes`, 'classes', { per_page: 100 }),
        api.list(`${pre}/payment-schedules`, 'payment_schedules', { per_page: 100 }),
      ]);
      const curBody = cur.data || {};
      current = curBody.payment_schedule || curBody.payment_schedules || curBody.current || (curBody.id ? curBody : null); // live wraps nested; mock flat
      classes = cls.items;
      schedules = sch.items;
      loaded = true;
    } catch (e) { err = e; }
    render();
  }
  load();
}

function classRow(c) {
  const st = c.payment_status || 'upcoming';
  const outstanding = parseFloat(c.outstanding_amount || 0);
  return `
    <button class="row-item" data-go="#/class/${c.id}">
      <span class="row-tile">${icon('book', 17)}</span>
      <span class="row-body">
        <span class="row-title">${esc(c.name)}</span>
        <span class="row-sub">${icon('building', 12)} ${esc(c.organization ? c.organization.name : '—')}</span>
        ${c.teacher_name ? `<span class="row-sub">${icon('user', 12)} ${esc(c.teacher_name)}</span>` : ''}
        <span class="mt2" style="display:inline-block">${statusChip(st === 'paid' ? 'paid' : st === 'overdue' ? 'overdue' : st === 'pending' ? 'pending' : 'upcoming')}</span>
      </span>
      <span class="row-right">
        <span class="money" style="font-size:15px">${esc(rm(c.payment_amount))}</span>
        <span class="small muted">/ ${esc(freqLabel(c.frequency))}</span>
        ${outstanding > 0 ? `<span class="small red-txt bold">${esc(rm(outstanding))}</span>` : ''}
      </span>
    </button>`;
}

/* ---------------- my classes ---------------- */
export function myClassesScreen(ctx) {
  let items = null;
  let err = null;
  let q = '';

  const filtered = () => (items || []).filter((c) => !q || `${c.name} ${c.teacher_name || ''} ${(c.organization || {}).name || ''}`.toLowerCase().includes(q.toLowerCase()));

  const render = () => {
    let body;
    if (err) body = `<div class="card mt3">${errorState(err, 'data-act="retry"')}</div>`;
    else if (items === null) body = skeletonList(4);
    else if (!filtered().length) body = `<div class="card mt3">${emptyState({ ic: 'cap', title: t('stu.empty'), text: q ? t('common.search') : t('stu.emptySub') })}</div>`;
    else body = `<div class="list mt3">${filtered().map(classRow).join('')}</div>`;

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t('stu.myClasses'), sub: t('stu.myClassesN', { n: (items || []).length }), back: true, bell: true, unread: store.unread, avatar: true })}
        <div class="content with-nav pad">
          <div class="searchbar mt3">
            ${icon('search', 18)}
            <input id="cls-q" type="search" placeholder="${attr(t('cls.search'))}" value="${attr(q)}">
          </div>
          ${body}
          <div style="height:16px"></div>
        </div>
        ${bottomNav('classes', STU_NAV)}
      </div>`;

    const s = ctx.root.querySelector('#cls-q');
    if (s) s.addEventListener('input', debounce(() => { q = s.value.trim(); render(); }, 250));
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    const content = ctx.root.querySelector('.content');
    if (content) bindPTR(null, content, load);
  };

  async function load() {
    err = null; items = null; render();
    try {
      const r = await api.list(`${selfPrefix()}/classes`, 'classes', { per_page: 100 });
      items = r.items;
    } catch (e) { err = e; }
    render();
  }
  load();
}

/* ---------------- my organizations ---------------- */
export function myOrgsScreen(ctx) {
  let items = null;
  let err = null;

  const render = () => {
    let body;
    if (err) body = `<div class="card mt3">${errorState(err, 'data-act="retry"')}</div>`;
    else if (items === null) body = skeletonList(3);
    else if (!items.length) body = `<div class="card mt3">${emptyState({ ic: 'building', title: t('orgsMine.empty'), text: t('stu.myOrgsEmpty') })}</div>`;
    else body = `<div class="list mt3">${items.map((o) => `
      <div class="row-item" style="cursor:default">
        <span class="org-logo" style="width:44px;height:44px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--primary-soft-2)">
          ${o.logo_url ? `<img src="${attr(o.logo_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : icon('building', 18)}
        </span>
        <span class="row-body">
          <span class="row-title">${esc(o.name)}</span>
          <span class="row-sub">${icon('grid', 12)} ${esc(o.code || '—')}</span>
          ${o.description ? `<span class="row-sub" style="white-space:normal">${esc(String(o.description).slice(0, 90))}</span>` : ''}
        </span>
        <span class="row-right">${statusChip(o.status || 'active')}</span>
      </div>`).join('')}</div>`;

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t('orgsMine.title'), back: true, bell: true, unread: store.unread, avatar: true })}
        <div class="content with-nav pad">
          ${body}
          <div style="height:16px"></div>
        </div>
        ${bottomNav('', STU_NAV)}
      </div>`;

    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    const content = ctx.root.querySelector('.content');
    if (content) bindPTR(null, content, load);
  };

  async function load() {
    err = null; items = null; render();
    try {
      const r = await api.list(`${selfPrefix()}/organizations`, 'organizations', { per_page: 100 });
      items = r.items;
    } catch (e) { err = e; }
    render();
  }
  load();
}

/* ---------------- payment history ---------------- */
export function historyScreen(ctx) {
  let items = null;
  let err = null;
  let tab = 'all';
  let scheds = [];

  /* Self-service payment payloads carry no class name (or created_at);
     join via the schedule, which does include its class. */
  const schedFor = (p) => scheds.find((s) => String(s.id) === String(p.payment_schedule_id)) || null;
  const schedName = (p) => { const s = schedFor(p); return (s && s.class && s.class.name) || (s && s.class_name) || null; };
  const schedDue = (p) => { const s = schedFor(p); return (s && s.due_date) || null; };

  const counts = () => ({
    all: (items || []).length,
    paid: (items || []).filter((p) => p.status === 'paid').length,
    pending: (items || []).filter((p) => p.status === 'pending' || p.status === 'initiated').length,
    failed: (items || []).filter((p) => p.status === 'failed').length,
  });
  const filtered = () => {
    if (!items) return [];
    if (tab === 'all') return items;
    if (tab === 'pending') return items.filter((p) => p.status === 'pending' || p.status === 'initiated');
    return items.filter((p) => p.status === tab);
  };
  const collected = () => (items || []).filter((p) => p.status === 'paid').reduce((a, p) => a + parseFloat(p.total_amount || 0), 0);

  const render = () => {
    let body;
    if (err) body = `<div class="card mt3">${errorState(err, 'data-act="retry"')}</div>`;
    else if (items === null) body = skeletonList(4);
    else {
      const c = counts();
      body = `
        <div class="card mt3" style="background:var(--grad-navy);color:#fff;box-shadow:none">
          <div class="eyebrow" style="color:rgba(255,255,255,.7)">${esc(t('hist.title'))}</div>
          <div class="money" style="font-size:22px;margin-top:4px">${esc(rm(collected()))}</div>
          <div class="small" style="color:rgba(255,255,255,.7)">${esc(t('dash.collected'))} · ${c.paid} ${esc(t('st.paid').toLowerCase())}</div>
        </div>

        <div class="tabs mt3" id="hist-tabs">
          <button class="tab ${tab === 'all' ? 'active' : ''}" data-s="all">${esc(t('notif.tabAll'))}<span class="cnt">(${c.all})</span></button>
          <button class="tab ${tab === 'paid' ? 'active' : ''}" data-s="paid">${esc(t('st.paid'))}<span class="cnt">(${c.paid})</span></button>
          <button class="tab ${tab === 'pending' ? 'active' : ''}" data-s="pending">${esc(t('pay.tabPending'))}<span class="cnt">(${c.pending})</span></button>
          <button class="tab ${tab === 'failed' ? 'active' : ''}" data-s="failed">${esc(t('st.failed'))}<span class="cnt">(${c.failed})</span></button>
        </div>

        ${filtered().length ? `<div class="list mt3">${filtered().map(historyRow).join('')}</div>`
          : `<div class="card mt3">${emptyState({ ic: 'receipt', title: t('hist.empty'), text: t('pay.emptySub') })}</div>`}
        <div style="height:16px"></div>`;
    }

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t('hist.title'), sub: t('hist.sub'), back: true, bell: true, unread: store.unread, avatar: true })}
        <div class="content with-nav pad">${body}</div>
        ${bottomNav('', STU_NAV)}
      </div>`;

    ctx.root.querySelectorAll('#hist-tabs .tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.s; render(); }));
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    const content = ctx.root.querySelector('.content');
    if (content) bindPTR(null, content, load);
  };

  function historyRow(p) {
    return `
      <div class="row-item" style="cursor:default;align-items:flex-start">
        <span class="row-tile ${p.status === 'paid' ? 'green' : p.status === 'failed' ? '' : 'amber'}" ${p.status === 'failed' ? 'style="background:var(--danger-bg);color:var(--danger)"' : ''}>${icon('receipt', 17)}</span>
        <span class="row-body">
          <span class="row-title">${esc((p.class && p.class.name) || p.class_name || schedName(p) || '—')}</span>
          <span class="row-sub">${icon('calendar', 12)} ${esc(fmtDate(p.paid_at || p.created_at || schedDue(p)))}</span>
          <span class="row-sub mono">${icon('file', 12)} ${esc(t('scls.receiptNo', { ref: p.reference_number || `#${p.id}` }))}</span>
          <span class="mt2" style="display:inline-block">${statusChip(p.status)}</span>
        </span>
        <span class="row-right">
          <span class="money" style="font-size:15.5px">${esc(rm(p.total_amount))}</span>
          ${parseFloat(p.additional_infaq || 0) > 0 ? `<span class="small green-txt">${icon('sparkle', 11)} ${esc(rm(p.additional_infaq))} infaq</span>` : ''}
        </span>
      </div>`;
  }

  async function load() {
    err = null; items = null; render();
    try {
      const [r, s] = await Promise.all([
        api.list(`${selfPrefix()}/payments`, 'payments', { per_page: 100 }),
        api.list(`${selfPrefix()}/payment-schedules`, 'payment_schedules', { per_page: 100 }).catch(() => ({ items: [] })),
      ]);
      items = r.items;
      scheds = s.items || [];
    } catch (e) { err = e; }
    render();
  }
  load();
}
