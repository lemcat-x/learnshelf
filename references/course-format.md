# 课程文件格式 · v1

所有 JSON 使用 UTF-8。Node 运行时与网页使用同一 `schemaVersion: 1`。

```text
<项目>/learning-library/books/<book-id>/
  book.json
  lessons/<lesson-id>.json
  assets/                  图片、SVG、自定义实验文件
  versions/                修订时自动备份旧讲解
```

ID 为小写字母、数字、短横线，1–80 字符，以字母或数字开头。课程、章节、小节、段落使用稳定 ID；标题修改不需要改 ID。一级章、二级小节为当前导航结构，更细的知识点放进讲解 `sections`，同时保留原始小标题。

## 创建课程的输入

```json
{
  "id": "computer-networks",
  "title": "计算机网络",
  "subtitle": "从连接到协议",
  "category": "计算机",
  "level": "初学者",
  "cover": "forest",
  "description": "按课程目录编写的通用讲解，尚未提供教材正文。",
  "materialMode": "outline-only",
  "chapters": [
    { "id": "ch-1", "title": "第1章 网络基础", "lessons": [
      { "id": "network-intro", "title": "1.1 什么是计算机网络" }
    ] }
  ]
}
```

`id` 可省略，由脚本生成。`cover` 可取 forest、ochre、clay、slate。`materialMode` 用 outline-only 或 supplied-material。普通两级目录可把 `chapters` 替换为 `outline` 字符串。

创建脚本添加 `schemaVersion` 与时间。不要手工写 ready 数量或小节状态：状态从有效讲解文件实时推导。

导入教材目录时，章可带 `part`（部分标题）和 `page`（教材页码），小节可带 `page`、`subsections`。`subsections` 为 `{id,title,page}` 数组，保留三级小标题；生成该小节时需覆盖这些知识点。网页以可展开列表显示，仍以二级节作为讲解单元。裁切或无法准确读取的页码用 null，不补猜。

## 讲解输入

```json
{
  "schemaVersion": 1,
  "id": "network-intro",
  "bookId": "computer-networks",
  "title": "1.1 什么是计算机网络",
  "summary": "从两台设备怎样交换信息，理解网络、协议和分层。",
  "minutes": 12,
  "objectives": ["区分网络连接与通信协议"],
  "prerequisites": [],
  "sections": [
    { "id": "intuition", "title": "从一个问题开始", "blocks": [
      { "type": "markdown", "content": "这里填写实际的完整讲解。" }
    ] }
  ],
  "sources": [{ "title": "用户提供的课程目录", "note": "仅确定主题范围，未提供教材正文。" }]
}
```

`minutes` 是预计阅读分钟数，1–180 整数。`sections` 至少一段，每段必须有有效 `blocks`。段落 ID 在一节内唯一。sources 的外部 URL 用 http/https；材料来源可以没有 URL、改用真实名称与章节定位。上述示例演示结构，生成时必须替换为真实内容。

## 内容块

| type | 必要字段 | 可选字段 |
| --- | --- | --- |
| markdown | content：Markdown，可用 `$...$`、`$$...$$` 数学 | — |
| callout | content | title、tone：note/tip/warning |
| formula | latex：LaTeX 公式 | caption |
| diagram | svg：完整 SVG 字符串 | caption |
| image | src：`assets/` 相对路径、alt、caption | — |
| widget | kind | config，见组件约定 |
| quiz | id、question、options、answer、explanation | hint |
| flashcards | cards，每张含 front/back | — |
| experiment | src：`assets/` 相对 HTML 路径、caption | — |

选择题 options 是 `{id, text, feedback}` 数组；answer 是其中一个 ID。不要给重复选项 ID。Quiz 只有一个正确答案。

讲解图片使用独立 image 块，避免在 Markdown 中写不受控 URL。自定义 HTML 只能在隔离实验 iframe 运行。书架、导航和主题样式由应用维护，讲解不加入任意页面级样式或脚本。

先 `put-lesson` 校验并保存，再 `validate` 扫描课程库。需要替换原稿时显式 `--replace`，自动创建旧稿备份。
