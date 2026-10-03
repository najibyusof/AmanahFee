/**
 * Notification center (mockup 25) — senarai, tab tapis, tanda dibaca.
 * Endpoints: GET /notifications, POST /notifications/{id}/read|unread,
 *            POST /notifications/read-all, GET /notifications/unread-count
 */
import { t } from '../i18n/index.js';
import { api } from '../api.js';
import { store, refreshUnread } from '../store.js';
import {
  appbar, icon, esc, attr, fmtDateTime, timeAgo, skeletonList, errorState,
  emptyState, bindPTR, toast, bottomNav, ADMIN_NAV, STU_NAV,
} from '../ui.js';

const CATS = {
  all: () => true,
  pay: (n) => String(n.type || '').startsWith('payment.'),
  reminder: (n) => String(n.type || '').includes('reminder'),
};

export function notificationsScreen(ctx) {
  let items = null;
  let err = null;
  let tab = 'all';

  const filtered = () => (items || []).filter(CATS[tab] || CATS.all);
  const unread = () => (items || []).filter((n) => !n.read_at).length;

  const iconFor = (n) => {
    const ty = String(n.type || '');
    if (ty.includes('reminder')) return ['clock', 'amber'];
    if (ty.includes('success') || ty.includes('paid')) return ['checkCircle', 'green'];
    if (ty.includes('pending')) return ['upload', ''];
    if (ty.includes('class')) return ['cap', ''];
    return ['bell', ''];
  };

  const render = () => {
    let body;
    if (err) body = `<div class="card mt3">${errorState(err, 'data-act="retry"')}</div>`;
    else if (items === null) body = skeletonList(5);
    else if (!filtered().length) body = `<div class="card mt3">${emptyState({ ic: 'bell', title: t('notif.empty'), text: t('notif.emptySub') })}</div>`;
    else body = `<div class="list mt3">${filtered().map(row).join('')}</div>`;

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t('notif.title'), sub: items ? t('notif.unreadN', { n: unread() }) : '', back: true, avatar: true })}
        <div class="content with-nav pad">
          ${items && unread() > 0 ? `
            <div class="flex between items-center mt3">
              <span class="chip warn"><i class="dot"></i> ${esc(t('notif.unreadN', { n: unread() }))}</span>
              <button class="btn btn-light btn-sm" id="read-all">${icon('check', 15)} ${esc(t('notif.markAll'))}</button>
            </div>` : ''}

          <div class="tabs mt3" id="notif-tabs">
            <button class="tab ${tab === 'all' ? 'active' : ''}" data-s="all">${esc(t('notif.tabAll'))}<span class="cnt">(${(items || []).length})</span></button>
            <button class="tab ${tab === 'pay' ? 'active' : ''}" data-s="pay">${esc(t('notif.tabPay'))}</button>
            <button class="tab ${tab === 'reminder' ? 'active' : ''}" data-s="reminder">${esc(t('notif.tabReminder'))}</button>
          </div>

          ${body}
          <div class="banner grey mt3">${icon('info', 16)}<div class="bt">${esc(t('notif.channelNote'))} — WhatsApp · Emel · Telegram</div></div>
          <div style="height:16px"></div>
        </div>
        ${bottomNav(store.activeRole === 'admin' ? '' : 'notifications', store.activeRole === 'admin' ? ADMIN_NAV : STU_NAV)}
      </div>`;

    ctx.root.querySelectorAll('#notif-tabs .tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.s; render(); }));
    const ra = ctx.root.querySelector('#read-all');
    if (ra) ra.addEventListener('click', async () => {
      ra.disabled = true;
      try {
        await api.post('/notifications/read-all', {});
        items = (items || []).map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }));
        store.unread = 0;
        refreshUnread();
        toast(t('notif.allRead'), 'ok');
      } catch (e) { toast(e.message || t('err.generic'), 'err'); }
      render();
    });
    ctx.root.querySelectorAll('[data-notif]').forEach((el) => el.addEventListener('click', () => toggle(el.dataset.notif)));
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', load);
    const content = ctx.root.querySelector('.content');
    if (content) bindPTR(null, content, load);
  };

  function row(n) {
    const [ic, tile] = iconFor(n);
    const isUnread = !n.read_at;
    return `
      <button class="row-item" data-notif="${attr(n.id)}" style="${isUnread ? 'background:var(--primary-soft-2)' : ''}">
        <span class="row-tile ${tile}">${icon(ic, 17)}</span>
        <span class="row-body">
          <span class="row-title" style="${isUnread ? 'font-weight:700' : ''}">${esc(n.title || n.type)}</span>
          <span class="row-sub" style="white-space:normal">${esc(n.message || '')}</span>
          <span class="row-sub muted2">${icon('clock', 11)} ${esc(t('notif.ago', { t: timeAgo(n.created_at) }))} · ${esc(fmtDateTime(n.created_at))}</span>
        </span>
        <span class="row-right">${isUnread ? `<span class="unread-dot" title="${attr(t('notif.markRead'))}"></span>` : ''}</span>
      </button>`;
  }

  async function toggle(id) {
    const n = (items || []).find((x) => String(x.id) === String(id));
    if (!n) return;
    try {
      const wasUnread = !n.read_at;
      await api.post(`/notifications/${id}/${wasUnread ? 'read' : 'unread'}`, {});
      n.read_at = wasUnread ? new Date().toISOString() : null;
      store.unread = Math.max(0, store.unread + (wasUnread ? -1 : 1));
      render();
    } catch (e) { toast(e.message || t('err.generic'), 'err'); }
  }

  async function load() {
    err = null; items = null; render();
    try {
      const r = await api.list('/notifications', 'notifications', { per_page: 100 });
      items = r.items;
      refreshUnread();
    } catch (e) { err = e; }
    render();
  }
  load();
}
