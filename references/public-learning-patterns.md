# 公开学习模式与 LearnShelf 的实现边界

核查日期：2026-10-13。

LearnShelf 从 OpenAI 公开说明中提炼三类可复用的教学组织方式。它们是产品行为层面的设计依据，不是对 ChatGPT 内部提示词、模型权重、组件协议或源代码的复制。

## Study Mode：引导式学习

[OpenAI Study Mode 帮助文档](https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt)描述了以互动问题了解学习目标和水平、分步讲解、检查理解并根据回答调整的方法。

LearnShelf 将这些原则落成可持久化课程结构：目标与先修知识、由直觉到形式化的分层正文、关键节点的理解检查、具体反馈、总结与复习卡片。当前本地网页的反馈由课程文件预先生成；需要真实自适应追问时，由正在运行该技能的 agent 继续对话并修订课程。

## Intelligent UI：按问题选择信息形态

[OpenAI 的 Intelligent UI 公开介绍](https://openai.com/index/gpt-6-for-everyone/)说明回答可以按任务选择文字、图形、按钮、表单、图表及其他交互体验。

LearnShelf 因此不强制每节课填满同一套媒体。关系与结构优先图示或表格，变量关系优先公式、图表与参数实验，过程优先步骤播放器，实物内容才使用有来源的图片。纯文字更清楚时保持纯文字。

## Visualizations：可操作的解释

[OpenAI Visualizations 文档](https://learn.chatgpt.com/docs/visualizations)展示了图表、地图、示意图和互动可视化等表达方式。

LearnShelf 提供固定的安全组件，以及课程目录内的沙箱 HTML 实验。每个实验都要说明操作对象、预测、观察结果、解释范围和限制；动画应支持暂停或重置，并尊重减少动态效果的系统偏好。

## 不等价之处

- LearnShelf 是独立的开源实验项目，与 OpenAI 无隶属或背书关系。
- 它不包含 ChatGPT 的私有 system prompt、原生组件实现或内部 API。
- 仅凭教材目录生成的是围绕主题的原创通用讲解，不是教材原文，也不能代替核对指定教材。
- 生成内容可能出错。高风险知识、引用、计算和考试要求应由用户或领域专家复核。
- 批量生成整本书会消耗 agent 的时间与模型额度；当前 alpha 没有后台任务队列或自动付费 API 调用。
