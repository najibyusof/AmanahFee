/**
 * Class screens — 09 senarai, 10 cipta, 11 butiran, 12 edit, 13 QR penuh.
 * Endpoints: /organizations/{org}/classes*, /classes/{id}/payment-setting(+qr-code),
 *            /admin/classes/{id}/participants, /admin/classes/{id}/activate
 */
import { t } from "../i18n/index.js";
import { api, ApiError } from "../api.js";
import { store } from "../store.js";
import { config } from "../config.js";
import {
  appbar,
  bottomNav,
  ADMIN_NAV,
  icon,
  esc,
  attr,
  rm,
  field,
  selectField,
  formValues,
  showErrors,
  clearErrors,
  setLoading,
  toast,
  skeletonList,
  errorState,
  emptyState,
  statusChip,
  chip,
  confirmDialog,
  bindPTR,
  pickImage,
  isValidImage,
  banner,
  dayName,
  freqLabel,
  debounce,
  copyText,
  shareContent,
  initials,
} from "../ui.js";
import { go } from "../router.js";

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const FREQS = ["weekly", "fortnightly", "monthly"];
let classSearchViewportSyncInstalled = false;

function syncClassSearchViewport() {
  const input = document.activeElement;
  const screen = input && input.id === "cls-search" ? input.closest(".screen") : null;
  if (!screen) return;

  const viewport = window.visualViewport;
  const visibleBottom = viewport
    ? viewport.offsetTop + viewport.height
    : window.innerHeight;
  const baseHeight = Number(screen.dataset.keyboardBaseHeight || visibleBottom);
  const keyboardOpen = visibleBottom < baseHeight - 120;
  screen.classList.toggle("keyboard-active", keyboardOpen);
  if (keyboardOpen)
    screen.style.setProperty("--keyboard-screen-height", `${visibleBottom}px`);
  else screen.style.removeProperty("--keyboard-screen-height");
}

function installClassSearchViewportSync() {
  if (classSearchViewportSyncInstalled) return;
  classSearchViewportSyncInstalled = true;
  if (window.visualViewport)
    window.visualViewport.addEventListener("resize", syncClassSearchViewport);
  window.addEventListener("resize", syncClassSearchViewport);
}

/* Shared: fetch every class across the admin's organizations (BR-020 context) */
async function fetchAllClasses({ orgId = null, search = "" } = {}) {
  const orgsEnv = await api.list("/admin/organizations", "organizations", {
    per_page: 100,
  });
  const orgs = orgsEnv.items;
  const target = orgId
    ? orgs.filter((o) => String(o.id) === String(orgId))
    : orgs;
  const results = await Promise.all(
    target.map(async (o) => {
      const [classList, dashboard] = await Promise.all([
        api
          .list(`/organizations/${o.id}/classes`, "classes", { per_page: 100 })
          .catch(() => ({ items: [] })),
        api.get(`/admin/organizations/${o.id}/dashboard`).catch(() => null),
      ]);
      const classes = classList.items.map((c) => ({ ...c, _org: o }));
      const total = dashboard?.data?.participants?.total;
      const participantCount =
        total !== undefined && total !== null
          ? Number(total)
          : classes.reduce((sum, c) => sum + Number(c.participant_count || 0), 0);
      return { classes, participantCount };
    }),
  );
  let classes = results.flatMap((result) => result.classes);
  if (search) {
    const q = search.toLowerCase();
    classes = classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.teacher_name || "")
          .toLowerCase()
          .includes(q),
    );
  }
  classes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return {
    orgs,
    classes,
    participantCount: results.reduce(
      (sum, result) => sum + result.participantCount,
      0,
    ),
  };
}

