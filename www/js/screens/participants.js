/**
 * Participant screens — 14 senarai, 15 tambah sedia ada (carian), 16 cipta baharu.
 * Endpoints: GET/POST/DELETE /admin/classes/{id}/participants,
 *            GET/POST /admin/students|sponsors
 */
import { t } from "../i18n/index.js";
import { api, ApiError, normalizePhone, formatPhone } from "../api.js";
import { store } from "../store.js";
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
  emptyState,
  statusChip,
  confirmDialog,
  bindPTR,
  banner,
  initials,
  debounce,
  avatar,
} from "../ui.js";
import { go } from "../router.js";

async function loadClassShell(id) {
  const env = await api.get(`/classes/${id}`);
  const cls = env.data;
  let orgName = "";
  try {
    const o = await api.get(`/admin/organizations/${cls.organization_id}`);
    orgName = (o.data && o.data.name) || "";
  } catch (e) {
    /* noop */
  }
  return { cls, orgName };
}

function kindOf(obj) {
  return (obj && obj.participant_type) === "sponsor" ? "sponsor" : "student";
}
// NOTE: the live API has no class-level participant_type (GET /classes/{id} never
// returns it) — the class type must be chosen explicitly when adding participants.
function ptypeLabel(ptype) {
  return ptype === "sponsor" ? t("part.typeSponsor") : t("part.typeStudent");
}
function ptypeSegmented(ptype) {
  return `
      <div class="field" data-name="ptype">
        <div class="field-head"><label class="field-label">${esc(t("createP.ptype"))}<span class="req">*</span></label></div>
        <div class="segmented" id="ptype-seg">
          <button type="button" class="seg-btn ${ptype === "sponsor" ? "" : "active"}" data-val="student">${icon("cap", 15)} ${esc(t("part.typeStudent"))}</button>
          <button type="button" class="seg-btn ${ptype === "sponsor" ? "active" : ""}" data-val="sponsor">${icon("handshake", 15)} ${esc(t("part.typeSponsor"))}</button>
        </div>
        <div class="field-note">${icon("info", 14)} ${esc(t("createP.ptypeHint"))}</div>
      </div>`;
}

