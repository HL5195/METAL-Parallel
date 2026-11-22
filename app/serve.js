/*
 * Description: Tiny zero-dependency static file server (Node's built-in
 * http/fs only), just so this app runs over http:// instead of file://
 * (Web Workers are blocked or unreliable on file:// origins in most
 * browsers). No framework needed for a handful of static files.
 *
 * Referenced METAL: No -- plain from-scratch implementation.
 *
 * Author: Howard Li
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

// Serves ROOT's files as-is; defaults '/' to index.html and blocks any path
// that would resolve outside ROOT.
http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } // path traversal guard
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}`));
