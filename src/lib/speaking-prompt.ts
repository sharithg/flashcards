import type { StudySet } from "./types";

/** Builds a prompt to paste into ChatGPT (voice mode) for spoken practice with a set's vocabulary. */
export function speakingPrompt(set: StudySet): string {
  const list = set.cards.map((c) => `- ${c.term.trim()} — ${c.definition.trim()}`).join("\n");
  return `I'm studying a flashcard set called "${set.title}"${set.description ? ` (${set.description.trim()})` : ""}. I want to practice speaking with it. Here are the terms and their meanings:

${list}

Please be my conversation partner:
- Have a natural, back-and-forth conversation in the language of the terms that gets me to use these words and phrases out loud.
- Keep your turns short (1–3 sentences) and ask me a question each time so I keep talking.
- Match my level: use simple language built around this vocabulary, and slow down if I struggle.
- When I make a mistake or use a word wrongly, briefly correct me, give the right version, and continue the conversation.
- Work through as many of the terms above as you can, and bring back ones I got wrong.
- If I say "hint", give me a clue in English. If I say "stop", summarize which terms I used well and which I should review.

Start by greeting me and asking your first question.`;
}
