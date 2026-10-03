/**
 * Organization screens — 05 senarai, 06 tambah, 07 butiran, 08 edit.
 * Endpoints: GET/POST /admin/organizations, GET/PUT/DELETE /admin/organizations/{id},
 *            POST /admin/organizations/{id}/logo, GET /admin/organizations/{id}/dashboard
 */
import { t } from "../i18n/index.js";
import { api, ApiError } from "../api.js";
import { store } from "../store.js";
import { config } from "../config.js";
import {
  appbar,
  bottomNav,
  ADMIN_NAV,
  SA_NAV,
  icon,
  esc,
  attr,
  rm,
  field,
  formValues,
  showErrors,
  clearErrors,
  setLoading,
  toast,
  skeletonList,
  errorState,
  emptyState,
  statusChip,
  confirmDialog,
  bindPTR,
  pickImage,
  isValidImage,
  banner,
  initials,
  debounce,
} from "../ui.js";
import { go } from "../router.js";

/* ---------------- 05: Senarai Organisasi ---------------- */
export function orgListScreen(ctx) {
  let items = null;
  let err = null;
  let q = "";
  let searchRequestId = 0;

  const listMarkup = () => {
    const canCreateOrganization = !store.isSuperAdmin;
    let body;
    if (err)
      body = `<div class="card">${errorState(err, 'data-act="retry"')}</div>`;
    else if (!items) body = skeletonList(4);
    else if (!items.length && !q)
      body = `<div class="card">${emptyState({
        ic: "building",
        title: t("org.empty"),
        text: t("org.emptySub"),
        action: canCreateOrganization
          ? `<button class="btn btn-primary" data-go="#/organizations/new">${icon("plus", 17)} ${esc(t("org.add"))}</button>`
          : "",
      })}</div>`;
    else
      body = `
      <div class="flex between items-center mt3">
        <span class="section-sub">${esc(t("org.count", { n: items.length }))}</span>
        <span class="section-sub">${esc(t("common.updated", { when: t("common.today") }))}</span>
      </div>
      <div class="list mt3">
        ${items
          .map(
            (o) => `
          <button class="row-item" data-go="#/organizations/${o.id}" style="align-items:flex-start">
            <span class="row-tile navy" style="border-radius:50%;overflow:hidden;${o.logo_url ? "padding:0;background:#fff" : ""}">
              ${o.logo_url ? `<img src="${attr(o.logo_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : icon("building", 18)}
            </span>
            <span class="row-body">
              <span class="row-title" style="white-space:normal">${esc(o.name)}</span>
              <span class="row-sub"><span class="mono">${esc(o.code || "—")}</span> · ${esc(o.description ? o.description.slice(0, 60) + (o.description.length > 60 ? "…" : "") : "")}</span>
              <span class="tag-row" style="margin-top:8px">
                ${statusChip(o.status)}
                <span class="chip info">${icon("book", 12)} ${esc(o.code || "")}</span>
              </span>
            </span>
            <span class="chev">${icon("chevronR", 18)}</span>
          </button>`,
          )
          .join("")}
      </div>`;
    return body;
  };

  const render = () => {
    const canCreateOrganization = !store.isSuperAdmin;
    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t("org.title"), bell: true, unread: store.unread, avatar: true })}
        <div class="content with-nav pad">
          <div class="flex between items-center" style="margin-top:14px">
            <div>
              <div class="eyebrow">${esc(t("app.system"))}</div>
              <h1 class="h2">${esc(t("org.title"))}</h1>
            </div>
            ${canCreateOrganization ? `<button class="btn btn-primary btn-sm" data-go="#/organizations/new">${icon("plus", 15)} ${esc(t("org.add"))}</button>` : ""}
          </div>
          <div class="searchbar mt3">
            ${icon("search", 18)}
            <input id="org-search" type="search" placeholder="${attr(t("org.search"))}" value="${attr(q)}">
          </div>
          <div id="org-list" class="mt2">${listMarkup()}</div>
        </div>
        ${bottomNav("orgs", store.isSuperAdmin ? SA_NAV : ADMIN_NAV)}
      </div>`;

    const s = ctx.root.querySelector("#org-search");
    s.addEventListener(
      "input",
      debounce(() => {
        q = s.value.trim();
        load(true);
      }, 350),
    );
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", () => load());
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, () => load(true));
  };

  function updateList() {
    const container = ctx.root.querySelector("#org-list");
    if (!container) return;
    container.innerHTML = listMarkup();
    const retry = container.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", () => load());
  }

  async function load(quiet = false) {
    const requestId = ++searchRequestId;
    if (!quiet) {
      err = null;
      items = null;
      render();
    } else {
      err = null;
      items = null;
      updateList();
    }
    try {
      const superAdmin = store.isSuperAdmin;
      const env = await api.list(
        superAdmin ? "/superadmin/organizations" : "/admin/organizations",
        "organizations",
        superAdmin
          ? { page: 1, per_page: 100, status: "active", search: q }
          : { search: q, per_page: 50 },
      );
      if (requestId !== searchRequestId) return;
      items = env.items;
      err = null;
    } catch (e) {
      if (requestId !== searchRequestId) return;
      err = e;
    }
    if (quiet) updateList();
    else render();
  }
  load();
}

