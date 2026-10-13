# 交互组件约定

优先让模型填参数与教学解释，不改网页源代码。复用组件如下：

| widget kind | config | 行为 |
| --- | --- | --- |
| binary-search | values：2–16 个非递减数值，target：目标值 | 左右边界和中点、前进/后退、自动播放/暂停、未命中状态 |
| growth | 可省略 | 输入规模 n=1–100，比较 log₂n、n、n²；同一纵轴与数值 |
| derivative | 可省略 | 仅 f(x)=x²，调 x 与正步长 h，观察割线、切线和斜率差 |
| probability | 可省略 | 仅独立伯努利试验，调 p、批量模拟、累计频率与概率对照 |
| steps | steps：`{title,content,svg?,caption?}` 数组 | 通用分步解释、前进、后退、重置 |

不要把固定 x² 导数组件描述成任何函数都支持；不要把硬币组件说成可以模拟任意概率模型。需要超出范围的功能，用有明确边界的新实验。

```json
{
  "type": "widget",
  "kind": "binary-search",
  "config": { "values": [2,5,8,12,16,23,38,56,72], "target": 23 }
}
```

SVG 应含 viewBox、合理文字与 aria-label；正文图建议使用 currentColor 和 CSS 变量，例如 `var(--accent)`、`var(--line)`、`var(--warm)`，以支持深浅主题。不要放入脚本、foreignObject 或外部资源。

图片使用本地资源与替代文字，精确结构图优先程序化 SVG。新实验存储为课程 `assets/example.html`，必要 CSS/JS 也放同目录；页面支持 `sandbox="allow-scripts"`，没有父页面、网络请求或本机文件访问权限。iframe 当前固定高度约 490px（手机 430px），实验自己适配窄屏和滚动。自定义实验需自己实现主题或提供适宜的中性色背景。

验收实际操作：控件会改变结果、对应文字同步；零值、边界、错误答案、重置、键盘操作都能正确工作。不要只检查是否有动画或截图是否好看。

## 自定义实验的主题同步

阅读器会在iframe加载和页面主题变化时，通过 postMessage 发送 `{type: "zhiye-theme", theme: "light" | "dark"}`。自定义HTML应仅接受 `event.source === window.parent`、正确type与两个合法theme值，设置自身 `document.documentElement.dataset.theme`，用 `:root[data-theme]` 切换颜色。保持实验状态，不因主题变化重置计数或选择。消息只包含主题，不开放父页面访问、网络能力或代码执行接口。
