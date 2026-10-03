#!/usr/bin/env node
/**
 * Build helper — verifies the web assets before handing off to Cordova.
 * The app is plain vanilla ES modules (no bundler): "building" means
 *  1) syntax-checking every JS module (node --check),
 *  2) verifying that every named import resolves to a real export,
 *  3) sanity-checking that index.html + required images exist.
 * Then run `cordova build android` separately (npm run android:build).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

function exportsOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    m[1].split(',').forEach((s) => { const n = s.trim().split(/\s+as\s+/).pop().trim(); if (n) names.add(n); });
  }
  for (const m of src.matchAll(/export\s+default\s+/g)) names.add('default');
  return names;
}

function main() {
  const files = walk(path.join(ROOT, 'www', 'js'));
  console.log(`checking ${files.length} JS modules…`);

  for (const f of files) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });

  const expMap = new Map(files.map((f) => [path.resolve(f), exportsOf(fs.readFileSync(f, 'utf8'))]));
  let bad = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(f), m[2]);
      const exp = expMap.get(target);
      if (!exp) { console.error(`MISSING MODULE ${m[2]} (imported by ${f})`); bad++; continue; }
      for (const raw of m[1].split(',')) {
        const n = raw.trim().split(/\s+as\s+/)[0].trim();
        if (n && !exp.has(n)) { console.error(`MISSING EXPORT "${n}" in ${m[2]} (imported by ${f})`); bad++; }
      }
    }
  }

  const mustExist = [
    'www/index.html',
    'www/css/tokens.css',
    'www/css/app.css',
    'www/img/logo.png',
    'www/img/qr-placeholder.png',
    'www/img/proof-placeholder.png',
    'res/screens/android/splash.png',
    'res/icons/android/xxxhdpi.png',
  ];
  for (const rel of mustExist) {
    if (!fs.existsSync(path.join(ROOT, rel))) { console.error(`MISSING FILE ${rel}`); bad++; }
  }

  if (bad) {
    console.error(`build check FAILED with ${bad} problem(s)`);
    process.exit(1);
  }
  console.log('build check OK — run `npm run android:build` next.');
}

main();
