/**
 * Super Admin screens (mockups SA-01..10):
 *  saDashboardScreen  — admin counts, quick actions, high-security zone
 *  saAdminsScreen     — senarai pentadbir (aggregated daripada organization admins)
 *  saAdminCreateScreen / saAdminCreatedScreen — cipta akaun + kata laluan sementara
 *  saAdminDetailScreen — butiran + hantar semula / nyahaktif
 *  saSettingsScreen / saProfileScreen / saPasswordScreen
 *
 * Endpoint notes (see ASSUMPTIONS.md): there is no "list all users" endpoint.
 * Super Admin listing = GET /admin/organizations + GET /admin/organizations/{id}/admins
 * (SUPERADMIN bypasses org-assignment checks per admin.md), deduped by user id.
 * Create = POST /auth/register/admin (client generates the temporary password).
 */
import { t } from "../i18n/index.js";
import { api, normalizePhone, formatPhone, ApiError } from "../api.js";
import { config } from "../config.js";
import { store, roleLabel } from "../store.js";
import {
  appbar,
  bottomNav,
  SA_NAV,
  icon,
  esc,
  attr,
  fmtDate,
  timeAgo,
  statusChip,
  field,
  formValues,
  showErrors,
  clearErrors,
  setLoading,
  toast,
  skeletonList,
  errorState,
  emptyState,
  bindPTR,
  confirmDialog,
  banner,
  avatar,
  copyText,
  debounce,
  initials,
} from "../ui.js";
import { go, resetHistory } from "../router.js";
import { passwordScreen } from "./settings.js";

/* ---------------- shared data helpers ---------------- */
let adminCache = null;

async function loadAdmins({ fresh = false } = {}) {
  if (adminCache && !fresh) return adminCache;
  const orgs = await api
    .list("/admin/organizations", "organizations", { per_page: 100 })
    .then((r) => r.items)
    .catch(() => []);
  const perOrg = await Promise.all(
    orgs.map((o) =>
      api
        .get(`/admin/organizations/${o.id}/admins`)
        .then((e) =>
          (Array.isArray(e.data) ? e.data : []).map((a) => ({
            ...a,
            _org: { id: o.id, name: o.name },
          })),
        )
        .catch(() => []),
    ),
  );
  const map = new Map();
  for (const a of perOrg.flat()) {
    if (!map.has(a.id)) map.set(a.id, { ...a, orgs: [], is_primary: false });
    const row = map.get(a.id);
    row.orgs.push(a._org);
    row.is_primary = row.is_primary || !!a.is_primary;
    if (a.status === "active") row.status = "active";
  }
  adminCache = { orgs, admins: [...map.values()] };
  return adminCache;
}

function genTempPassword() {
  const words = ["Amanah", "Tahfiz", "Hikmah", "Madrasah", "Barakah"];
  const w = words[Math.floor(Math.random() * words.length)];
  const r = Math.random().toString(36).slice(2, 6);
  const n = String(Math.floor(Math.random() * 90) + 10);
  return `${w}${r}${n}`;
}

