---
name: flashcards-ui-review
description: Review Recall locally with isolated Playwright, sample data, screenshots, and annotated UI findings.
---

Run commands from the repository root. Install tooling with `npm ci --prefix ui-review`.
Use the supported browser tool first when required by the environment. Standalone Playwright is available for explicitly authorized fallback reviews.

For a signed-out review, use the normal app. For sample signed-in screens, run `python3 ui-review/preview.py apply`, then `pnpm dev --hostname 127.0.0.1`. The preview temporarily replaces auth and database access with seed data; do not deploy or commit while applied. It disables persistence and supplies the signed-in navigation without a real account menu.

Run `node ui-review/capture.mjs` against the local server. Keep raw screenshots as evidence. Inspect screenshots and exercise interactions before writing findings; distinguish observed problems from source-based risks. Score visual design, hierarchy, navigation, interaction feedback, accessibility, and responsive behavior out of 10. Accessibility scores are provisional without an assistive-technology audit.

Always stop the preview server and run `python3 ui-review/preview.py restore` when finished, including after failures. The backup preserves pre-existing edits; never use git checkout to clean up. The preview script refuses to overwrite an existing backup.
