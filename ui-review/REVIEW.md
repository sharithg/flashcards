Recall UI/UX review — 9 November 2026

**Overall: 7.4/10.** A clean, coherent study app with a strong core learning screen. The main opportunity is to adapt interaction density and navigation to mobile rather than carrying desktop controls into a narrower layout.

| Category | Score | Assessment |
| --- | --- | --- |
| Visual design | 8/10 | Consistent type, restrained color, clear surfaces and comfortable spacing. Polished, though visually conventional. |
| Hierarchy and readability | 8/10 | Headings, prompts and actions scan well. Mobile library summary badges occupy too much vertical space. |
| Navigation and discoverability | 7/10 | Clear mode names and back links. Match is clipped at 390px and completely offscreen initially at 320px; the scrollable mode bar has little visible indication. |
| Learning interactions and feedback | 8.5/10 | Large answer choices; wrong answers show both the correction and a supportive explanation, with icons as well as color. Space flips cards and Right advances them. |
| Mobile responsiveness | 6.5/10 | No document-level horizontal overflow on the captured routes at 390px or flashcards at 320px. Internal navigation clips, icon-only controls are harder to discover, and Match requires scrolling during timed play. |
| Create/import workflow | 7/10 | Clear import separators, a sticky submit action, and visible missing-title feedback. Empty card inputs consume substantial height; title and description rely on placeholders for visible labels. |
| Accessibility foundations | 7/10, provisional | Keyboard flashcard controls work; source includes accessible input names and an alert for validation. Learning feedback uses symbols and words alongside color. Faint hints and icon controls deserve a dedicated contrast, focus, and screen-reader audit. This is not a WCAG conformance score. |
| Light/dark consistency | 8/10 | The sampled dark library preserves the same hierarchy and color roles. Full dark-mode flow coverage remains untested. |

Priority improvements:

1. **Make all study modes discoverable on mobile.** Fit four labelled tabs, use a two-by-two layout, or provide a clear scroll affordance and bring the active mode into view. See [flashcards annotation](artifacts/mobile-flashcards-annotated.png).
2. **Fit the Match board to the available height.** At 390 × 844, twelve tiles stretch below the fold and the timer scrolls away. Reduce tile height or offer fewer pairs per mobile round, with a persistent timer. See [Match annotation](artifacts/mobile-match-active-annotated.png).
3. **Compact the library summary.** The first set begins around 450px down the mobile page. Put the streak and learning count in one compact region so study content starts sooner. See [library annotation](artifacts/mobile-library-annotated.png).
4. **Keep mobile study controls understandable.** Options and Shuffle lose visible labels. Use short labels or a labelled tools menu, and change “Click or press Space to flip” to a touch-appropriate hint. Title attributes help mouse users but do not provide visible guidance on touch.
5. **Shorten the blank editor.** Use compact empty rows that expand with content, persistent visible Title/Description labels, a shorter title example, and consistent “Create set” wording. Keep the sticky action. See [editor annotation](artifacts/mobile-create-annotated.png).

What to preserve: the learning screen's large choices and correction feedback; specific “Start learning N terms” actions; consistent styling; term-level library search; and accessible keyboard flashcard navigation. See [Learn annotation](artifacts/mobile-learn-active-annotated.png) and [desktop annotation](artifacts/desktop-library-annotated.png).

Evidence and scope: Playwright ran in an isolated headless Chrome session with sample Spanish and biology sets. Captured library, overview, flashcards, Learn setup, Test setup, Match setup and create at 1440 × 1000 and 390 × 844; additionally captured active Learn, wrong-answer feedback, active Test, active Match, import, missing-title validation, no-results search, a dark library and 320px flashcards. Search for “mitochondria” returned Cell Biology; Space and Right changed flashcard state. Raw captures and interaction observations are in `artifacts/`. The Next.js development badge is an environment artifact and was excluded from scoring.

Authentication, account menus, database persistence, completed-test grading, completed Match results, and real-device virtual keyboards were not evaluated. The sample preview intentionally disables persistence and substitutes signed-in navigation without an account menu. Scores are reviewer judgments based on this scope.

Reusable tooling: [SKILL.md](SKILL.md). Run `npm ci --prefix ui-review`, apply the fixture preview, start Next bound to localhost, run `node ui-review/capture.mjs`, `node ui-review/interact.mjs`, and `node ui-review/annotate.mjs`. Stop Next and restore the preview afterward. Annotation text and coordinates describe this review's sample captures; revise them after inspecting newly captured screens.
