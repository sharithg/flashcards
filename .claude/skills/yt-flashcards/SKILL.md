---
name: yt-flashcards
description: Turn one or more YouTube video links into a new flashcard study set in this app. Use when the user shares YouTube URLs and wants a set, deck, or flashcards made from them.
argument-hint: <youtube-url> [more urls] [notes: topic focus, card count, language]
---

# YouTube → study set

Requires the `repaso` CLI to be logged in (`pnpm repaso login`).

Build one study set from the YouTube links in `$ARGUMENTS` (or the conversation). Run everything from the repo root.

## 1. Pull transcripts

```bash
uv run scripts/yt-transcript.py <url> [<url> ...] --json > "$SCRATCH/transcripts.json"
```

- `$SCRATCH` = this session's scratchpad directory. Read the JSON; each entry has `title`, `url`, `language`, `generated`, `text`.
- Add `--lang es,en` for non-English videos (first language is also the translation target), `--timestamps` if you need to locate sections.
- Errors go to stderr per video and the others still succeed. If a video has no transcript or YouTube blocks the request (`RequestBlocked`/`IpBlocked`), tell the user which link failed and continue with the rest — don't invent content for it.

## 2. Write the cards

Read every transcript fully, then write cards that capture what the videos actually teach:

- **Term** — short and specific: a concept, name, word, formula, or a question. **Definition** — one or two plain sentences, self-contained (no "as mentioned in the video").
- Cover the key ideas, definitions, cause/effect, steps, and numbers worth remembering. Skip intros, sponsor reads, jokes, and calls to subscribe.
- Default to roughly 10–30 cards depending on content density; follow any count the user gave. No duplicates across videos.
- Language videos: term = target-language word/phrase, definition = meaning (plus brief usage note if useful).
- Auto-generated transcripts (`generated: true`) mangle names and jargon — fix obvious mis-hearings from context; leave out anything you can't resolve with confidence.
- Stick to what the videos say. If something sounds wrong, leave it out or flag it to the user rather than silently "correcting" it.

Title: concise topic name (not the raw video title unless it fits). Description: one line, ending with the source, e.g. `From "Video Title"` or `From 3 YouTube videos`.

Save to `$SCRATCH/set.json`:

```json
{ "title": "…", "description": "…", "cards": [{ "term": "…", "definition": "…" }] }
```

## 3. Review with the user

Show the title, description and cards as a compact table and ask if they want changes before importing. Apply edits to `set.json`.

## 4. Import with the `repaso` CLI

```bash
pnpm -s repaso sets create "$SCRATCH/set.json" --json
```

- It prints `{ id, url, cards }`; share the `url`.
- Targets https://repaso.me by default. For a local dev server add `--api http://localhost:3000` (and log in to that host separately).
- If it says "Not logged in", ask the user to run `! pnpm repaso login` (opens the browser to authorize the machine), then retry. Check who you're acting as with `pnpm -s repaso whoami`.
- A 400 lists the invalid fields; fix `set.json` and retry. Don't create the set twice: on any unclear failure, check `pnpm -s repaso sets list --json` first.
