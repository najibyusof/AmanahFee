/**
 * Shared settings screens (mockups 21–24):
 *  settingsScreen — session, akaun & keselamatan, komunikasi, about, logout
 *  profileScreen  — kemaskini profil (PUT /auth/me, best-effort)
 *  passwordScreen — tukar kata laluan (POST /auth/change-password)
 *  rolesScreen    — tukar peranan (GET /auth/roles + PUT /auth/current-role, BR-001..003)
 */
import { t } from "../i18n/index.js";
import { api, ApiError, formatPhone, normalizePhone } from "../api.js";
import { config } from "../config.js";
import {
  store,
  switchRole,
  roleHome,
  isMultiRole,
  roleLabel,
  logout,
} from "../store.js";
import { storage } from "../storage.js";
import {
  appbar,
  icon,
  esc,
  attr,
  field,
  formValues,
  showErrors,
  clearErrors,
  setLoading,
  toast,
  skeletonList,
  errorState,
  banner,
  avatar,
  bottomNav,
  ADMIN_NAV,
  STU_NAV,
  confirmDialog,
  pickImage,
  isValidImage,
} from "../ui.js";
import { go, resetHistory } from "../router.js";

/* ---------------- 21: Tetapan Utama ---------------- */
export function settingsScreen(ctx) {
  const isSA = store.activeRole === "admin" && store.isSuperAdmin;
  const roles = store.roles || [];
  const roleNames = roles.map((r) => roleLabel(r.role)).join(" · ");
  const storageMode = "Android Keystore (SecureStorage)";

  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: t("set.title"), back: true, bell: true, unread: store.unread, avatar: false })}
      <div class="content with-nav pad">
        <div class="card mt3">
          <div class="flex gap3 items-center">
            ${avatar(store.user && store.user.name, "")}
            <span class="grow">
              <span class="row-title" style="display:block">${esc((store.user && store.user.name) || "—")}</span>
              <span class="row-sub">${icon("phone", 12)} ${esc(formatPhone(store.user && store.user.phone))}</span>
              ${store.user && store.user.email ? `<span class="row-sub">${icon("mail", 12)} ${esc(store.user.email)}</span>` : ""}
            </span>
            <span class="chip navy">${esc(roleLabel(store.activeRole))}${isSA ? " · SA" : ""}</span>
          </div>
          <div class="kv mt3">
            <div class="kv-row">
              <span class="kv-k">${icon("swap", 13)} ${esc(t("set.dualAccess"))}</span>
              <span class="kv-v">${esc(t("set.dualN", { n: roles.length, roles: roleNames || roleLabel(store.activeRole) }))}</span>
            </div>
            <div class="kv-row">
              <span class="kv-k">${icon("lock", 13)} ${esc(t("set.storageMode", { mode: "" }).replace(":", ""))}</span>
              <span class="kv-v small">${esc(storageMode)}</span>
            </div>
          </div>
          ${isMultiRole() ? `<button class="btn btn-soft btn-block mt3" data-go="#/settings/roles">${icon("swap", 16)} ${esc(t("set.switch"))}</button>` : ""}
        </div>

        ${config.MOCK ? `<div class="mt3">${banner("grey", esc(t("set.mockOn")), "info")}</div>` : ""}

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("lock", 15)} ${esc(t("set.account"))}</h2>
          </div>
          <div class="list">
            ${row("user", t("set.profile"), t("set.profileSub"), "#/settings/profile")}
            ${row("key", t("set.password"), t("set.passwordSub"), isSA ? "#/sa/password" : "#/settings/password")}
            ${isMultiRole() ? row("swap", t("set.switchRole"), t("set.switchRoleSub", { a: roleLabel(roles[0] && roles[0].role), b: roleLabel(roles[1] && roles[1].role) }), "#/settings/roles") : ""}
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("message", 15)} ${esc(t("set.comms"))}</h2>
          </div>
          <div class="list">
            ${row("bell", t("set.notifCenter"), store.unread ? t("notif.unreadN", { n: store.unread }) : t("set.notifCenterSub"), "#/notifications")}
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("info", 15)} ${esc(t("set.about"))}</h2>
          </div>
          <div class="card">
            <div class="kv">
              <div class="kv-row"><span class="kv-k">${esc(t("app.name"))}</span><span class="kv-v">${esc(t("set.aboutSub", { app: config.APP_NAME, v: config.APP_VERSION }))}</span></div>
              <div class="kv-row"><span class="kv-k">${icon("shieldCheck", 13)} ${esc(t("set.compliance"))}</span><span class="kv-v small">${esc(t("set.complianceSub"))}</span></div>
              <div class="kv-row"><span class="kv-k">${esc(t("set.language"))}</span><span class="kv-v">Bahasa Melayu</span></div>
            </div>
            <p class="small muted2 mt2" style="margin-bottom:0">${esc(t("set.version", { app: config.APP_NAME, v: config.APP_VERSION }))}</p>
          </div>
        </div>

        <div class="danger-zone mt4">
          <button class="btn btn-outline btn-block" data-act="logout" style="color:var(--danger);border-color:var(--danger)">
            ${icon("logout", 16)} ${esc(t("set.logout"))}
          </button>
          <p class="small muted2 center mt2" style="margin-bottom:0">${esc(t("set.logoutConfirm"))}</p>
        </div>
        <div style="height:16px"></div>
      </div>
      ${bottomNav("", store.activeRole === "admin" ? ADMIN_NAV : STU_NAV)}
    </div>`;

  function row(ic, title, sub, href) {
    return `
      <button class="row-item" data-go="${attr(href)}">
        <span class="row-tile">${icon(ic, 17)}</span>
        <span class="row-body">
          <span class="row-title">${esc(title)}</span>
          <span class="row-sub">${esc(sub)}</span>
        </span>
        <span class="row-right">${icon("chevronR", 16)}</span>
      </button>`;
  }
}

/* ---------------- 22: Kemaskini Profil ---------------- */
export function profileScreen(ctx) {
  let orgs = [];
  let saving = false;
  const u = store.user || {};

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("prof.title"), back: true, avatar: false })}
      <div class="content with-foot pad">${body}</div>
    </div>`;

  const render = () => {
    ctx.root.innerHTML = shell(`
      <div class="card mt3 center">
        <div style="display:flex;justify-content:center">${avatar(u.name, "")}</div>
        <div class="strong mt2">${esc(u.name || "—")}</div>
        <div class="small muted">${esc(roleLabel(store.activeRole))} · ${esc(formatPhone(u.phone))}</div>
        <p class="small muted2 mt2" style="margin-bottom:0">${esc(t("prof.photoHint"))}</p>
      </div>

      <div class="section" style="margin-top:16px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("user", 15)} ${esc(t("prof.fullName"))}</h2>
          <span class="chip warn">${esc(t("prof.fullNameReq"))}</span>
        </div>
        <div class="card" data-form>
          <form id="prof-form" novalidate>
            ${field("name", { label: t("prof.fullName"), req: true, value: u.name || "", hint: t("prof.fullNameNote"), maxlength: 150 })}
            ${field("email", { label: t("prof.email"), type: "email", value: u.email || "", hint: t("prof.emailNote"), hintRight: t("prof.emailTag") })}
            ${field("phone", { label: t("prof.phone"), req: true, type: "tel", inputmode: "tel", value: formatPhone(u.phone), hint: t("prof.phoneNote"), hintRight: t("prof.phoneTag") })}
            ${field("telegram_chat_id", { label: t("prof.telegram"), value: u.telegram_chat_id || "", hint: t("prof.telegramNote"), hintRight: t("prof.optional"), maxlength: 50, inputmode: "numeric" })}
            <label class="check-row mt2" for="whatsapp_opt_in">
              <input type="checkbox" id="whatsapp_opt_in" name="whatsapp_opt_in" ${u.whatsapp_opt_in ? "checked" : ""}>
              <span class="grow">
                <span class="ct">${esc(t("prof.whatsapp"))}</span>
                <span class="cs">${esc(t("prof.whatsappNote"))}</span>
              </span>
            </label>
          </form>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("info", 15)} ${esc(t("prof.telegramGuideTitle"))}</h2>
        </div>
        <div class="card tight">
          <ol class="small muted" style="margin:0;padding-left:20px">
            <li>${esc(t("prof.telegramGuideStep1"))}</li>
            <li class="mt1">${esc(t("prof.telegramGuideStep2"))}</li>
            <li class="mt1">${esc(t("prof.telegramGuideStep3"))}</li>
          </ol>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("building", 15)} ${esc(t("prof.orgs"))}</h2>
          <span class="section-sub">${orgs.length}</span>
        </div>
        ${
          orgs.length
            ? `<div class="tag-row">${orgs.map((o) => `<span class="chip info">${icon("building", 11)} ${esc(o.name)}</span>`).join("")}</div>`
            : `<div class="card tight">${banner("grey", esc(store.activeRole === "admin" ? t("org.empty") : t("stu.myOrgsEmpty")), "building")}</div>`
        }
      </div>

      <div class="mt3">${banner("grey", esc(t("prof.dataNote")), "shieldCheck")}</div>
      <div style="height:12px"></div>

      <div class="foot">
        <button class="btn btn-primary btn-block" id="save-btn">${icon("check", 16)} ${esc(t("prof.save"))}</button>
      </div>`);

    bind();
  };

  function bind() {
    const btn = ctx.root.querySelector("#save-btn");
    if (btn)
      btn.addEventListener("click", async () => {
        if (saving) return;
        const v = formValues(ctx.root.querySelector("#prof-form"));
        clearErrors(ctx.root);
        if (!v.name || !v.name.trim()) {
          showErrors(ctx.root, { name: [t("v.required")] });
          return;
        }
        if (!v.phone || !v.phone.trim()) {
          showErrors(ctx.root, { phone: [t("v.required")] });
          return;
        }
        const telegramChatId = String(v.telegram_chat_id || "").trim();
        if (telegramChatId && (!/^-?\d+$/.test(telegramChatId) || telegramChatId.length > 50)) {
          showErrors(ctx.root, { telegram_chat_id: [t("prof.telegramInvalid")] });
          return;
        }
        saving = true;
        setLoading(btn, true);
        try {
          const response = await api.put("/auth/me", {
            name: v.name.trim(),
            phone: normalizePhone(v.phone),
            email: v.email || null,
            telegram_chat_id: telegramChatId || null,
            whatsapp_opt_in: ctx.root.querySelector("#whatsapp_opt_in").checked,
          });
          store.user =
            response.data && response.data.user
              ? response.data.user
              : {
                  ...store.user,
                  name: v.name.trim(),
                  phone: normalizePhone(v.phone),
                  email: v.email || null,
                  telegram_chat_id: telegramChatId || null,
                  whatsapp_opt_in: ctx.root.querySelector("#whatsapp_opt_in").checked,
                };
          store.emit();
          saving = false;
          setLoading(btn, false);
          toast(t("prof.saved"), "ok");
          ctx.back();
        } catch (e) {
          saving = false;
          setLoading(btn, false);
          showErrors(ctx.root, e.errors || {}, e.message || t("err.generic"));
        }
      });
  }

  (async () => {
    render();
    try {
      const path =
        store.activeRole === "admin"
          ? "/admin/organizations"
          : `/${store.activeRole === "sponsor" ? "sponsor" : "student"}/organizations`;
      const r = await api.list(path, "organizations", { per_page: 100 });
      orgs = r.items;
    } catch (e) {
      orgs = [];
    }
    render();
  })();
}

