import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createBook, getBook, listBooks, parseOutline, putLesson, safePath, validateLesson, validateBook } from '../scripts/library.mjs';

const fixture = { id: 'course', title: '测试课程', outline: '第1章 入门\n1.1 基础\n1.2 应用\n第2章 延伸\n2.1 进阶' };
const lesson = { schemaVersion: 1, id: 'ch-1-s-1', bookId: 'course', title: '基础', summary: '基础解释', minutes: 5, objectives: ['理解定义'], prerequisites: [], sections: [{ id: 'intro', title: '直觉', blocks: [{ type: 'markdown', content: '完整正文' }] }], sources: [] };
async function temporary(t) { const base = path.resolve(os.tmpdir()); const dir = await fs.mkdtemp(path.join(base, 'course-tutor-test-')); if (!path.resolve(dir).startsWith(base + path.sep)) throw new Error('测试目录越界'); t.after(() => fs.rm(dir, { recursive: true, force: true })); return dir; }
test('两级目录保留顺序，纯小节与空章也可以建立', () => {
  const chapters = parseOutline(fixture.outline); assert.equal(chapters.length, 2); assert.equal(chapters[0].lessons[1].title, '1.2 应用');
  assert.equal(parseOutline('基础\n应用')[0].lessons.length, 2);
  assert.equal(parseOutline('第1章 入门')[0].lessons[0].title, '第1章 入门');
});
test('只有有效讲解才算 ready，重复课程不能覆盖', async t => {
  const root = await temporary(t); await createBook(root, fixture); let book = await getBook(root, 'course'); assert.equal(book.total, 3); assert.equal(book.ready, 0);
  await putLesson(root, 'course', lesson); book = await getBook(root, 'course'); assert.equal(book.ready, 1);
  await assert.rejects(createBook(root, fixture), { code: 'EEXIST' });
  await assert.rejects(putLesson(root, 'course', lesson), /已存在/);
});
test('修订保留旧版本，后续小节仍待生成', async t => {
  const root = await temporary(t); await createBook(root, fixture); await putLesson(root, 'course', lesson);
  await putLesson(root, 'course', { ...lesson, summary: '新的解释' }, true);
  const files = await fs.readdir(path.join(root, 'books/course/versions')); assert.equal(files.length, 1);
  const original = JSON.parse(await fs.readFile(path.join(root, 'books/course/versions', files[0]), 'utf8')); assert.equal(original.summary, '基础解释');
  assert.equal((await getBook(root, 'course')).chapters[0].lessons[1].status, 'pending');
});
test('损坏内容明确标记异常，其他课程仍可读取', async t => {
  const root = await temporary(t); await createBook(root, fixture); await fs.writeFile(path.join(root, 'books/course/lessons/ch-1-s-1.json'), '{broken');
  const data = await listBooks(root); assert.equal(data.books.length, 1); assert.equal(data.books[0].ready, 0); assert.equal(data.books[0].chapters[0].lessons[0].status, 'error'); assert.equal(data.issues.length, 1);
});
test('讲解不能写进其他课程，路径与资源不能越界', async t => {
  const root = await temporary(t); await createBook(root, fixture);
  await assert.rejects(putLesson(root, 'course', { ...lesson, bookId: 'elsewhere' }), /不属于/);
  await assert.rejects(safePath(root, '..', 'outside.json'), /越界/);
  assert.throws(() => validateLesson({ ...lesson, sections: [{ id: 's', title: '资源', blocks: [{ type: 'image', src: 'assets/../private.png', alt: '图片', caption: '说明' }] }] }), /相对路径/);
});
test('选择题反馈与答案必须完整，二分数组必须有序', () => {
  const build = block => ({ ...lesson, sections: [{ id: 's', title: '练习', blocks: [block] }] });
  assert.throws(() => validateLesson(build({ type: 'quiz', id: 'q', question: '问题', options: [{ id: 'a', text: '甲', feedback: '说明' }, { id: 'b', text: '乙', feedback: '说明' }], answer: 'c', explanation: '解析' })), /答案/);
  assert.throws(() => validateLesson(build({ type: 'widget', kind: 'binary-search', config: { values: [1, 7, 3] } })), /非递减/);
});
test('导入教材保留三级知识点，非法结构不会进入网页', async t => {
  const root = await temporary(t); const book = await createBook(root, { ...fixture, chapters: [{ id: 'ch-1', title: '第1章', part: '第一部分', lessons: [{ id: 's-1', title: '1.1 基础', subsections: [{ id: 'sub-1', title: '1.1.1 原理', page: 5 }] }] }] });
  assert.equal((await getBook(root, book.id)).chapters[0].lessons[0].subsections[0].page, 5);
  assert.throws(() => validateBook({ ...book, chapters: [{ ...book.chapters[0], lessons: [{ ...book.chapters[0].lessons[0], subsections: 'bad' }] }] }), /必须为数组/);
});