/* ---------------- SA-02: dashboard ---------------- */
export function saDashboardScreen(ctx) {
  let data = null;
  let err = null;

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("sa.title"), bell: true, unread: store.unread, avatar: true })}
      <div class="content with-nav">${body}</div>
      ${bottomNav("home", SA_NAV)}
    </div>`;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="pad"><div class="card mt4">${errorState(err, 'data-act="retry"')}</div></div>`,
      );
      bind();
      return;
    }
    if (!data) {
      ctx.root.innerHTML = shell(
        `<div class="pad"><div class="mt4">${skeletonList(2, true)}${skeletonList(3)}</div></div>`,
      );
      return;
    }

    const totalAdmins = data.total_admins ?? 0;
    const activeAdmins = data.active_admins ?? 0;
    const pendingFirstLoginAdmins = data.pending_first_login_admins ?? 0;
    const verifiedAdminPercentage = data.verified_admin_percentage ?? 0;
    const totalOrganizations = data.total_organizations ?? 0;

    ctx.root.innerHTML = shell(`
      <div class="pad">
        <div class="hero mt4">
          <div class="hero-row">
            <div>
              <div class="eyebrow">${esc(t("sa.control"))}</div>
              <div class="hero-title">${esc(t("sa.hello"))}</div>
              <div class="hero-sub">${esc(t("sa.helloSub"))}</div>
            </div>
            <span class="pill-light">${icon("shieldCheck", 14)} SA</span>
          </div>

          <div class="card mt3" style="background:rgba(255,255,255,.1);box-shadow:none;color:#fff">
            <div class="flex between items-center">
              <div>
                <div class="eyebrow" style="color:rgba(255,255,255,.7)">${esc(t("sa.adminCount"))}</div>
                <div class="num-xl" style="color:#fff">${totalAdmins}</div>
                <div class="small" style="color:rgba(255,255,255,.75)">${esc(t("sa.activeAdmins", { n: activeAdmins }))}</div>
              </div>
              <span class="chip" style="background:rgba(255,255,255,.16);color:#fff">${esc(t("sa.verifiedAll", { p: verifiedAdminPercentage }))}</span>
            </div>
          </div>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title">${esc(t("dash.stats"))}</h2>
            <span class="section-sub">${esc(t("sa.adminCountTag"))}</span>
          </div>
          <div class="stat-grid">
            <div class="stat"><span class="stat-tile">${icon("users", 17)}</span><div class="stat-num">${totalAdmins}</div><div class="stat-label">${esc(t("sa.adminCount"))}</div></div>
            <div class="stat"><span class="stat-tile green">${icon("checkCircle", 17)}</span><div class="stat-num">${activeAdmins}</div><div class="stat-label">${esc(t("st.active"))}</div></div>
            <div class="stat"><span class="stat-tile amber">${icon("clock", 17)}</span><div class="stat-num">${pendingFirstLoginAdmins}</div><div class="stat-label">${esc(t("sa.manage.pendingLogin"))}</div></div>
            <div class="stat"><span class="stat-tile">${icon("building", 17)}</span><div class="stat-num">${totalOrganizations}</div><div class="stat-label">${esc(t("dash.organizations"))}</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title">${esc(t("sa.quick"))}</h2>
            <span class="section-sub">${esc(t("sa.quickSub"))}</span>
          </div>
          <div class="qa-grid">
            <button class="qa-item" data-go="#/sa/admins/new"><span class="qa-ico">${icon("userPlus", 17)}</span><span class="qa-t">${esc(t("sa.createAdmin"))}</span></button>
            <button class="qa-item" data-go="#/sa/admins"><span class="qa-ico">${icon("users", 17)}</span><span class="qa-t">${esc(t("sa.manageAdmins"))}</span></button>
            <button class="qa-item" data-go="#/organizations"><span class="qa-ico">${icon("building", 17)}</span><span class="qa-t">${esc(t("dash.organizations"))}</span></button>
            <button class="qa-item" data-go="#/payments"><span class="qa-ico">${icon("card", 17)}</span><span class="qa-t">${esc(t("dash.viewPayment"))}</span></button>
          </div>
        </div>

        <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
          <div class="flex gap2 items-center">${icon("shieldCheck", 16)}<span class="strong small">${esc(t("sa.highZone"))}</span></div>
          <p class="small muted" style="margin:8px 0 0">${esc(t("sa.highZoneSub"))}</p>
        </div>
        <div style="height:16px"></div>
      </div>`);
    bind();
  };

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, load);
  }

  async function load() {
    err = null;
    data = null;
    render();
    try {
      const response = await api.get("/superadmin/dashboard", {
        page: 1,
        per_page: 20,
      });
      data = response.data || {};
    } catch (e) {
      err = e;
    }
    render();
  }
  load();
}

