/**
 * Session / role store.
 * - token in secure storage, user + roles cached in memory (rehydrated from /auth/me)
 * - active role persisted locally; switch without re-login (BR-001/002/003)
 * - super-admin detection via RBAC probe (see ASSUMPTIONS.md)
 */
import { api, setToken, ApiError, normalizePhone } from './api.js';
import { storage } from './storage.js';
import { config } from './config.js';

const listeners = new Set();

export const store = {
  token: null,
  user: null,
  roles: [],            // [{ role, is_current, organizations?, classes? }]
  currentRole: null,    // server-side users.user_type
  activeRole: null,     // client-side active role (validated against roles)
  isSuperAdmin: false,
  mustChangePassword: false,
  unread: 0,
  booted: false,

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit() { for (const fn of listeners) { try { fn(store); } catch (e) { /* noop */ } } },
};

export function roleHome(role) {
  const r = role || store.activeRole;
  if (r === 'superadmin') return '#/sa/dashboard';
  if (r === 'admin') return '#/dashboard';
  return '#/home'; // student | sponsor
}

function detectFirstLogin(u) {
  if (!u) return false;
  const keys = ['must_change_password', 'force_password_change', 'is_temp_password', 'password_set', 'has_password'];
  for (const k of keys) {
    if (u[k] === true) return true;
    if ((k === 'password_set' || k === 'has_password') && u[k] === false) return true;
  }
  if (u.temp_password === true) return true;
  return false;
}

async function probeSuperAdmin(u) {
  // Live API: /auth/me exposes user_type === 'superadmin'. The RBAC listing
  // (GET /roles) is NOT a reliable signal — verified live: regular admins also
  // get 200 — so the user record is the single source of truth.
  return !!(u && (u.user_type === 'superadmin' || u.superadmin === true));
}

export async function loadSession() {
  const me = await api.get('/auth/me');
  store.user = (me.data && me.data.user) || null;
  store.mustChangePassword = detectFirstLogin(store.user);

  try {
    const rr = await api.get('/auth/roles');
    const d = rr.data || {};
    store.currentRole = d.current_role || (store.user && store.user.user_type) || null;
    store.roles = Array.isArray(d.roles) ? d.roles : [];
  } catch (e) {
    store.currentRole = store.user ? store.user.user_type : null;
    store.roles = store.currentRole ? [{ role: store.currentRole, is_current: true }] : [];
  }

  // validate persisted active role
  const saved = await storage.get('activeRole');
  const held = store.roles.map((r) => r.role);
  store.activeRole = (saved && held.includes(saved)) ? saved : (store.currentRole || held[0] || null);
  if (store.activeRole) store.isSuperAdmin = false;

  if (store.activeRole === 'admin' || store.currentRole === 'admin' || store.currentRole === 'superadmin') {
    const cached = await storage.get('superadmin');
    if (cached === '1') store.isSuperAdmin = true;
    else if (cached === '0') store.isSuperAdmin = false;
    else {
      store.isSuperAdmin = await probeSuperAdmin(store.user);
      await storage.set('superadmin', store.isSuperAdmin ? '1' : '0');
    }
  }

  store.booted = true;
  store.emit();
  refreshUnread();
  return store;
}

export async function refreshUnread() {
  try {
    const r = await api.get('/notifications/unread-count');
    store.unread = (r.data && (r.data.count ?? r.data.unread)) || 0;
  } catch (e) { store.unread = 0; }
  store.emit();
  return store.unread;
}

export async function login(phone, password) {
  const env = await api.post('/auth/login', {
    phone: normalizePhone(phone) || phone,
    password,
    device_name: config.DEVICE_NAME,
  });
  const d = env.data || {};
  store.token = d.token || null;
  setToken(store.token);
  if (store.token) await storage.set('token', store.token);
  await storage.remove('superadmin');
  await loadSession();
  return store;
}

export async function restoreSession() {
  const t = await storage.get('token');
  if (!t) { store.booted = true; return null; }
  store.token = t;
  setToken(t);
  try {
    await loadSession();
    return store.user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await clearSession();
    }
    return null;
  }
}

export async function clearSession() {
  store.token = null;
  store.user = null;
  store.roles = [];
  store.currentRole = null;
  store.activeRole = null;
  store.isSuperAdmin = false;
  store.unread = 0;
  setToken(null);
  await storage.remove('token');
  await storage.remove('superadmin');
  store.emit();
}

export async function logout() {
  try { await api.post('/auth/logout', {}); } catch (e) { /* token may already be dead */ }
  await clearSession();
}

export async function switchRole(role) {
  const env = await api.put('/auth/current-role', { role });
  const d = env.data || {};
  if (d.user) store.user = d.user;
  store.currentRole = d.current_role || role;
  store.roles = Array.isArray(d.roles) && d.roles.length ? d.roles : store.roles;
  store.activeRole = role;
  await storage.set('activeRole', role);
  store.isSuperAdmin = role === 'admin' ? store.isSuperAdmin : false;
  if (role === 'admin') {
    const cached = await storage.get('superadmin');
    store.isSuperAdmin = cached === '1';
  }
  store.emit();
  refreshUnread();
  return store;
}

export function isMultiRole() {
  return (store.roles || []).length > 1;
}

export function roleLabel(r) {
  return { admin: 'Pentadbir', student: 'Pelajar', sponsor: 'Penaja', superadmin: 'Super Admin' }[r] || r;
}