/* ---------------- 06: Tambah Organisasi ---------------- */
export function orgCreateScreen(ctx) {
  let logoFile = null;
  let status = "active";

  const render = () => {
    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t("org.create"), back: true, avatar: false })}
        <div class="content with-foot pad">
          <p class="lead" style="margin-top:14px">${esc(t("org.editSub"))}</p>

          <div class="card mt2" data-form>
            <div class="flex items-center gap3">
              <div class="org-logo" id="logo-preview" style="width:76px;height:76px">${logoFile ? `<img src="${attr(logoFile.url)}">` : icon("image", 26)}</div>
              <div class="grow">
                <div class="eyebrow">${esc(t("org.logo"))}</div>
                <div class="strong">${esc(logoFile ? logoFile.name : t("org.logoUpload"))}</div>
                <div class="field-hint">${esc(t("org.logoFmt"))}</div>
                <button type="button" class="btn btn-light btn-sm mt2" id="logo-btn">${icon("camera", 15)} ${esc(t("org.logoUpload"))}</button>
              </div>
            </div>
          </div>

          <div class="card mt3" data-form>
            <form id="org-form" novalidate>
              ${field("name", { label: t("org.name"), req: true, placeholder: "cth. Madrasah Tahfiz Al-Hikmah", hintRight: t("common.required") })}
              ${field("code", { label: t("org.code"), placeholder: "MTH", hint: t("org.codeHint") })}
              ${field("description", { label: t("org.desc"), textarea: true, rows: 4, maxlength: 300, placeholder: "Penerangan ringkas organisasi…", hintRight: "0 / 300" })}
              <div class="field" data-name="status">
                <div class="field-head"><label class="field-label">${esc(t("org.status"))}</label></div>
                <div class="segmented" id="status-seg">
                  <button type="button" class="seg-btn active" data-val="active"><i class="dot" style="background:var(--ok-dot)"></i> ${esc(t("org.statusActive"))}</button>
                  <button type="button" class="seg-btn" data-val="inactive"><i class="dot" style="background:var(--muted-2)"></i> ${esc(t("org.statusInactive"))}</button>
                </div>
              </div>
            </form>
          </div>
          <div style="height:12px"></div>
        </div>
        <div class="foot">
          <button class="btn btn-primary btn-block" id="save-btn" form="org-form">${icon("check", 17)} ${esc(t("common.create"))}</button>
        </div>
      </div>`;
    bind();
  };

  const bind = () => {
    const form = ctx.root.querySelector("#org-form");
    const card = form.closest(".card");

    // status segmented
    ctx.root.querySelectorAll("#status-seg .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        ctx.root
          .querySelectorAll("#status-seg .seg-btn")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        status = b.dataset.val;
      }),
    );

    // char count
    const ta = form.description;
    ta.addEventListener("input", () => {
      const c = ctx.root.querySelector('[data-name="description"] .char-count');
      if (c) c.textContent = `${ta.value.length} / 300`;
    });

    ctx.root.querySelector("#logo-btn").addEventListener("click", async () => {
      try {
        const picked = await pickImage({});
        const v = isValidImage(picked, config.IMAGE_MAX_MB);
        if (!v.ok) {
          toast(
            v.okType
              ? t("pay4.tooBig", { mb: config.IMAGE_MAX_MB })
              : "Format: JPG/PNG/WEBP",
            "err",
          );
          return;
        }
        logoFile = { ...picked, url: URL.createObjectURL(picked.blob) };
        render();
      } catch (e) {
        /* cancelled */
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(card);
      const v = formValues(form);
      const errs = {};
      if (!String(v.name || "").trim()) errs.name = [t("org.needName")];
      if (Object.keys(errs).length) {
        showErrors(card, errs);
        return;
      }
      const btn = ctx.root.querySelector("#save-btn");
      setLoading(btn, true);
      try {
        const env = await api.post("/admin/organizations", {
          name: v.name.trim(),
          code: v.code || null,
          description: v.description || null,
          status,
        });
        const created = env.data || {};
        if (logoFile) {
          try {
            await api.upload(`/admin/organizations/${created.id}/logo`, {
              file: {
                field: "logo",
                blob: logoFile.blob,
                filename: logoFile.name,
              },
            });
          } catch (eLogo) {
            toast(eLogo.message || t("err.generic"), "err");
          }
        }
        setLoading(btn, false);
        toast(t("org.created"), "ok");
        go(`#/organizations/${created.id}`, { replace: true });
      } catch (err2) {
        setLoading(btn, false);
        if (err2 instanceof ApiError && err2.isValidation)
          showErrors(card, err2.errors, t("err.validation"));
        else showErrors(card, {}, err2.message || t("err.generic"));
      }
    });
  };
  render();
}

