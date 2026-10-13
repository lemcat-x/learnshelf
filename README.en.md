# LearnShelf

LearnShelf turns a textbook table of contents into a persistent local learning library. A compatible agent generates layered explanations, diagrams, interactive experiments, checks for understanding, and review cards section by section; the bundled web app presents them as books, chapters, and lessons outside the chat window.

**This is an early, unfinished alpha. APIs, schemas, and workflows may change. It is not guaranteed to be stable or complete, and users are expected to inspect generated content and debug their own setup.**

The design operationalizes behavior described in OpenAI's public documentation for [Study Mode](https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt), [Intelligent UI](https://openai.com/index/gpt-6-for-everyone/), and [Visualizations](https://learn.chatgpt.com/docs/visualizations). LearnShelf is an independent open-source experiment. It is not affiliated with or endorsed by OpenAI and contains no private ChatGPT prompts, internal APIs, model weights, or native component implementation.

## Install

Prerequisites: Node.js 22+ and an agent that can load local skills.

```powershell
git clone https://github.com/lemcat-x/learnshelf.git "$env:USERPROFILE\.codex\skills\course-tutor"
```

Invoke the skill with a request such as:

```text
Use $course-tutor to import this textbook outline into a local bookshelf, then generate chapter 1 so I can review the teaching style.
```

To launch the bundled demo on Windows:

```powershell
node .\scripts\seed-demo.mjs --workspace .
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-library.ps1 -Workspace .
```

On other platforms:

```bash
node scripts/seed-demo.mjs --workspace .
node scripts/course.mjs serve --workspace .
```

See the [Chinese README](README.md) for architecture, agent integration, development, limitations, and licensing details.
