#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createBook, listBooks, putLesson, readJson } from './library.mjs';

const args = process.argv.slice(2);
const command = args.shift();
const flag = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const workspace = path.resolve(flag('--workspace', process.cwd()));
const root = path.join(workspace, 'learning-library');
try {
  if (command === 'create') {
    const input = await readJson(flag('--input'));
    console.log(JSON.stringify(await createBook(root, input), null, 2));
  } else if (command === 'put-lesson') {
    await putLesson(root, flag('--book'), await readJson(flag('--input')), args.includes('--replace'));
    console.log('讲解已保存。');
  } else if (command === 'list' || command === 'validate') {
    const result = await listBooks(root);
    console.log(JSON.stringify(result, null, 2));
    if (command === 'validate' && result.issues.length) process.exitCode = 1;
  } else if (command === 'serve') {
    const server = fileURLToPath(new URL('../assets/library-app/server.mjs', import.meta.url));
    const child = spawn(process.execPath, [server, '--library', root, '--port', flag('--port', '4317')], { stdio: 'inherit', windowsHide: true });
    child.on('exit', code => process.exit(code || 0));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
  } else {
    console.log('node course.mjs create|put-lesson|list|validate|serve --workspace <项目目录> [--input <JSON>] [--book <课程ID>] [--replace] [--port 4317]');
    if (command) process.exitCode = 1;
  }
} catch (err) { console.error(err.message); process.exitCode = 1; }