/* ---------------- SA-03: manage admins ---------------- */
export function saAdminsScreen(ctx) {
  let data = null;
  let err = null;
  let q = "";
  let tab = "all";

  const counts = (list) => ({
    all: list.length,
    active: list.filter((a) => a.status === "active").length,
    pending: list.filter((a) => !a.last_login_at).length,
  });
  const filtered = () => {
    let list = (data && data.admins) || [];
    if (tab === "active") list = list.filter((a) => a.status === "active");
    if (tab === "pending") list = list.filter((a) => !a.last_login_at);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((a) =>
        `${a.name} ${a.phone} ${a.email || ""}`.toLowerCase().includes(s),
      );
    }
    return list;
  };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("sa.manage.title"), sub: data ? t("sa.manage.sub", { n: data.admins.length }) : "", back: true, bell: true, unread: store.unread, avatar: true })}
      <div class="content with-nav pad">${body}</div>
      ${bottomNav("admins", SA_NAV)}
    </div>`;

  const render = () => {
    let body;
    if (err)
      body = `<div class="card mt3">${errorState(err, 'data-act="retry"')}</div>`;
    else if (!data) body = skeletonList(5);
    else {
      const c = counts(data.admins);
      body = `
        <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
          <div class="flex between items-center">
            <span class="strong small">${esc(t("sa.manage.head"))}</span>
            <span class="chip ok"><i class="dot"></i> ${esc(t("sa.manage.active", { n: c.active }))}</span>
          </div>
        </div>

        <div class="searchbar mt3">
          ${icon("search", 18)}
          <input id="sa-q" type="search" placeholder="${attr(t("sa.manage.search"))}" value="${attr(q)}">
        </div>

        <div class="tabs mt3" id="sa-tabs">
          <button class="tab ${tab === "all" ? "active" : ""}" data-s="all">${esc(t("sa.manage.tabAll"))}<span class="cnt">(${c.all})</span></button>
          <button class="tab ${tab === "active" ? "active" : ""}" data-s="active">${esc(t("sa.manage.tabActive"))}<span class="cnt">(${c.active})</span></button>
          <button class="tab ${tab === "pending" ? "active" : ""}" data-s="pending">${esc(t("sa.manage.tabPending"))}<span class="cnt">(${c.pending})</span></button>
        </div>

        ${
          filtered().length
            ? `<div class="list mt3">${filtered().map(adminRow).join("")}</div>`
            : `<div class="card mt3">${emptyState({ ic: "users", title: t("sa.manage.empty") })}</div>`
        }
        <div style="height:16px"></div>`;
    }

    ctx.root.innerHTML = shell(`
      <div class="mt3">
        <button class="btn btn-primary btn-block" data-go="#/sa/admins/new">${icon("userPlus", 16)} ${esc(t("sa.manage.create"))}</button>
      </div>
      ${body}`);

    const s = ctx.root.querySelector("#sa-q");
    if (s)
      s.addEventListener(
        "input",
        debounce(() => {
          q = s.value.trim();
          render();
        }, 250),
      );
    ctx.root.querySelectorAll("#sa-tabs .tab").forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.s;
        render();
      }),
    );
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, load);
  };

  function adminRow(a) {
    const pending = !a.last_login_at;
    return `
      <button class="row-item" data-go="#/sa/admins/${a.id}" style="align-items:flex-start">
        <span class="avatar sm">${esc(initials(a.name))}</span>
        <span class="row-body">
          <span class="row-title">${esc(a.name)}</span>
          <span class="row-sub">${icon("phone", 12)} ${esc(formatPhone(a.phone))}</span>
          ${a.email ? `<span class="row-sub">${icon("mail", 12)} ${esc(a.email)}</span>` : ""}
          <span class="row-sub">${icon("building", 12)} ${esc(a.orgs.map((o) => o.name).join(", ") || "—")}</span>
          <span class="mt2" style="display:inline-block">
            ${pending ? `<span class="chip warn"><i class="dot"></i> ${esc(t("sa.manage.pendingLogin"))}</span>` : statusChip(a.status || "active")}
            ${a.is_primary ? `<span class="chip navy" style="margin-left:6px">${esc(t("sa.detail.primary"))}</span>` : ""}
          </span>
        </span>
        <span class="row-right">
          <span class="small muted2">${pending ? esc(t("sa.manage.never")) : esc(t("sa.manage.lastLogin", { when: timeAgo(a.last_login_at) }))}</span>
          <span class="small blue-txt bold flex items-center gap1" style="margin-top:6px">${esc(t("common.view"))} ${icon("chevronR", 13)}</span>
        </span>
      </button>`;
  }

  async function load() {
    err = null;
    data = null;
    render();
    try {
      data = await loadAdmins({ fresh: true });
    } catch (e) {
      err = e;
    }
    render();
  }
  load();
}

/* ---------------- SA-04: create admin ---------------- */
export function saAdminCreateScreen(ctx) {
  let temp = genTempPassword();
  let creating = false;

  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: t("sa.create.title"), back: true, avatar: true })}
      <div class="content with-foot pad">
        <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
          <div class="flex between items-center">
            <span class="strong small">${esc(t("sa.create.head"))}</span>
            <span class="chip navy">${icon("lock", 11)} ${esc(t("sa.loginBadge"))}</span>
          </div>
          <p class="small muted" style="margin:8px 0 0">${esc(t("sa.create.sub"))}</p>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("userPlus", 15)} ${esc(t("sa.create.name"))}</h2>
            <span class="section-sub">URS · Admin</span>
          </div>
          <div class="card" data-form>
            <form id="sa-form" novalidate>
              ${field("name", { label: t("sa.create.name"), req: true, placeholder: t("sa.create.namePh"), hint: t("sa.create.nameNote"), maxlength: 150 })}
              ${field("phone", { label: t("sa.create.phone"), req: true, placeholder: "012 345 6789", inputmode: "tel", hint: t("sa.create.phoneNote") })}
              ${field("email", { label: t("sa.create.email"), type: "email", placeholder: t("sa.create.emailPh"), hint: t("sa.create.emailNote"), hintRight: t("common.optional") })}
            </form>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("swap", 15)} ${esc(t("sa.create.role"))}</h2>
            <span class="chip muted">${esc(t("sa.create.roleLocked"))}</span>
          </div>
          <div class="card">
            <div class="flex between items-center">
              <div class="flex gap2 items-center"><span class="row-tile navy">${icon("grid", 16)}</span><span class="strong small">${esc(t("sa.create.roleLine"))}</span></div>
              <span class="chip info">${icon("lock", 11)} ${esc(t("sa.create.roleLock"))}</span>
            </div>
            <p class="small muted mt2" style="margin-bottom:0">${esc(t("sa.create.roleNote"))}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("key", 15)} ${esc(t("sa.created.temp"))}</h2>
            <button class="btn btn-light btn-sm" id="regen">${icon("refresh", 13)} ${esc(t("common.refresh"))}</button>
          </div>
          <div class="card">
            <div class="file-chip">
              <span class="fc-ico">${icon("key", 17)}</span>
              <span class="grow"><span class="fc-name mono" id="temp-val">${esc(temp)}</span><span class="fc-sub">${esc(t("sa.created.tempTag"))}</span></span>
              <button class="icon-btn" id="copy-temp">${icon("copy", 16)}</button>
            </div>
            <div class="kv mt2">
              <div class="kv-row"><span class="kv-k">${icon("shieldCheck", 13)} ${esc(t("sa.create.sec"))}</span><span class="kv-v small">${esc(t("sa.create.secText"))}</span></div>
              <div class="kv-row"><span class="kv-k">${icon("clock", 13)} ${esc(t("sa.create.immediate"))}</span><span class="kv-v small">${esc(t("sa.create.immediateText"))}</span></div>
            </div>
          </div>
        </div>

        <div class="mt3">${banner("grey", esc(t("sa.create.auditNote")), "info")}</div>
        <div style="height:12px"></div>

        <div class="foot">
          <button class="btn btn-primary btn-block" id="create-btn">${icon("userPlus", 16)} ${esc(t("sa.create.submit"))}</button>
          <button class="center-link" data-act="back">${esc(t("common.cancel"))}</button>
        </div>
      </div>
    </div>`;

  const regen = ctx.root.querySelector("#regen");
  if (regen)
    regen.addEventListener("click", () => {
      temp = genTempPassword();
      ctx.root.querySelector("#temp-val").textContent = temp;
    });
  const cp = ctx.root.querySelector("#copy-temp");
  if (cp) cp.addEventListener("click", () => copyText(temp));

  const btn = ctx.root.querySelector("#create-btn");
  if (btn)
    btn.addEventListener("click", async () => {
      if (creating) return;
      const v = formValues(ctx.root.querySelector("#sa-form"));
      clearErrors(ctx.root);
      const errs = {};
      if (!v.name || !v.name.trim()) errs.name = [t("v.required")];
      const phone = normalizePhone(v.phone);
      if (!v.phone) errs.phone = [t("v.required")];
      else if (!/^\+601\d{8,9}$/.test(phone)) errs.phone = [t("v.phone")];
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
        errs.email = [t("v.email")];
      if (Object.keys(errs).length) {
        showErrors(ctx.root, errs);
        return;
      }

      creating = true;
      setLoading(btn, true);
      try {
        const env = await api.post("/auth/register/admin", {
          name: v.name.trim(),
          phone,
          email: v.email || undefined,
          password: temp,
          password_confirmation: temp,
          device_name: config.DEVICE_NAME,
        });
        created = {
          user: (env.data && env.data.user) || null,
          temp,
          name: v.name.trim(),
          phone,
          email: v.email || "",
        };
        adminCache = null;
        creating = false;
        setLoading(btn, false);
        go("#/sa/admins/created", { replace: true });
      } catch (e) {
        creating = false;
        setLoading(btn, false);
        showErrors(ctx.root, e.errors || {}, e.message || t("err.generic"));
      }
    });
}

