import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

test('本地服务可创建目录、只接收同源写入，不暴露课程库外文件', async t => {
  const base = path.resolve(os.tmpdir()); const root = await fs.mkdtemp(path.join(base, 'course-tutor-http-'));
  if (!path.resolve(root).startsWith(base + path.sep)) throw new Error('测试路径越界');
  const server = fileURLToPath(new URL('../assets/library-app/server.mjs', import.meta.url));
  const child = spawn(process.execPath, [server, '--library', root, '--port', '4329'], { stdio: 'pipe', windowsHide: true });
  t.after(async () => { child.kill(); await new Promise(resolve => child.once('exit', resolve)); await fs.rm(root, { recursive: true, force: true }); });
  let started = ''; child.stdout.on('data', data => { started += data.toString(); });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('服务启动超时')), 5000); const poll = setInterval(() => { if (started.includes('已启动')) { clearInterval(poll); clearTimeout(timer); resolve(); } }, 30); child.once('exit', code => { clearTimeout(timer); clearInterval(poll); reject(new Error(`服务提前退出 ${code}`)); }); });
  const url = 'http://127.0.0.1:4329';
  assert.equal((await fetch(url)).status, 200);
  const input = JSON.stringify({ id: 'http-course', title: '新课程', outline: '第1章 基础\n1.1 原理\n1.2 应用' });
  assert.equal((await fetch(`${url}/api/books`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' }, body: input })).status, 403);
  const created = await fetch(`${url}/api/books`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: url }, body: input }); assert.equal(created.status, 201);
  const library = await (await fetch(`${url}/api/library`)).json(); assert.equal(library.books.length, 1); assert.equal(library.books[0].total, 2); assert.equal(library.books[0].ready, 0);
  assert.equal((await fetch(`${url}/library-assets/http-course/%2e%2e%2fbook.json`)).status >= 400, true);
  const hostStatus = await new Promise((resolve, reject) => { const req = http.get(`${url}/api/library`, { headers: { Host: 'untrusted.example:4329' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); });
  assert.equal(hostStatus, 403);
});
