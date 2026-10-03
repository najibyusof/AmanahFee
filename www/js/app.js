/**
 * App bootstrap: device ready, router + routes, guards (auth/role/first-login),
 * global click delegation, Android back button, offline banner, statusbar/splash.
 */
import { config } from "./config.js";
import { storage } from "./storage.js";
import { onUnauthorized, ApiError } from "./api.js";
import {
  store,
  restoreSession,
  clearSession,
  roleHome,
  logout,
} from "./store.js";
import { t } from "./i18n/index.js";
import {
  initRouter,
  route,
  setGuard,
  setNotFound,
  go,
  back,
  refresh,
  resetHistory,
  hasHistory,
  currentRouteHash,
} from "./router.js";
import { closeTopOverlay, toast, confirmDialog, icon, esc } from "./ui.js";

import {
  splashScreen,
  loginScreen,
  registerScreen,
  forgotScreen,
  firstLoginScreen,
} from "./screens/auth.js";
import { adminDashboardScreen } from "./screens/adminDashboard.js";
import {
  orgListScreen,
  orgCreateScreen,
  orgDetailScreen,
  orgEditScreen,
} from "./screens/organizations.js";
import {
  classListScreen,
  classCreateScreen,
  classDetailScreen,
  classEditScreen,
  qrFullScreen,
} from "./screens/classes.js";
import {
  participantListScreen,
  participantAddScreen,
  participantCreateScreen,
} from "./screens/participants.js";
import {
  paymentListScreen,
  paymentDetailScreen,
  paymentVerifyScreen,
  paymentReminderScreen,
} from "./screens/payments.js";
import {
  studentDashboardScreen,
  myClassesScreen,
  myOrgsScreen,
  historyScreen,
} from "./screens/studentDashboard.js";
import { classDetailsScreen } from "./screens/classDetails.js";
import {
  payInfaqScreen,
  payTransferScreen,
  paySuccessScreen,
} from "./screens/paymentFlow.js";
import { notificationsScreen } from "./screens/notifications.js";
import {
  settingsScreen,
  profileScreen,
  passwordScreen,
  rolesScreen,
} from "./screens/settings.js";
import {
  saDashboardScreen,
  saAdminsScreen,
  saAdminCreateScreen,
  saAdminCreatedScreen,
  saAdminDetailScreen,
  saSettingsScreen,
  saProfileScreen,
  saPasswordScreen,
} from "./screens/superadmin.js";

const ADMIN = { role: "admin" };
const SELF = { role: "self" };
const SA = { role: "sa" };
const PUB = { pub: true };

function registerRoutes() {
  route("#/splash", splashScreen, PUB);
  route("#/login", loginScreen, PUB);
  route("#/register", registerScreen, PUB);
  route("#/forgot-password", forgotScreen, PUB);
  route("#/first-login", firstLoginScreen, { role: "any" });

  // Admin
  route("#/dashboard", adminDashboardScreen, ADMIN);
  route("#/organizations", orgListScreen, ADMIN);
  route("#/organizations/new", orgCreateScreen, {
    role: "admin",
    rejectSuperAdmin: true,
  });
  route("#/organizations/:id", orgDetailScreen, ADMIN);
  route("#/organizations/:id/edit", orgEditScreen, ADMIN);
  route("#/classes", classListScreen, ADMIN);
  route("#/classes/new", classCreateScreen, ADMIN);
  route("#/classes/:id", classDetailScreen, ADMIN);
  route("#/classes/:id/edit", classEditScreen, ADMIN);
  route("#/classes/:id/qr", qrFullScreen, ADMIN);
  route("#/classes/:id/participants", participantListScreen, ADMIN);
  route("#/classes/:id/participants/add", participantAddScreen, ADMIN);
  route("#/classes/:id/participants/new", participantCreateScreen, ADMIN);
  route("#/payments", paymentListScreen, ADMIN);
  route("#/payments/:id", paymentDetailScreen, ADMIN);
  route("#/payments/:id/verify", paymentVerifyScreen, {
    role: "admin",
    superAdminRedirect: "#/payments",
  });
  route("#/payments/:id/reminder", paymentReminderScreen, {
    role: "admin",
    superAdminRedirect: "#/payments",
  });

  // Student / Sponsor
  route("#/home", studentDashboardScreen, SELF);
  route("#/my-classes", myClassesScreen, SELF);
  route("#/my-organizations", myOrgsScreen, SELF);
  route("#/history", historyScreen, SELF);
  route("#/class/:id", classDetailsScreen, SELF);
  route("#/pay/:scheduleId", payInfaqScreen, SELF);
  route("#/pay/:scheduleId/transfer", payTransferScreen, SELF);
  route("#/pay-success/:paymentId", paySuccessScreen, SELF);

  // Shared
  route("#/notifications", notificationsScreen, { role: "any" });
  route("#/settings", settingsScreen, { role: "any" });
  route("#/settings/profile", profileScreen, { role: "any" });
  route("#/settings/password", passwordScreen, { role: "any" });
  route("#/settings/roles", rolesScreen, { role: "any" });

  // Super Admin
  route("#/sa/dashboard", saDashboardScreen, SA);
  route("#/sa/admins", saAdminsScreen, SA);
  route("#/sa/admins/new", saAdminCreateScreen, SA);
  route("#/sa/admins/created", saAdminCreatedScreen, SA);
  route("#/sa/admins/:id", saAdminDetailScreen, SA);
  route("#/sa/settings", saSettingsScreen, SA);
  route("#/sa/profile", saProfileScreen, SA);
  route("#/sa/password", saPasswordScreen, SA);

  route("#/", splashScreen, PUB);
}