/* ---------------- 09: Senarai Kelas ---------------- */
export function classListScreen(ctx) {
  let orgId = ctx.query.org || "";
  let search = "";
  let state = null; // { orgs, classes }
  let filter = "all"; // all|active|inactive
  let err = null;

  const classListMarkup = () => {
    const scopedClasses = orgId
      ? state.classes.filter((c) => String(c.organization_id) === String(orgId))
      : state.classes;
    let list = scopedClasses;
    if (filter !== "all")
      list = list.filter((c) =>
        filter === "active" ? c.status === "active" : c.status !== "active",
      );
    const query = search.toLocaleLowerCase();
    if (query) {
      list = list.filter(
        (c) =>
          String(c.name || "").toLocaleLowerCase().includes(query) ||
          String(c.teacher_name || "").toLocaleLowerCase().includes(query),
      );
    }
    return list.length
      ? `<div class="list mt3">${list.map(classCard).join("")}</div>`
      : `<div class="card mt3">${emptyState({ ic: "book", title: t("cls.emptyOrg") })}</div>`;
  };

  const render = () => {
    let body;
    if (err)
      body = `<div class="card mt3">${errorState(err, 'data-act="retry"')}</div>`;
    else if (!state) body = skeletonList(4);
    else {
      const scopedClasses = orgId
        ? state.classes.filter((c) => String(c.organization_id) === String(orgId))
        : state.classes;
      // NOTE: the API has no class-level participant_type — participant type is
      // per participant row, so no student/sponsor split can be shown here.
      body = `
        <div class="stat-grid mt3">
          <div class="stat"><span class="stat-tile">${icon("book", 16)}</span>
            <div class="stat-num">${scopedClasses.length}</div><div class="stat-label">${esc(t("cls.total"))}</div>
            <div class="stat-sub">${icon("checkCircle", 12)} ${esc(t("cls.activeClasses", { n: scopedClasses.filter((c) => c.status === "active").length }))}</div></div>
          <div class="stat"><span class="stat-tile green">${icon("users", 16)}</span>
            <div class="stat-num">${state.participantCount}</div><div class="stat-label">${esc(t("cls.participants"))}</div>
            </div>
        </div>
        <div class="tabs mt3" id="cls-tabs">
          <button class="tab ${filter === "all" ? "active" : ""}" data-f="all">${esc(t("common.all"))} (${scopedClasses.length})</button>
          <button class="tab ${filter === "active" ? "active" : ""}" data-f="active">${esc(t("cls.statusActive"))} (${scopedClasses.filter((c) => c.status === "active").length})</button>
          <button class="tab ${filter === "inactive" ? "active" : ""}" data-f="inactive">${esc(t("cls.statusInactive"))} (${scopedClasses.filter((c) => c.status !== "active").length})</button>
        </div>
        <div id="class-list">${classListMarkup()}</div>`;
    }

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t("nav.classes"), bell: true, unread: store.unread, avatar: true })}
        <div class="content with-nav pad">
          <div class="flex between items-center" style="margin-top:14px">
            <div>
              <div class="eyebrow">${esc(t("cls.session", { y: new Date().getFullYear() }))}</div>
              <h1 class="h2">${esc(t("cls.title"))}</h1>
            </div>
            <button class="btn btn-primary btn-sm" data-go="#/classes/new${orgId ? `?org=${orgId}` : ""}">${icon("plus", 15)} ${esc(t("common.create"))}</button>
          </div>
          <div class="searchbar mt3">
            ${icon("search", 18)}
            <input id="cls-search" type="search" placeholder="${attr(t("cls.search"))}" value="${attr(search)}">
          </div>
          <div id="cls-body">${body}</div>
        </div>
        ${bottomNav("classes", ADMIN_NAV)}
      </div>`;

    const s = ctx.root.querySelector("#cls-search");
    const screen = ctx.root.querySelector(".screen");
    const viewport = window.visualViewport;
    installClassSearchViewportSync();
    s.addEventListener("focus", () => {
      screen.dataset.keyboardBaseHeight = String(
        viewport ? viewport.offsetTop + viewport.height : window.innerHeight,
      );
      screen.classList.add("keyboard-active");
      screen.style.setProperty(
        "--keyboard-screen-height",
        `${viewport ? viewport.offsetTop + viewport.height : window.innerHeight}px`,
      );
    });
    s.addEventListener("blur", () => {
      screen.classList.remove("keyboard-active");
      screen.style.removeProperty("--keyboard-screen-height");
      delete screen.dataset.keyboardBaseHeight;
    });
    s.addEventListener(
      "input",
      debounce(() => {
        search = s.value.trim();
        const classList = ctx.root.querySelector("#class-list");
        if (classList) classList.innerHTML = classListMarkup();
      }, 250),
    );
    ctx.root.querySelectorAll("#cls-tabs .tab").forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.f;
        render();
      }),
    );
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, load);
  };

  async function load() {
    err = null;
    state = null;
    render();
    try {
      state = await fetchAllClasses({ orgId });
    } catch (e) {
      err = e;
    }
    render();
  }
  load();
}

function classCard(c) {
  const org = c._org || c.organization || {};
  const sched =
    c.day_of_week !== undefined && c.day_of_week !== null
      ? `${dayName(c.day_of_week)}${c.day_of_week_end ? ` – ${dayName(c.day_of_week_end)}` : ""}${c.start_time ? ` | ${c.start_time.slice(0, 5)}` : ""}`
      : "—";
  return `
    <button class="row-item" data-go="#/classes/${c.id}" style="align-items:flex-start">
      <span class="row-tile">${icon("book", 18)}</span>
      <span class="row-body">
        <span class="flex between gap2">
          <span class="row-title" style="white-space:normal">${esc(c.name)}</span>
          ${statusChip(c.status)}
        </span>
        <span class="row-sub">${icon("user", 12)} ${esc(t("cls.teacherShort"))}: ${esc(c.teacher_name || "—")}</span>
        <span class="row-sub" style="color:var(--muted)">${icon("clock", 12)} ${esc(sched)}</span>
        <span class="tag-row" style="margin-top:8px">
          <span class="chip info">${icon("card", 12)} ${esc(freqLabel(c.frequency || c.recurrence_type))} (${esc(rm(c.payment_amount).replace("RM ", ""))})</span>
          <span class="chip muted">${icon("users", 12)} ${c.participant_count ?? "—"}</span>
        </span>
      </span>
      <span class="chev">${icon("chevronR", 18)}</span>
    </button>`;
}

/* ---------------- 10: Cipta Kelas ---------------- */
export async function classCreateScreen(ctx) {
  const presetOrg = ctx.query.org || "";
  let orgs = [];
  let err = null;
  let values = {
    org: presetOrg,
    type: "student",
    day: [1, 2, 3, 4],
    freq: "monthly",
    status: "active",
  };
  let qrFile = null;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`,
      );
      bindOnce();
      return;
    }
    if (!orgs.length && !err) {
      ctx.root.innerHTML = shell(skeletonList(3));
      bindOnce();
      return;
    }
    ctx.root.innerHTML = shell(`
      <div class="pad">
        <div class="card mt3" data-form>
          <div class="flex between items-center">
            <div class="eyebrow" style="color:var(--primary)">${icon("book", 13)} ${esc(t("cls.createSub"))}</div>
          </div>

          <form id="cls-form" novalidate>
              ${selectField("org", { label: t("cls.org"), req: true, options: orgs.map((o) => ({ value: o.id, label: o.name })), value: values.org, placeholder: t("cls.selectOrg") || "—" })}
            <div class="field" data-name="type">
              <div class="field-head"><label class="field-label">${esc(t("cls.type"))}</label></div>
              <div class="segmented" id="type-seg">
                <button type="button" class="seg-btn ${values.type === "student" ? "active" : ""}" data-val="student">${icon("cap", 15)} ${esc(t("cls.typeStudent"))}</button>
                <button type="button" class="seg-btn ${values.type === "sponsor" ? "active" : ""}" data-val="sponsor">${icon("handshake", 15)} ${esc(t("cls.typeSponsor"))}</button>
              </div>
              <div class="field-note">${icon("info", 14)} ${esc(t("cls.typeHint"))}</div>
            </div>

            ${field("name", { label: t("cls.name"), req: true, placeholder: "Tahfiz Al-Quran Sesi Pagi", hintRight: t("common.required"), value: values.name || "" })}
            ${field("teacher", { label: t("cls.teacher"), req: true, placeholder: "Ustaz Ahmad Baihaqi", ic: "user", value: values.teacher || "" })}

            <div class="field" data-name="days">
              <div class="field-head"><label class="field-label">${esc(t("cls.day"))}</label></div>
              <div class="tabs" id="day-tabs" style="flex-wrap:wrap">
                ${DAYS.map((d) => `<button type="button" class="tab ${values.day.includes(d) ? "active" : ""}" data-d="${d}">${esc(dayName(d))}</button>`).join("")}
              </div>
              <div class="field-note" id="days-note">${icon("calendar", 14)} ${esc(t("cls.days", { days: values.day.map(dayName).join(", ") }))}</div>
            </div>

            ${field("time", { label: t("cls.time"), req: true, type: "time", value: values.time || "08:30", ic: "clock" })}

            <div class="field" data-name="freq">
              <div class="field-head"><label class="field-label">${esc(t("cls.freq"))}<span class="req">*</span></label></div>
              <div class="segmented" id="freq-seg">
                ${FREQS.map((f) => `<button type="button" class="seg-btn ${values.freq === f ? "active" : ""}" data-val="${f}">${esc(freqLabel(f))}</button>`).join("")}
              </div>
            </div>

            ${field("amount", { label: t("cls.amount"), req: true, type: "number", inputmode: "decimal", value: values.amount || "150.00", prefix: "RM", hint: t("cls.amountHint") })}

            <div class="section-head mt6" style="margin-bottom:6px">
              <h3 class="section-title" style="font-size:15px">${icon("bank", 15)} ${esc(t("cls.bank"))}</h3>
            </div>
            ${field("bank_name", { label: t("cls.bankName"), placeholder: "Maybank Islamic", ic: "bank", value: values.bank_name || "" })}
            ${field("bank_holder", { label: t("cls.bankHolder"), placeholder: "Madrasah Tahfiz Al-Hikmah", ic: "user", value: values.bank_holder || "" })}
            ${field("bank_number", { label: t("cls.bankNumber"), placeholder: "5642 1234 8899", inputmode: "numeric", ic: "card", value: values.bank_number || "" })}

            <div class="field">
              <div class="field-head"><label class="field-label">${esc(t("cls.qr"))}</label></div>
              <div class="file-chip">
                <span class="fc-ico">${icon("qr", 18)}</span>
                <span class="grow">
                  <span class="fc-name" style="display:block">${esc(qrFile ? qrFile.name : t("cls.qrFile"))}</span>
                  <span class="fc-sub">${esc(t("cls.qrFmt"))}</span>
                </span>
                <button type="button" class="btn btn-light btn-sm" id="qr-btn">${icon("upload", 14)} ${esc(qrFile ? t("cls.qrReplace") : t("common.add"))}</button>
              </div>
            </div>

            <div class="field" data-name="status">
              <div class="field-head"><label class="field-label">${esc(t("cls.openStatus"))}</label></div>
              <div class="segmented status-grid" id="status-seg">
                <button type="button" class="seg-btn ${values.status === "active" ? "active" : ""}" data-val="active">${esc(t("cls.statusActive"))}</button>
                <button type="button" class="seg-btn ${values.status === "draft" ? "active" : ""}" data-val="draft">${esc(t("cls.statusDraft"))}</button>
                <button type="button" class="seg-btn ${values.status === "inactive" ? "active" : ""}" data-val="inactive">${esc(t("cls.statusInactive"))}</button>
                <button type="button" class="seg-btn ${values.status === "completed" ? "active" : ""}" data-val="completed">${esc(t("cls.statusCompleted"))}</button>
              </div>
              <div class="field-note">${icon("info", 14)} ${esc(t("cls.openNote"))}</div>
            </div>
          </form>
        </div>
        <div style="height:12px"></div>
      </div>
      <div class="foot with-nav">
        <button class="btn btn-primary btn-block" id="create-btn">${icon("check", 17)} ${esc(t("common.create"))}</button>
      </div>`);
    bindOnce();
  };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("cls.create"), back: true, avatar: true })}
      <div class="content with-nav with-foot pad">${body}</div>
      ${bottomNav("classes", ADMIN_NAV)}
    </div>`;

  function bindOnce() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) {
      retry.addEventListener("click", load);
      return;
    }
    const form = ctx.root.querySelector("#cls-form");
    if (!form) return;
    const card = form.closest(".card");
    const rerender = () => {
      collect(form);
      render();
    };

    const seg = (id, key) =>
      ctx.root.querySelectorAll(`#${id} .seg-btn`).forEach((b) =>
        b.addEventListener("click", () => {
          values[key] = b.dataset.val;
          rerender();
        }),
      );
    seg("type-seg", "type");
    seg("freq-seg", "freq");
    seg("status-seg", "status");

    ctx.root.querySelectorAll("#day-tabs .tab").forEach((b) =>
      b.addEventListener("click", () => {
        const d = Number(b.dataset.d);
        values.day = values.day.includes(d)
          ? values.day.filter((x) => x !== d)
          : [...values.day, d].sort();
        rerender();
      }),
    );

    ctx.root.querySelector("#qr-btn").addEventListener("click", async () => {
      try {
        const picked = await pickImage({});
        const v = isValidImage(picked, config.IMAGE_MAX_MB);
        if (!v.ok) {
          toast(
            v.okType
              ? t("pay4.tooBig", { mb: config.IMAGE_MAX_MB })
              : "PNG/JPG/WEBP sahaja",
            "err",
          );
          return;
        }
        qrFile = picked;
        rerender();
      } catch (e) {
        /* cancelled */
      }
    });

    const btn = ctx.root.querySelector("#create-btn");
    if (btn)
      btn.addEventListener("click", () =>
        form.requestSubmit
          ? form.requestSubmit()
          : form.dispatchEvent(new Event("submit", { cancelable: true })),
      );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(card);
      const v = formValues(form);
      const errs = {};
      if (!v.org) errs.org = [t("cls.noOrg")];
      if (!String(v.name || "").trim()) errs.name = [t("cls.needName")];
      if (!String(v.teacher || "").trim())
        errs.teacher = [t("cls.needTeacher")];
      if (!values.day.length) errs.days = [t("v.required")];
      if (!v.amount || Number(v.amount) <= 0)
        errs.amount = [t("cls.needAmount")];
      if (Object.keys(errs).length) {
        showErrors(card, errs);
        return;
      }

      setLoading(btn, true);
      try {
        const env = await api.post(`/organizations/${v.org}/classes`, {
          name: v.name.trim(),
          teacher_name: v.teacher.trim(),
          day_of_week: values.day[0],
          day_of_week_end:
            values.day.length > 1
              ? values.day[values.day.length - 1]
              : undefined,
          start_time: v.time || "08:30",
          recurrence_type: values.freq,
          payment_amount: Number(v.amount),
          status: values.status,
          participant_type: values.type,
        });
        const created = env.data || {};
        // payment setting (bank)
        if (v.bank_name || v.bank_number || v.bank_holder) {
          try {
            await api.put(`/classes/${created.id}/payment-setting`, {
              required_amount: Number(v.amount),
              payment_frequency: values.freq,
              bank_name: v.bank_name || null,
              bank_account_name: v.bank_holder || null,
              bank_account_number: v.bank_number || null,
              allow_additional_infaq: true,
            });
          } catch (eSet) {
            /* record issue but continue */
          }
        }
        if (qrFile) {
          try {
            await api.upload(`/classes/${created.id}/payment-setting/qr-code`, {
              file: {
                field: "qr_code",
                blob: qrFile.blob,
                filename: qrFile.name,
              },
            });
          } catch (eQr) {
            toast(eQr.message || "QR gagal dimuat naik", "err");
          }
        }
        setLoading(btn, false);
        toast(t("cls.created"), "ok");
        go(`#/classes/${created.id}`, { replace: true });
      } catch (err2) {
        setLoading(btn, false);
        if (err2 instanceof ApiError && err2.isValidation)
          showErrors(card, err2.errors, t("err.validation"));
        else showErrors(card, {}, err2.message || t("err.generic"));
      }
    });
  }

  function collect(form) {
    const v = formValues(form);
    values = { ...values, ...v };
  }

  async function load() {
    err = null;
    orgs = [];
    render();
    try {
      const r = await api.list("/admin/organizations", "organizations", {
        per_page: 100,
      });
      orgs = r.items;
      if (!values.org && orgs.length) values.org = String(orgs[0].id);
    } catch (e) {
      err = e;
    }
    render();
  }
  await load();
}

