#!/usr/bin/env node
/**
 * after_prepare hook: harden cordova-plugin-secure-storage.
 *
 * The plugin's Android implementation launches the "com.android.credentials.UNLOCK"
 * intent from unlockCredentials() whenever a screen lock is enrolled but the
 * Keystore entry is not yet available (first run after install). On devices or
 * emulator images with no handler for that intent, the unguarded
 * ActivityNotFoundException kills the whole app.
 *
 * This hook wraps startActivity() in a try/catch so init fails gracefully and
 * the app (www/js/storage.js) falls back to in-memory storage. Idempotent.
 */
const fs = require('fs');
const path = require('path');

// IMPORTANT: after_prepare runs AFTER cordova has copied plugin Java sources into
// the platform, so the file that actually gets compiled is the platform copy.
// Patch that one (fall back to the plugin source for reference/edge cases).
const targets = [
  path.join(__dirname, '..', 'platforms', 'android', 'app', 'src', 'main', 'java',
    'com', 'crypho', 'plugins', 'SecureStorage.java'),
  path.join(__dirname, '..', 'plugins',
    'cordova-plugin-secure-storage', 'src', 'android', 'SecureStorage.java'),
];

const MARKER = '// [classpay-patch] guarded startActivity';
const OLD = [
  '    private void startActivity(Intent intent) {',
  '        cordova.getActivity().startActivity(intent);',
  '    }',
].join('\n');
const NEW = [
  '    private void startActivity(Intent intent) {',
  `        ${MARKER}`,
  '        try {',
  '            cordova.getActivity().startActivity(intent);',
  '        } catch (Exception e) {',
  '            // No activity handles the credential-unlock dialog (some emulator',
  '            // images). Fail init gracefully instead of crashing the app.',
  '            Log.e(TAG, "Unable to launch credential unlock activity", e);',
  '            if (initContext != null) {',
  '                initContext.error(e.getMessage());',
  '                initContext = null;',
  '            }',
  '        }',
  '    }',
].join('\n');

let applied = 0;
for (const target of targets) {
  try {
    const src = fs.readFileSync(target, 'utf8');
    if (src.includes(MARKER)) {
      applied++;
      console.log('patch-secure-storage: already applied (' + path.basename(path.dirname(target)) + ')');
    } else if (src.includes(OLD)) {
      fs.writeFileSync(target, src.replace(OLD, NEW));
      applied++;
      console.log('patch-secure-storage: startActivity() guarded (' + target + ')');
    } else {
      console.warn('patch-secure-storage: pattern not found in ' + target + ' — skipping');
    }
  } catch (e) {
    console.warn('patch-secure-storage: not found, skipping (' + target + ')');
  }
}
if (applied === 0) console.warn('patch-secure-storage: WARNING — no file patched');
