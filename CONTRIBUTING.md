# Contributing

LearnShelf is an early alpha. Small, reproducible improvements are easier to review than broad rewrites.

1. Open an issue describing the user-visible problem, expected behavior, Node.js version, operating system, and a minimal course JSON when relevant.
2. Keep personal textbooks, generated private lessons, API keys, and `learning-library/` out of commits.
3. Run `npm ci`, `npm run build`, and `npm test` in `assets/library-app/`.
4. If the course schema changes, update `references/course-format.md`, validation, tests, and the changelog together.
5. Do not describe preset local feedback as live AI evaluation, and do not claim to reproduce private ChatGPT prompts or internal components.
