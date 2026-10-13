import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const PALETTES = ['forest', 'ochre', 'clay', 'slate'];
export function checkId(value) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error('标识符需为 1–80 位小写字母、数字或短横线');
  return value;
}
export function checkString(value, label, max = 20000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label}不能为空，最多 ${max} 字符`);
  return value;
}
export async function safePath(root, ...parts) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...parts);
  if (target !== base && !target.startsWith(base + path.sep)) throw new Error('路径越界');
  // Reject junctions/symlinks rather than traversing them. lstat also works in
  // Windows desktop sandboxes that cannot call realpath across parent folders.
  let current = target;
  while (true) {
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new Error('课程资源目录不允许符号链接或联接点');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    if (current === base) break;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('路径越界');
    current = parent;
  }
  return target;
}
export async function initialize(root) {
  await fs.mkdir(path.join(root, 'books'), { recursive: true });
}
export async function readJson(filename) {
  return JSON.parse((await fs.readFile(filename, 'utf8')).replace(/^\uFEFF/, ''));
}
export async function writeJson(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const tmp = `${filename}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
    await fs.rename(tmp, filename);
  } finally { await fs.rm(tmp, { force: true }); }
}
export function validateBook(book) {
  if (book.schemaVersion !== 1) throw new Error('课程 schemaVersion 必须为 1');
  checkId(book.id); checkString(book.title, '书名', 160);
  checkString(book.category, '分类', 60); checkString(book.level, '学习基础', 100);
  checkString(book.subtitle, '副标题', 300); checkString(book.description, '课程介绍', 3000);
  if (!['outline-only', 'supplied-material'].includes(book.materialMode)) throw new Error('未知材料模式');
  if (!PALETTES.includes(book.cover)) throw new Error('封面色需为 forest / ochre / clay / slate');
  if (!Array.isArray(book.chapters) || !book.chapters.length) throw new Error('课程需要至少一章');
  const ids = new Set();
  for (const chapter of book.chapters) {
    checkId(chapter.id); checkString(chapter.title, '章标题', 200);
    if (chapter.part !== undefined) checkString(chapter.part, '部分标题', 160);
    if (ids.has(chapter.id)) throw new Error('章节标识符重复'); ids.add(chapter.id);
    if (!Array.isArray(chapter.lessons) || !chapter.lessons.length) throw new Error('每章需要至少一节');
    for (const lesson of chapter.lessons) {
      checkId(lesson.id); checkString(lesson.title, '小节标题', 200);
      if (ids.has(lesson.id)) throw new Error('小节标识符重复'); ids.add(lesson.id);
      if (lesson.subsections !== undefined) {
        if (!Array.isArray(lesson.subsections)) throw new Error('小节知识点必须为数组');
        for (const sub of lesson.subsections) {
          checkId(sub.id); checkString(sub.title, '知识点标题', 200);
          if (ids.has(sub.id)) throw new Error('知识点标识符重复'); ids.add(sub.id);
        }
      }
    }
  }
  return book;
}
const BLOCKS = new Set(['markdown', 'callout', 'formula', 'diagram', 'image', 'widget', 'quiz', 'flashcards', 'experiment']);
export function validateLesson(lesson, book) {
  if (lesson.schemaVersion !== 1) throw new Error('讲解 schemaVersion 必须为 1');
  checkId(lesson.id); checkId(lesson.bookId); checkString(lesson.title, '讲解标题', 200);
  if (book && (lesson.bookId !== book.id || !book.chapters.some(c => c.lessons.some(l => l.id === lesson.id)))) throw new Error('讲解不属于此课程目录');
  checkString(lesson.summary, '讲解摘要', 1000);
  if (!Number.isInteger(lesson.minutes) || lesson.minutes < 1 || lesson.minutes > 180) throw new Error('阅读分钟数需为 1–180');
  for (const key of ['objectives', 'prerequisites', 'sources']) if (!Array.isArray(lesson[key])) throw new Error(`${key} 必须为数组`);
  for (const item of [...lesson.objectives, ...lesson.prerequisites]) checkString(item, '学习目标或先修知识', 300);
  if (!lesson.objectives.length) throw new Error('至少需要一个学习目标');
  if (!Array.isArray(lesson.sections) || !lesson.sections.length) throw new Error('讲解需要正文段落');
  const sectionIds = new Set();
  const quizIds = new Set();
  for (const section of lesson.sections) {
    checkId(section.id); checkString(section.title, '段落标题', 200);
    if (sectionIds.has(section.id)) throw new Error('段落标识符重复'); sectionIds.add(section.id);
    if (!Array.isArray(section.blocks) || !section.blocks.length) throw new Error('段落需要内容块');
    for (const block of section.blocks) {
      if (!BLOCKS.has(block.type)) throw new Error(`未知内容块 ${block.type}`);
      if (['markdown', 'callout'].includes(block.type)) checkString(block.content, '正文');
      if (block.type === 'formula') checkString(block.latex, '公式', 3000);
      if (block.type === 'diagram') checkString(block.svg, 'SVG', 100000);
      if (['image', 'experiment'].includes(block.type)) {
        if (!/^assets\/[a-zA-Z0-9/_ .\-\u4e00-\u9fff]+$/.test(block.src) || block.src.split('/').some(p => p === '..')) throw new Error('资源需为课程内 assets/ 相对路径');
        checkString(block.caption, '资源说明', 1000);
        if (block.type === 'image') checkString(block.alt, '图片替代文字', 1000);
      }
      if (block.type === 'widget') {
        if (!['binary-search', 'growth', 'derivative', 'probability', 'steps'].includes(block.kind)) throw new Error('未知交互组件');
        if (block.kind === 'binary-search') {
          const v = block.config?.values;
          if (!Array.isArray(v) || v.length < 2 || v.length > 16 || !v.every(Number.isFinite) || v.some((x, i) => i && x < v[i - 1])) throw new Error('二分演示需提供 2–16 个非递减数值');
        }
        if (block.kind === 'steps' && (!Array.isArray(block.config?.steps) || !block.config.steps.length || block.config.steps.some(s => !s.title || !s.content))) throw new Error('步骤组件需要 title 与 content');
      }
      if (block.type === 'quiz') {
        checkId(block.id); checkString(block.question, '题目', 1500);
        if (quizIds.has(block.id)) throw new Error('练习标识符在一节内不能重复'); quizIds.add(block.id);
        if (!Array.isArray(block.options) || block.options.length < 2 || block.options.length > 6) throw new Error('选择题需要 2–6 个选项');
        const options = new Set();
        for (const option of block.options) { checkId(option.id); checkString(option.text, '选项', 1000); checkString(option.feedback, '选项反馈', 2000); options.add(option.id); }
        if (options.size !== block.options.length || !options.has(block.answer)) throw new Error('题目答案或选项标识符无效');
        checkString(block.explanation, '答案解析', 3000);
      }
      if (block.type === 'flashcards' && (!Array.isArray(block.cards) || !block.cards.length || block.cards.some(c => !c.front || !c.back))) throw new Error('闪卡需要正反面');
      if (block.type === 'flashcards') for (const c of block.cards) { checkString(c.front, '闪卡问题', 1000); checkString(c.back, '闪卡答案', 2000); }
    }
  }
  for (const source of lesson.sources) {
    checkString(source.title, '来源标题', 300);
    if (source.note !== undefined) checkString(source.note, '来源说明', 2000);
    if (source.url && !/^https?:\/\//.test(source.url)) throw new Error('来源链接必须为 http 或 https');
  }
  return lesson;
}

export function parseOutline(text) {
  checkString(text, '目录', 30000);
  const lines = text.split(/\r?\n/).map(l => l.trim().replace(/^[-*+]\s+/, '')).filter(Boolean);
  const chapters = [];
  let current;
  for (const raw of lines) {
    const heading = raw.replace(/^#{1,6}\s*/, '');
    const isChapter = /^(第[\d一二三四五六七八九十百零〇]+章|chapter\s+\d+\b|\d+[、.]\s+)/i.test(heading) || /^#\s+/.test(raw);
    if (isChapter) {
      current = { id: `ch-${chapters.length + 1}`, title: heading, lessons: [] };
      chapters.push(current);
    } else {
      if (!current) { current = { id: 'ch-1', title: '课程内容', lessons: [] }; chapters.push(current); }
      current.lessons.push({ id: `ch-${chapters.length}-s-${current.lessons.length + 1}`, title: heading });
    }
  }
  for (const c of chapters) if (!c.lessons.length) c.lessons.push({ id: `${c.id}-s-1`, title: c.title });
  return chapters;
}
export async function createBook(root, input) {
  await initialize(root);
  const id = input.id || `book-${randomUUID().slice(0, 8)}`;
  const book = validateBook({
    schemaVersion: 1, id, title: input.title?.trim(), subtitle: input.subtitle || '按目录，逐节学懂。',
    category: input.category?.trim() || '通用课程', level: input.level?.trim() || '初学者',
    description: input.description || '根据课程目录编写的原创讲解；尚未提供教材正文。',
    cover: input.cover || PALETTES[Math.floor(Math.random() * PALETTES.length)],
    createdAt: new Date().toISOString(), materialMode: input.materialMode || 'outline-only',
    chapters: input.chapters || parseOutline(input.outline),
  });
  const dir = await safePath(root, 'books', id);
  await fs.mkdir(dir); // Refuse an existing ID, including courses with unfinished files.
  await writeJson(path.join(dir, 'book.json'), book);
  await fs.mkdir(path.join(dir, 'lessons'));
  await fs.mkdir(path.join(dir, 'assets'));
  return book;
}
export async function getBook(root, id) {
  checkId(id);
  const book = validateBook(await readJson(await safePath(root, 'books', id, 'book.json')));
  if (book.id !== id) throw new Error('课程目录名与 ID 不一致');
  const issues = [];
  const chapters = [];
  for (const chapter of book.chapters) {
    const lessons = [];
    for (const entry of chapter.lessons) {
      let status = 'pending', minutes;
      try {
        const data = validateLesson(await readJson(await safePath(root, 'books', id, 'lessons', `${entry.id}.json`)), book);
        if (data.id !== entry.id) throw new Error('讲解文件名与 ID 不一致');
        for (const block of data.sections.flatMap(s => s.blocks)) {
          if (['image', 'experiment'].includes(block.type)) {
            try { await fs.access(await safePath(root, 'books', id, ...block.src.split('/'))); }
            catch (err) { if (err.code === 'ENOENT') throw new Error(`课程资源缺失：${block.src}`); throw err; }
          }
        }
        status = 'ready'; minutes = data.minutes;
      } catch (err) {
        if (err.code !== 'ENOENT') { status = 'error'; issues.push(`${entry.title}：${err.message}`); }
      }
      lessons.push({ ...entry, status, minutes });
    }
    chapters.push({ ...chapter, lessons });
  }
  const all = chapters.flatMap(c => c.lessons);
  return { ...book, chapters, total: all.length, ready: all.filter(l => l.status === 'ready').length, issues };
}
export async function listBooks(root) {
  await initialize(root);
  const books = [], issues = [];
  for (const dir of await fs.readdir(path.join(root, 'books'), { withFileTypes: true })) {
    if (!dir.isDirectory() || !ID.test(dir.name)) continue;
    try { const book = await getBook(root, dir.name); books.push(book); issues.push(...book.issues); }
    catch (err) { issues.push(`${dir.name}：${err.message}`); }
  }
  books.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  return { books, issues, workspace: path.dirname(path.resolve(root)) };
}
export async function getLesson(root, bookId, lessonId) {
  const book = await getBook(root, bookId); checkId(lessonId);
  const lesson = validateLesson(await readJson(await safePath(root, 'books', bookId, 'lessons', `${lessonId}.json`)), book);
  if (lesson.id !== lessonId) throw new Error('讲解文件名与 ID 不一致');
  return lesson;
}
export async function putLesson(root, bookId, input, replace = false) {
  const book = await getBook(root, bookId);
  const lesson = validateLesson(input, book);
  const file = await safePath(root, 'books', bookId, 'lessons', `${lesson.id}.json`);
  try {
    await fs.access(file);
    if (!replace) throw new Error('讲解已存在；检查原稿后用 --replace 更新');
    const versions = await safePath(root, 'books', bookId, 'versions');
    await fs.mkdir(versions, { recursive: true });
    await fs.copyFile(file, path.join(versions, `${lesson.id}-${Date.now()}.json`));
  } catch (err) { if (err.code !== 'ENOENT') throw err; }
  await writeJson(file, { ...lesson, updatedAt: new Date().toISOString() });
}