function effectiveRoleHome() {
  if (store.mustChangePassword) return "#/first-login";
  return roleHome(store.activeRole || store.currentRole);
}

function guard(meta, ctx, path) {
  const p = path.split("?")[0];
  if (meta.pub) {
    if (store.token && (p === "#/login" || p === "#/forgot-password"))
      return effectiveRoleHome();
    return null;
  }
  if (!store.token) return "#/login";
  if (store.mustChangePassword && p !== "#/first-login") return "#/first-login";
  if (!store.mustChangePassword && p === "#/first-login")
    return effectiveRoleHome();

  const role = store.activeRole || store.currentRole;
  if (meta.role === "admin") {
    if (meta.superAdminRedirect && store.isSuperAdmin)
      return meta.superAdminRedirect;
    if (meta.rejectSuperAdmin && store.isSuperAdmin) return "#/sa/dashboard";
    return role === "admin" || role === "superadmin"
      ? null
      : effectiveRoleHome();
  }
  if (meta.role === "sa")
    return store.isSuperAdmin && (role === "admin" || role === "superadmin")
      ? null
      : effectiveRoleHome();
  if (meta.role === "self")
    return role === "student" || role === "sponsor"
      ? null
      : effectiveRoleHome();
  return null;
}

/* ---------------- global UI behaviors ---------------- */
function bindGlobalClicks() {
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      go(nav.dataset.nav);
      return;
    }
    const g = e.target.closest("[data-go]");
    if (g) {
      e.preventDefault();
      go(g.dataset.go);
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const a = act.dataset.act;
    if (a === "back") {
      e.preventDefault();
      handleBack();
      return;
    }
    if (a === "settings") {
      e.preventDefault();
      go(
        store.activeRole === "admin" && store.isSuperAdmin
          ? "#/sa/settings"
          : "#/settings",
      );
      return;
    }
    if (a === "notifications") {
      e.preventDefault();
      go("#/notifications");
      return;
    }
    if (a === "logout") {
      e.preventDefault();
      confirmDialog({
        title: t("set.logout"),
        text: t("set.logoutConfirm"),
        ok: t("auth.logout") || "Log Keluar",
        danger: true,
      }).then(async (yes) => {
        if (!yes) return;
        await logout();
        resetHistory("#/login");
        go("#/login", { replace: true });
      });
    }
  });
}

function handleBack() {
  if (closeTopOverlay()) return;
  if (hasHistory()) {
    back();
    return;
  }
  // at an app root → confirm exit
  confirmDialog({
    title: "Keluar?",
    text: t("app.exitConfirm"),
    ok: "Keluar",
    cancel: t("common.cancel"),
  }).then((yes) => {
    if (yes && navigator.app && navigator.app.exitApp) navigator.app.exitApp();
  });
}

function bindDevice() {
  document.addEventListener(
    "backbutton",
    (e) => {
      e.preventDefault();
      handleBack();
    },
    false,
  );

  const banner = document.getElementById("offline-banner");
  const update = () => {
    const off = navigator.onLine === false;
    banner.hidden = !off;
    banner.textContent = off
      ? `${t("offline.title")} — ${t("offline.hint")}`
      : "";
    document.body.classList.toggle("is-offline", off);
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();

  try {
    if (window.StatusBar) {
      window.StatusBar.styleDefault();
      window.StatusBar.backgroundColorByHexString("#EEF1F9");
      if (window.StatusBar.overlaysWebView)
        window.StatusBar.overlaysWebView(false);
    }
  } catch (err) {
    /* noop */
  }
}

async function hideSplash() {
  try {
    if (navigator.splashscreen) navigator.splashscreen.hide();
  } catch (e) {
    /* noop */
  }
}

/* ---------------- boot ---------------- */
async function start() {
  await storage.init();
  const root = document.getElementById("app");
  registerRoutes();
  setGuard(guard);

  // unknown routes → friendly 404 with a way back (instead of a silent no-op)
  setNotFound((ctx) => {
    ctx.root.innerHTML = `
      <div class="screen"><div class="content pad" style="padding-top:90px">
        <div class="empty">
          <div class="empty-ico">?</div>
          <div class="empty-title">Halaman tidak dijumpai</div>
          <div class="empty-text">Pautan ini tidak sah atau telah dipindahkan.</div>
          <button class="btn btn-primary" id="nf-home" style="margin-top:16px">Ke Skrin Utama</button>
        </div></div></div>`;
    ctx.root
      .querySelector("#nf-home")
      ?.addEventListener("click", () =>
        go(roleHome(store.activeRole || store.currentRole), { replace: true }),
      );
  });
  initRouter(root);
  bindGlobalClicks();
  bindDevice();

  onUnauthorized(async () => {
    if (!store.token) return;
    await clearSession();
    const cur = currentRouteHash().split("?")[0];
    if (cur !== "#/login" && cur !== "#/splash") {
      toast(t("err.forbidden") && "Sesi tamat. Sila log masuk semula.", "err");
      resetHistory("#/login");
      go("#/login", { replace: true });
    }
  });

  // restore session (token → /auth/me → roles → active role) before first route resolve
  try {
    await restoreSession();
  } catch (e) {
    /* handled by guards */
  }

  if (!location.hash) location.replace("#/splash");
  await refresh();

  // dev-server convenience: expose state for debugging over chrome://inspect
  window.__classpay = { store, config, go };
}

function onDeviceReady() {
  start();
}
if (window.cordova) {
  document.addEventListener("deviceready", onDeviceReady, false);
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
