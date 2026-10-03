#!/usr/bin/env node
/**
 * Tiny static dev server for browser-based development of the Cordova www/ app.
 * Serves the project root with correct ES-module MIME types and SPA-ish
 * behaviour for the hash router (any unknown path → index.html).
 *
 * Usage: node scripts/dev-server.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'www/index.html' : urlPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      // hash-router app: unknown paths fall back to index.html
      filePath = path.join(ROOT, 'www/index.html');
    }
    fs.readFile(filePath, (err2, buf) => {
      if (err2) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(buf);
    });
  });
});

server.listen(PORT, () => {
  console.log(`ClassPay dev server → http://localhost:${PORT}  (serving ${ROOT})`);
});
