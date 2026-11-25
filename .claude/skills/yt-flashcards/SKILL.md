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
- Language videos: follow **Language sets** below instead of the Term/Definition rule above.
- Auto-generated transcripts (`generated: true`) mangle names and jargon — fix obvious mis-hearings from context; leave out anything you can't resolve with confidence.
- Stick to what the videos say. If something sounds wrong, leave it out or flag it to the user rather than silently "correcting" it.

### Language sets (Language Transfer, lessons, any language course)

The goal is practicing vocabulary and grammar by recall, not learning *about* the language. Learn and Test grade typed answers against the definition (ignoring case, punctuation and accents, allowing small typos, max ~40 chars), so every card must have an answer the user can type exactly.

- **Term** = target-language word, phrase or sentence. **Definition** = its English meaning and nothing else: `rice`, `I go; I'm going`, `I want to see them`.
- Separate alternative answers with `;` or ` / ` (each is accepted on its own). Optional memory hooks go in parentheses, which grading ignores: `to show (demostrar minus de-)`. Use them sparingly.
- No explanations, usage notes, examples or "Ex:" in the definition. Keep each definition under ~40 characters.
- No pronunciation, spelling or "how the language works" cards (e.g. "The letter H", "rolled r", "why the a?"). They can't be answered by typing. Instead, teach the rule with sentence cards that use it.
- Most of the value is in **sentences built in the lesson**: when the teacher has the student build "I'm going to try to see them", make a card for it (`Voy a intentar verlos` → `I'm going to try to see them`). Aim for roughly half vocab, half sentences; cover each grammar pattern with 2–3 sentences.
- Write the target language correctly (accents, ñ, ¿¡). Auto-transcripts mangle it; reconstruct from context only when you're confident.
- Lean on standard forms the lesson teaches: infinitives (`mostrar` → `to show`), conjugated forms (`intento` → `I try; I'm trying`), pronouns attached (`verlos`).

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
