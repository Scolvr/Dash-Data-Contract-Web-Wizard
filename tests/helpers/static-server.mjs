import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let __server;
let __baseUrl;

export async function ensureServer(rootDirUrl) {
  if (__baseUrl) return __baseUrl;
  const root = path.dirname(fileURLToPath(rootDirUrl));

  __server = http.createServer((req, res) => {
    try {
      let reqPath = (req.url || '/').split('?')[0];
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      let filePath = path.join(root, reqPath.replace(/^\//, ''));

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const cts = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.map': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
      };
      res.setHeader('Content-Type', cts[ext] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e && e.message ? e.message : e));
    }
  });

  await new Promise((resolve) => __server.listen(0, '127.0.0.1', resolve));
  const { port } = __server.address();
  __baseUrl = `http://127.0.0.1:${port}/`;
  return __baseUrl;
}

export async function closeServer() {
  if (__server) {
    await new Promise((resolve) => __server.close(() => resolve()));
    __server = undefined;
    __baseUrl = undefined;
  }
}

