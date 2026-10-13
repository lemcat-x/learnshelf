---
name: course-tutor
description: 将用户的课程或书籍目录变成本地学习书架，逐节生成分层讲解、图示、互动实验、理解检查和复习卡片；添加、续写、修订课程并打开独立浏览器阅读。用于通用课程学习与教材讲解，不用于论文研究流程或自动调用付费模型 API。
metadata:
  version: "0.1.0-alpha.1"
  repository: "https://github.com/lemcat-x/learnshelf"
---

# LearnShelf · Course Tutor

LearnShelf（知页）采用方案 A：当前桌面助手生成课程文件，本地网页呈现正式学习内容。网页没有实时 AI 接入；不要把预设练习反馈说成实时 AI 评估。它依据公开产品文档提炼教学组织原则，不包含 OpenAI 私有提示词、内部组件或专有实现，也不声称复刻 ChatGPT。

## 找到课程库

- 用户指定项目目录时使用该目录，否则使用当前工作目录。课程库为 `<项目目录>/learning-library/`；不把个人课程写进 skill 安装目录。
- 下文 `<skill>` 指本 SKILL.md 的父目录。脚本均随技能打包，支持 Windows Node.js 22+，启动不需要安装 npm 依赖；网页已经构建在 `assets/library-app/dist/`。
- Windows 宿主沙箱若阻止原子重命名或启动本地进程，按宿主的权限机制执行同一条限于项目的命令；不要为了绕过限制取消校验或改写其他位置。
- 先执行 `node "<skill>/scripts/course.mjs" list --workspace "<项目目录>"`。读取对应 `book.json`、已有讲解和来源信息；不要覆盖已经完成的课程或重排稳定 ID。

## 添加或生成课程

1. 读取 [教学规则](references/teaching-rules.md) 和 [课程格式](references/course-format.md)。需要核查设计依据时读取 [公开学习模式](references/public-learning-patterns.md)；只有生成新交互时再读取 [组件约定](references/interaction-components.md)。
2. 从用户目录保留章节与小节顺序，使用已给出的基础和目标。未给基础时采用初学者并说明；目录有关键歧义时只问必要问题，同时处理可确定部分。
3. 新课程：在项目目录写一个临时输入 JSON，然后执行 `node "<skill>/scripts/course.mjs" create --workspace "<项目目录>" --input "<输入JSON>"`。推荐传明确 `chapters` 树；粘贴的普通两级目录也可用 `outline`。记录返回的课程 ID。
4. 按先修关系逐节生成完整讲解 JSON。每节先写草稿文件，再执行 `node "<skill>/scripts/course.mjs" put-lesson --workspace "<项目目录>" --book "<课程ID>" --input "<讲解JSON>"`。讲解包含目标、先修知识、分层正文、具体例子、理解检查与总结；视觉和交互按知识需要选择。
5. 用户要求整书时逐节保存并续生成，完成整个授权范围。长课程可以分批处理和保持可恢复进度，但不能把只建好目录说成整书讲解完成。每个尚无有效文件的小节在网页显示“待生成”；失效文件显示“内容待检查”。
6. 执行 `node "<skill>/scripts/course.mjs" validate --workspace "<项目目录>"`。对新实验实际运行检查，核对图形、正文、答案和适用条件。
7. Windows 执行 `powershell -NoProfile -ExecutionPolicy Bypass -File "<skill>/scripts/start-library.ps1" -Workspace "<项目目录>"`，打开独立浏览器；已运行的同一课程库直接复用。其他平台运行 `node "<skill>/scripts/course.mjs" serve --workspace "<项目目录>"`，浏览器打开输出地址。
8. 最终提供书籍/小节入口、真实生成数量和必要局限；不把整篇讲解输出在 Codex 聊天窗口。

## 续写与修订

- 用户从网页复制的指令含项目路径、课程 ID、小节 ID；以这些字段定位现有文件。
- 续写：只生成待完成小节，读取前面的术语、符号与例子以保持连贯。
- 修订：先读原稿，再用 `put-lesson ... --replace`。脚本保存旧稿到该课程 `versions/`，不删除学习记录或其他章节。
- 用户只要求打开、阅读或检查已有课程时，不触发新的生成或修订。
- 用户追问已有知识点时，将补充解释写入对应小节的合理位置或独立学习段落，并打开文章；练习答案不要提前泄露在题目上方。

## 内容和呈现边界

只有目录时编写围绕主题的原创通用讲解，不能声称复现教材原文或编造作者的例题、页码。提供教材后标明材料版本和定位；区分材料解释与扩展知识。缺少依据就标未知。

模型输出正文与内容块，网页由固定组件渲染。图片、SVG、动画与小程序必须承担具体教学作用。可离线运行的资源放入课程自己的 `assets/`，使用相对路径；不要引用随机外部图片或把 API 凭据放进网页。

“带我学”是本地按段引导阅读与预设反馈；真实对话适配由当前桌面助手在后续生成中完成。已读、练习正确和闪卡掌握分别记录。