/* ---------------- 23: Tukar Kata Laluan ---------------- */
export function passwordScreen(ctx) {
  const isSA = store.activeRole === "admin" && store.isSuperAdmin;
  const headTitle = isSA ? t("sa.pw.title") : t("pw.title");
  const headText = isSA ? t("sa.pw.headSub") : t("pw.headText");

  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: headTitle, back: true, avatar: false })}
      <div class="content with-foot pad">
        <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
          <div class="flex gap3 items-center">
            <span class="row-tile navy" style="width:44px;height:44px">${icon("lock", 20)}</span>
            <span class="grow">
              <span class="strong" style="display:block;font-size:16px">${esc(isSA ? t("sa.pw.head") : t("pw.head"))}</span>
              <span class="small muted">${esc(headText)}</span>
            </span>
          </div>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("key", 15)} ${esc(t("pw.head"))}</h2>
            <span class="chip info">${esc(t("pw.encrypted"))}</span>
          </div>
          <div class="card" data-form>
            <form id="pw-form" novalidate>
              ${field("current_password", { label: t("pw.current"), type: "password", placeholder: t("pw.currentPh"), act: "toggle", actIcon: "eye", autocomplete: "current-password" })}
              ${field("password", { label: t("pw.new"), type: "password", placeholder: t("pw.newPh"), act: "toggle", actIcon: "eye", autocomplete: "new-password", hint: t("pw.headText") })}
              ${field("password_confirmation", { label: t("pw.confirm"), type: "password", placeholder: t("pw.confirmPh"), act: "toggle", actIcon: "eye", autocomplete: "new-password" })}
            </form>
            <div class="rules mt2">
              <div class="rule">${icon("check", 13)} ${esc(t("rule.min8"))}</div>
              <div class="rule">${icon("check", 13)} ${esc(t("rule.letter"))}</div>
              <div class="rule">${icon("check", 13)} ${esc(t("rule.match"))}</div>
            </div>
          </div>
        </div>

        <div class="mt3">${banner("grey", esc(t("pw.tempNote")), "info")}</div>
        <div style="height:12px"></div>

        <div class="foot">
          <button class="btn btn-primary btn-block" id="pw-btn">${icon("shieldCheck", 16)} ${esc(t("pw.submit"))}</button>
          <button class="center-link" data-act="back">${esc(t("common.cancel"))}</button>
        </div>
      </div>
    </div>`;

  // password visibility toggles
  ctx.root.querySelectorAll('[data-act2="toggle"]').forEach((b) =>
    b.addEventListener("click", () => {
      const inp = b.parentElement.querySelector("input");
      if (!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${show ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'}</svg>`;
    }),
  );

  const btn = ctx.root.querySelector("#pw-btn");
  if (btn)
    btn.addEventListener("click", async () => {
      const v = formValues(ctx.root.querySelector("#pw-form"));
      clearErrors(ctx.root);
      const errs = {};
      if (!v.current_password) errs.current_password = [t("v.required")];
      if (!v.password || v.password.length < 8) errs.password = [t("v.min8")];
      if (v.password !== v.password_confirmation)
        errs.password_confirmation = [t("v.match")];
      if (Object.keys(errs).length) {
        showErrors(ctx.root, errs);
        return;
      }
      setLoading(btn, true);
      try {
        await api.post("/auth/change-password", {
          current_password: v.current_password,
          password: v.password,
          password_confirmation: v.password_confirmation,
        });
        store.mustChangePassword = false;
        setLoading(btn, false);
        toast(t("pw.updated"), "ok");
        ctx.back();
      } catch (e) {
        setLoading(btn, false);
        showErrors(ctx.root, e.errors || {}, e.message || t("pw.wrong"));
      }
    });
}

