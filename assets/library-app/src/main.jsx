import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Copy, Download, Library, List, Monitor, Moon, Pause, Play, Plus, RefreshCw, Search, Sun, X } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './style.css';

marked.use({ extensions: [
  { name: 'mathBlock', level: 'block', start: s => s.indexOf('$$'), tokenizer: s => { const m = /^\$\$\n?([\s\S]+?)\n?\$\$(?:\n|$)/.exec(s); if (m) return { type: 'mathBlock', raw: m[0], text: m[1] }; }, renderer: t => katex.renderToString(t.text, { displayMode: true, throwOnError: false, trust: false }) },
  { name: 'mathInline', level: 'inline', start: s => s.indexOf('$'), tokenizer: s => { const m = /^\$([^$\n]+)\$/.exec(s); if (m) return { type: 'mathInline', raw: m[0], text: m[1] }; }, renderer: t => katex.renderToString(t.text, { throwOnError: false, trust: false }) },
] });
const clean = html => DOMPurify.sanitize(html, { USE_PROFILES: { html: true, mathMl: true }, FORBID_TAGS: ['style', 'iframe', 'form'] });
function Markdown({ content = '' }) { return <div className="prose" dangerouslySetInnerHTML={{ __html: clean(marked.parse(content)) }} />; }
const flatten = book => book.chapters.flatMap(ch => ch.lessons.map(l => ({ ...l, chapter: ch.title })));
const go = (book, lesson) => { location.hash = book ? `/book/${book}${lesson ? `/lesson/${lesson}` : ''}` : '/'; };
function parseRoute() { const p = location.hash.replace(/^#\/?/, '').split('/'); return { bookId: p[0] === 'book' ? p[1] : null, lessonId: p[2] === 'lesson' ? p[3] : null }; }
async function api(url, options) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error || '无法读取课程'); return data; }
function storageRead(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }

function useTheme() {
  const [theme, setTheme] = useState(() => { const t = storageRead('zhiye-theme', 'light'); return ['light', 'dark', 'system'].includes(t) ? t : 'light'; });
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme; };
    apply(); media.addEventListener('change', apply);
    try { localStorage.setItem('zhiye-theme', JSON.stringify(theme)); } catch { /* Theme still applies if storage is unavailable. */ }
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return [theme, setTheme];
}
function ThemeControl({ theme, setTheme }) {
  return <div className="theme-control"><span className="sr-only" id="theme-label">阅读主题</span><span aria-hidden="true">{theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />}</span><select aria-labelledby="theme-label" value={theme} onChange={e => setTheme(e.target.value)}><option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option></select><ChevronDown size={13} aria-hidden="true" /></div>;
}
class Boundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <main className="fatal"><BookOpen /><h1>页面暂时无法显示</h1><p>{this.state.error.message}</p><button onClick={() => location.reload()}>重新打开</button></main> : this.props.children; }
}
function CoverArt({ kind }) {
  return <svg viewBox="0 0 220 150" fill="none" aria-hidden="true" className="cover-art">
    {kind === 'forest' ? <><path d="M110 27v26M55 79h110M55 79v30m110-30v30M110 53L55 79m55-26 55 26" /><circle cx="110" cy="26" r="15" /><circle cx="55" cy="80" r="15" /><circle cx="165" cy="80" r="15" /><rect x="40" y="109" width="30" height="24" rx="3" /><rect x="150" y="109" width="30" height="24" rx="3" /></> : kind === 'ochre' ? <><path d="M25 115h170M49 136V20M35 116c37 0 45-74 80-74s40 60 75 14M65 125 166 27" /><circle cx="116" cy="66" r="5" /><path d="M116 66v50m0-50H49" strokeDasharray="4 5" /></> : <><path d="M28 123h165M39 137V23" /><path d="M53 123V97h22v26m8 0V68h22v55m8 0V42h22v81m8 0V81h22v42" /><path d="M52 91c17-25 52-54 74-52s36 22 56 26" strokeDasharray="4 5" /></>}
  </svg>;
}
function BookCard({ book, readCount }) {
  return <button className="book-card" onClick={() => go(book.id)} aria-label={`打开 ${book.title}，${book.ready} 节讲解已生成`}>
    <div className={`book-cover ${book.cover}`}><div className="book-spine" /><div className="cover-top"><span>{book.category}</span><span>{book.demo ? '示例课程' : '个人课程'}</span></div><h3>{book.title}</h3><p>{book.subtitle}</p><CoverArt kind={book.cover} /><div className="cover-bottom"><span>知页 · 学习手册</span><BookOpen size={16} /></div></div>
    <div className="book-meta"><strong>{book.title}</strong><span>{book.ready} / {book.total} 节讲解已生成</span><div className="book-foot"><span>{book.level}</span><span>{readCount ? `已读 ${readCount} 节` : '开始探索'}<ArrowRight size={14} /></span></div></div>
  </button>;
}
function AddCourse({ close, onCreated }) {
  const ref = useRef();
  const [form, setForm] = useState({ title: '', category: '通用课程', level: '初学者', outline: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { const prev = document.activeElement; ref.current.showModal(); return () => { prev?.focus?.(); }; }, []);
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const book = await api('/api/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); onCreated(book); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return <dialog ref={ref} className="course-dialog" onCancel={close} aria-labelledby="add-title"><div className="dialog-top"><span className="eyebrow">NEW COURSE</span><button className="icon-button" onClick={close} aria-label="关闭添加课程"><X size={20} /></button></div><h2 id="add-title">给知识一个位置。</h2><p className="muted">先把目录放进书架，再到 Codex 生成逐节讲解。</p><form onSubmit={submit}>
    <label>课程名称<input autoFocus required maxLength={160} name="title" value={form.title} onChange={update} placeholder="例如：计算机网络" /></label>
    <div className="form-row"><label>分类<input name="category" value={form.category} maxLength={60} onChange={update} /></label><label>学习基础<select name="level" value={form.level} onChange={update}><option>初学者</option><option>有一定基础</option><option>进阶学习</option></select></label></div>
    <label>课程目录<textarea required name="outline" rows={8} maxLength={30000} value={form.outline} onChange={update} placeholder={'第1章 网络基础\n1.1 什么是计算机网络\n1.2 协议与分层\n第2章 应用层\n2.1 HTTP'} /></label><p className="form-help">用“第1章”划分章节，每个小节单独一行。只有目录时，讲解将按主题原创编写。</p>
    {error && <p className="error" role="alert">{error}</p>}<button type="submit" className="primary full" disabled={busy}>{busy ? '正在保存…' : '添加到书架'}<ArrowRight size={17} /></button>
  </form></dialog>;
}
function Shelf({ books, progress, query, setQuery, category, setCategory, onAdd, refresh, issues }) {
  const categories = ['全部课程', ...new Set(books.map(b => b.category))];
  const visible = books.filter(b => (category === '全部课程' || b.category === category) && `${b.title} ${b.category} ${b.description}`.toLowerCase().includes(query.toLowerCase()));
  const last = progress.last;
  const lastBook = books.find(b => b.id === last?.bookId), lastLesson = lastBook && flatten(lastBook).find(l => l.id === last.lessonId && l.status === 'ready');
  const totalReady = books.reduce((s, b) => s + b.ready, 0);
  return <main id="main" tabIndex={-1} className="shelf-layout">
    <aside className="shelf-side"><div className="side-title">我的学习空间</div><button className="side-nav active"><Library size={18} />我的书架<span>{books.length}</span></button><div className="side-divider" /><div className="side-title">课程分类</div>{categories.map(c => <button key={c} className={`category-link ${category === c ? 'selected' : ''}`} onClick={() => setCategory(c)} aria-pressed={category === c}><span className="category-dot" />{c}<span>{c === '全部课程' ? books.length : books.filter(b => b.category === c).length}</span></button>)}<div className="side-note"><BookOpen size={21} /><p>不急着读完一本书，<br />先学懂一个知识点。</p><span>内容保存在本机 · 随时回来</span></div></aside>
    <div className="shelf-main"><div className="page-heading"><div><span className="eyebrow">YOUR KNOWLEDGE, A CHAPTER AT A TIME</span><h1>我的书架<span className="heading-dot">.</span></h1><p>把零散的知识，读成自己的理解。</p></div><button className="primary" onClick={onAdd}><Plus size={17} />添加课程</button></div>
      <div className="reading-banner"><div className="banner-mark"><Bookmark size={27} strokeWidth={1.4} /></div><div><span className="eyebrow">{lastLesson ? 'CONTINUE READING' : 'A GOOD PLACE TO START'}</span><h2>{lastLesson ? lastLesson.title : '从一个概念，开始一段探索。'}</h2><p>{lastLesson ? `${lastBook.title} · 回到上次的学习位置` : '先打开示例课程，体验图示、互动演示与理解检查。'}</p></div><button className="text-button" onClick={() => lastLesson ? go(lastBook.id, lastLesson.id) : books[0] && go(books[0].id)} disabled={!books.length}>{lastLesson ? '继续阅读' : '打开第一本'}<ArrowRight size={18} /></button></div>
      <div className="shelf-toolbar"><div className="shelf-count">{query ? `找到 ${visible.length} 门课程` : `${books.length} 门课程`}<span>·</span>{totalReady} 节可阅读讲解</div><label className="search"><Search size={17} /><input aria-label="搜索课程" placeholder="搜索书名、分类…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="清空搜索"><X size={15} /></button>}</label><button className="icon-button" onClick={refresh} aria-label="刷新课程库" title="刷新课程库"><RefreshCw size={17} /></button></div>
      {issues.length > 0 && <div className="notice error">有 {issues.length} 处课程内容需要检查；相关小节会显示异常状态。</div>}
      <div className="book-grid">{visible.map(book => <BookCard key={book.id} book={book} readCount={flatten(book).filter(l => progress.lessons?.[`${book.id}/${l.id}`]?.read).length} />)}<button className="add-book" onClick={onAdd}><span><Plus size={27} strokeWidth={1.4} /></span><strong>下一本，学什么？</strong><p>添加你的课程目录</p></button></div>
      {!visible.length && books.length > 0 && <div className="empty-state"><Search size={28} /><h2>这里还没有匹配的课程</h2><button className="text-button" onClick={() => { setQuery(''); setCategory('全部课程'); }}>查看全部课程<ArrowRight size={16} /></button></div>}
      <footer className="shelf-footer"><span>知页 · 给每一次理解，留一页位置。</span><span>你的私人学习书架</span></footer>
    </div>
  </main>;
}
function Course({ book, progress, copyPrompt }) {
  const all = flatten(book), first = all.find(l => l.status === 'ready');
  return <main id="main" tabIndex={-1} className="course-page"><button className="text-button back" onClick={() => go()}><ArrowLeft size={17} />返回书架</button><div className="course-intro"><div className={`mini-cover ${book.cover}`}><span>{book.category}</span><h2>{book.title}</h2><CoverArt kind={book.cover} /></div><div className="course-info"><span className="eyebrow">{book.demo ? 'SAMPLE COURSE' : 'YOUR LEARNING PATH'}</span><h1>{book.title}</h1><p>{book.description}</p><div className="pills"><span>{book.level}</span><span>{book.chapters.length} 章 · {book.total} 节</span><span>{book.ready} 节讲解已生成</span></div><div className="course-actions">{first && <button className="primary" onClick={() => go(book.id, first.id)}>开始阅读<ArrowRight size={17} /></button>}<button className="secondary" onClick={() => copyPrompt(book)}>复制生成指令<Copy size={16} /></button></div></div></div>
    <div className="section-heading"><h2>沿着目录，慢慢学懂。</h2><span>选择一节进入讲解</span></div>
    {book.chapters.map((chapter, i) => <React.Fragment key={chapter.id}>
      {chapter.part && (i === 0 || book.chapters[i - 1].part !== chapter.part) && <h2 className="catalog-part">{chapter.part}</h2>}
      <section className="chapter-card"><div className="chapter-title"><span>{String(i + 1).padStart(2, '0')}</span><h3>{chapter.title}</h3><small>{chapter.lessons.length} 节{chapter.page ? ` · p.${chapter.page}` : ''}</small></div><div>{chapter.lessons.map(lesson => { const read = progress.lessons?.[`${book.id}/${lesson.id}`]?.read; return <div className="lesson-entry" key={lesson.id}>
        <button className="lesson-row" onClick={() => go(book.id, lesson.id)}><span className={`lesson-status ${lesson.status}`}>{read ? <Check size={16} /> : lesson.status === 'ready' ? <BookOpen size={16} /> : <Clock3 size={16} />}</span><span className="lesson-row-title">{lesson.title}{lesson.page && <small className="catalog-page">教材 p.{lesson.page}</small>}</span><span className={`row-label ${lesson.status}`}>{lesson.status === 'ready' ? read ? '已读' : `${lesson.minutes} 分钟` : lesson.status === 'error' ? '内容待检查' : '待生成'}</span><ChevronRight size={17} /></button>
        {lesson.subsections?.length > 0 && <details className="catalog-subtopics"><summary>展开 {lesson.subsections.length} 个知识点</summary><ul>{lesson.subsections.map(s => <li key={s.id}><span>{s.title}</span><small>{s.page ? `p.${s.page}` : '页码未读取'}</small></li>)}</ul></details>}
      </div>; })}</div></section>
    </React.Fragment>)}
    <p className="course-bottom">讲解按小节保存。待生成的小节可复制指令到 Codex，完成后刷新课程库。</p></main>;
}
function BinarySearch({ config = {} }) {
  const values = config.values || [2, 5, 8, 12, 16, 23, 38, 56, 72];
  const [target, setTarget] = useState(config.target ?? 23), [step, setStep] = useState(0), [playing, setPlaying] = useState(false);
  const frames = useMemo(() => {
    const result = []; let left = 0, right = values.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2), found = values[mid] === Number(target);
      result.push({ left, right, mid, done: found, text: found ? `中点的值是 ${values[mid]}，等于目标，找到下标 ${mid}。` : values[mid] < target ? `中点 ${values[mid]} 小于目标 ${target}，下一步只保留右半区间。` : `中点 ${values[mid]} 大于目标 ${target}，下一步只保留左半区间。` });
      if (found) return result;
      if (values[mid] < target) left = mid + 1; else right = mid - 1;
    }
    result.push({ left, right, mid: -1, done: true, text: `区间已为空：目标 ${target} 不在数组中。` }); return result;
  }, [values.join(','), target]);
  const f = frames[Math.min(step, frames.length - 1)];
  useEffect(() => { if (!playing) return; const timer = setInterval(() => setStep(s => { if (s >= frames.length - 1) { setPlaying(false); return s; } return s + 1; }), 1200); return () => clearInterval(timer); }, [playing, frames.length]);
  function reset() { setPlaying(false); setStep(0); }
  return <div className="experiment-box"><div className="experiment-title"><span className="eyebrow">TRY IT YOURSELF</span><span className="experiment-tag">二分查找实验</span></div><div className="experiment-input"><label>要查找的值<input type="number" aria-label="二分查找目标值" min={-1000} max={1000} value={target} onChange={e => { setTarget(Number(e.target.value)); reset(); }} /></label><span>先预测一次比较会排除哪一半。</span></div><div className="array-track" role="img" aria-label={`当前区间下标 ${f.left} 到 ${f.right}，中点 ${f.mid}`} >{values.map((v, i) => <div className={`array-cell ${i < f.left || i > f.right ? 'excluded' : ''} ${i === f.mid ? f.done ? 'found' : 'mid' : ''}`} key={i}><span className="array-pointer">{i === f.mid ? 'mid' : i === f.left ? 'L' : i === f.right ? 'R' : ''}</span><strong>{v}</strong><small>{i}</small></div>)}</div><div className="experiment-feedback" aria-live="polite"><span className="step-number">{step + 1}</span><p>{f.text}</p></div><div className="experiment-controls"><button className="secondary compact" onClick={() => { if (step === frames.length - 1) setStep(0); setPlaying(!playing); }}><span aria-hidden="true">{playing ? <Pause size={15} /> : <Play size={15} />}</span>{playing ? '暂停' : '自动演示'}</button><button className="icon-button" onClick={() => { setPlaying(false); setStep(Math.max(0, step - 1)); }} disabled={!step} aria-label="上一步"><ChevronLeft size={17} /></button><button className="secondary compact" onClick={() => { setPlaying(false); setStep(Math.min(frames.length - 1, step + 1)); }} disabled={step === frames.length - 1}>下一步<ChevronRight size={16} /></button><button className="icon-button" onClick={reset} aria-label="重置二分演示"><RefreshCw size={16} /></button><span>{step + 1} / {frames.length}</span></div><p className="experiment-caption">浅色是当前候选区间，mid 是这次比较的位置。也试试一个不存在的值。</p></div>;
}
function Growth() {
  const [n, setN] = useState(32);
  const curves = [{ key: 'log', label: 'O(log₂ n)', value: Math.log2(n), stroke: 'var(--accent)', fn: x => Math.log2(x) }, { key: 'linear', label: 'O(n)', value: n, stroke: 'var(--ochre)', fn: x => x }, { key: 'square', label: 'O(n²)', value: n * n, stroke: 'var(--clay)', fn: x => x * x }];
  const x = v => 42 + (v - 1) / 99 * 470, y = v => 190 - v / 10000 * 160;
  return <div className="experiment-box"><div className="experiment-title"><span className="eyebrow">EXPLORE THE RELATIONSHIP</span><span className="experiment-tag">增长速度实验</span></div><label className="range-label">输入规模 n <strong>{n}</strong><input type="range" min="1" max="100" value={n} onChange={e => setN(Number(e.target.value))} /></label><svg className="plot" viewBox="0 0 550 225" role="img" aria-label="三种复杂度的操作数量示意，纵轴从零到一万"><path d="M42 25v165h470" className="axis" />{[0, 5000, 10000].map(v => <g key={v}><path d={`M42 ${y(v)}h470`} className="grid-line" /><text x="35" y={y(v) + 4} textAnchor="end">{v}</text></g>)}{curves.map(c => <path key={c.key} d={Array.from({ length: 100 }, (_, i) => `${i ? 'L' : 'M'}${x(i + 1)} ${y(c.fn(i + 1))}`).join(' ')} stroke={c.stroke} strokeWidth="2.5" fill="none" />)}<path d={`M${x(n)} 25v165`} className="guide-line" /><text x="42" y="214">1</text><text x="512" y="214" textAnchor="end">100 · 输入规模 n</text></svg><div className="metric-grid">{curves.map(c => <div key={c.key}><span style={{ color: c.stroke }}>{c.label}</span><strong>{Number.isInteger(c.value) ? c.value : c.value.toFixed(2)}</strong><small>归一化增长值</small></div>)}</div><p className="experiment-caption">这里比较的是代表性函数，系数取 1；不是程序的实际运行时间。相同纵轴也会让对数曲线贴近底部。</p></div>;
}
function Derivative() {
  const [point, setPoint] = useState(1), [power, setPower] = useState(-1);
  const h = 10 ** power, slope = 2 * point + h;
  const sx = v => 45 + (v + 2) / 4 * 450, sy = v => 198 - v / 5 * 166;
  const pathCurve = Array.from({ length: 81 }, (_, i) => { const v = -2 + i / 20; return `${i ? 'L' : 'M'}${sx(v)} ${sy(v * v)}`; }).join(' ');
  const line = m => `M${sx(-2)} ${sy(point * point + m * (-2 - point))}L${sx(2)} ${sy(point * point + m * (2 - point))}`;
  return <div className="experiment-box"><div className="experiment-title"><span className="eyebrow">FROM SECANT TO TANGENT</span><span className="experiment-tag">让两点靠近</span></div><div className="two-ranges"><label className="range-label">观察位置 x<strong>{point.toFixed(1)}</strong><input type="range" aria-label="观察位置 x" min="-1.5" max="1.5" step="0.1" value={point} onChange={e => setPoint(Number(e.target.value))} /></label><label className="range-label">步长 h<strong>{h.toFixed(3)}</strong><input type="range" aria-label="步长 h" min="-3" max="-0.3" step="0.1" value={power} onChange={e => setPower(Number(e.target.value))} /></label></div><svg className="plot" viewBox="0 0 540 225" role="img" aria-label={`函数 x 平方的割线斜率 ${slope.toFixed(3)}，切线斜率 ${(2 * point).toFixed(3)}`}><defs><clipPath id="derivative-clip"><rect x="45" y="25" width="450" height="174" /></clipPath></defs><path d="M45 198h450M270 25v174" className="axis" /><g clipPath="url(#derivative-clip)"><path d={pathCurve} className="function-curve" /><path d={line(2 * point)} className="tangent-line" /><path d={line(slope)} className="secant-line" /><circle cx={sx(point)} cy={sy(point * point)} r="5" fill="var(--accent)" /><circle cx={sx(point + h)} cy={sy((point + h) ** 2)} r="5" fill="var(--ochre)" /></g><text x="455" y="43">f(x) = x²</text><text x="485" y="218">x</text></svg><div className="metric-grid"><div><span>割线斜率 · 实线</span><strong>{slope.toFixed(3)}</strong><small>2x + h</small></div><div><span>切线斜率 · 虚线</span><strong>{(2 * point).toFixed(3)}</strong><small>2x</small></div><div><span>两者之差</span><strong>{h.toFixed(3)}</strong><small>等于 h</small></div></div><p className="experiment-caption">缩小 h，看割线接近切线。本演示只取正步长；导数定义还需要左右极限一致。</p></div>;
}
function Probability() {
  const [p, setP] = useState(0.5), [trials, setTrials] = useState([]), [size, setSize] = useState(100);
  const heads = trials.reduce((a, b) => a + b, 0);
  function toss() { setTrials(t => [...t, ...Array.from({ length: size }, () => Math.random() < p ? 1 : 0)].slice(-10000)); }
  const points = useMemo(() => { let sum = 0; return trials.map((t, i) => { sum += t; return { x: i + 1, y: sum / (i + 1) }; }).filter((_, i) => i % Math.max(1, Math.floor(trials.length / 400)) === 0 || i === trials.length - 1); }, [trials]);
  return <div className="experiment-box"><div className="experiment-title"><span className="eyebrow">PREDICT, THEN TEST</span><span className="experiment-tag">抛硬币实验</span></div><label className="range-label">正面概率 p<strong>{p.toFixed(2)}</strong><input type="range" min="0" max="1" step="0.05" value={p} onChange={e => { setP(Number(e.target.value)); setTrials([]); }} /></label><svg className="plot" viewBox="0 0 540 225" role="img" aria-label={`${trials.length} 次模拟，正面频率 ${trials.length ? (heads / trials.length).toFixed(3) : '尚无数据'}`}><path d="M42 25v170h460" className="axis" />{[0, 0.5, 1].map(v => <g key={v}><path d={`M42 ${195 - v * 170}h460`} className="grid-line" /><text x="35" y={199 - v * 170} textAnchor="end">{v}</text></g>)}<path d={`M42 ${195 - p * 170}h460`} className="tangent-line" /><path d={points.map((v, i) => `${i ? 'L' : 'M'}${42 + (v.x - 1) / Math.max(trials.length - 1, 1) * 460} ${195 - v.y * 170}`).join(' ')} className="function-curve" /><text x="502" y="216" textAnchor="end">试验次数 →</text>{!trials.length && <text x="270" y="105" textAnchor="middle">先点击开始模拟</text>}</svg><div className="experiment-controls"><label>每批<select value={size} onChange={e => setSize(Number(e.target.value))}><option value={10}>10 次</option><option value={100}>100 次</option><option value={1000}>1000 次</option></select></label><button className="primary compact" onClick={toss}>开始模拟<Play size={15} /></button><button className="icon-button" onClick={() => setTrials([])} aria-label="清空抛硬币实验"><RefreshCw size={16} /></button><span>{trials.length} 次 · 正面 {heads} 次</span></div><p className="experiment-caption">虚线是设定概率，实线是累计频率；频率不会每一步都更接近概率。最多保留最近 10000 次独立模拟。</p></div>;
}
function Steps({ config }) {
  const [step, setStep] = useState(0), s = config.steps[step];
  return <div className="experiment-box"><div className="experiment-title"><span className="eyebrow">ONE STEP AT A TIME</span><span>{step + 1} / {config.steps.length}</span></div><h3>{s.title}</h3><Markdown content={s.content} />{s.svg && <Diagram svg={s.svg} caption={s.caption} />}<div className="experiment-controls"><button className="secondary compact" disabled={!step} onClick={() => setStep(step - 1)}><ChevronLeft size={16} />上一步</button><button className="secondary compact" disabled={step === config.steps.length - 1} onClick={() => setStep(step + 1)}>下一步<ChevronRight size={16} /></button><button className="icon-button" onClick={() => setStep(0)} aria-label="重置步骤"><RefreshCw size={16} /></button></div></div>;
}
function Diagram({ svg, caption }) {
  const html = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: false }, FORBID_TAGS: ['style', 'foreignObject'], FORBID_ATTR: ['style'], ADD_ATTR: ['role', 'aria-label'] });
  return <figure className="diagram"><div dangerouslySetInnerHTML={{ __html: html }} />{caption && <figcaption>{caption}</figcaption>}</figure>;
}
function Quiz({ block, saved, onSave }) {
  const [selected, setSelected] = useState(saved?.choice || ''), [submitted, setSubmitted] = useState(Boolean(saved?.submitted)), [hint, setHint] = useState(false);
  const option = block.options.find(o => o.id === selected), correct = selected === block.answer;
  function submit() { setSubmitted(true); onSave({ choice: selected, submitted: true, correct, attempts: (saved?.attempts || 0) + 1 }); }
  function retry() { setSubmitted(false); setSelected(''); }
  return <div className="quiz-box"><div className="experiment-title"><span className="eyebrow">CHECK YOUR UNDERSTANDING</span><span className="experiment-tag">理解检查</span></div><h3>{block.question}</h3><fieldset disabled={submitted}><legend className="sr-only">选择一个答案</legend>{block.options.map((o, i) => <label className={`quiz-option ${selected === o.id ? 'chosen' : ''} ${submitted && selected === o.id ? correct ? 'correct' : 'incorrect' : ''}`} key={o.id}><input type="radio" name={`quiz-${block.id}`} value={o.id} checked={selected === o.id} onChange={() => setSelected(o.id)} /><span className="option-letter">{String.fromCharCode(65 + i)}</span><span>{o.text}</span>{submitted && selected === o.id && (correct ? <Check size={17} /> : <X size={17} />)}</label>)}</fieldset><div className="quiz-controls">{submitted ? <button className="secondary compact" onClick={retry}>再试一次<RefreshCw size={15} /></button> : <button className="primary compact" disabled={!selected} onClick={submit}>检查答案<ArrowRight size={16} /></button>}{block.hint && <button className="text-button" onClick={() => setHint(!hint)}><CircleHelp size={16} />{hint ? '收起提示' : '给我一点提示'}</button>}</div>{hint && <p className="hint">{block.hint}</p>}{submitted && <div className={`quiz-feedback ${correct ? 'correct' : 'incorrect'}`} role="status"><strong>{correct ? '理解得很准确。' : '这里有个值得留意的地方。'}</strong><p>{option?.feedback}</p>{correct ? <Markdown content={block.explanation} /> : <details><summary>查看完整解析</summary><Markdown content={block.explanation} /></details>}</div>}</div>;
}
function Flashcards({ cards, saved = {}, onSave }) {
  const [index, setIndex] = useState(0), [flipped, setFlipped] = useState(false);
  const card = cards[index];
  return <div className="flashcards"><div className="experiment-title"><span className="eyebrow">TAKE A MOMENT TO RECALL</span><span>{index + 1} / {cards.length} · 复习卡片</span></div><button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? '翻回问题' : '翻面查看答案'}><span>{flipped ? '答案' : '先在心里回答'}</span><strong>{flipped ? card.back : card.front}</strong><small>点击翻面<RefreshCw size={13} /></small></button><div className="experiment-controls"><button className="icon-button" disabled={!index} onClick={() => { setIndex(index - 1); setFlipped(false); }} aria-label="上一张卡片"><ChevronLeft size={18} /></button><button className="secondary compact" onClick={() => onSave({ ...saved, [index]: false })}>再复习</button><button className="secondary compact" onClick={() => onSave({ ...saved, [index]: true })}><Check size={15} />{saved[index] ? '已标记掌握' : '我记住了'}</button><button className="icon-button" disabled={index === cards.length - 1} onClick={() => { setIndex(index + 1); setFlipped(false); }} aria-label="下一张卡片"><ChevronRight size={18} /></button></div></div>;
}
function CustomExperiment({ bookId, block }) {
  const frameRef = useRef();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme || 'light'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const sendTheme = () => frameRef.current?.contentWindow?.postMessage({ type: 'zhiye-theme', theme }, '*');
  useEffect(() => { sendTheme(); }, [theme]);
  return <figure className="custom-experiment"><iframe ref={frameRef} onLoad={sendTheme} sandbox="allow-scripts" title={block.caption} src={`/library-assets/${bookId}/${block.src.slice(7)}`} /><figcaption>{block.caption}</figcaption></figure>;
}
function Block({ block, bookId, blockKey, saved, save }) {
  if (block.type === 'markdown') return <Markdown content={block.content} />;
  if (block.type === 'callout') return <aside className={`callout ${block.tone || 'note'}`}><span className="callout-line" /><div>{block.title && <strong>{block.title}</strong>}<Markdown content={block.content} /></div></aside>;
  if (block.type === 'formula') return <figure className="formula"><div dangerouslySetInnerHTML={{ __html: katex.renderToString(block.latex, { displayMode: true, throwOnError: false, trust: false }) }} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
  if (block.type === 'diagram') return <Diagram svg={block.svg} caption={block.caption} />;
  if (block.type === 'image') return <figure className="lesson-image"><img src={`/library-assets/${bookId}/${block.src.slice(7)}`} alt={block.alt} loading="lazy" /><figcaption>{block.caption}</figcaption></figure>;
  if (block.type === 'experiment') return <CustomExperiment bookId={bookId} block={block} />;
  if (block.type === 'quiz') return <Quiz block={block} saved={saved?.quizzes?.[block.id]} onSave={v => save({ quizzes: { ...(saved?.quizzes || {}), [block.id]: v } })} />;
  if (block.type === 'flashcards') return <Flashcards cards={block.cards} saved={saved?.cards?.[blockKey]} onSave={v => save({ cards: { ...(saved?.cards || {}), [blockKey]: v } })} />;
  if (block.type === 'widget') {
    if (block.kind === 'binary-search') return <BinarySearch config={block.config} />;
    if (block.kind === 'growth') return <Growth />;
    if (block.kind === 'derivative') return <Derivative />;
    if (block.kind === 'probability') return <Probability />;
    if (block.kind === 'steps') return <Steps config={block.config} />;
  }
  return null;
}
function Reader({ book, entry, lesson, saved, save, copyPrompt, refresh }) {
  const [mode, setMode] = useState('read'), [step, setStep] = useState(0), [active, setActive] = useState(lesson?.sections[0]?.id), [navOpen, setNavOpen] = useState(false);
  const noteRef = useRef();
  const all = flatten(book), position = all.findIndex(l => l.id === entry.id), previous = all[position - 1], next = all[position + 1];
  useEffect(() => {
    if (!lesson || mode !== 'read') return;
    const observer = new IntersectionObserver(records => { const hit = records.filter(r => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (hit) { setActive(hit.target.id); save({ scroll: hit.target.id }); } }, { rootMargin: '-100px 0px -55% 0px' });
    document.querySelectorAll('.lesson-section').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [lesson, mode]);
  useEffect(() => {
    if (!lesson || !saved?.scroll || mode !== 'read') return;
    const timer = setTimeout(() => document.getElementById(saved.scroll)?.scrollIntoView({ block: 'start' }), 70);
    return () => clearTimeout(timer);
  }, [lesson?.id]);
  function scrollSection(id) { setNavOpen(false); if (mode === 'guided') setStep(lesson.sections.findIndex(s => s.id === id)); else document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); setActive(id); save({ scroll: id }); }
  const visibleSections = lesson ? mode === 'read' ? lesson.sections : [lesson.sections[step]] : [];
  return <div className="reader-layout"><button className="mobile-outline secondary" onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen}><List size={16} />目录与大纲</button><aside className={`reader-sidebar ${navOpen ? 'open' : ''}`}><button className="text-button" onClick={() => go(book.id)}><ArrowLeft size={16} />课程目录</button><div className="reader-book-title">{book.title}</div>
    {lesson && <nav className="article-outline" aria-label="当前文章大纲"><h3>本节大纲</h3>{lesson.sections.map((s, i) => <button key={s.id} className={active === s.id || mode === 'guided' && step === i ? 'selected' : ''} onClick={() => scrollSection(s.id)}><span>{String(i + 1).padStart(2, '0')}</span>{s.title}</button>)}</nav>}
    <details className="book-outline" open={!lesson}><summary>本书目录 · {book.chapters.length} 章</summary><nav aria-label="本书章节">{book.chapters.map(ch => <div className="reader-chapter" key={ch.id}><h3>{ch.title}</h3>{ch.lessons.map(l => <button key={l.id} className={`reader-lesson ${entry.id === l.id ? 'current' : ''}`} onClick={() => { go(book.id, l.id); setNavOpen(false); }} aria-current={entry.id === l.id ? 'page' : undefined}>{l.status === 'ready' ? <span className="nav-dot" /> : <Clock3 size={12} />}<span>{l.title}</span></button>)}</div>)}</nav></details><div className="reader-side-end">一步一步，理解会发生。</div></aside>
    <main id="main" tabIndex={-1} className="reader-main"><div className="reader-top"><div className="breadcrumb"><button onClick={() => go()}>书架</button><ChevronRight size={12} /><button onClick={() => go(book.id)}>{book.title}</button></div>{lesson && <div className="reading-modes" role="group" aria-label="讲解模式"><button aria-pressed={mode === 'read'} className={mode === 'read' ? 'selected' : ''} onClick={() => setMode('read')}><BookOpen size={14} />完整文章</button><button aria-pressed={mode === 'guided'} className={mode === 'guided' ? 'selected' : ''} onClick={() => { setMode('guided'); setStep(0); }}><Play size={14} />带我学</button></div>}</div>
      {!lesson ? <div className="pending-page"><span className="eyebrow">THE NEXT CHAPTER</span><h1>{entry.title}</h1><div className="pending-illustration"><BookOpen size={48} strokeWidth={1} /><span /></div><h2>{entry.status === 'error' ? '这节讲解需要检查。' : '这一页，等你来开启。'}</h2><p>{entry.status === 'error' ? '文件存在，但内容格式暂时无法显示。可把检查指令交给 Codex 修复。' : '目录已经保存。将下方指令复制到 Codex，生成这节讲解；完成后回来刷新即可阅读。'}</p><div className="pending-actions"><button className="primary" onClick={() => copyPrompt(book, entry)}><Copy size={16} />复制到 Codex 的指令</button><button className="secondary" onClick={refresh}><RefreshCw size={16} />刷新讲解</button></div></div> : <article className="lesson-article"><header className="article-header"><span className="eyebrow">{entry.chapter}</span><h1>{lesson.title}</h1><p className="article-summary">{lesson.summary}</p><div className="article-meta"><span><Clock3 size={14} />约 {lesson.minutes} 分钟</span><span>{book.level}</span>{saved.read && <span className="read-label"><Check size={14} />已读</span>}<button className="text-button" onClick={() => { noteRef.current?.scrollIntoView({ behavior: 'smooth' }); noteRef.current?.focus(); }}><Bookmark size={14} />记一笔</button></div><div className="learning-goals"><strong>学完这一节，你能</strong><ul>{lesson.objectives.map(o => <li key={o}><Check size={14} />{o}</li>)}</ul>{lesson.prerequisites.length > 0 && <p>先修知识：{lesson.prerequisites.join('、')}</p>}</div></header>
        {mode === 'guided' && <div className="guided-status"><div><span className="eyebrow">GUIDED READING</span><p>一次读一段，遇到问题先作答，再看反馈。</p></div><span>{step + 1} / {lesson.sections.length}</span></div>}
        {visibleSections.map((s, i) => <section className="lesson-section" id={s.id} key={s.id}><div className="lesson-section-heading"><span>{String(lesson.sections.indexOf(s) + 1).padStart(2, '0')}</span><h2>{s.title}</h2></div>{s.blocks.map((b, j) => <Block key={`${s.id}-${j}`} block={b} bookId={book.id} blockKey={`${s.id}-${j}`} saved={saved} save={save} />)}</section>)}
        {mode === 'guided' && <div className="guided-controls"><button className="secondary" disabled={!step} onClick={() => { setStep(step - 1); scrollTo({ top: 0, behavior: 'instant' }); }}><ArrowLeft size={16} />上一段</button><span>{step + 1} / {lesson.sections.length}</span><button className="primary" disabled={step === lesson.sections.length - 1} onClick={() => { setStep(step + 1); scrollTo({ top: 0, behavior: 'instant' }); }}>下一段<ArrowRight size={16} /></button></div>}
        {(mode === 'read' || step === lesson.sections.length - 1) && <><section className="source-section"><h2>讲解依据</h2><p>{book.materialMode === 'outline-only' ? '围绕目录主题原创编写，未使用指定教材正文。' : '依据已提供材料编写，扩展内容以来源说明为准。'}</p>{lesson.sources.length ? <ul>{lesson.sources.map((s, i) => <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<ArrowRight size={12} /></a> : <strong>{s.title}</strong>}{s.note && <span>{s.note}</span>}</li>)}</ul> : <p>暂无外部参考链接；可在后续补充教材与讲义。</p>}</section><section className="notes-section"><div><h2>留下一点自己的理解</h2><span>自动保存到此浏览器</span></div><textarea ref={noteRef} aria-label="本节学习笔记" placeholder="用自己的话说说：这一节最重要的想法是什么？" value={saved.note || ''} onChange={e => save({ note: e.target.value })} rows={4} maxLength={20000} /><button className={`secondary ${saved.read ? 'completed' : ''}`} onClick={() => save({ read: !saved.read })}><Check size={16} />{saved.read ? '已标记读完 · 点击撤销' : '标记这一节已读完'}</button></section></>}
        <nav className="lesson-pagination" aria-label="相邻小节">{previous ? <button onClick={() => go(book.id, previous.id)}><span><ArrowLeft size={14} />上一节</span><strong>{previous.title}</strong></button> : <div />}{next ? <button onClick={() => go(book.id, next.id)}><span>下一节<ArrowRight size={14} /></span><strong>{next.title}</strong></button> : <button onClick={() => go(book.id)}><span>这一章的探索告一段落<Check size={14} /></span><strong>回到课程目录</strong></button>}</nav>
      </article>}
    </main></div>;
}