/* ---------------- 14: Senarai Peserta ---------------- */
export function participantListScreen(ctx) {
  const id = ctx.params.id;
  let cls = null;
  let orgName = "";
  let items = null;
  let err = null;
  let q = "";

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("part.title"), back: true, avatar: true })}
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
    if (!cls) {
      ctx.root.innerHTML = shell(skeletonList(3, true));
      return;
    }

    let list = items || [];
    const total = list.length;
    if (q) {
      const s = q.toLowerCase();
      const digits = q.replace(/\D/g, "");
      list = list.filter((p) => {
        const user = p.user || p;
        return (
          String(p.name || user.name || "")
            .toLowerCase()
            .includes(s) ||
          (digits &&
            String(p.phone || user.phone || "")
              .replace(/\D/g, "")
              .includes(digits))
        );
      });
    }

    ctx.root.innerHTML = shell(`
      <div class="hero mt3" style="background:var(--grad-navy-soft)">
        <div class="flex gap2 items-center">
          <span class="pill-light">${icon("book", 12)} ${esc((cls.name || "").split(" ").slice(0, 3).join(" ").toUpperCase())}</span>
          ${statusChip(cls.status)}
        </div>
        <div class="hero-title" style="font-size:22px;margin-top:10px">${esc(cls.name)}</div>
        <div class="hero-sub">${icon("building", 12)} ${esc(orgName)}</div>
        <div class="hero-row mt3">
          <span class="pill-light">${esc(t("part.count", { n: total }))}</span>
        </div>
      </div>

      <div class="btn-row mt3">
        <button class="btn btn-soft" data-go="#/classes/${id}/participants/add">${icon("search", 16)} ${esc(t("part.addExisting"))}</button>
        <button class="btn btn-primary" data-go="#/classes/${id}/participants/new">${icon("userPlus", 16)} ${esc(t("part.createNew"))}</button>
      </div>

      <div class="searchbar mt3">
        ${icon("search", 18)}
        <input id="p-search" type="search" placeholder="${attr(t("part.search"))}" value="${attr(q)}">
        ${q ? `<button class="clr" id="p-clear">${icon("x", 16)}</button>` : ""}
      </div>

      <div class="flex between items-center mt2">
        <span class="small muted">${esc(t("part.showing", { shown: list.length, total }))}</span>
        <span class="small muted2">${esc(t("part.updatedNow", { when: t("common.today") }))}</span>
      </div>

      <div class="list mt3" id="p-list">
        ${
          items === null
            ? skeletonList(4)
            : list.length
              ? list
                  .map((p) => {
                    const user = p.user || p;
                    const name = p.name || user.name || "—";
                    const phone = p.phone || user.phone || "";
                    return `
            <div class="row-item" style="cursor:default">
              <span class="avatar sm">${esc(initials(name))}</span>
              <span class="row-body">
                <span class="flex gap2 items-center">
                  <span class="row-title">${esc(name)}</span>
                  <span class="chip ${kindOf(p) === "sponsor" ? "ok" : "info"}">${esc(kindOf(p) === "sponsor" ? t("part.typeSponsor") : t("part.typeStudent"))}</span>
                </span>
                <span class="row-sub">${icon("phone", 12)} ${esc(formatPhone(phone))}</span>
              </span>
              <button class="icon-btn" data-remove="${attr(p.id)}" data-name="${attr(name)}">${icon("dots", 18)}</button>
            </div>`;
                  })
                  .join("")
              : `<div class="card">${emptyState({ ic: "users", title: t("part.empty"), text: t("part.emptySub") })}</div>`
        }
      </div>
      <div style="height:16px"></div>`);

    const s = ctx.root.querySelector("#p-search");
    s.addEventListener(
      "input",
      debounce(() => {
        q = s.value.trim();
        render();
      }, 250),
    );
    const clr = ctx.root.querySelector("#p-clear");
    if (clr)
      clr.addEventListener("click", () => {
        q = "";
        render();
      });
    ctx.root
      .querySelectorAll("[data-remove]")
      .forEach((b) => b.addEventListener("click", () => removeMenu(b)));
    bind();
  };

  function removeMenu(btn) {
    import("../ui.js").then(({ openSheet }) => {
      openSheet({
        title: t("part.menu"),
        sub: btn.dataset.name,
        html: `
          <button class="action-row" id="m-remove" style="margin-bottom:8px">
            <span class="row-tile red">${icon("trash", 17)}</span>
            <span class="grow"><span class="ar-t" style="display:block;color:var(--danger)">${esc(t("part.menuRemove"))}</span></span>
          </button>
          <button class="btn btn-soft btn-block" data-sheet-close-btn>${esc(t("common.cancel"))}</button>`,
        onMount(el, close) {
          el.querySelector("#m-remove").addEventListener("click", async () => {
            close();
            const yes = await confirmDialog({
              title: t("part.remove"),
              text: t("part.removeConfirm", { name: btn.dataset.name }),
              ok: t("common.delete"),
              danger: true,
            });
            if (!yes) return;
            try {
              await api.del(
                `/admin/classes/${id}/participants/${btn.dataset.remove}`,
              );
              toast(t("part.removed"), "ok");
              load(true);
            } catch (e) {
              toast(e.message || t("err.generic"), "err");
            }
          });
          el.querySelector("[data-sheet-close-btn]").addEventListener(
            "click",
            close,
          );
        },
      });
    });
  }

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", () => load());
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, () => load(true));
  }

  async function load(quiet = false) {
    if (!quiet) {
      items = null;
      err = null;
      render();
    }
    try {
      const r = await api.list(
        `/admin/classes/${id}/participants`,
        "participants",
        { per_page: 100 },
      );
      items = (r.items || []).filter(
        (p) => (p.status || "active") !== "removed",
      );
      err = null;
      if (!cls) {
        const env = await api.get(`/classes/${id}`);
        cls = env.data;
        try {
          const o = await api.get(
            `/admin/organizations/${cls.organization_id}`,
          );
          orgName = (o.data && o.data.name) || "";
        } catch (e) {
          orgName = "";
        }
      }
    } catch (e) {
      err = e;
    }
    render();
  }
  load();
}

