#!/usr/bin/env node
/**
 * Evaluate a JavaScript expression inside the running Cordova WebView via the
 * Chrome DevTools Protocol (remote debugging is enabled in debug builds).
 *
 * Setup (once per app launch):
 *   adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 *   (scripts/emu-eval.js does this automatically)
 *
 * Usage:
 *   node scripts/emu-eval.js "location.hash"
 *   node scripts/emu-eval.js "await new Promise(r=>setTimeout(r,500)); document.querySelector('#login-btn').click(); 'clicked'"
 */
const http = require('http');
const { execFileSync } = require('child_process');

const ADB = process.env.ADB || 'adb';
const PKG = 'net.padat.classpay';

function sh(args) {
  return execFileSync(ADB, args, { encoding: 'utf8' }).trim();
}

function httpJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: 9222, path }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function findTarget() {
  for (let i = 0; i < 10; i++) {
    try {
      const list = await httpJson('/json/list');
      const page = list.find((t) => t.type === 'page' && /index\.html|localhost/.test(t.url || '')) || list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (e) { /* retry */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('no WebView devtools target — is the app running (debug build)?');
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} reject(new Error('evaluate timeout')); }, 30000);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true, userGesture: true },
      }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (msg.result && msg.result.exceptionDetails) {
        reject(new Error(msg.result.exceptionDetails.exception && msg.result.exceptionDetails.exception.description || 'eval error'));
      } else if (msg.result && msg.result.result) {
        resolve(msg.result.result.value);
      } else {
        resolve(undefined);
      }
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error('ws error')); };
  });
}

async function main() {
  const expression = process.argv.slice(2).join(' ') || '1+1';
  let pid = '';
  try { pid = sh(['shell', 'pidof', PKG]).split(/\s+/)[0]; } catch (e) { /* not running */ }
  if (!pid) throw new Error(`${PKG} is not running`);
  try { sh(['forward', '--remove', 'tcp:9222']); } catch (e) { /* ignore */ }
  sh(['forward', 'tcp:9222', `localabstract:webview_devtools_remote_${pid}`]);
  const target = await findTarget();
  const value = await evaluate(target.webSocketDebuggerUrl, expression);
  console.log(typeof value === 'string' ? value : JSON.stringify(value));
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
