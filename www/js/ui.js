/**
 * Shared UI kit — icons, formatters, chrome (appbar/nav), states, overlays,
 * form helpers, pull-to-refresh, media pickers, clipboard/share.
 */
import { t } from "./i18n/index.js";

/* ---------------- basics ---------------- */
export function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function attr(s) {
  return esc(s);
}
export function debounce(fn, ms = 350) {
  let tmr;
  return (...a) => {
    clearTimeout(tmr);
    tmr = setTimeout(() => fn(...a), ms);
  };
}

/* ---------------- icons (feather-style, stroke) ---------------- */
const P = {
  home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  building:
    '<path d="M3 21h18"/><path d="M5 21V5a1 1 0 011-1h8a1 1 0 011 1v16"/><path d="M15 21V9h4a1 1 0 011 1v11"/><path d="M8 8h2M8 12h2M8 16h2"/>',
  book: '<path d="M2 4h6a4 4 0 014 4v12a3 3 0 00-3-3H2z"/><path d="M22 4h-6a4 4 0 00-4 4v12a3 3 0 013-3h7z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  settings:
    '<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/><circle cx="12" cy="12" r="3"/>',
  sliders:
    '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  userPlus:
    '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
  chevronR: '<path d="M9 18l6-6-6-6"/>',
  chevronL: '<path d="M15 18l-6-6 6-6"/>',
  chevronD: '<path d="M6 9l6 6 6-6"/>',
  chevronU: '<path d="M18 15l-6-6-6 6"/>',
  arrowL: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  arrowR: '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  checkCircle:
    '<circle cx="12" cy="12" r="10"/><path d="M8.5 12.5l2.5 2.5 4.5-5.5"/>',
  edit: '<path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/>',
  trash:
    '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6M14 11v6"/>',
  share:
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  download:
    '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload:
    '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  qr: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h3v3h-3zM21 14v7h-7v-3"/>',
  camera:
    '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  file: '<path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/>',
  logout:
    '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  login:
    '<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
  refresh:
    '<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  alert:
    '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldCheck:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4.5"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  message:
    '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  swap: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>',
  bank: '<path d="M3 21h18"/><path d="M5 21v-9M9.5 21v-9M14.5 21v-9M19 21v-9"/><path d="M2 10l10-6 10 6z"/>',
  receipt:
    '<path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3z"/><path d="M9 8h6M9 12h6"/>',
  cap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
  loader:
    '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>',
  more: '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  dollar:
    '<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
  handshake:
    '<path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6"/><path d="M2 8l4-4 4 3 2-2 2 2 2-2 2 2 4-3 2 4-6 6-2-2-2 3-2-3-2 2z"/>',
  sparkle:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.4L22 18.3l-2.1.9L19 21.5l-.9-2.3-2.1-.9 2.1-.9z"/>',
  bellOff:
    '<path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0118 8"/><path d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14"/><path d="M18 8A6 6 0 006 8"/><path d="M2 2l20 20"/>',
  offline:
    '<path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0"/><path d="M12 20h.01"/>',
};

