import path from 'node:path';
import fs from 'node:fs/promises';
import { createBook, putLesson, getBook } from './library.mjs';

const i = process.argv.indexOf('--workspace');
const root = path.join(path.resolve(i >= 0 ? process.argv[i + 1] : process.cwd()), 'learning-library');
const md = content => ({ type: 'markdown', content });
const tip = (title, content, tone = 'tip') => ({ type: 'callout', title, content, tone });
const section = (id, title, ...blocks) => ({ id, title, blocks });
const quiz = (id, question, options, answer, hint, explanation) => ({ type: 'quiz', id, question, options: options.map((o, j) => ({ id: ['a', 'b', 'c', 'd'][j], text: o[0], feedback: o[1] })), answer, hint, explanation });
const source = (title, url, note) => ({ title, url, note });
const books = [
  { id: 'data-structures', title: '数据结构', subtitle: '把数据组织成解决问题的方式', category: '计算机', level: '初学者', cover: 'forest', demo: true, description: '从数据的组织方式到算法的效率，用具体例子、动态图示和小实验理解计算机怎样解决问题。这是原创示例课程，尚未提供指定教材。', chapters: [
    { id: 'ch-1', title: '第1章 数据与算法', lessons: [{ id: 'intro', title: '1.1 数据结构究竟是什么' }, { id: 'complexity', title: '1.2 时间复杂度：比较增长速度' }] },
    { id: 'ch-2', title: '第2章 查找与线性结构', lessons: [{ id: 'binary-search', title: '2.1 二分查找：每次排除一半' }, { id: 'linked-list', title: '2.2 链表与数组的取舍' }, { id: 'stack-queue', title: '2.3 栈与队列' }] },
  ] },
  { id: 'calculus', title: '微积分入门', subtitle: '理解变化，从一条曲线开始', category: '数学', level: '初学者', cover: 'ochre', demo: true, description: '沿着“变化率”这条线索，从平均变化走向瞬时变化，再认识积分与积累。通过可调参数的实验，把公式与图像连起来。', chapters: [
    { id: 'ch-1', title: '第1章 从变化到导数', lessons: [{ id: 'derivative', title: '1.1 导数：这一刻变化多快' }, { id: 'limits', title: '1.2 极限：靠近的含义' }] },
    { id: 'ch-2', title: '第2章 从局部到整体', lessons: [{ id: 'rules', title: '2.1 求导法则' }, { id: 'integral', title: '2.2 积分与累积' }] },
  ] },
  { id: 'probability', title: '概率的直觉', subtitle: '在不确定里，找到规律', category: '数学', level: '初学者', cover: 'clay', demo: true, description: '从抛硬币开始，区分一次结果、长期频率和概率模型，学会在不确定的问题中提出清楚的判断。', chapters: [
    { id: 'ch-1', title: '第1章 随机与规律', lessons: [{ id: 'frequency', title: '1.1 概率与频率不是一回事' }, { id: 'conditional', title: '1.2 条件概率：信息改变判断' }, { id: 'bayes', title: '1.3 贝叶斯：用新证据更新认识' }] },
  ] },
];

