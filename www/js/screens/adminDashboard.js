/**
 * Admin dashboard (04._dashboard_admin_utama) — stats, quick actions, recent payments.
 * GET /admin/dashboard
 */
import { t } from "../i18n/index.js";
import { api, ApiError } from "../api.js";
import { store } from "../store.js";
import {
  appbar,
  bottomNav,
  ADMIN_NAV,
  icon,
  esc,
  rm,
  fmtDate,
  statusChip,
  skeletonList,
  errorState,
  emptyState,
  initials,
  bindPTR,
} from "../ui.js";
import { go } from "../router.js";

export function adminDashboardScreen(ctx) {
  let data = null;
  let err = null;

  const render = () => {
    const name =
      store.user && store.user.name ? store.user.name.split(" ")[0] : "Admin";
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="card">${errorState(err, 'data-act="retry-dash"')}</div>`,
      );
      bind();
      return;
    }
    if (!data) {
      ctx.root.innerHTML = shell(
        `<div>${skeletonList(2, true)}${skeletonList(3)}</div>`,
      );
      return;
    }
    const d = data;
    const stats = `
      <div class="section" style="margin-top:16px">
        <div class="section-head">
          <h2 class="section-title">${esc(t("dash.stats"))}</h2>
        </div>
        <div class="stat-grid">
          ${statCard(d.organizations, t("dash.organizations"), t("dash.active", { n: d.active_organizations }), "building")}
          ${statCard(d.classes, t("dash.classes"), t("dash.active", { n: d.active_classes }), "book")}
          ${statCard(d.students, t("dash.students"), "", "cap", true)}
          ${statCard(d.sponsors, t("dash.sponsors"), "", "handshake", true, "green")}
          ${statCard(d.payments.pending, t("dash.pending"), rm(d.financial.outstanding), "clock", true, "amber")}
        </div>
      </div>`;

    const quick = `
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">${esc(t("dash.quick"))}</h2>
          <span class="section-sub">${esc(t("dash.quickSub"))}</span>
        </div>
        <div class="qa-grid">
          ${store.isSuperAdmin ? "" : `<button class="qa-item" data-go="#/organizations/new"><span class="qa-ico">${icon("plus", 17)}</span><span class="qa-t">${esc(t("dash.addOrg"))}</span></button>`}
          <button class="qa-item" data-go="#/classes/new"><span class="qa-ico">${icon("book", 17)}</span><span class="qa-t">${esc(t("dash.createClass"))}</span></button>
          <button class="qa-item" data-go="#/payments"><span class="qa-ico">${icon("card", 17)}</span><span class="qa-t">${esc(t("dash.viewPayment"))}</span></button>
          <button class="qa-item" data-go="#/payments?remind=1"><span class="qa-ico">${icon("bell", 17)}</span><span class="qa-t">${esc(t("dash.reminder"))}</span></button>
        </div>
      </div>`;

    const fin = `
      <div class="card mt4" style="background:var(--grad-navy);color:#fff;box-shadow:none">
        <div class="eyebrow" style="color:rgba(255,255,255,.7)">${esc(t("pay.title"))}</div>
        <div class="stat-grid mt3" style="gap:10px">
          <div><div class="stat-label" style="color:rgba(255,255,255,.65)">${esc(t("dash.collected"))}</div><div class="money" style="font-size:20px">${esc(rm(d.financial.collected))}</div></div>
          <div><div class="stat-label" style="color:rgba(255,255,255,.65)">${esc(t("dash.outstanding"))}</div><div class="money" style="font-size:20px">${esc(rm(d.financial.outstanding))}</div></div>
        </div>
      </div>`;

    const recent = (d.recent_payments || []).length
      ? `
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">${esc(t("dash.recent"))}</h2>
          <button class="section-link" data-go="#/payments">${esc(t("common.seeAll"))}</button>
        </div>
        <div class="list">
          ${d.recent_payments
            .map(
              (p) => `
            <button class="row-item" data-go="#/payments/${p.id}">
              <span class="avatar sm">${esc(initials(p.payer && p.payer.name))}</span>
              <span class="row-body">
                <span class="row-title">${esc(p.payer ? p.payer.name : "—")}</span>
                <span class="row-sub">${icon("book", 13)} ${esc(p.class ? p.class.name : "—")} · ${esc(fmtDate(p.paid_at || p.created_at))}</span>
              </span>
              <span class="row-right">
                <span class="money" style="font-size:15px">${esc(rm(p.total_amount))}</span>
                ${statusChip(p.status)}
              </span>
            </button>`,
            )
            .join("")}
        </div>
      </div>`
      : `<div class="section"><div class="card">${emptyState({ ic: "card", title: t("pay.empty"), text: t("pay.emptySub") })}</div></div>`;

    ctx.root.innerHTML = shell(`
      <div class="pad">
        <div class="hero mt4">
          <div class="hero-row">
            <div>
              <div class="eyebrow">${esc(t("dash.role"))}</div>
              <div class="hero-title">${esc(t("dash.hi", { name }))}</div>
              <div class="hero-sub">${esc(store.user ? formatName(store.user) : "")}</div>
            </div>
            <span class="pill-light">${esc(roleChipLabel())}</span>
          </div>
          ${fin}
        </div>
        ${stats}
        ${quick}
        ${recent}
      </div>`);
    bind();
  };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("app.name"), sub: t("app.system"), bell: true, unread: store.unread, avatar: true })}
      <div class="content with-nav">
        <div class="ptr-host">${body}</div>
      </div>
      ${bottomNav("home", ADMIN_NAV)}
    </div>`;

  const bind = () => {
    const retry = ctx.root.querySelector('[data-act="retry-dash"]');
    if (retry) retry.addEventListener("click", load);
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, load);
  };

  async function load() {
    err = null;
    data = null;
    render();
    try {
      const env = await api.get("/admin/dashboard");
      data = env.data;
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}

function statCard(num, label, sub, ic, small = false, tileCls = "") {
  return `
    <div class="stat">
      <span class="stat-tile ${tileCls}">${icon(ic, 17)}</span>
      <div class="stat-num ${small ? "small" : ""}">${esc(String(num ?? 0))}</div>
      <div class="stat-label">${esc(label)}</div>
      ${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ""}
    </div>`;
}
function formatName(u) {
  return u.email || u.phone || "";
}
function roleChipLabel() {
  const map = { admin: "Pentadbir", student: "Pelajar", sponsor: "Penaja" };
  return map[store.activeRole] || store.activeRole || "";
}