/* ---------------- SA-05: created ---------------- */
let created = null;

export function saAdminCreatedScreen(ctx) {
  if (!created) {
    go("#/sa/admins", { replace: true });
    return;
  }
  const rec = created;

  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: t("sa.created.title"), back: false, avatar: false })}
      <div class="content pad">
        <div class="center mt6">
          <div class="success-ico">${icon("checkCircle", 38)}</div>
          <div class="h2 mt3">${esc(t("sa.created.head"))}</div>
          <p class="small muted mt2" style="margin-bottom:0">${esc(t("sa.created.sub"))}</p>
        </div>

        <div class="card mt4">
          <div class="flex gap3 items-center">
            ${avatar(rec.name, "sm")}
            <span class="grow">
              <span class="row-title" style="display:block">${esc(rec.name)}</span>
              <span class="row-sub">${esc(formatPhone(rec.phone))}</span>
              ${rec.email ? `<span class="row-sub">${icon("mail", 12)} ${esc(rec.email)}</span>` : ""}
            </span>
            <span class="chip ok"><i class="dot"></i> ${esc(t("st.active"))}</span>
          </div>

          <div class="eyebrow mt3">${esc(t("sa.created.temp"))}</div>
          <div class="file-chip mt2">
            <span class="fc-ico">${icon("key", 17)}</span>
            <span class="grow"><span class="fc-name mono">${esc(rec.temp)}</span><span class="fc-sub">${esc(t("sa.created.tempTag"))}</span></span>
            <button class="btn btn-light btn-sm" id="copy-temp">${icon("copy", 13)} ${esc(t("sa.created.copy"))}</button>
          </div>
          <p class="small muted2 mt2" style="margin-bottom:0">${esc(t("sa.created.copyNote"))}</p>
        </div>

        <div class="mt3">${banner("warn", esc(t("sa.created.warnText")), "alert")}</div>
        <div class="mt2">${banner("grey", esc(t("sa.created.notify")), "send")}</div>

        <div class="mt4">
          <button class="btn btn-primary btn-block" id="back-list">${icon("users", 16)} ${esc(t("sa.created.back"))}</button>
        </div>
        <div style="height:20px"></div>
      </div>
    </div>`;

  const cp = ctx.root.querySelector("#copy-temp");
  if (cp) cp.addEventListener("click", () => copyText(rec.temp));
  const back = ctx.root.querySelector("#back-list");
  if (back)
    back.addEventListener("click", () => {
      created = null;
      resetHistory("#/sa/admins");
      go("#/sa/admins", { replace: true });
    });
}

/* ---------------- SA-06: admin detail ---------------- */
export function saAdminDetailScreen(ctx) {
  const id = Number(ctx.params.id);
  let admin = null;
  let err = null;

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("sa.detail.title"), back: true, avatar: true })}
      <div class="content pad">${body}</div>
    </div>`;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`,
      );
      bind();
      return;
    }
    if (!admin) {
      ctx.root.innerHTML = shell(skeletonList(3, true));
      return;
    }
    const a = admin;
    const isActive = a.status === "active";

    ctx.root.innerHTML = shell(`
      <div class="card mt3 center">
        <div style="display:flex;justify-content:center">${avatar(a.name, "")}</div>
        <div class="strong mt2" style="font-size:17px">${esc(a.name)}</div>
        <div class="mt2">${isActive ? statusChip("active") : statusChip("inactive")} ${a.is_primary ? `<span class="chip navy">${esc(t("sa.detail.primary"))}</span>` : ""}</div>
      </div>

      <div class="section" style="margin-top:16px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("user", 15)} ${esc(t("sa.detail.info"))}</h2>
          <span class="chip ok">${icon("shieldCheck", 11)} ${esc(t("sa.detail.sah"))}</span>
        </div>
        <div class="card">
          <div class="kv">
            <div class="kv-row"><span class="kv-k">${esc(t("sa.detail.roleSystem"))}</span><span class="kv-v">${esc(t("sa.create.roleLine"))}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t("sa.detail.phone"))}</span><span class="kv-v mono">${esc(formatPhone(a.phone))}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t("sa.detail.email"))}</span><span class="kv-v">${esc(a.email || "—")}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t("sa.detail.account"))}</span><span class="kv-v">${esc(t("sa.detail.statusNow"))}: <strong>${esc(isActive ? t("st.active") : t("st.inactive"))}</strong></span></div>
            <div class="kv-row"><span class="kv-k">${icon("building", 13)} ${esc(t("prof.orgs"))}</span><span class="kv-v small">${esc(a.orgs.map((o) => o.name).join(", ") || "—")}</span></div>
            <div class="kv-row"><span class="kv-k">${icon("clock", 13)} ${esc(t("sa.manage.lastLogin", { when: "" }).replace(":", ""))}</span><span class="kv-v small">${a.last_login_at ? esc(fmtDate(a.last_login_at)) : esc(t("sa.manage.never"))}</span></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("sliders", 15)} ${esc(t("sa.detail.manage"))}</h2>
          <span class="section-sub">${esc(t("sa.detail.manageSub"))}</span>
        </div>
        <div class="list">
          <button class="row-item" id="resend">
            <span class="row-tile">${icon("send", 17)}</span>
            <span class="row-body">
              <span class="row-title">${esc(t("sa.detail.resend"))}</span>
              <span class="row-sub">${esc(t("sa.detail.resendNote"))}</span>
            </span>
            <span class="row-right">${icon("chevronR", 16)}</span>
          </button>
          <button class="row-item" id="toggle-status">
            <span class="row-tile" style="background:var(--danger-bg);color:var(--danger)">${icon(isActive ? "x" : "check", 17)}</span>
            <span class="row-body">
              <span class="row-title" style="color:var(--danger)">${esc(isActive ? t("sa.detail.deactivate") : t("sa.detail.activate"))}</span>
              <span class="row-sub">${esc(isActive ? t("sa.detail.deactivateConfirm", { name: a.name }) : t("sa.detail.activateConfirm", { name: a.name }))}</span>
            </span>
            <span class="row-right">${icon("chevronR", 16)}</span>
          </button>
        </div>
        <div class="mt3">${banner("grey", esc(t("sa.highZoneSub")), "shieldCheck")}</div>
      </div>
      <div style="height:20px"></div>`);

    bind();
  };

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);

    const rs = ctx.root.querySelector("#resend");
    if (rs)
      rs.addEventListener("click", async () => {
        if (!admin || !admin.email) {
          toast(t("sa.create.emailNote"), "err");
          return;
        }
        setLoading(rs, true);
        try {
          await api.post("/auth/forgot-password", { email: admin.email });
          setLoading(rs, false);
          toast(t("sa.detail.resendNote"), "ok");
        } catch (e) {
          setLoading(rs, false);
          toast(e.message || t("err.generic"), "err");
        }
      });

    const tg = ctx.root.querySelector("#toggle-status");
    if (tg)
      tg.addEventListener("click", async () => {
        if (!admin) return;
        const deactivate = admin.status === "active";
        const yes = await confirmDialog({
          title: deactivate
            ? t("sa.detail.deactivate")
            : t("sa.detail.activate"),
          text: deactivate
            ? t("sa.detail.deactivateConfirm", { name: admin.name })
            : t("sa.detail.activateConfirm", { name: admin.name }),
          ok: deactivate ? t("sa.detail.deactivate") : t("sa.detail.activate"),
          danger: deactivate,
        });
        if (!yes) return;
        // The API has no account-level toggle: deactivate/re-activate the admin's
        // membership in EVERY organization they belong to, so the merged status
        // (active wins across orgs) actually reflects the account state.
        if (!admin.orgs || !admin.orgs.length) {
          toast(t("err.notfound"), "err");
          return;
        }
        setLoading(tg, true);
        try {
          await Promise.all(
            admin.orgs.map((org) =>
              api.put(`/admin/organizations/${org.id}/admins/${admin.id}`, {
                status: deactivate ? "inactive" : "active",
              }),
            ),
          );
          setLoading(tg, false);
          toast(
            deactivate ? t("sa.detail.deactivated") : t("sa.detail.activated"),
            "ok",
          );
          adminCache = null;
          load();
        } catch (e) {
          setLoading(tg, false);
          toast(e.message || t("err.generic"), "err");
        }
      });
  }

  async function load() {
    err = null;
    admin = null;
    render();
    try {
      const data = await loadAdmins({ fresh: !adminCache });
      admin = data.admins.find((a) => a.id === id) || null;
      if (!admin) err = new ApiError(404, t("err.notfound"));
    } catch (e) {
      err = e;
    }
    render();
  }
  load();
}

/* ---------------- SA-07: settings ---------------- */
export function saSettingsScreen(ctx) {
  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: t("sa.settings.title"), back: false, bell: true, unread: store.unread, avatar: false })}
      <div class="content with-nav pad">
        <div class="card mt3">
          <div class="flex gap3 items-center">
            ${avatar(store.user && store.user.name, "")}
            <span class="grow">
              <span class="row-title" style="display:block">${esc((store.user && store.user.name) || "—")}</span>
              <span class="row-sub">${esc(formatPhone(store.user && store.user.phone))}</span>
              ${store.user && store.user.email ? `<span class="row-sub">${icon("mail", 12)} ${esc(store.user.email)}</span>` : ""}
            </span>
            <span class="chip navy">${icon("shieldCheck", 11)} ${esc(t("sa.profile.tag"))}</span>
          </div>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("lock", 15)} ${esc(t("sa.settings.account"))}</h2>
          </div>
          <div class="list">
            <button class="row-item" data-go="#/sa/profile">
              <span class="row-tile">${icon("user", 17)}</span>
              <span class="row-body"><span class="row-title">${esc(t("sa.settings.profile"))}</span><span class="row-sub">${esc(t("sa.settings.profileSub"))}</span></span>
              <span class="row-right">${icon("chevronR", 16)}</span>
            </button>
            <button class="row-item" data-go="#/sa/password">
              <span class="row-tile">${icon("key", 17)}</span>
              <span class="row-body"><span class="row-title">${esc(t("sa.settings.password"))}</span><span class="row-sub">${esc(t("sa.settings.passwordSub"))}</span></span>
              <span class="row-right">${icon("chevronR", 16)}</span>
            </button>
            <button class="row-item" data-act="logout">
              <span class="row-tile" style="background:var(--danger-bg);color:var(--danger)">${icon("logout", 17)}</span>
              <span class="row-body"><span class="row-title" style="color:var(--danger)">${esc(t("sa.settings.logout"))}</span><span class="row-sub">${esc(t("sa.settings.logoutSub"))}</span></span>
              <span class="row-right">${icon("chevronR", 16)}</span>
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-head"><h2 class="section-title" style="font-size:15px">${icon("info", 15)} ${esc(t("set.about"))}</h2></div>
          <div class="card">
            <div class="kv">
              <div class="kv-row"><span class="kv-k">${icon("shieldCheck", 13)} ${esc(t("app.name"))}</span><span class="kv-v small">${esc(t("sa.settings.service", { code: "MY-01" }))}</span></div>
              <div class="kv-row"><span class="kv-k">${icon("grid", 13)} ${esc(t("app.version", { v: "" }).replace(":", ""))}</span><span class="kv-v small">${esc(t("sa.settings.build", { v: config.APP_VERSION }))}</span></div>
            </div>
            <p class="small muted2 mt2" style="margin-bottom:0">${esc(t("set.complianceSub"))}</p>
          </div>
        </div>
        <div style="height:16px"></div>
      </div>
      ${bottomNav("settings", SA_NAV)}
    </div>`;
}