const lessons = [
  { schemaVersion: 1, id: 'intro', bookId: 'data-structures', title: '1.1 数据结构究竟是什么', summary: '同样一组数据，换一种组织方式，能做的事情和付出的代价就会改变。', minutes: 10,
    objectives: ['用“数据、关系、操作”解释数据结构', '区分逻辑关系与具体存储方式', '根据操作需求比较数组与链表'], prerequisites: ['能理解一组数字或一份名单'],
    sections: [
      section('question', '先从一份通讯录说起', md('你有一份通讯录。今天要做三件事：按姓名查找一个人、在中间加入新联系人、按顺序显示所有联系人。\n\n联系人信息可以完全一样，但怎样组织这份名单，会影响每件事有多容易。把名字连续放在一段内存里，可以很快找到“第 20 个”；把每个人和“下一个人在哪里”一起保存，插入可能只需改几个连接，但找到第 20 个通常要逐个经过。\n\n**数据结构，就是把数据以及数据之间的关系组织起来，让所需操作有合适的实现方式。**它关心的不只是“放了什么”，还包括“怎样连接”和“怎样操作”。')),
      section('relationships', '数据、关系、操作：三件事一起看', md('| 看什么 | 在通讯录中是什么 |\n| --- | --- |\n| 数据 | 每个联系人的姓名与号码 |\n| 关系 | 排列顺序、前后关系、分类关系 |\n| 操作 | 查找、插入、删除、遍历 |\n\n当我们把数据看成一排元素时，是线性关系；当我们把文件夹看成父子层级时，是树形关系；把城市和道路看成连接网络时，是图关系。'), { type: 'diagram', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" role="img" aria-label="线性关系的节点依次连接，树形关系的根连接两个子节点"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M75 80h65m45 0h65m140-18-55 58m55-58 55 58"/><rect x="35" y="60" width="45" height="40" rx="5"/><rect x="135" y="60" width="45" height="40" rx="5"/><rect x="235" y="60" width="45" height="40" rx="5"/><circle cx="390" cy="45" r="23"/><circle cx="335" cy="130" r="23"/><circle cx="445" cy="130" r="23"/></g><g fill="currentColor" font-family="sans-serif" font-size="16" text-anchor="middle"><text x="58" y="86">A</text><text x="158" y="86">B</text><text x="258" y="86">C</text><text x="390" y="51">A</text><text x="335" y="136">B</text><text x="445" y="136">C</text><text x="158" y="150" font-size="13">线性：前后关系</text><text x="390" y="178" font-size="13">树形：父子关系</text></g></svg>', caption: '元素可以相同，关系却不同。线性结构和树形结构是两种逻辑组织方式。' }, tip('不要把“结构”等同于“内存摆放”', '逻辑结构描述元素的关系；存储结构描述这些关系如何在机器中表示。同一种逻辑结构可以有不同的存储实现。')),
      section('tradeoff', '操作需求决定怎样组织', md('数组采用连续的元素存储。给定下标，通常可以根据起始地址和元素大小计算目标地址，因此随机访问是 $O(1)$。在中间插入一个元素，往往需要把后面的元素移动。\n\n链表的节点通过链接相连。**已知待插入位置和必要节点**时，改链接可以是 $O(1)$；如果还要先找到位置，遍历的成本仍然可能是 $O(n)$。'), { type: 'widget', kind: 'steps', config: { steps: [
        { title: '需求：在 A 与 B 之间加入 X', content: '原顺序是 `A → B → C`。目标顺序是 `A → X → B → C`。先区分“找到位置”与“完成插入”两项成本。' },
        { title: '连续数组：腾出一个位置', content: '如果数组还有足够容量，先把 C 向后移动，再把 B 向后移动，最后在空位写入 X。最坏情况下需要移动很多元素。' },
        { title: '链表：修改局部连接', content: '若已经有 A 的节点位置，令 `X.next = A.next`，再令 `A.next = X`。只有局部链接改变；节点的内存位置不必连续。' },
        { title: '别忘了寻找与分配', content: '若必须先遍历找到 A，整体仍可能是 $O(n)$。创建节点也涉及存储管理。不能把局部链接修改的成本当成所有插入任务的成本。' },
      ] } }),
      section('check', '检查一下：哪句话更准确', quiz('insertion', '关于链表插入，哪种说法准确？', [
        ['链表插入任何时候都是 O(1)。', '你只考虑了修改链接，忽略了寻找插入位置的过程。'],
        ['已知必要节点时，局部修改链接可以是 O(1)。', '准确！操作成本取决于条件，查找位置和改链接要分开。'],
        ['链表节点必须在内存中连续。', '链表使用链接表示关系，节点通常不需要连续存放。'],
      ], 'b', '想想你是否已经知道“插在哪里”。', '插入通常包含定位与修改两部分。定位可能要遍历；已知必要节点时，局部改链接只涉及固定数量的操作。')),
      section('recall', '带走这三个想法', md('1. 数据结构同时关心数据、关系和操作。\n2. 逻辑关系和存储表示属于不同层次。\n3. 没有脱离需求的“最好结构”，要看最常做哪些操作。\n\n**迁移问题：**如果你需要频繁按下标读取，却很少在中间插入，你会先考虑哪种表示？说出你的理由，而不是只说名字。'), { type: 'flashcards', cards: [{ front: '为什么只比较“插入是 O(1)”不够？', back: '要说明是否已知位置，以及是否包含查找、移动或分配的成本。' }, { front: '逻辑结构与存储结构有什么区别？', back: '前者描述元素关系，后者描述关系和元素如何在机器中表示。' }] }),
    ], sources: [source('MIT 6.006 · Introduction to Algorithms', 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/'), { title: '本地示例课程', note: '原创教学示例，目录由本项目设计，未使用指定教材正文。' }],
  },
  { schemaVersion: 1, id: 'complexity', bookId: 'data-structures', title: '1.2 时间复杂度：比较增长速度', summary: '不要只问“这次用了多久”，还要问“输入大起来时，工作量怎样增加”。', minutes: 12,
    objectives: ['解释为何复杂度不等于实际秒数', '识别常数、线性、对数与平方增长', '说清最坏情况和计算成本的假设'], prerequisites: ['简单循环', '输入规模 n 的含义'],
    sections: [
      section('intuition', '人数变多，工作怎样增加', md('给每个人发一张卡片：有 $n$ 个人就发 $n$ 次。让每个人与其他每个人交换名片，配对数会按平方规模增长。查找一本按编号排好的字典，如果每次排除一半，步骤增长慢得多。\n\n复杂度关注的是**输入规模变化时，基本操作数量怎样增长**。它帮助我们比较方法，而不是预测每台电脑会运行几毫秒。')),
      section('notation', 'O 记号：关心大规模的上界', md('若每个元素都处理一次，工作量可能是 $T(n)=3n+5$。大规模时，它的主导增长与 $n$ 相同，常用 $O(n)$ 描述上界。严格地说，$O$ 给出渐近上界；描述紧确增长时可用 $\Theta$。\n\n| 增长类型 | 一个典型场景 |\n| --- | --- |\n| O(1) | 给定合法下标的数组访问 |\n| O(log n) | 有序随机访问数组上的二分查找 |\n| O(n) | 遍历全部元素 |\n| O(n²) | 两个独立的 n 次循环嵌套 |'), tip('省略常数，不是说常数没影响', '小输入、实现细节、缓存和语言都会影响实际时间。复杂度描述的是随规模变化的趋势，不代替运行测量。', 'note')),
      section('experiment', '拉动规模，看三条函数怎样增长', md('先预测：当 $n$ 从 10 变成 100，线性工作量增加多少倍？平方工作量呢？拖动下面的滑块，再比较数值。'), { type: 'widget', kind: 'growth' }, md('线性函数增加 10 倍，平方函数增加 100 倍。对数函数只从约 3.32 增长到约 6.64。它们不是实际秒数，但能展示“增长方式”的差别。')),
      section('example', '读一个循环，而不是只数几层', md('```python\nfor i in range(n):\n    for j in range(n):\n        compare(i, j)\n```\n\n若一次 `compare` 的成本不随 $n$ 增长，内层执行 $n$ 次，外层也执行 $n$ 次，总计 $n^2$ 次调用。\n\n如果内层改成 `range(i)`，总次数是 $0+1+\cdots+(n-1)=n(n-1)/2$，仍然是平方增长。\n\n但不能机械地“看到两层就说 O(n²)”：内层如果只执行固定 3 次，总次数就是 $3n$，属于线性增长。')),
      section('check', '试着独立判断一次', quiz('loops', '外层循环 n 次，内层每次固定循环 3 次，循环体是 O(1)。整体复杂度是什么？', [
        ['O(n²)，因为有两层循环。', '层数不是决定因素。内层次数不会随 n 增大。'],
        ['O(3)，因为内层只循环 3 次。', '你漏掉了外层的 n 次重复。'],
        ['O(n)，因为总次数是 3n。', '正确！3 是固定系数，总工作量按 n 线性增长。'],
      ], 'c', '把两层的实际执行次数相乘。', '总次数是 $n \times 3$，每次成本固定，因此整体为 $\Theta(n)$，也属于 $O(n)$。')),
      section('summary', '比较前，先说清条件', md('给出复杂度时，至少说清：\n\n- 输入规模指什么。\n- 统计哪些基本操作。\n- 讨论最坏、最好还是平均情况。\n- 依赖什么条件，比如随机访问或比较成本固定。\n\n下一节会把这个思路用在二分查找中：为什么一次次减半只需要对数级比较？')),
    ], sources: [source('MIT 6.006 · Introduction to Algorithms', 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/'), { title: '本地示例课程', note: '示例展示渐近分析的基础概念，未作为具体运行性能测量。' }],
  },
  { schemaVersion: 1, id: 'binary-search', bookId: 'data-structures', title: '2.1 二分查找：每次排除一半', summary: '有序，让一次比较不只判断一个位置，还能排除整片不可能的区域。', minutes: 15,
    objectives: ['解释二分查找为什么要求有序', '跟踪 left、right 与 mid 的变化', '处理目标不存在和边界情况', '解释 O(log n) 比较次数的来源'], prerequisites: ['数组与下标', '时间复杂度与对数增长'],
    sections: [
      section('intuition', '像猜数字一样查找', md('想象我在 1 到 100 中选一个整数。你猜 50，我回答“更大”。这句话立即排除了 1 到 50，不需要把每个数都问一遍。\n\n二分查找利用同样的信息：在**按非递减顺序排列的数组**里，比较中间元素与目标。如果中点太小，左边都不可能；如果中点太大，右边都不可能。\n\n普通查找一次通常只排除一个位置，二分查找一次可以排除约一半位置。关键是能证明排除的部分不含目标。')),
      section('boundaries', '三个下标，维护一段候选区间', md('这一节使用闭区间 $[left,right]$：两端都属于当前候选。\n\n- 初始：`left = 0`，`right = n - 1`。\n- 中点：`mid = left + (right - left) // 2`。\n- 中点太小：`left = mid + 1`。\n- 中点太大：`right = mid - 1`。\n- 中点相等：找到；`left > right`：区间为空，没有找到。'), tip('为什么要加 1 或减 1？', '中点已经比较过，且不等于目标。更新时必须排除它，否则某些情况下区间不缩小，会陷入循环。')),
      section('try', '亲手把不可能的位置排除', md('下面的数组已经有序。默认目标是 23。先看看中点是什么，再点“下一步”；也可以自动演示。\n\n**预测任务：**第一次看到中点为 16 时，目标 23 应该在左边还是右边？'), { type: 'widget', kind: 'binary-search', config: { values: [2, 5, 8, 12, 16, 23, 38, 56, 72], target: 23 } }, md('默认演示依次比较 16、38、23，最终命中下标 5。把目标改成 24，再观察：最后区间会为空，而不是“最接近的数就是答案”。')),
      section('code', '把区间变化写成代码', md('```python\ndef binary_search(values, target):\n    left, right = 0, len(values) - 1\n    while left <= right:\n        mid = left + (right - left) // 2\n        if values[mid] == target:\n            return mid\n        if values[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n```\n\n循环开始时，如果目标存在，它一定在候选区间内。每次比较都在保持这个性质，同时缩短区间。\n\n这份实现返回一个匹配下标；有重复值时，**不保证是第一个或最后一个**。查找边界需要不同的更新规则。空数组的 `right` 是 -1，循环直接结束。')),
      section('why-fast', '为何是对数级比较', md('候选数大致从 $n$ 变成 $n/2$、$n/4$、$n/8$。若减半 $k$ 次后只剩常数个候选，就有 $n/2^k \approx 1$，因此 $k \approx \log_2 n$。'), { type: 'formula', latex: '\frac{n}{2^k}\approx 1\quad\Longrightarrow\quad k\approx\log_2 n', caption: '这是增长数量级的解释；具体比较次数还取决于长度和目标位置。' }, tip('快的条件也要一起说', '有序、能快速访问中间元素、比较成本固定，是这里分析的重要条件。先排序的成本需要另外计算；在链表上寻找中间位置可能要遍历。', 'note')),
      section('check', '最重要的前提，你记住了吗', quiz('sorted', '为什么不能直接对一个任意无序数组使用这份二分查找？', [
        ['中点较小时，目标仍可能在左边，无法安全排除。', '准确！缺少有序性，比较中点就不能推断整片区域的取值。'],
        ['无序数组没有下标。', '无序数组仍然有下标，问题是下标顺序和数值大小没有关系。'],
        ['无序数组只能存放字符串。', '排序与元素类型无关。关键是是否有与比较规则一致的顺序。'],
      ], 'a', '中点小于目标，能不能证明左边全部小于目标？', '二分查找需要排除区间的逻辑依据。有序时，左边不大于中点，因此中点太小就能排除左边；无序时这个推断不成立。')),
      section('recall', '用自己的话解释“快”', md('**一句话带走：**二分查找用有序性让一次比较排除约一半候选，而不是一次只检查一个位置。\n\n接下来可以思考：如果数组中有多个 23，怎样查找最左边那个？暂时不要套用这一节的返回条件，先说清你想维护的区间性质。'), { type: 'flashcards', cards: [{ front: '中点小于目标时，闭区间怎么更新？', back: 'left = mid + 1。中点已证明不等于目标，需要把它排除。' }, { front: '循环终止但没找到时，区间是什么状态？', back: 'left > right，闭区间为空，所以目标不存在。' }, { front: '时间复杂度 O(log n) 依赖哪些条件？', back: '有序、快速随机访问和固定比较成本；排序成本需另算。' }] }),
    ], sources: [source('Python 标准库 · bisect', 'https://docs.python.org/3/library/bisect.html', '可进一步了解排序序列的插入边界，以及定位与插入成本的区别。'), source('MIT 6.006 · Introduction to Algorithms', 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/')],
  },
  { schemaVersion: 1, id: 'derivative', bookId: 'calculus', title: '1.1 导数：这一刻变化多快', summary: '平均变化率看一段过程；导数试图描述某一个位置附近的局部变化。', minutes: 13,
    objectives: ['区分平均变化率与瞬时变化率', '在图像中区分割线与切线', '用差商解释 x² 的导数', '知道差商极限可能不存在'], prerequisites: ['函数与坐标', '分数和平方运算'],
    sections: [
      section('question', '平均速度，能说明此刻速度吗', md('一辆车一小时行驶 60 千米，平均速度是 60 千米/小时。但它可能停过车，也可能在某一刻开到 80。平均值无法直接告诉我们“这一刻变化多快”。\n\n对一个函数来说，平均变化率是函数值变化除以输入变化。把观察区间缩得很小，我们开始接近局部变化率，这就是导数背后的问题。')),
      section('difference', '两点之间的变化：差商', md('从 $x$ 到 $x+h$，输入变化为 $h$，函数值变化为 $f(x+h)-f(x)$。两者相除，得到这一段的平均变化率。'), { type: 'formula', latex: '\frac{f(x+h)-f(x)}{h},\qquad h\ne 0', caption: '在图像上，这就是连接两点的割线斜率。' }, md('对 $f(x)=x^2$，展开后：\n\n$$\frac{(x+h)^2-x^2}{h}=\frac{2xh+h^2}{h}=2x+h$$\n\n当 $h$ 趋近 0，差商趋近 $2x$。例如在 $x=1$ 附近，瞬时变化率为 2。注意我们让 $h$ **趋近** 0，而不是直接在分式中令 $h=0$。')),
      section('experiment', '看割线怎样接近切线', md('先把观察位置设在 $x=1$。当步长 $h=0.1$ 时，割线斜率是 2.1；把 $h$ 缩小到 0.001，它会是多少？'), { type: 'widget', kind: 'derivative' }, tip('图像是直觉，极限才是定义', '实验只展示 x² 和正步长。一般的导数要求差商在 h 从两侧趋于 0 时得到同一个有限极限。单侧靠近或图像看起来平滑，都不能替代这个检查。', 'note')),
      section('definition', '从平均变化到导数定义', { type: 'formula', latex: 'f\prime(x)=\lim_{h\to 0}\frac{f(x+h)-f(x)}{h}', caption: '当这个两侧极限存在并有限时，函数在该点可导。' }, md('导数是一个新函数。对 $x^2$，它是 $f\prime(x)=2x$，因此不同位置的局部变化率不同。\n\n在 $x=0$ 处导数是 0，并不意味着函数在整个附近都保持不变，只说明该点的切线斜率为 0。对 $|x|$ 在 0 处，左侧斜率为 -1，右侧为 1，两边不一致，所以该点不可导。')),
      section('check', '别把“趋近”写成“代入”', quiz('limit', '计算导数时，为什么不能直接把 h=0 代入差商分式？', [
        ['因为所有函数在 h=0 时都不存在。', '不是函数一定不存在；例如 x² 在 x=0 完全有定义。问题在差商分母。'],
        ['因为差商要求 h≠0，导数看的是差商的极限。', '正确！导数由邻近的非零步长产生的差商决定。'],
        ['因为 h 永远不能取负值。', 'h 可以为负，对应从另一侧接近。通常需要两侧极限一致。'],
      ], 'b', '看一下分母，再区分函数值与差商。', '当 h=0 时，差商分母为零。导数不是这时的分式值，而是非零 h 趋于 0 时差商的极限。')),
      section('summary', '把三层意思连起来', md('平均变化率：一段区间的变化。割线斜率：平均变化率的几何表示。导数：差商的局部极限，在可导点对应切线斜率。\n\n试着解释：为什么 $x^2$ 在 $x=2$ 处的导数是 4，但从 2 到 3 的平均变化率是 5？'), { type: 'flashcards', cards: [{ front: 'x² 在 x 处的导数是什么？', back: '2x；从 x 到 x+h 的差商为 2x+h，h 趋近 0 时得到 2x。' }, { front: '连续是否一定可导？', back: '不是。例如 |x| 在 0 处连续，但左右差商极限不一致。' }] }),
    ], sources: [source('OpenStax · 导数定义', 'https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative', '进一步阅读差商、切线与导数定义；本节内容为原创解释。')],
  },
  { schemaVersion: 1, id: 'frequency', bookId: 'probability', title: '1.1 概率与频率不是一回事', summary: '概率描述一个模型中的可能性，频率描述你在一批实际试验里看到了什么。', minutes: 11,
    objectives: ['区分概率参数和观测频率', '理解公平硬币也可能短期不均衡', '识别独立试验中的赌徒谬误'], prerequisites: ['比例与百分数'],
    sections: [
      section('intuition', '公平，不是每两次就一正一反', md('一枚公平硬币，模型中正面概率为 0.5。抛 10 次，却可能出现 7 次正面。7/10=0.7 是这批试验的正面频率，并不自动说明硬币的真实概率变成了 0.7。\n\n**概率是模型的参数；频率是数据的统计结果。**它们相关，但不是同一个量。'), tip('先说清模型假设', '这里假设每次试验独立、正面概率保持不变。真实硬币、设备或采样过程是否满足条件，需要实际检查。', 'note')),
      section('try', '多试几次，观察频率曲线', md('下面是本地随机模拟。虚线代表设定概率，实线代表累积正面频率。先预测：一次出现很多正面后，下一批结果会被“强制补偿”吗？'), { type: 'widget', kind: 'probability' }, md('随着试验次数增加，频率通常会围绕概率变得更稳定。但曲线不会每一步都更接近虚线，也没有“结果必须补齐”的安排。\n\n把概率改成 0.8，会重置旧数据。这是在改变模型，不能把两种模型的数据混在一起，再把一个比例当成单一固定概率的估计。')),
      section('law', '长期规律，不要求短期补偿', md('对独立、同分布的伯努利试验，正面频率是 $\hat p=H/n$，其中 $H$ 为正面次数。它的方差是 $p(1-p)/n$：样本越多，频率围绕 $p$ 的波动尺度通常越小。'), { type: 'formula', latex: '\hat p=\frac{H}{n},\qquad\operatorname{Var}(\hat p)=\frac{p(1-p)}{n}', caption: '以上结论依赖独立且固定概率的试验模型。' }, md('独立时，之前的结果不会改变下一次的概率。连续出现 5 次正面后，下一次正面的概率仍然是 0.5。把“总体比例会稳定”理解成“下一次一定要补反面”，就是赌徒谬误。')),
      section('check', '一个很容易被骗的直觉', quiz('coin', '独立的公平硬币已经连续出现 5 次正面，下一次出现反面的概率是多少？', [
        ['大于 0.5，反面应该补回来。', '这就是赌徒谬误。独立试验没有为了平衡历史而补偿的机制。'],
        ['小于 0.5，正面正在连胜。', '过去的连续正面也不会让下一次更偏向正面。'],
        ['仍然是 0.5。', '正确！公平和独立的模型假设没有改变。'],
      ], 'c', '题目特意给出了“独立”和“公平”。', '独立意味着下一次结果的分布不因过去结果改变。公平硬币的反面概率为 0.5；不能用长期频率规律推断短期补偿。')),
      section('recall', '从模型走到数据，再回到模型', md('概率帮助我们预测数据；频率帮助我们检查模型。若实际频率长期明显偏离预期，应该检查假设、样本量和误差，而不是说“概率定义已经失效”。\n\n迁移问题：如果从袋中不放回抽球，前一次抽取会不会影响下一次？这时就不能直接套用独立硬币的结论。'), { type: 'flashcards', cards: [{ front: '正面 7 次、共 10 次，0.7 是什么？', back: '这批试验的正面频率；不是自动确定的真实正面概率。' }, { front: '长期频率稳定是否意味着短期一定补偿？', back: '不意味着。独立试验的下一次概率不因历史结果而改变。' }] }),
    ], sources: [source('OpenStax · 独立事件', 'https://openstax.org/books/introductory-statistics-2e/pages/3-2-independent-and-mutually-exclusive-events', '进一步阅读独立性的含义；本节实验和解释为原创。')],
  },
];

for (const input of books) {
  let exists = false;
  try { await getBook(root, input.id); exists = true; } catch (err) { if (err.code !== 'ENOENT') throw err; }
  if (!exists) {
    const book = await createBook(root, input);
    // Demo metadata is explicit; real courses are never tagged as samples.
    const file = path.join(root, 'books', book.id, 'book.json');
    const data = JSON.parse(await fs.readFile(file, 'utf8')); data.demo = true;
    await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
  }
}
for (const lesson of lessons) {
  const file = path.join(root, 'books', lesson.bookId, 'lessons', `${lesson.id}.json`);
  try { await fs.access(file); } catch (err) { if (err.code !== 'ENOENT') throw err; await putLesson(root, lesson.bookId, lesson); }
}
console.log('示例课程已就绪：3 门课程、5 节完整讲解；已有内容保持不变。');
