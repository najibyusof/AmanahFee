/**
 * Central API client for ClassPay.
 *  - Laravel Sanctum bearer auth, standard envelope { success, message, data, errors }
 *  - Uniform handling of 401 / 403 / 404 / 422 / 429 / 500 + offline
 *  - Lists: list() returns { items, pagination } from data.<resource> + data.pagination
 *  - multipart uploads (logo / QR / proof)
 *  - config.MOCK=true routes requests to in-app fixtures (see mock.js)
 */
import { config } from './config.js';
import { storage } from './storage.js';
import { handleMock } from './mock.js';

export class ApiError extends Error {
  constructor(status, message, errors = {}, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;      // 0 = network/offline
    this.errors = errors;      // always a normalized object { field: [msgs] }
    this.retryable = retryable;
  }
  get isValidation() { return this.status === 422; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isOffline() { return this.status === 0; }
}

let token = null;
let unauthorizedHandler = null;

export function setToken(t) { token = t; }
export function getToken() { return token; }
export function onUnauthorized(fn) { unauthorizedHandler = fn; }

/** Normalize server `errors` (object OR array) into { field: [string] }. */
function normalizeErrors(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return { _: raw.map(String) };
  const out = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v.map(String) : [String(v)];
  return out;
}

function buildQuery(query) {
  if (!query) return '';
  const ps = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    ps.set(k, String(v));
  }
  const s = ps.toString();
  return s ? `?${s}` : '';
}

async function parseBody(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch (e) { return null; }
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { success: res.ok, message: text.slice(0, 300), data: null, errors: {} }; }
}

async function http(method, path, { query, body, form, signal, raw } = {}) {
  const url = config.BASE_URL + path + buildQuery(query);
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // FormData sets its own multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, signal });
  } catch (e) {
    throw new ApiError(0, 'network', {}, false);
  }

  if (res.status === 401) {
    // Clear session → login (uniform across the app)
    if (unauthorizedHandler) unauthorizedHandler();
    const j = await parseBody(res).catch(() => null);
    throw new ApiError(401, (j && j.message) || 'Unauthenticated.', {});
  }

  if (!res.ok) {
    const j = await parseBody(res).catch(() => null);
    const msg = (j && j.message) || `HTTP ${res.status}`;
    const errors = normalizeErrors(j && j.errors);
    if (res.status === 429) throw new ApiError(429, msg, errors, true);
    if (res.status >= 500) throw new ApiError(res.status, msg, errors, true);
    throw new ApiError(res.status, msg, errors);
  }

  if (raw) return parseBody(res);
  const json = await parseBody(res);
  if (json && json.success === false) {
    throw new ApiError(res.status, json.message || 'Error', normalizeErrors(json.errors));
  }
  return json || { success: true, message: '', data: null, errors: {} };
}

async function withRetry(fn) {
  try {
    return await fn();
  } catch (e) {
    // one short backoff retry for rate limits on idempotent reads
    if (e instanceof ApiError && e.status === 429 && !e._retried) {
      e._retried = true;
      await new Promise((r) => setTimeout(r, 1500));
      return fn();
    }
    throw e;
  }
}

function isMockable(path) {
  // fall through to live endpoints only when MOCK is off
  return config.MOCK;
}

// 401 means “session expired/invalid” no matter which backend produced it:
// run the uniform session-expiry handler, then rethrow for the caller.
function rethrowWithAuthHandling(e) {
  if (e instanceof ApiError && e.status === 401 && unauthorizedHandler) {
    try { unauthorizedHandler(); } catch (err) { /* handler must not mask the error */ }
  }
  throw e;
}

export const api = {
  async get(path, query, opts) {
    if (isMockable(path)) return handleMock('GET', path, { query, ...(opts || {}) }).catch(rethrowWithAuthHandling);
    return withRetry(() => http('GET', path, { ...opts, query }));
  },
  async post(path, body, opts) {
    if (isMockable(path)) return handleMock('POST', path, { body, ...(opts || {}) }).catch(rethrowWithAuthHandling);
    return http('POST', path, { ...opts, body });
  },
  async put(path, body, opts) {
    if (isMockable(path)) return handleMock('PUT', path, { body, ...(opts || {}) }).catch(rethrowWithAuthHandling);
    return http('PUT', path, { ...opts, body });
  },
  async patch(path, body, opts) {
    if (isMockable(path)) return handleMock('PATCH', path, { body, ...(opts || {}) }).catch(rethrowWithAuthHandling);
    return http('PATCH', path, { ...opts, body });
  },
  async del(path, opts) {
    if (isMockable(path)) return handleMock('DELETE', path, opts || {}).catch(rethrowWithAuthHandling);
    return http('DELETE', path, opts || {});
  },

  /** multipart POST — fields: { fieldName: value }, file: { field, blob, filename } */
  async upload(path, { fields = {}, file = null, onProgress } = {}) {
    if (isMockable(path)) return handleMock('POST', path, { form: { fields, file } }).catch(rethrowWithAuthHandling);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) fd.append(k, v);
    if (file) fd.append(file.field || 'file', file.blob, file.filename || 'upload.bin');
    return http('POST', path, { form: fd });
  },

  /** Convenience: paginated list from data.<resource> */
  async list(path, resource, query, opts) {
    const env = await api.get(path, query, opts);
    const d = env.data || {};
    const aliasedItems =
      resource === 'participants' ? d.class_participants : null;
    return {
      items: Array.isArray(d[resource])
        ? d[resource]
        : Array.isArray(aliasedItems)
          ? aliasedItems
          : (Array.isArray(d) ? d : []),
      pagination: d.pagination || null,
      message: env.message || '',
      raw: d,
    };
  },
};

/** Resolve a cordova file URI (camera/gallery/picker) to a Blob. */
export function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    if (!window.resolveLocalFileSystemURL) {
      // browser dev: plain URL fetch
      fetch(uri).then((r) => r.blob()).then(resolve).catch(reject);
      return;
    }
    window.resolveLocalFileSystemURL(uri, (entry) => {
      entry.file((file) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(new Blob([fr.result], { type: file.type || '' }));
        fr.onerror = reject;
        fr.readAsArrayBuffer(file);
      }, reject);
    }, reject);
  });
}

/** Normalize Malaysian phone for display/validation (server stays authoritative). */
export function normalizePhone(input) {
  if (!input) return '';
  let d = String(input).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) {
    if (d.startsWith('+60')) return d;
    if (d.startsWith('+')) return d; // foreign code — never duplicate country code
    return d;
  }
  if (d.startsWith('60')) return `+${d}`;
  if (d.startsWith('0')) return `+60${d.slice(1)}`;
  return `+60${d}`;
}

/** Pretty phone per mockups: +6012-345 6789 */
export function formatPhone(p) {
  if (!p) return '';
  const n = normalizePhone(p);
  if (!n.startsWith('+60')) return n;
  const body = n.slice(3);
  if (body.length >= 9) {
    // 123456789 -> 12-345 6789
    return `+60${body.slice(0, 2)}-${body.slice(2, 5)} ${body.slice(5, 9)}${body.slice(9)}`;
  }
  return n;
}