export function icon(name, size = 20, cls = "") {
  const d = P[name] || P.info;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
export function spin(size = 18) {
  return icon("loader", size, "spinner");
}

/* ---------------- formatters ---------------- */
const MONTHS = [
  "Jan",
  "Feb",
  "Mac",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ogo",
  "Sep",
  "Okt",
  "Nov",
  "Dis",
];

export function fmtMoney(v, { withRM = true } = {}) {
  const n = parseFloat(String(v ?? 0).replace(/,/g, ""));
  const num = Number.isFinite(n) ? n : 0;
  const s = num.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withRM ? `RM ${s}` : s;
}
export function rm(v) {
  return fmtMoney(v);
}

function parseDate(iso) {
  if (!iso) return null;
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
export function fmtDate(iso) {
  const d = parseDate(iso);
  if (!d) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function h12(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}
export function fmtDateTime(iso) {
  const d = parseDate(iso);
  if (!d) return "—";
  return `${fmtDate(iso)}, ${h12(d)}`;
}
export function timeAgo(iso) {
  const d = parseDate(iso);
  if (!d) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "sebentar tadi";
  if (s < 3600) return `${Math.floor(s / 60)} min lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return fmtDate(iso);
}
export function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0] ? parts[0][0] : "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}
export function fmtBytes(n) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

const STATUS_MAP = {
  active: ["ok", "st.active"],
  inactive: ["muted", "st.inactive"],
  draft: ["muted", "st.draft"],
  completed: ["info", "st.completed"],
  pending: ["warn", "st.pending"],
  paid: ["ok", "st.paid"],
  initiated: ["info", "st.initiated"],
  failed: ["danger", "st.failed"],
  refunded: ["muted", "st.refunded"],
  overdue: ["danger", "st.overdue"],
  upcoming: ["info", "st.upcoming"],
  partially_paid: ["amber", "st.partially_paid"],
  cancelled: ["muted", "st.cancelled"],
  suspended: ["danger", "st.suspended"],
  approved: ["ok", "st.approved"],
  rejected: ["danger", "st.rejected"],
  reminded: ["info", "st.reminded"],
  submitted: ["info", "st.submitted"],
};
export function statusChip(status, { dot = true } = {}) {
  const [cls, key] = STATUS_MAP[status] || ["muted", status];
  return `<span class="chip ${cls}">${dot ? '<i class="dot"></i>' : ""}${esc(t(key))}</span>`;
}
export function chip(text, cls = "info", dot = false) {
  return `<span class="chip ${cls}">${dot ? '<i class="dot"></i>' : ""}${esc(text)}</span>`;
}
const METHOD_LABEL = {
  manual: "Pindahan Manual",
  bank_transfer: "Pindahan Bank",
  qr: "DuitNow QR",
  merchant: "FPX / Gateway",
  fp: "FPX",
  transfer: "Pindahan",
};
export function methodLabel(m) {
  return METHOD_LABEL[m] || m || "—";
}
const DAY_NAMES = [
  "Ahad",
  "Isnin",
  "Selasa",
  "Rabu",
  "Khamis",
  "Jumaat",
  "Sabtu",
];
export function dayName(i) {
  return DAY_NAMES[Number(i)] || "—";
}
const FREQ_LABEL = {
  weekly: "Mingguan",
  fortnnightly: "Dwi-mingguan",
  fortnightly: "Dwi-mingguan",
  monthly: "Bulanan",
};
export function freqLabel(f) {
  return FREQ_LABEL[f] || f || "—";
}

/* ---------------- chrome ---------------- */
export function appbar({
  title = "",
  sub = "",
  back = false,
  bell = false,
  unread = 0,
  avatar = true,
  logo = true,
  bare = false,
} = {}) {
  return `
  <header class="appbar${bare ? " bare" : ""}">
    ${back ? `<button class="icon-btn" data-act="back" aria-label="Back">${icon("arrowL", 22)}</button>` : ""}
    ${!back && logo ? `<span class="logo-chip">${icon("shieldCheck", 19)}</span>` : ""}
    <div class="appbar-title">${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ""}</div>
    ${bell ? `<button class="icon-btn" data-act="notifications" aria-label="${attr(t("common.notifications"))}">${icon("bell", 21)}${unread > 0 ? `<span class="bell-badge">${unread > 99 ? "99+" : unread}</span>` : ""}</button>` : ""}
    ${avatar ? `<button class="icon-btn round" data-act="settings" aria-label="${attr(t("nav.settings"))}">${icon("user", 18)}</button>` : ""}
  </header>`;
}

export const ADMIN_NAV = [
  { key: "home", label: "nav.home", icon: "grid", href: "#/dashboard" },
  { key: "orgs", label: "nav.orgs", icon: "building", href: "#/organizations" },
  { key: "classes", label: "nav.classes", icon: "book", href: "#/classes" },
  { key: "payments", label: "nav.payments", icon: "card", href: "#/payments" },
  {
    key: "settings",
    label: "nav.settings",
    icon: "sliders",
    href: "#/settings",
  },
];
export const STU_NAV = [
  { key: "home", label: "nav.home", icon: "home", href: "#/home" },
  { key: "classes", label: "nav.classes", icon: "book", href: "#/my-classes" },
  {
    key: "notifications",
    label: "nav.notifications",
    icon: "bell",
    href: "#/notifications",
  },
  {
    key: "settings",
    label: "nav.settings",
    icon: "sliders",
    href: "#/settings",
  },
];
export const SA_NAV = [
  { key: "home", label: "nav.homeSA", icon: "grid", href: "#/sa/dashboard" },
  { key: "admins", label: "nav.admins", icon: "users", href: "#/sa/admins" },
  { key: "orgs", label: "nav.orgs", icon: "building", href: "#/organizations" },
  { key: "payments", label: "nav.payments", icon: "card", href: "#/payments" },
  {
    key: "settings",
    label: "nav.settingsSA",
    icon: "dots",
    href: "#/sa/settings",
  },
];

export function bottomNav(activeKey, items = ADMIN_NAV) {
  return `
  <nav class="bottomnav">
    ${items
      .map(
        (it) => `
      <button class="bn-item${it.key === activeKey ? " active" : ""}" data-nav="${attr(it.href)}">
        ${icon(it.icon, 22)}<span>${esc(t(it.label))}</span>
      </button>`,
      )
      .join("")}
  </nav>`;
}

/* ---------------- states ---------------- */
export function skeletonList(n = 4, hero = false) {
  let h = "";
  if (hero)
    h += '<div class="skeleton sk-hero" style="margin-bottom:14px"></div>';
  for (let i = 0; i < n; i++)
    h += '<div class="skeleton sk-card" style="margin-bottom:12px"></div>';
  return h;
}
export function emptyState({ ic = "inbox", title, text, action = "" }) {
  return `<div class="empty">
    <div class="empty-ico">${icon(ic, 30)}</div>
    <div class="empty-title">${esc(title || t("empty.title"))}</div>
    ${text ? `<div class="empty-text">${esc(text)}</div>` : ""}
    ${action}
  </div>`;
}
export function errorState(err, retryAttr = 'data-act="retry"') {
  let ic = "alert",
    title = t("err.title"),
    text = t("err.generic");
  if (err && err.isOffline) {
    ic = "offline";
    text = t("err.network");
  } else if (err && err.isForbidden) {
    ic = "lock";
    text = t("err.forbidden");
  } else if (err && err.isNotFound) {
    ic = "search";
    text = t("err.notfound");
  } else if (err && err.status === 429) {
    ic = "clock";
    text = t("err.rate");
  } else if (err && err.status >= 500) {
    ic = "alert";
    text = t("err.server");
  } else if (err && err.message && err.status !== 422) text = err.message;
  return `<div class="empty">
    <div class="empty-ico">${icon(ic, 30)}</div>
    <div class="empty-title">${esc(title)}</div>
    <div class="empty-text">${esc(text)}</div>
    <button class="btn btn-light" ${retryAttr}>${icon("refresh", 17)} ${esc(t("common.retry"))}</button>
  </div>`;
}

/* ---------------- toast ---------------- */
let toastTimer = null;
export function toast(msg, type = "") {
  const layer = document.getElementById("toast-layer");
  if (!layer) return;
  layer.innerHTML = `<div class="toast ${type}">${esc(msg)}</div>`;
  const el = layer.firstElementChild;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, 300);
  }, 2500);
}

/* ---------------- overlays (sheet/confirm) ---------------- */
const overlayStack = [];
export function openSheet({ title = "", sub = "", html = "", onMount } = {}) {
  const host = document.getElementById("overlays");
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="sheet-backdrop" data-sheet-close></div>
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-handle"></div>
      ${title ? `<div class="sheet-title">${esc(title)}</div>` : ""}
      ${sub ? `<div class="sheet-sub">${esc(sub)}</div>` : ""}
      <div class="sheet-body">${html}</div>
    </div>`;
  host.appendChild(wrap);
  const backdrop = wrap.querySelector(".sheet-backdrop");
  const sheet = wrap.querySelector(".sheet");
  requestAnimationFrame(() => {
    backdrop.classList.add("show");
    sheet.classList.add("show");
  });
  const close = () => {
    backdrop.classList.remove("show");
    sheet.classList.remove("show");
    setTimeout(() => {
      if (wrap.parentNode) wrap.remove();
    }, 260);
    const i = overlayStack.indexOf(close);
    if (i >= 0) overlayStack.splice(i, 1);
  };
  backdrop.addEventListener("click", close);
  overlayStack.push(close);
  if (onMount) onMount(sheet, close);
  return { close, el: sheet };
}
/** Returns true if an overlay was closed (used by Android back button). */
export function closeTopOverlay() {
  if (!overlayStack.length) return false;
  const c = overlayStack.pop();
  c();
  return true;
}
export function confirmDialog({
  title,
  text,
  ok,
  cancel,
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const { close } = openSheet({
      title: title || t("common.confirm"),
      sub: text || "",
      html: `<div class="btn-row mt4">
        <button class="btn btn-soft" data-no>${esc(cancel || t("common.cancel"))}</button>
        <button class="btn ${danger ? "btn-primary" : "btn-primary"}" data-yes>${esc(ok || t("common.ya"))}</button>
      </div>`,
      onMount(el, c) {
        el.querySelector("[data-yes]").addEventListener("click", () => {
          c();
          resolve(true);
        });
        el.querySelector("[data-no]").addEventListener("click", () => {
          c();
          resolve(false);
        });
      },
    });
  });
}

/* ---------------- pull to refresh ---------------- */
export function bindPTR(screenEl, contentEl, onRefresh) {
  if (!contentEl || !contentEl.parentNode) return { reset() {} };
  const ptr = document.createElement("div");
  ptr.className = "ptr";
  ptr.innerHTML = `<span>${spin(20)}</span>`;
  contentEl.parentNode.insertBefore(ptr, contentEl);

  // A refresh must be an INTENTIONAL pull: starts at scrollTop 0, moves mostly
  // vertically, and stays past a visible threshold. Anything else — ordinary
  // scrolling, momentum-stop taps, tab swipes, drifting row taps — must NOT
  // trigger it (real-device bug: any 1px downward drag at top used to refresh).
  const THRESHOLD = 72; // net pull (px) required to fire
  const MAXPULL = 110; // visual cap while dragging
  const DAMP = 0.55; // rubber-band damping for the indicator
  let startX = 0,
    startY = 0,
    armed = false,
    busy = false;

  const setH = (px) => {
    ptr.style.height = `${Math.max(0, Math.min(px, MAXPULL))}px`;
  };
  const reset = () => {
    armed = false;
    ptr.classList.remove("on");
    ptr.style.transition = "";
    setH(0);
  };

  contentEl.addEventListener(
    "touchstart",
    (e) => {
      if (busy || e.touches.length > 1) return;
      if (contentEl.scrollTop > 0) return; // only at the very top
      // Arm on ANY touch (including on rows/buttons): we never preventDefault, so
      // taps still land as clicks — but a real pull anywhere now works.
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      armed = true;
    },
    { passive: true },
  );

  contentEl.addEventListener(
    "touchmove",
    (e) => {
      if (!armed || busy) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > Math.abs(dy)) {
        reset();
        return;
      } // horizontal gesture
      if (dy <= 0) {
        reset();
        return;
      } // moved back up → cancel
      if (contentEl.scrollTop > 0) {
        reset();
        return;
      } // scrolled away → cancel
      ptr.style.transition = "none";
      setH(dy * DAMP);
      ptr.classList.toggle("on", dy >= THRESHOLD);
    },
    { passive: true },
  );

  const finish = async () => {
    if (!armed) return;
    const shouldRefresh = ptr.classList.contains("on") && !busy && onRefresh;
    reset();
    if (!shouldRefresh) return;
    busy = true;
    ptr.style.transition = "";
    ptr.classList.add("on");
    setH(46);
    try {
      await onRefresh();
    } catch (e) {
      /* noop */
    }
    busy = false;
    reset();
  };
  contentEl.addEventListener("touchend", finish, { passive: true });
  contentEl.addEventListener("touchcancel", reset, { passive: true });

  return { reset };
}

/* ---------------- forms ---------------- */
export function field(name, opts = {}) {
  const {
    label = "",
    req = false,
    hint = "",
    hintRight = "",
    type = "text",
    placeholder = "",
    value = "",
    prefix = "",
    ic = "",
    textarea = false,
    rows = 4,
    maxlength = 0,
    inputmode = "",
    autocomplete = "",
    disabled = false,
    act = "",
    actIcon = "eye",
    id = "",
  } = opts;
  const lbl = label
    ? `<div class="field-head">
      <label class="field-label" ${id ? `for="${attr(id)}"` : ""}>${esc(label)}${req ? '<span class="req">*</span>' : ""}</label>
      ${hintRight ? `<span class="char-count">${esc(hintRight)}</span>` : hint ? `<span class="field-hint">${esc(hint)}</span>` : ""}
    </div>`
    : "";
  let control;
  if (textarea) {
    control = `<textarea class="input" name="${attr(name)}" rows="${rows}" ${maxlength ? `maxlength="${maxlength}"` : ""}
      placeholder="${attr(placeholder)}" ${disabled ? "disabled" : ""}>${esc(value)}</textarea>`;
  } else if (prefix) {
    control = `<div class="input-prefix">
      <span class="prefix">${prefix}</span>
      <input class="input" id="${attr(id)}" name="${attr(name)}" type="${attr(type)}" value="${attr(value)}"
        placeholder="${attr(placeholder)}" ${inputmode ? `inputmode="${attr(inputmode)}"` : ""}
        ${autocomplete ? `autocomplete="${attr(autocomplete)}"` : ""} ${disabled ? "disabled" : ""}>
    </div>`;
  } else if (ic || act) {
    control = `<div class="input-wrap">
      ${ic ? `<span class="in-ico">${icon(ic, 18)}</span>` : ""}
      <input class="input ${act ? "has-act" : ""}" id="${attr(id)}" name="${attr(name)}" type="${attr(type)}" value="${attr(value)}"
        placeholder="${attr(placeholder)}" ${inputmode ? `inputmode="${attr(inputmode)}"` : ""}
        ${maxlength ? `maxlength="${maxlength}"` : ""}
        ${autocomplete ? `autocomplete="${attr(autocomplete)}"` : ""} ${disabled ? "disabled" : ""}>
      ${act ? `<button type="button" class="icon-btn in-act" data-act2="${attr(act)}" aria-label="toggle">${icon(actIcon, 18)}</button>` : ""}
    </div>`;
  } else {
    control = `<input class="input" id="${attr(id)}" name="${attr(name)}" type="${attr(type)}" value="${attr(value)}"
      placeholder="${attr(placeholder)}" ${inputmode ? `inputmode="${attr(inputmode)}"` : ""}
      ${maxlength ? `maxlength="${maxlength}"` : ""}
      ${autocomplete ? `autocomplete="${attr(autocomplete)}"` : ""} ${disabled ? "disabled" : ""}>`;
  }
  return `<div class="field" data-name="${attr(name)}">${lbl}${control}</div>`;
}

export function selectField(name, opts = {}) {
  const {
    label = "",
    req = false,
    hint = "",
    options = [],
    value = "",
    placeholder = "—",
  } = opts;
  const optsHtml = [`<option value="">${esc(placeholder)}</option>`]
    .concat(
      options.map(
        (o) =>
          `<option value="${attr(o.value)}" ${String(o.value) === String(value) ? "selected" : ""}>${esc(o.label)}</option>`,
      ),
    )
    .join("");
  return `<div class="field" data-name="${attr(name)}">
    ${label ? `<div class="field-head"><label class="field-label">${esc(label)}${req ? '<span class="req">*</span>' : ""}</label>${hint ? `<span class="field-hint">${esc(hint)}</span>` : ""}</div>` : ""}
    <div class="select-wrap">
      <select class="select" name="${attr(name)}">${optsHtml}</select>
      <span class="sel-ico">${icon("chevronD", 17)}</span>
    </div>
  </div>`;
}

export function formValues(root) {
  const out = {};
  root
    .querySelectorAll("input[name], textarea[name], select[name]")
    .forEach((el) => {
      out[el.name] = el.value;
    });
  return out;
}
export function clearErrors(root) {
  root.querySelectorAll(".field.err").forEach((f) => f.classList.remove("err"));
  root.querySelectorAll(".field > .field-error").forEach((e) => e.remove());
  root.querySelectorAll("[data-form-banner]").forEach((e) => e.remove());
}
/** errors: { field: [msgs] } from ApiError (422) */
export function showErrors(root, errors = {}, fallbackMsg = "") {
  clearErrors(root);
  let first = null;
  for (const [k, msgs] of Object.entries(errors)) {
    if (!k || k === "_") continue;
    const f = root.querySelector(`.field[data-name="${CSS.escape(k)}"]`);
    const msg = Array.isArray(msgs) ? msgs[0] : msgs;
    if (f) {
      f.classList.add("err");
      const inp = f.querySelector(".input, .select, textarea");
      if (inp) inp.classList.add("err");
      const div = document.createElement("div");
      div.className = "field-error";
      div.innerHTML = `${icon("alert", 14)}<span>${esc(msg)}</span>`;
      f.appendChild(div);
      if (!first) first = inp || f;
    }
  }
  const msg = fallbackMsg || (errors._ && errors._[0]) || "";
  if (msg) {
    const host =
      root.querySelector("[data-form]") ||
      root.querySelector("form") ||
      root.querySelector(".content");
    if (host) {
      const b = document.createElement("div");
      b.className = "banner danger";
      b.setAttribute("data-form-banner", "1");
      b.style.marginBottom = "12px";
      b.innerHTML = `${icon("alert", 18)}<div class="bt">${esc(msg)}</div>`;
      host.prepend(b);
    }
  }
  if (first && first.scrollIntoView)
    first.scrollIntoView({ block: "center", behavior: "smooth" });
}
export function setLoading(btn, on, label = "") {
  if (!btn) return;
  if (on) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = `${spin(17)} ${esc(label || t("common.loading"))}`;
    btn.disabled = true;
  } else {
    if (btn.dataset.orig) btn.innerHTML = btn.dataset.orig;
    btn.disabled = false;
  }
}

