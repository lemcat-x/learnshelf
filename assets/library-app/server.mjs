import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBook, listBooks, getBook, getLesson, initialize, safePath } from '../../scripts/library.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const root = path.resolve(arg('--library', path.join(process.cwd(), 'learning-library')));
const port = Number(arg('--port', '4317'));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('端口需为 1024–65535');
const dist = fileURLToPath(new URL('./dist/', import.meta.url));
await initialize(root);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('请求需要 JSON 内容'), { status: 415 });
  let size = 0, chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 100000) throw Object.assign(new Error('目录过长'), { status: 413 }); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function file(res, filename, isolated = false) {
  const data = await fs.readFile(filename);
  const type = MIME[path.extname(filename).toLowerCase()] || 'application/octet-stream';
  if (isolated) res.setHeader('Content-Security-Policy', "sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self'; form-action 'none'; base-uri 'none'");
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' }); res.end(data);
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return json(res, 403, { error: '仅允许本机访问' });
    const u = new URL(req.url, `http://127.0.0.1:${port}`);
    const parts = decodeURIComponent(u.pathname).split('/').filter(Boolean);
    if (u.pathname === '/api/health') return json(res, 200, { app: 'course-tutor', library: root });
    if (u.pathname === '/api/library' && req.method === 'GET') return json(res, 200, await listBooks(root));
    if (parts[0] === 'api' && parts[1] === 'books' && parts.length === 3 && req.method === 'GET') return json(res, 200, await getBook(root, parts[2]));
    if (parts[0] === 'api' && parts[1] === 'lessons' && parts.length === 4 && req.method === 'GET') return json(res, 200, await getLesson(root, parts[2], parts[3]));
    if (u.pathname === '/api/books' && req.method === 'POST') {
      if (![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) return json(res, 403, { error: '课程只能从本机学习网页添加' });
      return json(res, 201, await createBook(root, await body(req)));
    }
    if (u.pathname.startsWith('/api/')) return json(res, 404, { error: '找不到此接口' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: '不支持此操作' });
    if (parts[0] === 'library-assets' && parts.length >= 3) {
      if (!/^[a-z0-9-]+$/.test(parts[1]) || parts.slice(2).some(p => p === '..' || p === '.' || p.includes('\\'))) throw new Error('无效资源路径');
      return await file(res, await safePath(root, 'books', parts[1], 'assets', ...parts.slice(2)), true);
    }
    const target = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname).slice(1);
    await file(res, await safePath(dist, target));
  } catch (err) {
    const status = err.status || (err.code === 'ENOENT' ? 404 : err.code === 'EEXIST' ? 409 : 400);
    json(res, status, { error: err.code === 'ENOENT' ? '内容尚未生成或资源不存在' : err.message });
  }
});
server.on('error', err => { console.error(err.code === 'EADDRINUSE' ? `端口 ${port} 已被使用，请检查已有服务或指定 --port` : err.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`知页已启动：http://127.0.0.1:${port}\n课程库：${root}`));