/* ---------------- 07: Butiran Organisasi ---------------- */
export function orgDetailScreen(ctx) {
  const id = ctx.params.id;
  let org = null;
  let dash = null;
  let err = null;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`,
      );
      bind();
      return;
    }
    if (!org) {
      ctx.root.innerHTML = shell(skeletonList(3, true));
      return;
    }

    const d = dash || {};
    const counts = {
      classes: store.isSuperAdmin
        ? (org.total_classes ?? "—")
        : ((d.classes && d.classes.total) ?? "—"),
      students: store.isSuperAdmin
        ? (org.total_students ?? "—")
        : ((d.participants && d.participants.students) ?? "—"),
      sponsors: store.isSuperAdmin
        ? (org.total_sponsors ?? "—")
        : ((d.participants && d.participants.sponsors) ?? "—"),
      collected: d.financial ? rm(d.financial.collected) : "—",
      payments: org.total_payments ?? "—",
    };
    const canDelete = counts.classes === 0;

    ctx.root.innerHTML = shell(`
      <div class="pad">
        <div class="card mt3" style="position:relative;overflow:hidden">
          <span class="chip ${org.status === "active" ? "ok" : "muted"}" style="position:absolute;right:14px;top:14px">${icon("checkCircle", 12)} ${esc(org.status === "active" ? t("org.statusActive") : t("org.statusInactive"))}</span>
          <div class="mt2"></div>
          <div class="org-logo">${org.logo_url ? `<img src="${attr(org.logo_url)}" alt="">` : icon("building", 30)}</div>
          <div class="center mt3">
            <div class="h2">${esc(org.name)}</div>
            <p class="lead" style="margin:6px auto 0;max-width:320px">${esc(org.description || "—")}</p>
          </div>
        </div>

        <div class="stat-grid mt3">
          ${miniStat(counts.classes, t("cls.total"), "book")}
          ${miniStat(counts.students, t("dash.students"), "cap", true)}
          ${miniStat(counts.sponsors, t("dash.sponsors"), "handshake", true)}
          ${
            store.isSuperAdmin
              ? miniStat(counts.payments, t("org.totalPayments"), "card", true)
              : miniStat(counts.collected, t("dash.collected"), "dollar")
          }
        </div>

        ${
          store.isSuperAdmin
            ? ""
            : `<div class="section">
          <div class="section-head">
            <h2 class="section-title">${esc(t("org.actions"))}</h2>
            <span class="section-sub">${esc(t("org.actionsSub"))}</span>
          </div>
          <div class="list">
            ${actionRow("edit", t("org.edit") || "Edit Organisasi", t("org.editSub"), `#/organizations/${id}/edit`)}
            ${actionRow("book", t("org.viewClasses"), t("org.viewClassesSub"), `#/classes?org=${id}`)}
            ${actionRow("card", t("org.viewPayments"), t("org.viewPaymentsSub"), `#/payments?organization_id=${id}`)}
            ${actionRow("cap", t("org.viewStudents"), t("org.viewStudentsSub"), null, "students")}
            ${actionRow("handshake", t("org.viewSponsors"), t("org.viewSponsorsSub"), null, "sponsors")}
            <button class="action-row danger" id="del-org" ${canDelete ? "" : 'disabled style="opacity:.55"'}>
              <span class="row-tile red">${icon("trash", 18)}</span>
              <span class="grow">
                <span class="ar-t" style="display:block">${esc(t("org.delete"))}</span>
                <span class="ar-s" style="display:block">${esc(t("org.deleteSub"))}</span>
              </span>
              <span class="chev" style="color:var(--danger)">${icon("chevronR", 17)}</span>
            </button>
          </div>
          ${canDelete ? "" : `<div class="mt3">${banner("grey", esc(t("org.deleteNote")), "info")}</div>`}
        </div>`
        }
      </div>`);

    bind();
  };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("org.detail"), back: true, avatar: true })}
      <div class="content pad">${body}</div>
    </div>`;

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);

    ctx.root.querySelectorAll("[data-sheet]").forEach((el) => {
      const kind = el.dataset.sheet;
      el.addEventListener("click", () => openUserSheet(kind));
    });

    const del = ctx.root.querySelector("#del-org");
    if (del && !del.disabled)
      del.addEventListener("click", async () => {
        const yes = await confirmDialog({
          title: t("org.delete"),
          text: t("org.deleteConfirm", { name: org.name }),
          ok: t("common.delete"),
          danger: true,
        });
        if (!yes) return;
        setLoading(del, true);
        try {
          await api.del(`/admin/organizations/${id}`);
          setLoading(del, false);
          toast(t("org.deleted"), "ok");
          go("#/organizations", { replace: true });
        } catch (e2) {
          setLoading(del, false);
          toast(e2.message || t("org.noDelete"), "err");
        }
      });

    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, load);
  }

  function openUserSheet(kind) {
    const listKey = kind === "student" ? "students" : "sponsors";
    const path = kind === "student" ? "/admin/students" : "/admin/sponsors";
    import("../ui.js").then(({ openSheet }) => {
      const sheet = openSheet({
        title:
          kind === "student" ? t("org.viewStudents") : t("org.viewSponsors"),
        sub: org.name,
        html: `<div id="user-sheet-list" class="list">${skeletonList(3)}</div>`,
      });
      api
        .list(path, listKey, { per_page: 50 })
        .then((r) => {
          const host = document.getElementById("user-sheet-list");
          if (!host) return;
          host.innerHTML = r.items.length
            ? r.items
                .map(
                  (u) => `
          <div class="row-item" style="cursor:default">
            <span class="avatar sm">${esc(initials(u.name))}</span>
            <span class="row-body">
              <span class="row-title">${esc(u.name)}</span>
              <span class="row-sub">${icon("phone", 12)} ${esc(u.phone)}</span>
            </span>
            ${statusChip(u.status || "active")}
          </div>`,
                )
                .join("")
            : emptyState({ title: t("common.none") });
        })
        .catch(() => {
          const host = document.getElementById("user-sheet-list");
          if (host)
            host.innerHTML = errorState(
              { message: t("err.generic") },
              'data-act="noop"',
            );
        });
      return sheet;
    });
  }

  async function load() {
    err = null;
    org = null;
    dash = null;
    render();
    try {
      const orgPath = store.isSuperAdmin
        ? `/superadmin/organizations/${id}`
        : `/admin/organizations/${id}`;
      const [o, dd] = await Promise.all([
        api.get(orgPath),
        store.isSuperAdmin
          ? Promise.resolve(null)
          : api.get(`/admin/organizations/${id}/dashboard`).catch(() => null),
      ]);
      org = o.data;
      dash = dd && dd.data;
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}

function miniStat(val, label, ic, small = false) {
  const value = String(val);
  const valueSize = value.length > 9 ? "14px" : value.length > 6 ? "17px" : "";
  return `
    <div class="stat">
      <span class="stat-tile">${icon(ic, 16)}</span>
      <div class="stat-num ${small ? "small" : ""}" style="font-size:${valueSize};max-width:calc(100% - 46px);overflow-wrap:anywhere">${esc(value)}</div>
      <div class="stat-label">${esc(label)}</div>
    </div>`;
}
function actionRow(ic, title, sub, dest, sheet = null) {
  return `
    <button class="action-row" ${sheet ? `data-sheet="${attr(sheet)}"` : `data-go="${attr(dest)}"`}>
      <span class="row-tile">${icon(ic, 18)}</span>
      <span class="grow">
        <span class="ar-t" style="display:block">${esc(title)}</span>
        <span class="ar-s" style="display:block">${esc(sub)}</span>
      </span>
      <span class="chev">${icon("chevronR", 17)}</span>
    </button>`;
}

/* ---------------- 08: Edit Organisasi ---------------- */
export function orgEditScreen(ctx) {
  const id = ctx.params.id;
  let org = null;
  let err = null;
  let status = "active";
  let logoFile = null;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = `
        <div class="screen">
          ${appbar({ title: t("org.edit"), back: true, avatar: false })}
          <div class="content pad"><div class="card mt4">${errorState(err, 'data-act="retry"')}</div></div>
        </div>`;
      ctx.root
        .querySelector('[data-act="retry"]')
        .addEventListener("click", load);
      return;
    }
    if (!org) {
      ctx.root.innerHTML = `
        <div class="screen">
          ${appbar({ title: t("org.edit"), back: true, avatar: false })}
          <div class="content pad" style="padding-top:16px">${skeletonList(3, true)}</div>
        </div>`;
      return;
    }
    status = org.status || "active";

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t("org.edit"), back: true, avatar: true })}
        <div class="content with-foot pad">
          <p class="lead" style="margin-top:14px">${esc(t("org.editSub"))}</p>

          <div class="card mt2">
            <div class="flex items-center gap3">
              <div class="org-logo" style="width:76px;height:76px">${logoFile ? `<img src="${attr(logoFile.url)}">` : org.logo_url ? `<img src="${attr(org.logo_url)}">` : icon("image", 26)}</div>
              <div class="grow">
                <div class="eyebrow">${esc(t("org.logo"))}</div>
                <div class="strong">${esc(t("org.logoCurrent"))}</div>
                <div class="field-hint">${esc(t("org.logoFmt"))}</div>
                <button type="button" class="btn btn-light btn-sm mt2" id="logo-btn">${icon("camera", 15)} ${esc(t("org.logoChange"))}</button>
              </div>
            </div>
          </div>

          <div class="card mt3" data-form>
            <form id="org-form" novalidate>
              ${field("name", { label: t("org.name"), req: true, value: org.name, hintRight: t("common.required") })}
              ${field("code", { label: t("org.code"), value: org.code || "", hint: t("org.codeHint") })}
              ${field("description", { label: t("org.desc"), textarea: true, rows: 4, maxlength: 300, value: org.description || "", hintRight: `${(org.description || "").length} / 300` })}
              <div class="field" data-name="status">
                <div class="field-head"><label class="field-label">${esc(t("org.status"))}</label></div>
                <div class="segmented" id="status-seg">
                  <button type="button" class="seg-btn ${status === "active" ? "active" : ""}" data-val="active"><i class="dot" style="background:var(--ok-dot)"></i> ${esc(t("org.statusActive"))}</button>
                  <button type="button" class="seg-btn ${status !== "active" ? "active" : ""}" data-val="inactive"><i class="dot" style="background:var(--muted-2)"></i> ${esc(t("org.statusInactive"))}</button>
                </div>
              </div>
              <div class="mt3">${banner("", esc(status === "active" ? t("org.statusNote") : t("org.statusNoteOff")), status === "active" ? "checkCircle" : "info")}</div>
            </form>
          </div>
          <div style="height:12px"></div>
        </div>
        <div class="foot">
          <button class="btn btn-primary btn-block" id="save-btn">${icon("check", 17)} ${esc(t("common.save"))}</button>
        </div>
      </div>`;
    bind();
  };

  function bind() {
    const form = ctx.root.querySelector("#org-form");
    const card = form.closest(".card");

    ctx.root.querySelectorAll("#status-seg .seg-btn").forEach((b) =>
      b.addEventListener("click", () => {
        ctx.root
          .querySelectorAll("#status-seg .seg-btn")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        status = b.dataset.val;
      }),
    );

    const ta = form.description;
    ta.addEventListener("input", () => {
      const c = ctx.root.querySelector('[data-name="description"] .char-count');
      if (c) c.textContent = `${ta.value.length} / 300`;
    });

    ctx.root.querySelector("#logo-btn").addEventListener("click", async () => {
      try {
        const picked = await pickImage({});
        const v = isValidImage(picked, config.IMAGE_MAX_MB);
        if (!v.ok) {
          toast(
            v.okType
              ? t("pay4.tooBig", { mb: config.IMAGE_MAX_MB })
              : "Format: JPG/PNG/WEBP",
            "err",
          );
          return;
        }
        setLoading(ctx.root.querySelector("#logo-btn"), true);
        try {
          const env = await api.upload(`/admin/organizations/${id}/logo`, {
            file: { field: "logo", blob: picked.blob, filename: picked.name },
          });
          if (env.data && env.data.logo_url) org.logo_url = env.data.logo_url;
          logoFile = {
            ...picked,
            url:
              env.data && env.data.logo_url
                ? env.data.logo_url
                : URL.createObjectURL(picked.blob),
          };
          toast(t("org.logoOk"), "ok");
        } finally {
          render();
        }
      } catch (e) {
        if (e && e.message !== "cancelled")
          toast(e.message || t("err.generic"), "err");
      }
    });

    ctx.root.querySelector("#save-btn").addEventListener("click", async () => {
      clearErrors(card);
      const v = formValues(form);
      const errs = {};
      if (!String(v.name || "").trim()) errs.name = [t("org.needName")];
      if (Object.keys(errs).length) {
        showErrors(card, errs);
        return;
      }
      const btn = ctx.root.querySelector("#save-btn");
      setLoading(btn, true);
      try {
        await api.put(`/admin/organizations/${id}`, {
          name: v.name.trim(),
          code: v.code || null,
          description: v.description || null,
          status,
        });
        setLoading(btn, false);
        toast(t("org.updated"), "ok");
        ctx.back();
      } catch (e2) {
        setLoading(btn, false);
        if (e2 instanceof ApiError && e2.isValidation)
          showErrors(card, e2.errors, t("err.validation"));
        else showErrors(card, {}, e2.message || t("err.generic"));
      }
    });
  }

  async function load() {
    err = null;
    org = null;
    render();
    try {
      const env = await api.get(`/admin/organizations/${id}`);
      org = env.data;
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}
