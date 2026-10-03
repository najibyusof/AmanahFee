#!/usr/bin/env node
/**
 * Regenerates sheets/view.html: a single self-contained page with the
 * test-evidence screenshots embedded as base64 data URIs (works offline,
 * no server needed). Usage: node scripts/make-view.js [shot1.png shot2.png ...]
 * With no args, embeds the default "key evidence" subset below.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'test-evidence');
const OUT = path.join(ROOT, 'sheets', 'view.html');

const DEFAULT_SHOTS = [
  '00_boot_splash.png', '01_admin_login.png', '03_admin_dashboard.png',
  '34_boot_with_cordova.png', '36_sa_dashboard.png', '37_sa_admins.png',
  '38_sa_admin_created.png', '41_sa_admin_deactivated.png', '45_session_expired_401.png',
  '46_student_home.png', '47_notifications_student.png', '48_offline_banner.png',
  '50_rotation_landscape.png', '51_exit_confirm_fixed.png',
];

const shots = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_SHOTS;
const cards = [];
for (const name of shots) {
  const p = path.join(SRC, name);
  if (!fs.existsSync(p)) { console.warn('skip (missing):', name); continue; }
  const b64 = fs.readFileSync(p).toString('base64');
  cards.push(
    `    <figure><figcaption>${name}</figcaption>` +
    `<img loading="lazy" src="data:image/png;base64,${b64}" alt="${name}"></figure>`);
}

const html = `<!DOCTYPE html>
<html lang="ms"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ClassPay — Test Evidence</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#0f1420;color:#e8ecf5}
  header{padding:18px 22px;border-bottom:1px solid #232a3d;position:sticky;top:0;background:#0f1420}
  h1{font-size:18px;margin:0 0 4px} p{margin:0;color:#93a0bb;font-size:13px}
  main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px;padding:20px}
  figure{margin:0;background:#161d2e;border:1px solid #232a3d;border-radius:10px;overflow:hidden}
  figcaption{padding:8px 12px;font:12px/1.4 ui-monospace,monospace;color:#93a0bb}
  img{width:100%;display:block}
</style></head><body>
<header><h1>ClassPay — Emulator Test Evidence</h1>
<p>${cards.length} screenshots · test-evidence/ · net.padat.classpay v1.0.0</p></header>
<main>
${cards.join('\n')}
</main></body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`sheets/view.html written (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB, ${cards.length} shots)`);
