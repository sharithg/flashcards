# Recall

A Quizlet-style flashcard study app built with Next.js 16 (App Router), React 19, and Tailwind CSS v4.

## Features

- **Library**: search, sort (recent, A–Z, least mastered) and pin sets. Each card shows mastery, when you last studied it, and a one-click next step. A daily streak and a "terms to learn" count sit at the top.
- **Create and edit**: add, reorder, and delete cards; bulk import pasted text (tab, comma, or dash separated); Tab out of the last definition to add a card; Cmd/Ctrl+Enter to save.
- **Flashcards**: 3D flip cards, shuffle, starred-only, choose which side is the front, and an optional *track progress* mode that sorts cards into Know / Still learning.
- **Learn**: adaptive rounds of 7. Answer multiple choice first, then type the answer to master a card. Missed cards come back later in the round, and progress is saved.
- **Test**: generated tests mixing true/false, multiple choice, and written questions, with scoring and review.
- **Match**: a timed game where you pair terms with definitions. Wrong matches add a 1s penalty, and your best time is saved.

Answer checking ignores case, accents, and punctuation, and allows small typos. Learn tells you when an answer was accepted despite a missing accent or a typo, and shows buttons for accented characters.

Data is stored in Postgres (via Drizzle ORM). There are no accounts yet: it's a single-user app, so don't expose it publicly without adding auth.

### Keyboard shortcuts

| Mode | Keys |
| --- | --- |
| Flashcards | Space / ↑ / ↓ flip · ← → navigate (or Still learning / Know in tracking mode) · S shuffle · F fullscreen · ? shortcuts |
| Learn | 1–4 pick an option · Enter submit / continue |

## Setup

Requires Node 22+ and Docker.

```bash
npm install
cp .env.example .env     # database credentials + DATABASE_URL
npm run db:up            # start Postgres 17 (docker compose), waits until healthy
npm run db:migrate       # apply migrations in drizzle/
npm run db:seed          # optional: add the two sample sets (safe to re-run)
npm run dev              # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`, `npm run db:generate` (create a migration after editing `src/db/schema.ts`), `npm run db:studio` (browse the data), `npm run db:down` (stop Postgres; data stays in the `pgdata` volume).

## Deployment

Hosted on Vercel (project `flashcards`, region `iad1`) with Postgres on Neon (project `flashcards`, `aws-us-east-1`). Every push to `main` deploys to production. All deployments are behind Vercel Authentication, since the app has no accounts.

- `DATABASE_URL` (Neon pooled) and `DATABASE_URL_UNPOOLED` (direct) are set in the Vercel project for all environments. `vercel env pull` copies them locally.
- Migrations don't run on deploy. After adding one, apply it to Neon with `DATABASE_URL_UNPOOLED="<neon direct url>" npm run db:migrate` (get the URL with `npx neonctl connection-string --project-id long-smoke-75420550`).

## How data flows

- The root layout renders `DataProvider` (a Server Component, per request) which loads everything from Postgres and passes it to the client store, so pages render with data on the first paint.
- `src/lib/store.ts` keeps that snapshot in the browser. Every change (star, Learn answer, match time…) updates the UI immediately, then calls a Server Action in `src/lib/actions.ts`, which validates the input with zod and writes to Postgres.
- Next runs a page's Server Actions one at a time, so writes land in order. If one fails, the store reloads from `GET /api/data`, undoing the optimistic change. It also reloads when the tab regains focus, to pick up changes made in another tab.

## Structure

```
src/app/                    routes: /, /create, /sets/[id], /sets/[id]/{edit,flashcards,learn,test,match}
src/components/             UI: FlashcardViewer, Learn, Test, Match, SetEditor, SetOverview, Library
src/db/schema.ts            Drizzle schema: study_sets, cards, card_progress, study_days
src/db/queries.ts           reads (server only)
src/lib/actions.ts          Server Actions (writes, zod-validated)
src/lib/store.ts            client cache with optimistic updates over the actions
src/app/api/data/route.ts   fresh snapshot for resyncing
drizzle/                    SQL migrations
scripts/seed.ts             sample data
src/lib/utils.ts            shuffle, answer checking, distractor selection
```