/* ---------------- SA-08: profile ---------------- */
export function saProfileScreen(ctx) {
  const u = store.user || {};
  let saving = false;

  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: t("sa.profile.title"), back: true, avatar: false })}
      <div class="content with-foot pad">
        <div class="card mt3 center">
          <div style="display:flex;justify-content:center">${avatar(u.name, "")}</div>
          <div class="strong mt2">${esc(u.name || "—")}</div>
          <div class="small muted">${esc(t("sa.profile.sub", { id: u.id || "—" }))}</div>
          <div class="mt2"><span class="chip navy">${icon("shieldCheck", 11)} ${esc(t("sa.profile.tag"))}</span></div>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("user", 15)} ${esc(t("sa.profile.personal"))}</h2>
            <span class="chip info">${esc(t("prof.fullNameReq"))}</span>
          </div>
          <div class="card" data-form>
            <form id="sa-prof-form" novalidate>
              ${field("name", { label: t("prof.fullName"), req: true, value: u.name || "", hint: t("prof.fullNameNote"), maxlength: 150 })}
              ${field("email", { label: t("prof.email"), type: "email", value: u.email || "", hint: t("prof.emailNote"), hintRight: t("prof.emailTag") })}
              ${field("phone", { label: t("prof.phone"), value: formatPhone(u.phone), disabled: true, hint: t("prof.phoneNote"), hintRight: t("prof.phoneTag") })}
              ${field("ic", { label: t("sa.profile.ic"), value: u.system_id || u.student_id || "SA-0000", disabled: true })}
            </form>
          </div>
        </div>

        <div class="mt3">${banner("grey", esc(t("prof.dataNote")), "shieldCheck")}</div>
        <div style="height:12px"></div>

        <div class="foot">
          <button class="btn btn-primary btn-block" id="save-btn">${icon("check", 16)} ${esc(t("prof.save"))}</button>
        </div>
      </div>
    </div>`;

  const btn = ctx.root.querySelector("#save-btn");
  if (btn)
    btn.addEventListener("click", async () => {
      if (saving) return;
      const v = formValues(ctx.root.querySelector("#sa-prof-form"));
      clearErrors(ctx.root);
      if (!v.name || !v.name.trim()) {
        showErrors(ctx.root, { name: [t("v.required")] });
        return;
      }
      saving = true;
      setLoading(btn, true);
      try {
        await api.put("/auth/me", {
          name: v.name.trim(),
          email: v.email || null,
        });
        store.user = {
          ...store.user,
          name: v.name.trim(),
          email: v.email || null,
        };
        store.emit();
        saving = false;
        setLoading(btn, false);
        toast(t("prof.saved"), "ok");
        ctx.back();
      } catch (e) {
        saving = false;
        setLoading(btn, false);
        if (
          e instanceof ApiError &&
          (e.status === 404 || e.status === 405 || e.status === 403)
        ) {
          store.user = {
            ...store.user,
            name: v.name.trim(),
            email: v.email || null,
          };
          store.emit();
          toast(t("prof.noEndpoint"), "");
          ctx.back();
        } else {
          showErrors(ctx.root, e.errors || {}, e.message || t("err.generic"));
        }
      }
    });
}

/* ---------------- SA-09: change password ---------------- */
export const saPasswordScreen = passwordScreen;