/* ---------------- clipboard / share ---------------- */
export async function copyText(text) {
  try {
    if (window.cordova && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else if (
      window.cordova &&
      window.cordova.plugins &&
      window.cordova.plugins.clipboard
    ) {
      await new Promise((res, rej) =>
        window.cordova.plugins.clipboard.copy(text, res, rej),
      );
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast(t("common.copied"), "ok");
    return true;
  } catch (e) {
    toast(t("err.generic"), "err");
    return false;
  }
}
export function shareContent({ text = "", subject = "", file = "" } = {}) {
  return new Promise((resolve) => {
    const p = window.plugins && window.plugins.socialsharing;
    if (!p) {
      copyText(text || "");
      resolve(false);
      return;
    }
    p.share(
      text,
      subject,
      file || null,
      null,
      () => resolve(true),
      () => resolve(false),
    );
  });
}

/* ---------------- media pickers ---------------- */
function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/data:(.*?);/) || [])[1] || "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function pickViaInput(accept) {
  return new Promise((resolve, reject) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = accept;
    inp.style.display = "none";
    document.body.appendChild(inp);
    inp.addEventListener("change", () => {
      const f = inp.files && inp.files[0];
      inp.remove();
      if (f) resolve({ blob: f, name: f.name, type: f.type, uri: null });
      else reject(new Error("cancelled"));
    });
    inp.click();
  });
}
/** Pick an image from camera (if available) or gallery/file picker. */
export function pickImage({ camera = false } = {}) {
  const cam = window.navigator && window.navigator.camera;
  if (cam && window.cordova) {
    return new Promise((resolve, reject) => {
      cam.getPicture(
        (dataUrl) => {
          try {
            const blob = dataUrlToBlob(dataUrl);
            resolve({
              blob,
              name: camera
                ? `kamera_${Date.now()}.jpg`
                : `gambar_${Date.now()}.jpg`,
              type: blob.type,
              uri: null,
            });
          } catch (e) {
            reject(e);
          }
        },
        (err) => {
          if (String(err).includes("cancel") || String(err).includes("Cancel"))
            reject(new Error("cancelled"));
          else pickViaInput("image/*").then(resolve, reject);
        },
        {
          quality: 72,
          destinationType: window.Camera.DestinationType.DATA_URL,
          sourceType: camera
            ? window.Camera.PictureSourceType.CAMERA
            : window.Camera.PictureSourceType.PHOTOLIBRARY,
          encodingType: window.Camera.EncodingType.JPEG,
          mediaType: window.Camera.MediaType.PICTURE,
          correctOrientation: true,
        },
      );
    });
  }
  return pickViaInput("image/*");
}
/** Pick a proof file (image or PDF). */
export function pickProof() {
  return pickViaInput("image/png,image/jpeg,image/webp,application/pdf");
}

export function isValidImage(file, maxMb) {
  const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const okSize = file.size <= maxMb * 1024 * 1024;
  return { ok: okType && okSize, okType, okSize };
}
export function isValidProof(file, maxMb) {
  const okType =
    ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    ) || /\.(png|jpe?g|webp|pdf)$/i.test(file.name || "");
  const okSize = file.size <= maxMb * 1024 * 1024;
  return { ok: okType && okSize, okType, okSize };
}

/* ---------------- misc ---------------- */
export function bindCommon(root, ctx) {
  root.addEventListener("click", (e) => {
    const back = e.target.closest('[data-act="back"]');
    if (back) {
      ctx.back();
      return;
    }
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      ctx.go(nav.dataset.nav);
      return;
    }
    const goEl = e.target.closest("[data-go]");
    if (goEl) {
      ctx.go(goEl.dataset.go);
      return;
    }
  });
}
export function banner(kind, text, ic = "info") {
  return `<div class="banner ${kind}">${icon(ic, 17)}<div class="bt">${text}</div></div>`;
}
export function avatar(name, cls = "") {
  return `<div class="avatar ${cls}">${esc(initials(name))}</div>`;
}
