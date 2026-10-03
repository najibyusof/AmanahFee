#!/usr/bin/env node
/**
 * Static check: every shared-module helper used by a screen must be imported.
 * Catches the "ReferenceError: rm is not defined" class of bug at build time
 * instead of at runtime in the WebView.
 */
const fs = require('fs');
const path = require('path');

const SHARED = {
  '../ui.js': ['esc', 'attr', 'debounce', 'icon', 'spin', 'fmtMoney', 'rm', 'fmtDate', 'fmtDateTime', 'timeAgo', 'initials', 'fmtBytes', 'statusChip', 'chip', 'methodLabel', 'dayName', 'freqLabel', 'appbar', 'ADMIN_NAV', 'STU_NAV', 'SA_NAV', 'bottomNav', 'skeletonList', 'emptyState', 'errorState', 'toast', 'openSheet', 'closeTopOverlay', 'confirmDialog', 'bindPTR', 'field', 'selectField', 'formValues', 'clearErrors', 'showErrors', 'setLoading', 'copyText', 'shareContent', 'pickImage', 'pickProof', 'isValidImage', 'isValidProof', 'bindCommon', 'banner', 'avatar'],
  '../api.js': ['api', 'ApiError', 'normalizePhone', 'formatPhone', 'uriToBlob', 'setToken', 'getToken', 'onUnauthorized'],
  '../store.js': ['store', 'roleHome', 'loadSession', 'refreshUnread', 'login', 'restoreSession', 'clearSession', 'logout', 'switchRole', 'isMultiRole', 'roleLabel'],
  '../router.js': ['initRouter', 'setGuard', 'route', 'setNotFound', 'go', 'back', 'resetHistory', 'hasHistory', 'refresh', 'currentRouteHash'],
  '../config.js': ['config'],
  '../storage.js': ['storage'],
  '../i18n/index.js': ['t', 'setLang', 'getLang'],
};

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})('www/js');

let problems = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const imported = new Set();
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const raw of m[1].split(',')) {
      const parts = raw.trim().split(/\s+as\s+/);
      imported.add((parts[1] || parts[0]).trim());
    }
  }
  const local = new Set();
  for (const m of src.matchAll(/(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) local.add(m[1]);
  for (const m of src.matchAll(/import\s+\*\s+as\s+([A-Za-z0-9_$]+)/g)) local.add(m[1]);

  for (const [mod, names] of Object.entries(SHARED)) {
    if (!src.includes("'" + mod + "'")) continue;
    // dynamic import('../ui.js') lazy-loads helpers at runtime — skip static check
    const dynImported = new RegExp("import\\(\\s*['\"]" + mod.replace(/[.\\/]/g, (c) => '\\' + c) + "['\"]\\s*\\)").test(src);
    if (dynImported) continue;
    for (const n of names) {
      // usage as a call or bare reference, not as a property access / declaration
      const used = new RegExp('[^\\w$.\'"`]' + n + '\\s*[(\\)]').test(src);
      const declared = new RegExp('(?:function|const|let|var|class)\\s+' + n + '\\b').test(src);
      if (used && !imported.has(n) && !local.has(n) && !declared) {
        console.log(f + ': uses ' + n + ' from ' + mod + ' but does not import it');
        problems++;
      }
    }
  }
}
console.log(problems ? problems + ' problem(s)' : 'no missing shared imports');
process.exit(problems ? 1 : 0);
