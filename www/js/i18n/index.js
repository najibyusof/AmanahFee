/**
 * i18n loader — all user-visible strings live in ms.js (Bahasa Melayu, mockup language).
 * en.js is the English stub with the same key structure.
 */
import ms from './ms.js';
import en from './en.js';

let lang = 'ms';
const dict = { ms, en };

export function setLang(l) { if (dict[l]) lang = l; }
export function getLang() { return lang; }

/** t('pay.title') or t('hello', { name: 'Ali' }) — falls back to the key path. */
export function t(key, params) {
  const d = dict[lang] || ms;
  let s = d[key];
  if (s === undefined) s = ms[key];
  if (s === undefined) return key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}