/* ---------------- 15: Tambah Peserta Sedia Ada ---------------- */
export function participantAddScreen(ctx) {
  const id = ctx.params.id;
  let cls = null;
  let orgName = "";
  let results = null;
  let existing = [];
  let readdableParticipants = [];
  let q = "";
  let searching = false;
  let searchRequestId = 0;
  let err = null;
  let ptype = "student";

  const contextBanner = () => `
    <div class="hero" style="background:var(--grad-navy-soft);padding:14px 16px">
      <div class="flex gap3 items-center">
        <span class="row-tile" style="background:rgba(255,255,255,.16);color:#fff;width:38px;height:38px">${icon("book", 17)}</span>
        <span class="grow">
          <span class="eyebrow" style="color:rgba(255,255,255,.75)">${icon("dot", 8)} ${esc(t("addExisting.banner"))}</span>
          <span class="flex gap2 items-center"><span class="strong" style="color:#fff;font-size:16px">${esc(cls ? cls.name : "…")}</span><span class="pill-light">${esc(cls ? ptypeLabel(ptype) : "")}</span></span>
          <span class="hero-sub">${esc(orgName)}</span>
        </span>
      </div>
    </div>`;

  const render = () => {
    if (!cls && err) {
      ctx.root.innerHTML = shell(
        `<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`,
      );
      bind();
      return;
    }
    if (!cls) {
      ctx.root.innerHTML = shell(skeletonList(2));
      return;
    }

    const kind = ptypeLabel(ptype);

    ctx.root.innerHTML = shell(`
      ${contextBanner()}
      <div class="card mt3">
        <div class="flex gap2 items-center">${icon("info", 16)}<span class="strong">${esc(t("addExisting.rules"))}</span></div>
        <p class="lead mt2" style="margin-bottom:0">${esc(t("addExisting.rulesText", { kind }))}</p>
      </div>

      ${ptypeSegmented(ptype)}

      <div class="field mt4" data-name="search">
        <div class="field-head"><label class="field-label">${esc(t("addExisting.searchLbl"))}</label></div>
        <div class="searchbar">
          ${icon("search", 18)}
          <input id="p-search" type="tel" inputmode="tel" placeholder="${attr(t("addExisting.search"))}" value="${attr(q)}">
          <button class="clr" id="p-clear" style="display:${q ? "flex" : "none"}">${icon("x", 16)}</button>
        </div>
      </div>

      <div id="p-results"></div>
      <div style="height:12px"></div>
      <button class="btn btn-primary btn-block" id="done-btn">${icon("check", 17)} ${esc(t("addExisting.done"))}</button>
      <div class="note">${esc(t("addExisting.foot"))}</div>
      <div style="height:16px"></div>`);

    ctx.root
      .querySelectorAll("#ptype-seg .seg-btn")
      .forEach((b) =>
        b.addEventListener("click", () => {
          if (ptype === b.dataset.val) return;
          ptype = b.dataset.val;
          render();
        }),
      );
    const s = ctx.root.querySelector("#p-search");
    s.addEventListener(
      "input",
      debounce(() => runSearch(s.value), 400),
    );
    s.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch(s.value);
      }
    });
    const clr = ctx.root.querySelector("#p-clear");
    clr.addEventListener("click", () => {
      s.value = "";
      runSearch("");
      s.focus();
    });
    ctx.root
      .querySelector("#done-btn")
      .addEventListener("click", () => ctx.back());
    bind();
    updateResults();
  };

  const resultsMarkup = () => {
    if (searching) return skeletonList(3);
    if (results === null) {
      const digits = q.replace(/\D/g, "");
      return q && digits.length < 3
        ? `<div class="card mt3">${esc(t("addExisting.minPhoneDigits"))}</div>`
        : "";
    }
    if (!results.length)
      return `<div class="card mt3">${emptyState({ ic: "search", title: t("addExisting.noResult"), text: t("addExisting.noResultSub") })}</div>`;
    return `
      <div class="flex gap2 items-center mt4">
        <span class="section-title" style="font-size:15px">${esc(t("addExisting.results"))}</span>
        <i class="unread-dot" style="margin:0"></i>
        <span class="small muted">${esc(t("addExisting.found", { n: results.length, q }))}</span>
      </div>
      <div class="list mt3">
        ${results
          .map(
            (u) => `
          <div class="row-item">
            <span class="avatar">${esc(initials(u.name))}</span>
            <span class="row-body">
              <span class="row-title">${esc(u.name)}</span>
              <span class="row-sub">${icon("phone", 12)} ${esc(formatPhone(u.phone))}</span>
            </span>
            <button class="btn btn-primary btn-icon-only" data-add="${attr(u.id)}" aria-label="${attr(t("addExisting.add"))}" title="${attr(t("addExisting.add"))}">${icon("userPlus", 17)}</button>
          </div>`,
          )
          .join("")}
      </div>`;
  };

  function updateResults() {
    const container = ctx.root.querySelector("#p-results");
    if (!container) return;
    container.innerHTML = resultsMarkup();
    container
      .querySelectorAll("[data-add]")
      .forEach((b) => b.addEventListener("click", () => addParticipant(b)));
  }

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("addExisting.title"), back: true, avatar: true })}
      <div class="content pad" style="padding-top:14px">${body}</div>
    </div>`;

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);
  }

  async function runSearch(term) {
    q = String(term || "").trim();
    const requestId = ++searchRequestId;
    const clrBtn = ctx.root.querySelector("#p-clear");
    if (clrBtn) clrBtn.style.display = q ? "flex" : "none";
    if (!q) {
      results = null;
      searching = false;
      updateResults();
      return;
    }
    if (q.replace(/\D/g, "").length < 3) {
      results = null;
      searching = false;
      updateResults();
      return;
    }
    searching = true;
    updateResults();
    try {
      const response = await api.post("/admin/users/search", {
        phone_number: q,
        organizationID: Number(cls.organization_id),
        classID: Number(cls.id),
      });
      if (requestId !== searchRequestId) return;
      const already = new Set(existing.map((p) => String(p.user_id || p.id)));
      const users = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data && response.data.users)
          ? response.data.users
          : [];
      const searchDigits = q
        .replace(/\D/g, "")
        .replace(/^60/, "")
        .replace(/^0/, "");
      const readdableUsers = readdableParticipants
        .map((participant) => {
          const user = participant.user || {};
          return {
            ...user,
            id: user.id ?? participant.user_id,
            name: user.name || participant.name,
            phone: user.phone || participant.phone,
            email: user.email || participant.email,
          };
        })
        .filter((user) =>
          String(user.phone || "")
            .replace(/\D/g, "")
            .replace(/^60/, "")
            .replace(/^0/, "")
            .includes(searchDigits),
        );
      const usersById = new Map(
        [...readdableUsers, ...users].map((user) => [String(user.id), user]),
      );
      results = [...usersById.values()]
        .filter((u) => String(u.id) !== String(store.user ? store.user.id : ""))
        .filter((u) => !already.has(String(u.id)))
        .map((u) => ({ ...u }));
      err = null;
    } catch (e) {
      if (requestId !== searchRequestId) return;
      results = [];
      err = null;
      if (e && e.isForbidden) toast(t("err.forbidden"), "err");
    }
    searching = false;
    updateResults();
  }

  async function addParticipant(btn) {
    const uid = btn.dataset.add;
    setLoading(btn, true);
    try {
      await api.post(`/admin/classes/${id}/participants`, {
        user_id: Number(uid),
        participant_type: ptype,
      });
      setLoading(btn, false);
      const name =
        (results.find((u) => String(u.id) === String(uid)) || {}).name || "";
      toast(t("part.added", { name }), "ok");
      results = results.filter((u) => String(u.id) !== String(uid));
      existing.push({ user_id: Number(uid) });
      render();
    } catch (e) {
      setLoading(btn, false);
      toast(e.message || t("err.generic"), "err");
    }
  }

  async function load() {
    err = null;
    cls = null;
    render();
    try {
      const env = await api.get(`/classes/${id}`);
      cls = env.data;
      try {
        const o = await api.get(`/admin/organizations/${cls.organization_id}`);
        orgName = (o.data && o.data.name) || "";
      } catch (e) {
        orgName = "";
      }
      try {
        const r = await api.list(
          `/admin/classes/${id}/participants`,
          "participants",
          { per_page: 100 },
        );
        const participants = r.items || [];
        existing = participants.filter(
          (p) => (p.status || "active") === "active",
        );
        readdableParticipants = participants.filter(
          (p) => (p.status || "active") !== "active",
        );
      } catch (e2) {
        existing = [];
        readdableParticipants = [];
      }
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}

/* ---------------- 16: Cipta Peserta Baharu ---------------- */
export function participantCreateScreen(ctx) {
  const id = ctx.params.id;
  let cls = null;
  let orgName = "";
  let err = null;
  let ptype = "student";
  let values = { name: "", phone: "", email: "" };

  const render = () => {
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`,
      );
      ctx.root
        .querySelector('[data-act="retry"]')
        .addEventListener("click", load);
      return;
    }
    if (!cls) {
      ctx.root.innerHTML = shell(skeletonList(2, true));
      return;
    }

    const kind = ptypeLabel(ptype);
    const kindPath = ptype;

    ctx.root.innerHTML = shell(`
      <div class="card flat mt3" style="background:var(--primary-soft-2);box-shadow:none">
        <div class="flex gap3 items-center">
          <span class="row-tile" style="width:40px;height:40px">${icon("book", 18)}</span>
          <span class="grow">
            <span class="eyebrow" style="color:var(--primary)">${icon("dot", 8)} ${esc(t("createP.context"))}</span>
            <span class="strong" style="display:block;font-size:16px">${esc(cls.name)}</span>
            <span class="small muted">${esc(orgName)}</span>
          </span>
          ${statusChip(cls.status)}
        </div>
      </div>

      <div class="card mt3">
        <div class="flex gap3 items-center">
          <span class="avatar navy" style="border-radius:16px">${icon("user", 22)}</span>
          <span class="grow">
            <span class="strong" style="display:block;font-size:16px">${esc(t("createP.intro"))}</span>
            <span class="small muted">${esc(t("createP.introSub"))}</span>
          </span>
        </div>
      </div>

      <div class="card mt3" data-form>
        <form id="p-form" novalidate>
          ${ptypeSegmented(ptype)}
          ${field("name", { label: t("createP.name"), req: true, placeholder: t("createP.namePh"), ic: "user", value: values.name || "" })}
          <div class="field-note">${icon("info", 13)} ${esc(t("createP.nameHint"))}</div>
          ${field("phone", { label: t("createP.phone"), req: true, type: "tel", inputmode: "tel", placeholder: "019 876 5432", prefix: "+60", value: values.phone || "" })}
          <div class="field-note">${icon("info", 13)} ${esc(t("createP.phoneNote"))}</div>
          ${field("email", { label: t("createP.email"), type: "email", inputmode: "email", placeholder: "nama@contoh.com", ic: "mail", value: values.email || "" })}
        </form>
      </div>

      <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
        <div class="flex between items-center">
          <div class="flex gap2 items-center">
            <span class="row-tile" style="width:34px;height:34px">${icon("shieldCheck", 16)}</span>
            <span class="strong" style="max-width:200px">${esc(t("createP.auto"))}</span>
          </div>
          <span class="chip info">${esc(t("createP.autoBadge"))}</span>
        </div>
        <div class="list mt3" style="gap:8px">
          ${autoRow("cap", t("createP.autoRole", { kind }), t("createP.autoRoleText", { kind }))}
          ${autoRow("key", t("createP.autoPass"), t("createP.autoPassText"))}
          ${autoRow("send", t("createP.autoNotify"), t("createP.autoNotifyText"))}
          ${autoRow("login", t("createP.autoFirst"), t("createP.autoFirstText"))}
        </div>
      </div>
      <div style="height:12px"></div>
      <button class="btn btn-primary btn-block" id="create-btn">${icon("userPlus", 17)} ${esc(t("createP.submit"))}</button>
      <button class="btn btn-soft btn-block mt2" data-act="back">${esc(t("common.cancel"))}</button>
      <div style="height:20px"></div>`);

    const form = ctx.root.querySelector("#p-form");
    ctx.root
      .querySelectorAll("#ptype-seg .seg-btn")
      .forEach((b) =>
        b.addEventListener("click", () => {
          if (ptype === b.dataset.val) return;
          values = { ...values, ...formValues(form) };
          ptype = b.dataset.val;
          render();
        }),
      );

    const card = form.closest(".card");
    form.addEventListener("submit", (e) => e.preventDefault());
    ctx.root
      .querySelector("#create-btn")
      .addEventListener("click", async () => {
        clearErrors(card);
        const v = formValues(form);
        const errs = {};
        if (!String(v.name || "").trim()) errs.name = [t("createP.needName")];
        if (!String(v.phone || "").trim())
          errs.phone = [t("createP.needPhone")];
        if (Object.keys(errs).length) {
          showErrors(card, errs);
          return;
        }
        const btn = ctx.root.querySelector("#create-btn");
        setLoading(btn, true);
        try {
          // 1) create (or reuse) the account
          const path =
            kindPath === "sponsor" ? "/admin/sponsors" : "/admin/students";
          const created = await api.post(path, {
            name: v.name.trim(),
            phone: normalizePhone(v.phone),
            email: v.email || null,
          });
          const uid = created.data && created.data.id;
          // 2) register into the class
          await api.post(`/admin/classes/${id}/participants`, {
            user_id: Number(uid),
            participant_type: ptype,
          });
          setLoading(btn, false);
          toast(t("createP.created"), "ok");
          go(`#/classes/${id}/participants`, { replace: true });
        } catch (e2) {
          setLoading(btn, false);
          if (e2 instanceof ApiError && e2.isValidation)
            showErrors(card, e2.errors, t("err.validation"));
          else showErrors(card, {}, e2.message || t("err.generic"));
        }
      });
  };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("createP.title"), back: true, avatar: true })}
      <div class="content pad" style="padding-top:14px">${body}</div>
    </div>`;

  function autoRow(ic, title, text) {
    return `
      <div class="card tight" style="box-shadow:none">
        <div class="flex gap2 items-center">${icon(ic, 15)}<span class="strong small">${esc(title)}</span></div>
        <p class="small muted" style="margin:6px 0 0">${esc(text)}</p>
      </div>`;
  }

  async function load() {
    err = null;
    cls = null;
    render();
    try {
      const env = await api.get(`/classes/${id}`);
      cls = env.data;
      try {
        const o = await api.get(`/admin/organizations/${cls.organization_id}`);
        orgName = (o.data && o.data.name) || "";
      } catch (e) {
        orgName = "";
      }
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}