/* ---------------- 11: Butiran Kelas ---------------- */
export function classDetailScreen(ctx) {
  const id = ctx.params.id;
  let cls = null;
  let setting = null;
  let participants = null;
  let err = null;

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

    const orgName = cls._orgName || "";
    const cap =
      cls.participant_count ?? (participants ? participants.length : "—");
    const schedule =
      cls.day_of_week !== undefined && cls.day_of_week !== null
        ? `${dayName(cls.day_of_week)}${cls.day_of_week_end ? ` – ${dayName(cls.day_of_week_end)}` : ""}${cls.start_time ? `\n${cls.start_time.slice(0, 5)}${cls.end_time ? ` – ${cls.end_time.slice(0, 5)}` : ""}` : ""}`
        : "—";
    const bank = setting || cls.payment_setting || {};

    ctx.root.innerHTML = shell(`
      <div class="pad">
        <div class="card mt3" style="position:relative;overflow:hidden">
          <div class="flex gap2 items-center">
            ${statusChip(cls.status)}
            <span class="grow"></span>
            <span class="row-tile" style="border-radius:12px">${icon("book", 17)}</span>
          </div>
          <div class="h2 mt3">${esc(cls.name)}</div>
          <div class="row-sub" style="margin-top:6px">${icon("building", 13)} ${esc(orgName)}</div>
          <div class="stat-grid mt3" style="gap:10px;grid-template-columns:1fr 1fr">
            <div class="flex items-center gap2">
              <span class="row-tile" style="width:34px;height:34px">${icon("users", 15)}</span>
              <span><span class="stat-label" style="margin:0">${esc(t("cls.capacity"))}</span><br><span class="strong" style="font-size:15px">${esc(t("cls.pesertaCount", { n: cap }))}</span></span>
            </div>
            <div class="flex items-center gap2">
              <span class="row-tile green" style="width:34px;height:34px">${icon("dollar", 15)}</span>
              <span><span class="stat-label" style="margin:0">${esc(t("cls.fee"))}</span><br><span class="strong blue-txt" style="font-size:15px">${esc(rm(cls.payment_amount))}</span></span>
            </div>
          </div>
        </div>

        <div class="section" style="margin-top:16px">
          <div class="section-head">
            <h2 class="section-title">${icon("info", 15)} ${esc(t("cls.info"))}</h2>
          </div>
          <div class="card stack" style="gap:0">
            ${infoRow("user", t("cls.teacherLbl"), cls.teacher_name || "—")}
            ${infoRow("calendar", t("cls.scheduleLbl"), schedule.replace(/\n/g, " · "))}
            ${infoRow("card", t("cls.freqAmt"), `${rm(cls.payment_amount)} ${esc(t("cls.perMonth", { label: freqLabel(cls.frequency || cls.recurrence_type) }))}`)}
            ${infoRow("users", t("cls.regStatus"), t("cls.registered", { n: cap }))}
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title">${icon("bank", 15)} ${esc(t("cls.bankCard"))}</h2>
            ${bank.bank_account_number ? `<span class="chip ok">${icon("checkCircle", 12)} ${esc(t("cls.verified"))}</span>` : ""}
          </div>
          <div class="card">
            <div class="flex gap3 items-center">
              <div class="qr-holder" style="width:104px;height:104px;flex:none;border:1px solid var(--line-2)">
                ${bank.qr_code_url ? `<img src="${attr(bank.qr_code_url)}" alt="QR" style="width:88px;height:88px">` : icon("qr", 40)}
              </div>
              <div class="grow">
                <div class="stat-label">${esc(t("cls.institution"))}</div>
                <div class="strong" style="font-size:15px">${icon("dot", 12)} ${esc(bank.bank_name || "—")}</div>
                <div class="stat-label mt2">${esc(t("cls.holder"))}</div>
                <div class="strong" style="font-size:14px">${esc(bank.bank_account_name || "—")}</div>
              </div>
            </div>
            ${
              bank.bank_account_number
                ? `
              <div class="file-chip mt3">
                <span class="grow">
                  <span class="fc-sub">${esc(t("cls.accountNo"))}</span>
                  <span class="fc-name mono blue-txt" style="font-size:15px">${esc(bank.bank_account_number)}</span>
                </span>
                <button class="icon-btn" id="copy-acct" aria-label="${attr(t("common.copy"))}">${icon("copy", 17)}</button>
              </div>`
                : ""
            }
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2 class="section-title">${esc(t("cls.manage"))}</h2>
            <span class="section-sub">${esc(t("cls.manageSub", { n: 6 }))}</span>
          </div>
          <div class="list">
            ${actionRow("edit", t("common.edit"), t("cls.edit"), `#/classes/${id}/edit`)}
            ${actionRow("qr", t("cls.qrFull"), t("cls.qrFullSub"), `#/classes/${id}/qr`)}
            <button class="action-row" id="share-qr">
              <span class="row-tile">${icon("share", 18)}</span>
              <span class="grow"><span class="ar-t" style="display:block">${esc(t("cls.shareQr"))}</span><span class="ar-s" style="display:block">${esc(t("cls.shareQrSub"))}</span></span>
              <span class="chev">${icon("chevronR", 17)}</span>
            </button>
            ${actionRow("users", `${t("cls.viewParticipants")} (${cap})`, t("cls.viewParticipantsSub", { kind: t("cls.pesertaWord") }), `#/classes/${id}/participants`)}
            ${actionRow("userPlus", t("cls.addParticipant"), t("cls.addParticipantSub"), `#/classes/${id}/participants/add`)}
            ${actionRow("card", t("cls.viewPayments"), t("cls.viewPaymentsSub"), `#/payments?class_id=${id}${cls.organization_id ? `&organization_id=${cls.organization_id}` : ""}`)}
            <button class="action-row danger" id="del-cls">
              <span class="row-tile red">${icon("trash", 18)}</span>
              <span class="grow">
                <span class="ar-t" style="display:block">${esc(t("cls.delete"))}</span>
                <span class="ar-s" style="display:block">${esc(t("cls.deleteSub"))}</span>
              </span>
              <span class="chev" style="color:var(--danger)">${icon("chevronR", 17)}</span>
            </button>
          </div>
        </div>

        <div class="mt3">${banner("grey", esc(t("cls.footer")), "shieldCheck")}</div>
        ${cls.status === "draft" ? `<div class="mt3"><button class="btn btn-primary btn-block" id="activate-btn">${icon("sparkle", 17)} ${esc(t("cls.activate"))}</button><div class="note">${esc(t("cls.activateHint"))}</div></div>` : ""}
      </div>`);

    bind();
  };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("cls.detail"), back: true, avatar: true })}
      <div class="content pad">${body}</div>
    </div>`;

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);

    const copy = ctx.root.querySelector("#copy-acct");
    if (copy)
      copy.addEventListener("click", () =>
        copyText(
          String(
            (setting || cls.payment_setting || {}).bank_account_number || "",
          ).replace(/\s/g, ""),
        ),
      );

    const share = ctx.root.querySelector("#share-qr");
    if (share)
      share.addEventListener("click", async () => {
        const bank2 = setting || cls.payment_setting || {};
        const text = `${cls.name} — ${t("cls.fee")}: ${rm(cls.payment_amount)}\n${t("cls.bankName")}: ${bank2.bank_name || "-"}\n${t("cls.accountNo")}: ${bank2.bank_account_number || "-"}\n${bank2.qr_code_url || ""}`;
        await shareContent({ text, subject: cls.name });
      });

    const act = ctx.root.querySelector("#activate-btn");
    if (act)
      act.addEventListener("click", async () => {
        setLoading(act, true);
        try {
          await api.post(`/admin/classes/${id}/activate`, {});
          setLoading(act, false);
          toast(t("cls.activated"), "ok");
          load();
        } catch (e) {
          setLoading(act, false);
          toast(e.message || t("err.generic"), "err");
        }
      });

    const delCls = ctx.root.querySelector("#del-cls");
    if (delCls)
      delCls.addEventListener("click", async () => {
        const yes = await confirmDialog({
          title: t("cls.delete"),
          text: t("cls.deleteConfirm", { name: cls.name }),
          ok: t("common.delete"),
          danger: true,
        });
        if (!yes) return;
        setLoading(delCls, true);
        try {
          await api.del(`/organizations/${cls.organization_id}/classes/${id}`);
          setLoading(delCls, false);
          toast(t("cls.deleted"), "ok");
          go("#/classes", { replace: true });
        } catch (e) {
          setLoading(delCls, false);
          toast(e.message || t("err.generic"), "err");
        }
      });

    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, load);
  }

  async function load() {
    err = null;
    cls = null;
    render();
    try {
      const env = await api.get(`/classes/${id}`);
      cls = env.data;
      try {
        const p = await api
          .list(
            `/admin/classes/${id}/participants`,
            "participants",
            { per_page: 100 },
          )
          .catch(() => null);
        participants = p ? p.items : null;
        if (Array.isArray(participants))
          cls.participant_count = participants.filter(
            (participant) => participant.status !== "removed",
          ).length;
      } catch (eP) {
        /* noop */
      }
      try {
        const s = await api.get(`/classes/${id}/payment-setting`);
        setting = s.data;
      } catch (eS) {
        setting = cls.payment_setting || null;
      }
      // organization name for the header
      try {
        const o = await api.get(`/admin/organizations/${cls.organization_id}`);
        cls._orgName = o.data && o.data.name;
      } catch (eO) {
        cls._orgName = "";
      }
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}

function infoRow(ic, k, v) {
  return `
    <div class="flex gap3 items-center" style="padding:11px 0;border-bottom:1px dashed var(--line-2)">
      <span class="row-tile" style="width:36px;height:36px">${icon(ic, 16)}</span>
      <span class="grow">
        <span class="stat-label" style="margin:0;display:block">${esc(k)}</span>
        <span class="strong" style="font-size:14.5px">${esc(v)}</span>
      </span>
    </div>`;
}
function actionRow(ic, title, sub, dest) {
  return `
    <button class="action-row" data-go="${attr(dest)}">
      <span class="row-tile">${icon(ic, 18)}</span>
      <span class="grow"><span class="ar-t" style="display:block">${esc(title)}</span><span class="ar-s" style="display:block">${esc(sub)}</span></span>
      <span class="chev">${icon("chevronR", 17)}</span>
    </button>`;
}

/* ---------------- 12: Edit Kelas ---------------- */
export function classEditScreen(ctx) {
  const id = ctx.params.id;
  let cls = null;
  let setting = null;
  let err = null;
  let qrFile = null;
  let values = {};

  const render = () => {
    if (err) {
      ctx.root.innerHTML = `
        <div class="screen">${appbar({ title: t("cls.edit"), back: true, avatar: false })}
        <div class="content pad"><div class="card mt4">${errorState(err, 'data-act="retry"')}</div></div></div>`;
      ctx.root
        .querySelector('[data-act="retry"]')
        .addEventListener("click", load);
      return;
    }
    if (!cls) {
      ctx.root.innerHTML = `
        <div class="screen">${appbar({ title: t("cls.edit"), back: true, avatar: false })}
        <div class="content pad" style="padding-top:16px">${skeletonList(3, true)}</div></div>`;
      return;
    }
    const bank = setting || cls.payment_setting || {};
    values = {
      name: cls.name || "",
      teacher: cls.teacher_name || "",
      day: Number(cls.day_of_week ?? 1),
      time: (cls.start_time || "08:30").slice(0, 5),
      freq: cls.recurrence_type || cls.frequency || "monthly",
      amount: cls.payment_amount || "0.00",
      status: cls.status || "draft",
      bank_name: bank.bank_name || "",
      bank_holder: bank.bank_account_name || "",
      bank_number: bank.bank_account_number || "",
    };

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t("cls.edit"), back: true, avatar: true })}
        <div class="content with-foot pad">
          <div class="card flat mt3">
            <div class="flex items-center gap2">
              <span class="row-tile" style="width:36px;height:36px">${icon("book", 16)}</span>
              <span class="grow strong">${esc(cls.name)}</span>
              <span class="chip muted mono" style="font-size:10px">ID Kelas: #${cls.id}</span>
              ${statusChip(cls.status)}
            </div>
          </div>

          <div class="section" style="margin-top:16px">
            <div class="card" data-form>
              <form id="cls-edit" novalidate>
                <div class="field">
                  <div class="field-head"><label class="field-label">${esc(t("nav.orgs"))}</label></div>
                  <input class="input" value="${attr(cls._orgName || "—")}" disabled>
                </div>

                <div class="section-head mt6" style="margin-bottom:6px"><h3 class="section-title" style="font-size:15px">${icon("calendar", 14)} ${esc(t("cls.info"))}</h3></div>
                ${field("name", { label: t("cls.name"), req: true, value: values.name })}
                ${field("teacher", { label: t("cls.teacherLbl"), req: true, value: values.teacher, ic: "user" })}
                <div class="field" data-name="days">
                  <div class="field-head"><label class="field-label">${esc(t("cls.day"))}<span class="req">*</span></label></div>
                  <div class="tabs" id="day-tabs" style="flex-wrap:wrap">
                    ${DAYS.map((d) => `<button type="button" class="tab ${values.day === d ? "active" : ""}" data-d="${d}">${esc(dayName(d))}</button>`).join("")}
                  </div>
                </div>
                ${field("time", { label: t("cls.timeShort"), req: true, type: "time", value: values.time, ic: "clock" })}

                <div class="section-head mt6" style="margin-bottom:6px"><h3 class="section-title" style="font-size:15px">${icon("dollar", 14)} ${esc(t("cls.amount"))}</h3></div>
                <div class="field" data-name="freq">
                  <div class="field-head"><label class="field-label">${esc(t("cls.freq"))}</label></div>
                  <div class="segmented" id="freq-seg">
                    ${FREQS.map((f) => `<button type="button" class="seg-btn ${values.freq === f ? "active" : ""}" data-val="${f}">${esc(freqLabel(f))}</button>`).join("")}
                  </div>
                </div>
                ${field("amount", { label: t("cls.amountEach"), req: true, type: "number", inputmode: "decimal", value: values.amount, prefix: "RM" })}

                <div class="section-head mt6" style="margin-bottom:6px"><h3 class="section-title" style="font-size:15px">${icon("bank", 14)} ${esc(t("cls.bank"))}</h3></div>
                ${field("bank_name", { label: t("cls.bankName"), value: values.bank_name })}
                ${field("bank_holder", { label: t("cls.bankHolder"), value: values.bank_holder })}
                ${field("bank_number", { label: t("cls.bankNumber"), value: values.bank_number, inputmode: "numeric" })}

                <div class="field">
                  <div class="field-head"><label class="field-label">${esc(t("cls.qr"))}</label></div>
                  <div class="file-chip">
                    <span class="fc-ico">${icon("qr", 18)}</span>
                    <span class="grow">
                      <span class="fc-name" style="display:block">${esc(qrFile ? qrFile.name : bank.qr_code_url ? t("cls.qrReady") : t("cls.qrFile"))}</span>
                      <span class="fc-sub">${esc(t("cls.qrFmt"))}</span>
                    </span>
                    <button type="button" class="btn btn-light btn-sm" id="qr-btn">${icon("upload", 14)} ${esc(t("cls.qrReplace"))}</button>
                  </div>
                </div>

                <div class="field" data-name="status">
                  <div class="field-head"><label class="field-label">${esc(t("cls.openStatus"))}</label></div>
                  <div class="segmented status-grid" id="status-seg">
                    <button type="button" class="seg-btn ${values.status === "active" ? "active" : ""}" data-val="active">${esc(t("cls.statusActive"))}</button>
                    <button type="button" class="seg-btn ${values.status === "draft" ? "active" : ""}" data-val="draft">${esc(t("cls.statusDraft"))}</button>
                    <button type="button" class="seg-btn ${values.status === "inactive" ? "active" : ""}" data-val="inactive">${esc(t("cls.statusInactive"))}</button>
                    <button type="button" class="seg-btn ${values.status === "completed" ? "active" : ""}" data-val="completed">${esc(t("cls.statusCompleted"))}</button>
                  </div>
                  <div class="field-note">${icon("info", 14)} ${esc(t("cls.openNote"))}</div>
                </div>
              </form>
            </div>
          </div>
          <div style="height:12px"></div>
        </div>
        <div class="foot">
          <button class="btn btn-primary btn-block" id="save-btn">${icon("check", 17)} ${esc(t("common.saveChanges"))}</button>
          <button class="center-link" data-act="back">${esc(t("common.cancel"))}</button>
        </div>
      </div>`;
    bind();
  };

  function bind() {
    const form = ctx.root.querySelector("#cls-edit");
    if (!form) return;
    const card = form.closest(".card");

    const seg = (id, key) =>
      ctx.root.querySelectorAll(`#${id} .seg-btn`).forEach((b) =>
        b.addEventListener("click", () => {
          ctx.root
            .querySelectorAll(`#${id} .seg-btn`)
            .forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          values[key] = b.dataset.val;
        }),
      );
    seg("freq-seg", "freq");
    seg("status-seg", "status");
    ctx.root.querySelectorAll("#day-tabs .tab").forEach((b) =>
      b.addEventListener("click", () => {
        ctx.root
          .querySelectorAll("#day-tabs .tab")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        values.day = Number(b.dataset.d);
      }),
    );

    ctx.root.querySelector("#qr-btn").addEventListener("click", async () => {
      try {
        const picked = await pickImage({});
        const v = isValidImage(picked, config.IMAGE_MAX_MB);
        if (!v.ok) {
          toast(
            v.okType
              ? t("pay4.tooBig", { mb: config.IMAGE_MAX_MB })
              : "PNG/JPG/WEBP sahaja",
            "err",
          );
          return;
        }
        setLoading(ctx.root.querySelector("#qr-btn"), true);
        try {
          await api.upload(`/classes/${id}/payment-setting/qr-code`, {
            file: {
              field: "qr_code",
              blob: picked.blob,
              filename: picked.name,
            },
          });
          qrFile = picked;
          toast("QR dimuat naik", "ok");
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
      if (!String(v.name || "").trim()) errs.name = [t("cls.needName")];
      if (!String(v.teacher || "").trim())
        errs.teacher = [t("cls.needTeacher")];
      if (!v.amount || Number(v.amount) <= 0)
        errs.amount = [t("cls.needAmount")];
      if (Object.keys(errs).length) {
        showErrors(card, errs);
        return;
      }
      const btn = ctx.root.querySelector("#save-btn");
      setLoading(btn, true);
      try {
        await api.put(`/organizations/${cls.organization_id}/classes/${id}`, {
          name: v.name.trim(),
          teacher_name: v.teacher.trim(),
          day_of_week: values.day,
          start_time: v.time,
          recurrence_type: values.freq,
          payment_amount: Number(v.amount),
          status: values.status,
        });
        await api.put(`/classes/${id}/payment-setting`, {
          required_amount: Number(v.amount),
          payment_frequency: values.freq,
          bank_name: v.bank_name || null,
          bank_account_name: v.bank_holder || null,
          bank_account_number: v.bank_number || null,
        });
        setLoading(btn, false);
        toast(t("cls.saved"), "ok");
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
    cls = null;
    render();
    try {
      const env = await api.get(`/classes/${id}`);
      cls = env.data;
      try {
        const s = await api.get(`/classes/${id}/payment-setting`);
        setting = s.data;
      } catch (e) {
        setting = cls.payment_setting || null;
      }
      try {
        const o = await api.get(`/admin/organizations/${cls.organization_id}`);
        cls._orgName = o.data && o.data.name;
      } catch (e) {
        cls._orgName = "";
      }
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}

/* ---------------- 13: QR Saiz Penuh ---------------- */
export function qrFullScreen(ctx) {
  const id = ctx.params.id;
  let cls = null;
  let setting = null;
  let err = null;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = `
        <div class="screen">${appbar({ title: t("qr.title"), back: true, avatar: false })}
        <div class="content pad"><div class="card mt4">${errorState(err, 'data-act="retry"')}</div></div></div>`;
      ctx.root
        .querySelector('[data-act="retry"]')
        .addEventListener("click", load);
      return;
    }
    if (!cls) {
      ctx.root.innerHTML = `
        <div class="screen">${appbar({ title: t("qr.title"), back: true, avatar: false })}
        <div class="content pad" style="padding-top:16px">${skeletonList(2, true)}</div></div>`;
      return;
    }
    const b = setting || {};
    const ref =
      cls.code ||
      (cls.name || "")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 4)
        .toUpperCase();

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t("qr.title"), back: true, avatar: true })}
        <div class="content with-foot pad">
          <div class="center mt3"><span class="chip info">${icon("qr", 12)} ${esc(t("qr.official"))}</span></div>

          <div class="card mt3">
            <div class="flex between items-center">
              <span class="chip info">${icon("book", 12)} ${esc(cls.name)}</span>
              ${statusChip(cls.status)}
            </div>
            <div class="center mt3">
              <div class="strong" style="font-size:15px">${esc(cls._orgName || "")}</div>
              <div class="small muted">${esc(t("qr.class", { ref }))}</div>
            </div>
            <div class="center mt3"><span class="chip" style="background:var(--danger-bg);color:var(--danger)">${icon("qr", 12)} ${esc(t("qr.badge"))}</span></div>
            <div class="qr-frame mt3">
              ${
                b.qr_code_url
                  ? `<img src="${attr(b.qr_code_url)}" alt="QR" id="qr-img" onclick="this.style.width=this.style.width?'':'100%'">`
                  : `<div class="empty-ico" style="margin:20px auto">${icon("qr", 30)}</div>`
              }
              <div class="small muted mt2">${icon("checkCircle", 13)} ${esc(t("qr.verified"))}</div>
            </div>
            <div class="hero mt3" style="padding:14px 16px">
              <div class="hero-row">
                <div><div class="eyebrow">${esc(t("qr.rate"))}</div><div class="strong" style="font-size:20px">${esc(rm(cls.payment_amount))}</div></div>
                <span class="pill-light">${esc(freqLabel(cls.frequency || cls.recurrence_type))}</span>
              </div>
            </div>
          </div>

          <div class="card mt3">
            <div class="flex between items-center">
              <div class="flex gap2 items-center">${icon("bank", 16)}<span class="strong">${esc(t("qr.bank"))}</span></div>
              <span class="chip info">${esc(t("qr.bankNow"))}</span>
            </div>
            <div class="kv mt3">
              <div class="kv-row"><span class="kv-k">${esc(t("qr.bankName"))}</span><span class="kv-v">${icon("dot", 10)} ${esc(b.bank_name || "—")}</span></div>
              <div class="kv-row"><span class="kv-k">${esc(t("qr.payer"))}</span><span class="kv-v">${esc(b.bank_account_name || "—")}</span></div>
            </div>
            <div class="file-chip mt3">
              <span class="grow">
                <span class="fc-sub">${esc(t("qr.account"))}</span>
                <span class="fc-name mono blue-txt" style="font-size:16px">${esc(b.bank_account_number || "—")}</span>
              </span>
              <button class="btn btn-light btn-sm" id="copy-btn">${icon("copy", 15)} ${esc(t("common.copy"))}</button>
            </div>
          </div>

          <div class="mt3">${banner("", esc(t("qr.info")), "info")}</div>
          <div style="height:8px"></div>
        </div>
        <div class="foot">
          <button class="btn btn-primary btn-block" id="share-btn">${icon("share", 17)} ${esc(t("qr.share"))}</button>
          <button class="btn btn-soft btn-block mt2" id="dl-btn">${icon("download", 17)} ${esc(t("qr.download"))}</button>
        </div>
      </div>`;

    ctx.root
      .querySelector("#copy-btn")
      .addEventListener("click", () =>
        copyText(String(b.bank_account_number || "").replace(/\s/g, "")),
      );
    ctx.root.querySelector("#share-btn").addEventListener("click", async () => {
      const text = `${cls.name} — ${cls._orgName || ""}\n${t("qr.rate")}: ${rm(cls.payment_amount)}\n${t("qr.bankName")}: ${b.bank_name || "-"}\n${t("qr.account")}: ${b.bank_account_number || "-"}\n${b.qr_code_url || ""}`;
      await shareContent({ text, subject: cls.name, file: "" });
    });
    const dl = ctx.root.querySelector("#dl-btn");
    dl.addEventListener("click", async () => {
      if (!b.qr_code_url) {
        toast(t("qr.noQr"), "err");
        return;
      }
      await shareContent({ text: cls.name, file: b.qr_code_url });
    });
  };

  async function load() {
    err = null;
    cls = null;
    render();
    try {
      const env = await api.get(`/classes/${id}`);
      cls = env.data;
      try {
        const s = await api.get(`/classes/${id}/payment-setting`);
        setting = s.data;
      } catch (e) {
        setting = cls.payment_setting || null;
      }
      try {
        const o = await api.get(`/admin/organizations/${cls.organization_id}`);
        cls._orgName = o.data && o.data.name;
      } catch (e) {
        cls._orgName = "";
      }
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}
