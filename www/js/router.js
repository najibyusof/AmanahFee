/**
 * Tiny hash router.
 * Routes: '#/org/:id/edit' style patterns → screen modules.
 * Each screen module default-export: async (ctx) => void | cleanupFn
 * ctx = { params, query, root, go, back, title, setHeader }
 */
const routes = [];
let notFoundRoute = null;
let currentCleanup = null;
let currentHash = '';
let guardFn = null; // (route, ctx) => string|null  → redirect hash or null
let appRoot = null;
const inAppHistory = [];
let resolveEpoch = 0; // increments per navigation; stale async renders are dropped

/**
 * Wrap the app root so that a screen whose async load resolves AFTER the user
 * has navigated elsewhere cannot overwrite the new screen's DOM. The first
 * (synchronous) render always runs in its own epoch; later re-renders from a
 * stale epoch are silently ignored.
 */
function staleGuardRoot(el, epoch) {
  return new Proxy(el, {
    get(target, prop) {
      if (epoch !== resolveEpoch) {
        // Stale screen: reads are inert so late bind() code cannot attach
        // handlers into the CURRENT screen's DOM.
        if (prop === 'querySelector') return () => null;
        if (prop === 'querySelectorAll') return () => [];
        if (prop === 'innerHTML' || prop === 'textContent') return '';
        return () => undefined;
      }
      const v = Reflect.get(target, prop);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      if (epoch !== resolveEpoch) return true; // stale paint — dropped
      target[prop] = value;
      return true;
    },
  });
}

export function initRouter(rootEl) {
  appRoot = rootEl;
  window.addEventListener('hashchange', () => resolve());
}

export function setGuard(fn) { guardFn = fn; }

export function route(pattern, screen, meta = {}) {
  const keys = [];
  const rx = new RegExp(
    '^' + pattern.replace(/\/:([A-Za-z0-9_]+)/g, (_, k) => { keys.push(k); return '/([^/?]+)'; }) + '/?$',
  );
  routes.push({ pattern, rx, keys, screen, meta });
}

export function setNotFound(screen) { notFoundRoute = screen; }

export function currentRouteHash() { return currentHash; }

export function go(hash, { replace = false } = {}) {
  if (!hash.startsWith('#')) hash = '#' + hash;
  if (hash === currentHash) { resolve(); return; }
  if (replace) {
    location.replace(hash);
  } else {
    inAppHistory.push(currentHash);
    location.hash = hash;
  }
}

export function back() {
  if (inAppHistory.length) {
    const prev = inAppHistory.pop();
    currentHash = ''; // force re-resolve
    if (prev) { location.hash = prev; return; }
  }
  history.back();
}

export function resetHistory(hash) {
  inAppHistory.length = 0;
  currentHash = '';
  if (hash) location.hash = hash;
}

export function hasHistory() { return inAppHistory.length > 0; }

function parseHash() {
  const h = location.hash || '#/';
  const [path, qs] = h.split('?');
  const query = {};
  if (qs) for (const [k, v] of new URLSearchParams(qs)) query[k] = v;
  return { path: path || '#/', query };
}

async function resolve() {
  const { path, query } = parseHash();
  currentHash = location.hash || '#/';

  let match = null;
  for (const r of routes) {
    const m = r.rx.exec(path);
    if (m) { match = { route: r, params: m.slice(1).reduce((acc, val, i) => { acc[r.keys[i]] = decodeURIComponent(val); return acc; }, {}) }; break; }
  }
  if (!match) {
    if (!notFoundRoute) return;
    match = { route: { screen: notFoundRoute, meta: {} }, params: {} };
  }

  const epoch = ++resolveEpoch;
  const ctx = {
    params: match.params,
    query,
    root: staleGuardRoot(appRoot, epoch),
    meta: match.route.meta || {},
    go,
    back,
    path,
  };

  if (guardFn) {
    const redirect = guardFn(match.route.meta, ctx, path);
    if (redirect && redirect !== path) { go(redirect, { replace: true }); return; }
  }

  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (e) { /* noop */ }
  }
  currentCleanup = null;
  appRoot.innerHTML = '';
  window.scrollTo(0, 0);

  try {
    const res = await match.route.screen(ctx);
    if (typeof res === 'function') currentCleanup = res;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('screen error', e);
    appRoot.innerHTML = `
      <div class="screen"><div class="content"><div class="empty" style="padding-top:80px">
        <div class="empty-ico">!</div>
        <div class="empty-title">Ralat skrin</div>
        <div class="empty-text">${String(e && e.message || e)}</div>
        <button class="btn btn-primary" onclick="location.reload()">Muat semula</button>
      </div></div></div>`;
  }
}

export async function refresh() { await resolve(); }