/* ---------------- 24: Tukar Peranan ---------------- */
export function rolesScreen(ctx) {
  const roles = store.roles || [];
  let switching = "";

  const bulletsFor = (role) =>
    role === "admin"
      ? [t("roles.p1"), t("roles.p2"), t("roles.p3"), t("roles.p4")]
      : [t("roles.s1"), t("roles.s2"), t("roles.s3"), t("roles.s4")];

  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: t("roles.title"), back: true, avatar: false })}
      <div class="content pad">
        <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
          <div class="flex between items-center">
            <span class="strong small">${esc(t("roles.intro"))}</span>
            <span class="chip navy">${esc(t("roles.introTag"))}</span>
          </div>
          <p class="small muted" style="margin:8px 0 0">${esc(t("roles.introText"))}</p>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title" style="font-size:15px">${icon("swap", 15)} ${esc(t("roles.available"))}</h2>
            <span class="section-sub">${esc(t("roles.accessibleN", { n: roles.length }))}</span>
          </div>
          <div class="list" style="gap:12px">
            ${roles.map((r) => roleCard(r)).join("") || `<div class="card">${banner("grey", esc(t("err.forbidden")), "lock")}</div>`}
          </div>
        </div>

        <div class="card mt4" style="background:var(--grad-navy);color:#fff;box-shadow:none">
          <div class="flex between items-center">
            <span class="strong small">${esc(t("roles.principles"))}</span>
            <span class="chip" style="background:rgba(255,255,255,.18);color:#fff">${esc(t("roles.principlesTag"))}</span>
          </div>
          <p class="small" style="color:rgba(255,255,255,.8);margin:8px 0 0">${esc(t("roles.principlesText"))}</p>
          <div class="flex gap3 mt3" style="color:rgba(255,255,255,.75);font-size:12px">
            <span class="flex items-center gap1">${icon("shieldCheck", 13)} ${esc(t("roles.audit"))}</span>
            <span class="flex items-center gap1">${icon("clock", 13)} ${esc(t("roles.token", { n: 24 }))}</span>
          </div>
        </div>
        <div style="height:20px"></div>
      </div>
    </div>`;

  function roleCard(r) {
    const active = r.role === store.activeRole;
    const ic =
      r.role === "admin" ? "grid" : r.role === "sponsor" ? "handshake" : "cap";
    const access =
      r.role === "admin" ? t("roles.fullAccess") : t("roles.powerPortal");
    const held = r.role === "admin" ? r.organizations || [] : r.classes || [];
    return `
      <div class="role-card" style="${active ? "border-color:var(--primary);box-shadow:0 8px 24px rgba(36,71,168,.14)" : ""}">
        <div class="role-head">
          <span class="row-tile ${active ? "navy" : ""}">${icon(ic, 18)}</span>
          <span class="grow">
            <span class="role-name">${esc(roleLabel(r.role))}</span>
            <span class="role-desc">${esc(access)}</span>
          </span>
          ${active ? `<span class="chip ok"><i class="dot"></i> ${esc(t("roles.current"))}</span>` : ""}
        </div>
        ${
          held.length
            ? `<div class="tag-row mt2">${held
                .slice(0, 4)
                .map((h) => `<span class="chip info">${esc(h.name)}</span>`)
                .join(
                  "",
                )}${held.length > 4 ? `<span class="chip muted">+${held.length - 4}</span>` : ""}</div>`
            : r.role !== "admin"
              ? `<p class="small muted2 mt2" style="margin-bottom:0">${esc(t("roles.noClasses", { kind: roleLabel(r.role) }))}</p>`
              : ""
        }
        <div class="perm-grid mt2">
          ${bulletsFor(r.role)
            .map(
              (p) => `<span class="perm">${icon("check", 12)} ${esc(p)}</span>`,
            )
            .join("")}
        </div>
        ${
          active
            ? `<button class="btn btn-soft btn-block mt3" disabled>${esc(t("roles.keepCurrent", { role: roleLabel(r.role) }))}</button>`
            : `<button class="btn btn-primary btn-block mt3" data-switch="${attr(r.role)}">${icon("swap", 16)} ${esc(t("roles.switchTo"))}</button>`
        }
      </div>`;
  }

  ctx.root.querySelectorAll("[data-switch]").forEach((b) =>
    b.addEventListener("click", async () => {
      const role = b.dataset.switch;
      if (switching) return;
      switching = role;
      setLoading(b, true, t("roles.switching"));
      try {
        await switchRole(role);
        toast(t("roles.switched", { role: roleLabel(role) }), "ok");
        switching = "";
        resetHistory(roleHome(role));
        go(roleHome(role), { replace: true });
      } catch (e) {
        switching = "";
        toast(e.message || t("err.generic"), "err");
        b.disabled = false;
        b.innerHTML = `${icon("swap", 16)} ${esc(t("roles.switchTo"))}`;
      }
    }),
  );
}