function App() {
  const [theme, setTheme] = useTheme(), [route, setRoute] = useState(parseRoute);
  const [library, setLibrary] = useState(null), [lesson, setLesson] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  const [progress, setProgress] = useState({ lessons: {} }), [add, setAdd] = useState(false), [toast, setToast] = useState('');
  const [query, setQuery] = useState(''), [category, setCategory] = useState('全部课程');
  const progressRef = useRef(progress), loadedKey = useRef(null);
  const storageKey = library ? `zhiye-progress:${library.workspace}` : null;
  const book = library?.books.find(b => b.id === route.bookId), entry = book && flatten(book).find(l => l.id === route.lessonId);
  useEffect(() => { const listener = () => { setRoute(parseRoute()); window.scrollTo(0, 0); }; addEventListener('hashchange', listener); return () => removeEventListener('hashchange', listener); }, []);
  useEffect(() => {
    const controller = new AbortController(); setError(''); setLoading(true);
    api('/api/library', { signal: controller.signal }).then(data => { setLibrary(data); }).catch(err => { if (err.name !== 'AbortError') setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => { if (!storageKey || loadedKey.current === storageKey) return; loadedKey.current = storageKey; const value = storageRead(storageKey, { lessons: {} }); const valid = value && typeof value === 'object' && value.lessons && typeof value.lessons === 'object' && !Array.isArray(value.lessons) ? value : { lessons: {} }; progressRef.current = valid; setProgress(valid); }, [storageKey]);
  function updateProgress(fn) {
    const value = fn(progressRef.current); progressRef.current = value; setProgress(value);
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { setToast('浏览器无法保存进度，请使用“导出学习记录”备份。'); } }
  }
  useEffect(() => {
    const controller = new AbortController(); setLesson(null); setError('');
    if (!entry || entry.status !== 'ready') { setLoading(false); return; }
    setLoading(true);
    api(`/api/lessons/${book.id}/${entry.id}`, { signal: controller.signal }).then(data => {
      setLesson(data); updateProgress(p => ({ ...p, last: { bookId: book.id, lessonId: entry.id } }));
    }).catch(err => { if (err.name !== 'AbortError') setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [route.bookId, route.lessonId, revision, entry?.status, storageKey]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { document.title = `${entry?.title || book?.title || '我的学习书架'} · 知页`; }, [entry?.title, book?.title]);
  const refresh = () => setRevision(x => x + 1);
  async function copyPrompt(b, e) {
    const prompt = `$course-tutor 请在项目目录「${library.workspace}」${e?.status === 'error' ? '检查并修复' : e ? '生成' : '继续生成'}课程「${b.title}」（课程 ID：${b.id}）${e ? `的小节「${e.title}」（小节 ID：${e.id}）` : '中尚未完成的讲解'}。学习基础：${b.level}。读取现有课程目录和先修讲解，按分层解释、例题、适合知识点的图示或交互、理解检查和总结来组织内容，写入本地课程库并校验，完成后打开学习网页。`;
    try { await navigator.clipboard.writeText(prompt); setToast('生成指令已复制，粘贴到 Codex 即可。'); }
    catch { setToast('剪贴板暂不可用，可在使用说明中复制示例指令。'); }
  }
  function exportProgress() {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, workspace: library.workspace, exportedAt: new Date().toISOString(), progress }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '知页-学习记录.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setToast('学习记录已导出。');
  }
  function importProgress(e) {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return; if (file.size > 5000000) { setToast('记录文件过大，请选择 5 MB 以内的 JSON。'); return; }
    file.text().then(text => {
      const data = JSON.parse(text);
      if (data.schemaVersion !== 1 || data.workspace !== library.workspace || !data.progress?.lessons || typeof data.progress.lessons !== 'object' || Array.isArray(data.progress.lessons)) throw new Error('请选择当前课程库导出的学习记录');
      for (const [key, value] of Object.entries(data.progress.lessons)) { if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(key) || !value || typeof value !== 'object' || typeof (value.note || '') !== 'string') throw new Error('记录格式不正确'); }
      updateProgress(p => ({ ...p, lessons: { ...data.progress.lessons, ...p.lessons }, last: p.last || data.progress.last })); setToast('记录已合并，当前已有笔记优先保留。');
    }).catch(err => setToast(`无法导入：${err.message}`));
  }
  return <><a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); document.getElementById('main')?.scrollIntoView(); }}>跳到正文</a><header className="app-header"><button className="brand" onClick={() => go()} aria-label="知页，返回书架"><span className="brand-icon"><BookOpen size={23} strokeWidth={1.5} /></span><strong>知页</strong><span className="brand-sub">一页一知</span></button><div className="header-actions"><button className="header-link" onClick={() => go()}><Library size={16} />我的书架</button>{library && <details className="records-menu"><summary><Download size={16} /><span>学习记录</span><ChevronDown size={12} /></summary><div><button onClick={exportProgress}>导出学习记录</button><button onClick={() => document.getElementById('progress-import').click()}>导入学习记录</button><input id="progress-import" type="file" accept=".json,application/json" onChange={importProgress} /><p>笔记与作答保存在此浏览器</p></div></details>}<ThemeControl theme={theme} setTheme={setTheme} /></div></header>
    {error ? <main id="main" tabIndex={-1} className="fatal"><CircleHelp /><h1>暂时无法打开</h1><p>{error}</p><button className="primary" onClick={refresh}><RefreshCw size={16} />重新读取</button><button className="text-button" onClick={() => go()}>回到书架</button></main> : loading || !library ? <main id="main" tabIndex={-1} className="loading"><BookOpen size={28} /><p>正在打开你的学习空间…</p></main> : route.bookId && !book || route.lessonId && !entry ? <main id="main" tabIndex={-1} className="fatal"><h1>没有找到这一页</h1><button className="primary" onClick={() => go()}>返回书架</button></main> : route.lessonId ? <Reader key={`${book.id}/${entry.id}/${lesson?.updatedAt || ''}`} book={book} entry={entry} lesson={lesson} saved={progress.lessons[`${book.id}/${entry.id}`] || {}} save={patch => updateProgress(p => ({ ...p, lessons: { ...p.lessons, [`${book.id}/${entry.id}`]: { ...p.lessons[`${book.id}/${entry.id}`], ...patch, updatedAt: new Date().toISOString() } } }))} copyPrompt={copyPrompt} refresh={refresh} /> : book ? <Course book={book} progress={progress} copyPrompt={copyPrompt} /> : <Shelf books={library.books} progress={progress} query={query} setQuery={setQuery} category={category} setCategory={setCategory} onAdd={() => setAdd(true)} refresh={refresh} issues={library.issues} />}
    {add && <AddCourse close={() => setAdd(false)} onCreated={book => { setAdd(false); refresh(); go(book.id); setToast('课程目录已放进书架。复制生成指令，开始制作讲解。'); }} />}{toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </>;
}
createRoot(document.getElementById('root')).render(<Boundary><App /></Boundary>);
