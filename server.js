import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMarketHandler } from './server/marketData.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const market = createMarketHandler({ token: process.env.UPSTOX_ACCESS_TOKEN });
const server = createServer(async (req, res) => {
  await market(req, res, async () => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    let path;
    try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); return res.end(); }
    if (path.startsWith('/api/')) { res.writeHead(404); return res.end(); }
    let file = resolve(root, `.${path}`);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403); return res.end(); }
    try { if (!(await stat(file)).isFile()) throw new Error(); } catch {
      if (extname(path)) { res.writeHead(404); return res.end(); }
      file = resolve(root, 'index.html');
    }
    if (!existsSync(file)) { res.writeHead(503); return res.end('Build the app with npm run build first.'); }
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); }).pipe(res);
  });
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`FinPera listening on port ${process.env.PORT || 3000}`));
