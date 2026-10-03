/**
 * Admin payment screens — 17 senarai, 18 butiran, 19 pengesahan, 20 peringatan.
 * Endpoints: GET /admin/payments, GET /admin/reports/payment-summary,
 *            GET /payments/{id}(+/proofs,+/transactions), PUT /payments/{id},
 *            PUT /payment-proofs/{id}, POST /payment-schedules/{id}/reminder
 */
import { t } from "../i18n/index.js";
import { api, ApiError } from "../api.js";
import { store } from "../store.js";
import {
  appbar,
  bottomNav,
  SA_NAV,
  icon,
  esc,
  attr,
  rm,
  fmtDate,
  fmtDateTime,
  statusChip,
  chip,
  methodLabel,
  field,
  formValues,
  showErrors,
  clearErrors,
  setLoading,
  toast,
  skeletonList,
  errorState,
  emptyState,
  confirmDialog,
  bindPTR,
  banner,
  initials,
  debounce,
  openSheet,
  shareContent,
} from "../ui.js";
import { go } from "../router.js";

const isPdf = (u, mime) =>
  /pdf$/i.test(String(mime || "")) || /\.pdf($|\?)/i.test(String(u || ""));

/* ---------------- 17: Senarai Pembayaran ---------------- */
export function paymentListScreen(ctx) {
  let orgId = ctx.query.organization_id || "";
  let classId = ctx.query.class_id || "";
  let participantName = "";
  let organizationName = "";
  let className = "";
  let paymentAtFrom = "";
  let paymentAtTo = "";
  let verifiedAtFrom = "";
  let verifiedAtTo = "";
  let queryMode = "list";
  let filterStatus = "";
  let paymentMethod = "";
  let fromDate = "";
  let toDate = "";
  let status = ctx.query.remind ? "pending" : "all";
  let q = "";
  let items = null;
  let orgs = [];
  let classes = [];
  let summary = null;
  let page = 1;
  let lastPage = 1;
  let err = null;

  const filtered = () => {
    if (!items) return [];
    let list = items;
    if (orgId)
      list = list.filter(
        (p) => p.organization && String(p.organization.id) === String(orgId),
      );
    if (classId)
      list = list.filter(
        (p) => p.class && String(p.class.id) === String(classId),
      );
    if (status === "pending")
      list = list.filter(
        (p) => p.status === "pending" || p.status === "initiated",
      );
    else if (status === "paid") list = list.filter((p) => p.status === "paid");
    else if (status === "reminded")
      list = list.filter(
        (p) => p.reminded || p.status === "failed" || p.status === "overdue",
      );
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(
        (p) =>
          (p.payer && p.payer.name.toLowerCase().includes(s)) ||
          String(p.reference_number || "")
            .toLowerCase()
            .includes(s),
      );
    }
    return list;
  };

  const counts = () => ({
    all: (items || []).length,
    pending: (items || []).filter(
      (p) => p.status === "pending" || p.status === "initiated",
    ).length,
    paid: (items || []).filter((p) => p.status === "paid").length,
    reminded: (items || []).filter(
      (p) => p.reminded || p.status === "failed" || p.status === "overdue",
    ).length,
  });

  const render = () => {
    let body;
    if (err)
      body = `<div class="card mt3">${errorState(err, 'data-act="retry"')}</div>`;
    else if (items === null) body = skeletonList(4);
    else {
      const list = filtered();
      const c = counts();
      body = `
        ${
          c.pending > 0
            ? `
        <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
          <div class="flex gap3 items-center">
            <span class="row-tile" style="width:40px;height:40px">${icon("clock", 18)}</span>
            <span class="grow">
              <span class="strong" style="display:block;font-size:15.5px">${esc(t("pay.pendingReview", { n: c.pending }))}</span>
              <span class="small muted">${esc(t("pay.pendingSub"))}</span>
            </span>
            <span class="chip navy">${esc(t("pay.urgent"))}</span>
          </div>
        </div>`
            : ""
        }

        <div class="eyebrow mt4">${esc(t("pay.org"))}</div>
        <div class="select-wrap mt2">
          <select class="select" id="f-org">
            <option value="">${esc(t("pay.allOrgs"))}</option>
            ${orgs.map((o) => `<option value="${o.id}" ${String(o.id) === String(orgId) ? "selected" : ""}>${esc(o.name)}</option>`).join("")}
          </select>
          <span class="sel-ico">${icon("chevronD", 17)}</span>
        </div>

        ${
          store.isSuperAdmin
            ? `
          <div class="field mt3">
            <label class="field-label" for="f-class">${esc(t("pay.class"))}</label>
            <input class="input" id="f-class" type="number" min="1" inputmode="numeric" placeholder="${attr(t("pay.filterClassId"))}" value="${attr(classId)}">
          </div>`
            : `
          <div class="eyebrow mt3">${esc(t("pay.class"))}</div>
          <div class="select-wrap mt2">
            <select class="select" id="f-class">
              <option value="">${esc(t("pay.allClasses"))}</option>
              ${classes
                .filter(
                  (cl) =>
                    !orgId || String(cl.organization_id) === String(orgId),
                )
                .map(
                  (cl) =>
                    `<option value="${cl.id}" ${String(cl.id) === String(classId) ? "selected" : ""}>${esc(cl.name)}${cl.payment_amount ? ` — ${esc(rm(cl.payment_amount))} / ${esc((cl.frequency || "").slice(0, 3))}` : ""}</option>`,
                )
                .join("")}
            </select>
            <span class="sel-ico">${icon("chevronD", 17)}</span>
          </div>`
        }

        <div class="searchbar mt3">
          ${icon("search", 18)}
          <input id="pay-search" type="search" placeholder="${attr(t("pay.search"))}" value="${attr(q)}">
        </div>

        ${
          store.isSuperAdmin
            ? `
            <details class="payment-filter-accordion card mt3">
              <summary class="payment-filter-summary"><span>${esc(t("pay.filters"))}</span>${icon("chevronD", 18)}</summary>
              <div class="payment-filter-content">
            <div class="stat-grid mt2">
              <div class="field"><label class="field-label" for="f-participant-name">${esc(t("pay.filterParticipantName"))}</label><input class="input" id="f-participant-name" type="search" value="${attr(participantName)}"></div>
              <div class="field"><label class="field-label" for="f-status">${esc(t("pay.filterStatus"))}</label>
                <select class="select" id="f-status">
                  <option value="">${esc(t("pay.filterAny"))}</option>
                  ${[
                    ["pending", "st.pending"],
                    ["initiated", "st.initiated"],
                    ["paid", "st.paid"],
                    ["failed", "st.failed"],
                    ["refunded", "st.refunded"],
                  ]
                    .map(
                      ([value, label]) =>
                        `<option value="${value}" ${filterStatus === value ? "selected" : ""}>${esc(t(label))}</option>`,
                    )
                    .join("")}
                </select>
              </div>
              <div class="field"><label class="field-label" for="f-method">${esc(t("pay.filterMethod"))}</label>
                <select class="select" id="f-method">
                  <option value="">${esc(t("pay.filterAny"))}</option>
                  ${["qr", "bank_transfer", "manual", "merchant"].map((value) => `<option value="${value}" ${paymentMethod === value ? "selected" : ""}>${esc(methodLabel(value))}</option>`).join("")}
                </select>
              </div>
              <div class="field"><label class="field-label" for="f-from">${esc(t("pay.filterFrom"))}</label><input class="input" id="f-from" type="date" value="${attr(fromDate)}"></div>
              <div class="field"><label class="field-label" for="f-to">${esc(t("pay.filterTo"))}</label><input class="input" id="f-to" type="date" value="${attr(toDate)}"></div>
            </div>
            <div class="flex gap2 mt2">
              <button type="button" class="btn btn-primary btn-sm" id="apply-pay-filters">${esc(t("common.filter"))}</button>
              <button type="button" class="btn btn-soft btn-sm" id="reset-pay-filters">${esc(t("pay.filterReset"))}</button>
            </div>
            </div>
          </details>
          <details class="payment-filter-accordion card mt3">
            <summary class="payment-filter-summary"><span>${esc(t("pay.searchAdvanced"))}</span>${icon("chevronD", 18)}</summary>
            <div class="payment-filter-content">
            <div class="stat-grid mt2">
              <div class="field"><label class="field-label" for="f-org-name">${esc(t("pay.filterOrganizationName"))}</label><input class="input" id="f-org-name" type="search" value="${attr(organizationName)}"></div>
              <div class="field"><label class="field-label" for="f-class-name">${esc(t("pay.filterClassName"))}</label><input class="input" id="f-class-name" type="search" value="${attr(className)}"></div>
              <div class="field"><label class="field-label" for="f-payment-from">${esc(t("pay.filterPaymentAtFrom"))}</label><input class="input" id="f-payment-from" type="date" value="${attr(paymentAtFrom)}"></div>
              <div class="field"><label class="field-label" for="f-payment-to">${esc(t("pay.filterPaymentAtTo"))}</label><input class="input" id="f-payment-to" type="date" value="${attr(paymentAtTo)}"></div>
              <div class="field"><label class="field-label" for="f-verified-from">${esc(t("pay.filterVerifiedAtFrom"))}</label><input class="input" id="f-verified-from" type="date" value="${attr(verifiedAtFrom)}"></div>
              <div class="field"><label class="field-label" for="f-verified-to">${esc(t("pay.filterVerifiedAtTo"))}</label><input class="input" id="f-verified-to" type="date" value="${attr(verifiedAtTo)}"></div>
            </div>
            <button type="button" class="btn btn-primary btn-sm mt2" id="search-payments">${esc(t("pay.searchAdvancedAction"))}</button>
            </div>
          </details>`
            : ""
        }

        <div class="tabs mt3" id="pay-tabs">
          <button class="tab ${status === "all" ? "active" : ""}" data-s="all">${esc(t("pay.tabAll"))}<span class="cnt">(${c.all})</span></button>
          <button class="tab ${status === "pending" ? "active" : ""}" data-s="pending">${esc(t("pay.tabPending"))}<span class="cnt">(${c.pending})</span></button>
          <button class="tab ${status === "paid" ? "active" : ""}" data-s="paid">${esc(t("pay.tabPaid"))}<span class="cnt">(${c.paid})</span></button>
          <button class="tab ${status === "reminded" ? "active" : ""}" data-s="reminded">${esc(t("pay.tabReminded"))}<span class="cnt">(${c.reminded})</span></button>
        </div>

        <div class="flex between items-center mt3">
          <span class="eyebrow">${esc(t("pay.list"))}</span>
          <span class="small blue-txt bold">${esc(t("pay.showingN", { n: filtered().length }))}</span>
        </div>

        <div class="list mt2" id="pay-list">
          ${
            filtered().length
              ? filtered().map(payCard).join("")
              : `<div class="card">${emptyState({ ic: "card", title: t("pay.empty"), text: t("pay.emptySub") })}</div>`
          }
        </div>
        ${lastPage > 1 && page < lastPage ? `<button class="btn btn-soft btn-block mt3" id="more-btn">${icon("chevronD", 16)} ${esc(t("common.more"))}</button>` : ""}
        <div style="height:16px"></div>`;
    }

    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t("pay.title"), bell: true, unread: store.unread, avatar: true })}
        <div class="content with-nav pad">
          <div id="pay-body" style="padding-top:14px">${body}</div>
        </div>
        ${bottomNavPayments()}
      </div>`;

    const so = ctx.root.querySelector("#f-org");
    if (so)
      so.addEventListener("change", () => {
        orgId = so.value;
        classId = "";
        load(true);
      });
    const sc = ctx.root.querySelector("#f-class");
    if (sc && !store.isSuperAdmin)
      sc.addEventListener("change", () => {
        classId = sc.value;
        render();
      });
    const applyFilters = ctx.root.querySelector("#apply-pay-filters");
    if (applyFilters)
      applyFilters.addEventListener("click", () => {
        classId = ctx.root.querySelector("#f-class").value.trim();
        participantName = ctx.root
          .querySelector("#f-participant-name")
          .value.trim();
        filterStatus = ctx.root.querySelector("#f-status").value;
        paymentMethod = ctx.root.querySelector("#f-method").value;
        fromDate = ctx.root.querySelector("#f-from").value;
        toDate = ctx.root.querySelector("#f-to").value;
        queryMode = "list";
        organizationName = "";
        className = "";
        paymentAtFrom = "";
        paymentAtTo = "";
        verifiedAtFrom = "";
        verifiedAtTo = "";
        load(false);
      });
    const searchPayments = ctx.root.querySelector("#search-payments");
    if (searchPayments)
      searchPayments.addEventListener("click", () => {
        participantName = ctx.root
          .querySelector("#f-participant-name")
          .value.trim();
        organizationName = ctx.root.querySelector("#f-org-name").value.trim();
        className = ctx.root.querySelector("#f-class-name").value.trim();
        paymentAtFrom = ctx.root.querySelector("#f-payment-from").value;
        paymentAtTo = ctx.root.querySelector("#f-payment-to").value;
        verifiedAtFrom = ctx.root.querySelector("#f-verified-from").value;
        verifiedAtTo = ctx.root.querySelector("#f-verified-to").value;
        queryMode = "search";
        orgId = "";
        classId = "";
        filterStatus = "";
        paymentMethod = "";
        fromDate = "";
        toDate = "";
        status = "all";
        q = "";
        load(false);
      });
    const resetFilters = ctx.root.querySelector("#reset-pay-filters");
    if (resetFilters)
      resetFilters.addEventListener("click", () => {
        orgId = "";
        classId = "";
        participantName = "";
        organizationName = "";
        className = "";
        paymentAtFrom = "";
        paymentAtTo = "";
        verifiedAtFrom = "";
        verifiedAtTo = "";
        filterStatus = "";
        paymentMethod = "";
        fromDate = "";
        toDate = "";
        status = "all";
        q = "";
        queryMode = "list";
        load(false);
      });
    const ss = ctx.root.querySelector("#pay-search");
    if (ss)
      ss.addEventListener(
        "input",
        debounce(() => {
          q = ss.value.trim();
          render();
        }, 250),
      );
    ctx.root.querySelectorAll("#pay-tabs .tab").forEach((b) =>
      b.addEventListener("click", () => {
        status = b.dataset.s;
        render();
      }),
    );
    const more = ctx.root.querySelector("#more-btn");
    if (more) more.addEventListener("click", () => load(true, true));
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", () => load());
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, () => load(false));
  };

  function bottomNavPayments() {
    return store.isSuperAdmin ? bottomNav("payments", SA_NAV) : "";
  }

  async function load(quiet = false, append = false) {
    if (!quiet) {
      items = null;
      err = null;
      page = 1;
      render();
    }
    try {
      if (!orgs.length || quiet === "meta") {
        try {
          const o = await api.list(
            store.isSuperAdmin
              ? "/superadmin/organizations"
              : "/admin/organizations",
            "organizations",
            { per_page: 100 },
          );
          orgs = o.items;
          if (!store.isSuperAdmin) {
            const cls = await Promise.all(
              orgs.map((x) =>
                api
                  .list(`/organizations/${x.id}/classes`, "classes", {
                    per_page: 100,
                  })
                  .then((r) => r.items)
                  .catch(() => []),
              ),
            );
            classes = cls.flat();
          }
        } catch (eMeta) {
          /* keep going with what we have */
        }
      }
      const nextPage = append ? page + 1 : 1;
      const listPaymentQuery = {
        organization_id: orgId || undefined,
        class_id: classId || undefined,
        participant_name: participantName || undefined,
        status: filterStatus || undefined,
        payment_method: paymentMethod || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page: nextPage,
        per_page: store.isSuperAdmin ? 20 : 100,
      };
      const searchPaymentQuery = {
        participant_name: participantName || undefined,
        organization_name: organizationName || undefined,
        class_name: className || undefined,
        payment_at_from: paymentAtFrom || undefined,
        payment_at_to: paymentAtTo || undefined,
        verified_at_from: verifiedAtFrom || undefined,
        verified_at_to: verifiedAtTo || undefined,
        page: nextPage,
        per_page: 20,
      };
      const paymentPath = store.isSuperAdmin
        ? queryMode === "search"
          ? "/superadmin/payments/search"
          : "/superadmin/payments"
        : "/admin/payments";
      const paymentQuery =
        store.isSuperAdmin && queryMode === "search"
          ? searchPaymentQuery
          : listPaymentQuery;
      const r = await api.list(paymentPath, "payments", paymentQuery);
      page = nextPage;
      lastPage = (r.pagination && r.pagination.last_page) || 1;
      items = append ? [...(items || []), ...r.items] : r.items;
      if (!store.isSuperAdmin) {
        try {
          const s = await api.get(
            "/admin/reports/payment-summary",
            orgId ? { organization_id: orgId } : undefined,
          );
          summary = s.data;
        } catch (eS) {
          summary = null;
        }
      }
      err = null;
    } catch (e) {
      err = e;
    }
    render();
  }
  load();
}

function payCard(p) {
  const date = fmtDate(p.paid_at || p.created_at);
  const time = p.paid_at ? "" : "";
  let action = "";
  if (store.isSuperAdmin) action = t("pay.seeRecord");
  else if (p.status === "pending" || p.status === "initiated")
    action = t("pay.check");
  else if (p.status === "paid") action = t("pay.seeRecord");
  else action = t("pay.checkStatus");
  let note = "";
  if (p.status === "pending") note = t("pay.review");
  else if (p.status === "paid") note = t("pay.receiptOk");
  else if (p.reminded) note = t("pay.reminderSent");
  return `
    <button class="row-item" data-go="#/payments/${p.id}" style="align-items:flex-start;flex-wrap:wrap">
      <span class="avatar sm">${esc(initials(p.payer && p.payer.name))}</span>
      <span class="row-body">
        <span class="row-title">${esc((p.payer && p.payer.name) || "—")}</span>
        <span class="row-sub">${icon("cap", 12)} ${esc(p.class ? p.class.name : "—")}</span>
        <span class="row-sub">${icon("calendar", 12)} ${esc(date)}</span>
        <span class="mt2" style="display:inline-block">${statusChip(p.status)}</span>
        ${p.reminded && p.status !== "paid" ? `<span class="chip info" style="margin-left:6px">${icon("bell", 11)} ${esc(t("st.reminded"))}</span>` : ""}
      </span>
      <span class="row-right">
        <span class="money" style="font-size:16px">${esc(rm(p.total_amount))}</span>
      </span>
      <span class="flex between items-center" style="width:100%;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line-2)">
        <span class="small muted">${esc(note)}</span>
        <span class="small blue-txt bold flex items-center gap1">${esc(action)} ${icon("chevronR", 13)}</span>
      </span>
    </button>`;
}

/* ---------------- 18: Butiran Pembayaran ---------------- */
export function paymentDetailScreen(ctx) {
  const id = ctx.params.id;
  let pay = null;
  let schedule = null;
  let proofs = [];
  let txs = [];
  let err = null;

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("payDetail.title"), back: true, avatar: true })}
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
    if (!pay) {
      ctx.root.innerHTML = shell(skeletonList(3, true));
      return;
    }

    const sch = schedule || {};
    const opts = sch.payment_options || {};
    const cls = pay.class || sch.class || {};
    const org = pay.organization || sch.organization || {};
    const part = sch.participant || {};
    const proof = proofs[0] || null;
    const canVerify =
      !store.isSuperAdmin &&
      (pay.status === "pending" || pay.status === "initiated");

    ctx.root.innerHTML = shell(`
      <div class="card center mt3" style="position:relative;overflow:hidden">
        <span class="chip ${pay.status === "paid" ? "ok" : pay.status === "pending" ? "warn" : pay.status === "failed" ? "danger" : "info"}" style="position:absolute;left:50%;transform:translateX(-50%);top:14px">
          <i class="dot"></i>${esc(statusText(pay.status))}
        </span>
        <div style="height:34px"></div>
        <div class="eyebrow">${esc(t("payDetail.amount"))}</div>
        <div class="num-xl">${esc(rm(pay.total_amount))}</div>
        <div class="flex items-center gap1 small muted" style="justify-content:center;margin-top:6px">
          ${icon("calendar", 13)} ${esc(fmtDateTime(pay.paid_at || pay.created_at))}
        </div>
        <div class="mt2"><span class="chip muted mono">${esc(t("payDetail.ref", { ref: pay.reference_number || `#${pay.id}` }))}</span></div>
      </div>

      <div class="section" style="margin-top:18px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("receipt", 15)} ${esc(t("payDetail.participant"))}</h2>
        </div>
        <div class="card">
          <div class="flex gap3 items-center" style="background:var(--primary-soft-2);border-radius:13px;padding:11px">
            <span class="avatar sm">${esc(initials(part.name || (pay.payer && pay.payer.name)))}</span>
            <span class="grow">
              <span class="stat-label" style="display:block;margin:0">${esc(t("payDetail.pName"))}</span>
              <span class="row-title" style="display:block;white-space:normal">${esc(part.name || (pay.payer && pay.payer.name) || "—")}</span>
              ${part.phone ? `<span class="row-sub">${icon("phone", 12)} ${esc(part.phone)}</span>` : ""}
            </span>
            <span class="chip info">${esc(part.participant_type === "sponsor" ? t("part.typeSponsor") : t("part.typeStudent"))}</span>
          </div>
          <div class="kv mt3">
            <div class="kv-row"><span class="kv-k">${icon("cap", 13)} ${esc(t("payDetail.pClass"))}</span><span class="kv-v">${esc(cls.name || "—")}${sch.id ? `<br><span class="small muted">${esc(t("payDetail.pFreq", { f: freqOf(sch, opts) }))}</span>` : ""}</span></div>
            <div class="kv-row"><span class="kv-k">${icon("building", 13)} ${esc(t("payDetail.pOrg"))}</span><span class="kv-v">${esc(org.name || "—")}</span></div>
            <div class="kv-row"><span class="kv-k">${icon("clock", 13)} ${esc(t("payDetail.pDate"))}</span><span class="kv-v">${esc(fmtDateTime(pay.paid_at || pay.created_at))}</span></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("file", 15)} ${esc(t("payDetail.proof"))}</h2>
          <span class="chip info">${esc(t("payDetail.proofTag"))}</span>
        </div>
        <div class="card">
          <p class="small muted" style="margin-top:0">${esc(t("payDetail.proofFmt"))}</p>
          ${
            proof
              ? `
            <div class="qr-frame" style="padding:8px;position:relative" id="proof-box">
              ${
                isPdf(proof.file_url, proof.mime_type)
                  ? `<div class="empty-ico" style="margin:14px auto;background:var(--danger-bg);color:var(--danger)">${icon("file", 30)}</div>`
                  : `<img src="${attr(proof.file_url)}" alt="${attr(t("payDetail.proof"))}" style="width:100%;max-height:300px;object-fit:contain">`
              }
              <div class="flex between items-center mt2" style="padding:6px 4px">
                <span class="small muted flex items-center gap1">${icon("image", 12)} ${esc(t("payDetail.proofPreview", { name: proof.original_name || "bukti" }))}</span>
                <span class="small muted2">${icon("zoom", 12)} ${esc(t("payDetail.zoom"))}</span>
              </div>
            </div>
            <div class="btn-row mt3">
              <button class="btn btn-light btn-sm" id="proof-full">${icon("eye", 15)} ${esc(t("payDetail.proofFull"))}</button>
              <button class="btn btn-light btn-sm" id="proof-dl">${icon("download", 15)} ${esc(t("payDetail.proofDl"))}</button>
            </div>
            ${proof.status && proof.status !== "pending" ? `<div class="mt2">${statusChip(proof.status === "approved" ? "approved" : "rejected")}</div>` : ""}`
              : `<div class="banner grey">${icon("info", 16)}<div class="bt">${esc(t("payDetail.proofNone"))}</div></div>`
          }
          ${
            txs.length
              ? `<div class="kv mt3">
            <div class="kv-row"><span class="kv-k">${esc(t("payDetail.txGateway"))}</span><span class="kv-v">${esc(methodLabel(txs[0].gateway_name || pay.payment_method))}</span></div>
            ${txs[0].bank_reference ? `<div class="kv-row"><span class="kv-k">${esc(t("payDetail.txRef"))}</span><span class="kv-v mono">${esc(txs[0].bank_reference)}</span></div>` : ""}
          </div>`
              : ""
          }
        </div>
      </div>

      ${
        store.isSuperAdmin
          ? ""
          : `<div class="section">
        <div class="section-head"><h2 class="section-title" style="font-size:15px">${icon("shieldCheck", 15)} ${esc(t("payDetail.verify"))}</h2></div>
        <div class="list">
          ${canVerify ? `<button class="btn btn-primary btn-block" data-go="#/payments/${id}/verify">${icon("checkCircle", 17)} ${esc(t("payDetail.verifyBtn", { amount: rm(pay.total_amount) }))}</button>` : ""}
          <button class="btn ${canVerify ? "btn-soft" : "btn-primary"} btn-block" data-go="#/payments/${id}/reminder">${icon("bell", 16)} ${esc(t("payDetail.reminderBtn"))}</button>
        </div>
        <div class="mt3">${banner("grey", esc(t("payDetail.compliance")), "info")}</div>
      </div>`
      }
      <div style="height:20px"></div>`);

    bind();
  };

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);
    const full = ctx.root.querySelector("#proof-full");
    if (full)
      full.addEventListener("click", () => {
        if (!proofs[0]) return;
        const p = proofs[0];
        openSheet({
          title: t("payDetail.proofFull"),
          sub: p.original_name || "",
          html: isPdf(p.file_url, p.mime_type)
            ? `<div class="empty-ico" style="margin:10px auto;background:var(--danger-bg);color:var(--danger)">${icon("file", 34)}</div><div class="center small muted">${esc(p.original_name || "file.pdf")}</div>`
            : `<img src="${attr(p.file_url)}" style="width:100%;border-radius:12px">`,
        });
      });
    const dl = ctx.root.querySelector("#proof-dl");
    if (dl)
      dl.addEventListener("click", () => {
        if (proofs[0])
          shareContent({ text: "Bukti bayaran", file: proofs[0].file_url });
      });
    const content = ctx.root.querySelector(".content");
    if (content) bindPTR(null, content, load);
  }

  async function load() {
    err = null;
    pay = null;
    render();
    try {
      const paymentPath = store.isSuperAdmin
        ? `/superadmin/payments/${id}`
        : `/payments/${id}`;
      const env = await api.get(paymentPath);
      pay = env.data.payment || env.data; // live wraps as data.payment; mock is flat
      try {
        if (pay.payment_schedule_id) {
          const s = await api.get(
            `/payment-schedules/${pay.payment_schedule_id}`,
          );
          schedule = s.data;
        }
      } catch (eS) {
        schedule = null;
      }
      try {
        const p = await api.get(`/payments/${id}/proofs`);
        proofs = Array.isArray(p.data)
          ? p.data
          : (p.data && p.data.proofs) || [];
      } catch (eP) {
        proofs = [];
      }
      try {
        const x = await api.get(`/payments/${id}/transactions`);
        txs = Array.isArray(x.data)
          ? x.data
          : (x.data && x.data.transactions) || [];
      } catch (eT) {
        txs = [];
      }
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}

function statusText(s) {
  return (
    {
      pending: t("st.pending"),
      paid: t("st.paid"),
      failed: t("st.failed"),
      refunded: t("st.refunded"),
      initiated: t("st.initiated"),
    }[s] || s
  );
}
function freqOf(sch, opts) {
  const f =
    (opts && opts.payment_frequency) ||
    (sch.class && sch.class.frequency) ||
    "";
  return (
    { weekly: "Mingguan", fortnightly: "Dwi-mingguan", monthly: "Bulanan" }[
      f
    ] ||
    f ||
    "—"
  );
}

/* ---------------- 19: Pengesahan Pembayaran ---------------- */
export function paymentVerifyScreen(ctx) {
  const id = ctx.params.id;
  let pay = null;
  let schedule = null;
  let proofs = [];
  let orgName = "";
  let err = null;
  let confirmed = false;

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("verify.title"), back: true, avatar: true })}
      <div class="content with-foot pad">${body}</div>
    </div>`;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`,
      );
      bind();
      return;
    }
    if (!pay) {
      ctx.root.innerHTML = shell(skeletonList(2, true));
      return;
    }
    const sch = schedule || {};
    const opts = sch.payment_options || {};
    const part = sch.participant || {};
    const cls = pay.class || sch.class || {};
    const proof = proofs[0] || null;

    ctx.root.innerHTML = shell(`
      <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
        <div class="flex gap3 items-center">
          <span class="row-tile navy" style="width:44px;height:44px">${icon("shieldCheck", 20)}</span>
          <span class="grow">
            <span class="strong" style="display:block;font-size:16px">${esc(t("verify.head"))}</span>
            <span class="small muted">${esc(t("verify.headSub"))}</span>
          </span>
        </div>
      </div>

      <div class="section" style="margin-top:18px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("card", 15)} ${esc(t("verify.detail"))}</h2>
          <span class="chip info"><i class="dot"></i> ${esc(t("verify.ready"))}</span>
        </div>
        <div class="card">
          <div class="flex between items-center">
            <div>
              <div class="eyebrow">${esc(t("verify.amount"))}</div>
              <div class="num-xl">${esc(rm(pay.total_amount))}</div>
            </div>
            <div class="right">
              <div class="eyebrow" style="text-align:right">${esc(t("verify.proofDate"))}</div>
              <div class="strong small" style="text-align:right">${esc(fmtDateTime(pay.paid_at || pay.created_at))}</div>
            </div>
          </div>
          <div class="kv mt3">
            <div class="kv-row"><span class="kv-k">${esc(t("payDetail.pName"))}</span><span class="kv-v">${esc(part.name || (pay.payer && pay.payer.name) || "—")}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t("payDetail.pClass"))}</span><span class="kv-v">${esc(cls.name || "—")}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t("payDetail.pOrg"))}</span><span class="kv-v">${esc((pay.organization && pay.organization.name) || orgName || "—")}</span></div>
            <div class="kv-row"><span class="kv-k">${esc(t("verify.bank"))}</span><span class="kv-v">${esc(opts.bank_name || "—")}<br><span class="mono small">${esc(opts.bank_account_number || "")}</span></span></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("file", 15)} ${esc(t("verify.proofCopy"))}</h2>
          <button class="section-link" id="proof-full">${icon("eye", 13)} ${esc(t("verify.full"))}</button>
        </div>
        <div class="card tight">
          ${
            proof
              ? isPdf(proof.file_url, proof.mime_type)
                ? `<div class="file-chip"><span class="fc-ico">${icon("file", 17)}</span><span class="grow"><span class="fc-name">${esc(proof.original_name || "resit.pdf")}</span><span class="fc-sub">PDF</span></span></div>`
                : `<img src="${attr(proof.file_url)}" alt="proof" style="width:100%;border-radius:12px;max-height:340px;object-fit:contain">`
              : `<div class="banner grey">${icon("info", 16)}<div class="bt">${esc(t("payDetail.proofNone"))}</div></div>`
          }
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("shieldCheck", 15)} ${esc(t("verify.decision"))}</h2>
          <span class="chip" style="background:#c9f7d5;color:#0f7a44"><i class="dot"></i> ${esc(t("verify.accepted"))}</span>
        </div>
        <div class="card" data-form>
          <label class="check-row">
            <input type="checkbox" id="confirm-chk" ${confirmed ? "checked" : ""}>
            <span>
              <span class="ct">${esc(t("verify.confirmChk"))}</span>
              <span class="cs">${esc(t("verify.confirmText", { amount: rm(pay.total_amount) }))}</span>
            </span>
          </label>
          <form id="verify-form" novalidate>
            ${field("notes", { label: t("verify.notes"), textarea: true, rows: 3, placeholder: t("verify.notesPh") })}
          </form>
        </div>
      </div>

      <div class="card mt3" style="background:var(--primary-soft-2);box-shadow:none">
        <div class="flex gap2 items-center">${icon("info", 16)}<span class="strong small">${esc(t("verify.unsure"))}</span></div>
        <p class="small muted" style="margin:8px 0 10px">${esc(t("verify.unsureSub"))}</p>
        <button class="btn btn-light btn-block btn-sm" data-go="#/payments/${id}/reminder">${icon("bell", 15)} ${esc(t("verify.reminderLink"))}</button>
      </div>
      <div style="height:12px"></div>

      <div class="foot">
        <button class="btn btn-primary btn-block" id="verify-btn">${icon("checkCircle", 17)} ${esc(t("verify.submit"))}</button>
        <button class="center-link" data-act="back">${esc(t("verify.cancel"))}</button>
      </div>`);

    bind();
  };

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);
    const chk = ctx.root.querySelector("#confirm-chk");
    if (chk)
      chk.addEventListener("change", () => {
        confirmed = chk.checked;
      });
    const full = ctx.root.querySelector("#proof-full");
    if (full)
      full.addEventListener("click", () => {
        const p = proofs[0];
        if (!p) return;
        openSheet({
          title: t("verify.proofCopy"),
          sub: p.original_name || "",
          html: isPdf(p.file_url, p.mime_type)
            ? `<div class="empty-ico" style="margin:10px auto;background:var(--danger-bg);color:var(--danger)">${icon("file", 34)}</div>`
            : `<img src="${attr(p.file_url)}" style="width:100%;border-radius:12px">`,
        });
      });

    const btn = ctx.root.querySelector("#verify-btn");
    if (btn)
      btn.addEventListener("click", async () => {
        if (!confirmed) {
          toast(t("verify.needCheck"), "err");
          return;
        }
        const form = ctx.root.querySelector("#verify-form");
        const v = formValues(form);
        setLoading(btn, true);
        try {
          // best-effort proof approval first
          for (const p of proofs) {
            if (p.status === "pending") {
              try {
                await api.put(`/payment-proofs/${p.id}`, {
                  status: "approved",
                });
              } catch (eP) {
                /* ignore */
              }
            }
          }
          await api.put(`/payments/${id}`, {
            status: "paid",
            notes: v.notes || pay.notes || null,
          });
          setLoading(btn, false);
          toast(t("verify.done", { amount: rm(pay.total_amount) }), "ok");
          ctx.back();
        } catch (e) {
          setLoading(btn, false);
          showErrors(ctx.root, e.errors || {}, e.message || t("err.generic"));
        }
      });
  }

  async function load() {
    err = null;
    pay = null;
    render();
    try {
      const env = await api.get(`/payments/${id}`);
      pay = env.data.payment || env.data; // live wraps as data.payment; mock is flat
      try {
        if (pay.payment_schedule_id) {
          const s = await api.get(
            `/payment-schedules/${pay.payment_schedule_id}`,
          );
          schedule = s.data;
        }
      } catch (eS) {
        schedule = null;
      }
      try {
        const p = await api.get(`/payments/${id}/proofs`);
        proofs = Array.isArray(p.data)
          ? p.data
          : (p.data && p.data.proofs) || [];
      } catch (eP) {
        proofs = [];
      }
      try {
        const o = await api.get(
          `/admin/organizations/${(schedule && schedule.organization && schedule.organization.id) || (pay.organization && pay.organization.id)}`,
        );
        orgName = (o.data && o.data.name) || "";
      } catch (eO) {
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

/* ---------------- 20: Hantar Peringatan ---------------- */
export function paymentReminderScreen(ctx) {
  const id = ctx.params.id;
  let pay = null;
  let schedule = null;
  let opts = {};
  let err = null;
  const channels = { whatsapp: true, telegram: true, email: true };

  const shell = (body) => `
    <div class="screen">
      ${appbar({ title: t("reminder.title"), back: true, avatar: true })}
      <div class="content with-foot pad">${body}</div>
    </div>`;

  const render = () => {
    if (err) {
      ctx.root.innerHTML = shell(
        `<div class="card mt4">${errorState(err, 'data-act="retry"')}</div>`,
      );
      bind();
      return;
    }
    if (!pay) {
      ctx.root.innerHTML = shell(skeletonList(2, true));
      return;
    }
    const sch = schedule || {};
    const part = sch.participant || {};
    const cls = pay.class || sch.class || {};
    const org = pay.organization || sch.organization || {};
    const name = part.name || (pay.payer && pay.payer.name) || "—";
    const phone = part.phone || "";
    const email = part.email || (pay.payer && pay.payer.email) || "";
    const msg = `Assalamualaikum ${name.split(" ")[0]}, ini adalah peringatan rasmi daripada ${org.name || "pihak kami"} mengenai yuran kelas ${cls.name} (${rm(pay.total_amount)}). Sila pastikan bayaran atau muat naik bukti pemindahan terkini dilakukan bagi rekod yuran anda. Terima kasih.`;

    ctx.root.innerHTML = shell(`
      <div class="card mt3">
        <div class="flex gap3 items-center">
          <span class="row-tile navy" style="width:46px;height:46px;position:relative">${icon("bell", 20)}
            <i style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;background:var(--danger);border-radius:50%;border:2px solid #fff"></i>
          </span>
          <span class="grow">
            <span class="strong" style="display:block;font-size:16.5px">${esc(t("reminder.head"))}</span>
            <span class="small muted">${esc(t("reminder.headSub"))}</span>
          </span>
        </div>
      </div>

      <div class="section" style="margin-top:18px">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("card", 15)} ${esc(t("reminder.arrears"))}</h2>
          <span class="chip" style="background:#ffd9d3;color:#b4321f">${icon("alert", 11)} ${esc(t("reminder.needRecheck"))}</span>
        </div>
        <div class="card">
          <div class="flex gap3 items-center" style="background:var(--primary-soft-2);border-radius:13px;padding:11px">
            <span class="avatar sm">${esc(initials(name))}</span>
            <span class="grow">
              <span class="row-title" style="white-space:normal">${esc(name)}</span>
              <span class="row-sub">${icon("cap", 12)} ${esc(cls.name || "—")}</span>
            </span>
          </div>
          <div class="stat-grid mt3" style="gap:8px">
            <div class="card tight flat" style="box-shadow:none">
              <div class="stat-label">${esc(t("reminder.org"))}</div>
              <div class="strong small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(org.name || "—")}</div>
            </div>
            <div class="card tight flat" style="box-shadow:none">
              <div class="stat-label">${esc(t("reminder.fee"))}</div>
              <div class="strong small red-txt">${esc(t("reminder.feeMonth", { amount: rm(pay.total_amount) }))}</div>
            </div>
            <div class="card tight flat" style="box-shadow:none">
              <div class="stat-label">${esc(t("reminder.phone"))}</div>
              <div class="strong small mono">${esc(phone || "—")}</div>
            </div>
            <div class="card tight flat" style="box-shadow:none">
              <div class="stat-label">${esc(t("reminder.email"))}</div>
              <div class="strong small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(email || "—")}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("send", 15)} ${esc(t("reminder.channels"))}</h2>
          <span class="section-sub">${esc(t("reminder.urs13"))}</span>
        </div>
        <p class="small muted" style="margin-top:-4px">${esc(t("reminder.channelsSub"))}</p>
        <div class="list" style="gap:10px">
          ${channelRow("whatsapp", "message", t("reminder.whatsapp"), phone, t("reminder.recommended"))}
          ${channelRow("telegram", "send", t("reminder.telegram"), phone ? `@${name.split(" ")[0].toLowerCase()} (${phone})` : "", "")}
          ${channelRow("email", "mail", t("reminder.emailCh"), email, "")}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2 class="section-title" style="font-size:15px">${icon("file", 15)} ${esc(t("reminder.msg"))}</h2>
          <span class="chip info">${esc(t("reminder.msgTag"))}</span>
        </div>
        <div class="card">
          <div class="flex between items-center">
            <span class="small muted">${esc(t("reminder.template", { period: monthLabel() }))}</span>
            <button class="btn btn-light btn-sm" id="copy-msg">${icon("copy", 13)} ${esc(t("reminder.copyMsg"))}</button>
          </div>
          <div class="card soft mt2" style="box-shadow:none">
            <p class="small" style="margin:0" id="msg-text">${esc(msg)}</p>
          </div>
          <div class="mt2 small muted2 flex gap1 items-center">${icon("shieldCheck", 13)} ${esc(t("reminder.autoNote"))}</div>
        </div>
      </div>
      <div style="height:12px"></div>

      <div class="foot">
        <button class="btn btn-primary btn-block" id="send-btn">${icon("send", 16)} ${esc(t("reminder.send"))}</button>
        <button class="center-link" data-act="back">${esc(t("common.cancel"))}</button>
      </div>`);

    bind();
  };

  function channelRow(key, ic, label, value, tag) {
    return `
      <label class="check-row">
        <input type="checkbox" data-ch="${key}" ${channels[key] ? "checked" : ""}>
        <span class="row-tile" style="width:34px;height:34px;background:#fff">${icon(ic, 16)}</span>
        <span class="grow">
          <span class="ct">${esc(label)} ${tag ? `<span class="chip info" style="font-size:10px">${esc(tag)}</span>` : ""}</span>
          <span class="cs">${esc(value || "—")}</span>
        </span>
      </label>`;
  }
  function monthLabel() {
    const d = new Date();
    const months = [
      "Januari",
      "Februari",
      "Mac",
      "April",
      "Mei",
      "Jun",
      "Julai",
      "Ogos",
      "September",
      "Oktober",
      "November",
      "Disember",
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function bind() {
    const retry = ctx.root.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener("click", load);
    const copy = ctx.root.querySelector("#copy-msg");
    if (copy)
      copy.addEventListener("click", () =>
        import("../ui.js").then((u) =>
          u.copyText(ctx.root.querySelector("#msg-text").textContent),
        ),
      );
    const btn = ctx.root.querySelector("#send-btn");
    if (btn)
      btn.addEventListener("click", async () => {
        const picked = [...ctx.root.querySelectorAll("[data-ch]")].filter(
          (c) => c.checked,
        );
        if (!picked.length) {
          toast(t("reminder.noChannels"), "err");
          return;
        }
        if (!schedule || !schedule.id) {
          toast(t("err.notfound"), "err");
          return;
        }
        setLoading(btn, true);
        try {
          await api.post(`/payment-schedules/${schedule.id}/reminder`, {});
          setLoading(btn, false);
          toast(t("reminder.sent", { n: picked.length }), "ok");
          ctx.back();
        } catch (e) {
          setLoading(btn, false);
          toast(e.message || t("err.generic"), "err");
        }
      });
  }

  async function load() {
    err = null;
    pay = null;
    render();
    try {
      const env = await api.get(`/payments/${id}`);
      pay = env.data.payment || env.data; // live wraps as data.payment; mock is flat
      try {
        if (pay.payment_schedule_id) {
          const s = await api.get(
            `/payment-schedules/${pay.payment_schedule_id}`,
          );
          schedule = s.data;
          opts = (schedule && schedule.payment_options) || {};
        }
      } catch (eS) {
        schedule = null;
      }
      render();
    } catch (e) {
      err = e;
      render();
    }
  }
  load();
}
