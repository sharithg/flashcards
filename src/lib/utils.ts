import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AnswerWith, Card, MasteryCounts, StudySet } from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(items: readonly T[], n: number): T[] {
  return shuffle(items).slice(0, n);
}

/** The prompt shown to the student, given which side they answer with. */
export function promptOf(card: Card, answerWith: AnswerWith): string {
  return answerWith === "definition" ? card.term : card.definition;
}

export function answerOf(card: Card, answerWith: AnswerWith): string {
  return answerWith === "definition" ? card.definition : card.term;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Like `normalize`, but keeps accents (for telling "manana" apart from "mañana"). */
function normalizeKeepAccents(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type AnswerCheck = {
  correct: boolean;
  /** Correct, but only after ignoring accents (e.g. "manana" for "mañana"). */
  accentSlip: boolean;
  /** Correct, but only after allowing a small typo. */
  typo: boolean;
};

/** Lead-ins that introduce a meaning rather than being part of it, e.g. "also used to mean 'let's go'". */
const FILLER = /^(?:also |or |ie |eg |lit |literally |used to mean |used as |means |meaning )+/;
/** Articles and the infinitive "to", so "go" matches "to go" and "house" matches "a house". */
const ARTICLE = /^(?:to |a |an |the )/;

/**
 * Every answer a student could reasonably type for `expected`: the whole thing, plus each meaning
 * when it lists several ("we're going; let's go", "big / large", "big, large"), plus any quoted
 * phrase ("also used to mean 'let's go'"). Parentheticals like "(informal)" are dropped.
 */
export function answerVariants(expected: string, norm: (s: string) => string = normalize): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const n = norm(s).replace(FILLER, "");
    if (n) out.add(n);
  };
  add(expected);
  // Quoted phrases: the quote must open after a space/start and close before a space/punctuation/end,
  // so apostrophes inside words ("we're", "let's") aren't mistaken for quotes.
  for (const m of expected.matchAll(/(?:^|[\s(])['"‘“]([^"“”]+?)['"’”](?=$|[\s.,;:!?)])/g)) add(m[1]);
  const bare = expected.replace(/\([^)]*\)/g, " ");
  add(bare);
  for (const part of bare.split(/[;/]|\s+or\s+/i)) {
    add(part);
    // Commas separate meanings only in short lists ("big, large"), not in a sentence.
    const pieces = part.split(",");
    if (pieces.length > 1 && pieces.every((p) => p.trim().split(/\s+/).length <= 3)) pieces.forEach(add);
  }
  return [...out];
}

/** Longest answer we expect anyone to type from memory; longer answers get self-graded or multiple choice. */
const MAX_TYPED = 40;

/** Whether at least one acceptable answer is short enough to type. */
export function isTypeable(expected: string): boolean {
  return answerVariants(expected).some((v) => v.length <= MAX_TYPED);
}

/**
 * Lenient answer check: ignores case, punctuation and accents, accepts any one of several listed
 * meanings (see `answerVariants`), and allows a small typo on longer answers.
 */
export function checkAnswer(given: string, expected: string): AnswerCheck {
  const no = { correct: false, accentSlip: false, typo: false };
  const g = normalize(given).replace(ARTICLE, "");
  if (!g) return no;
  const variants = answerVariants(expected).map((v) => v.replace(ARTICLE, ""));
  if (variants.includes(g)) {
    // Matched once accents are ignored; it's an accent slip unless it also matches with them.
    const strict = (s: string) => normalizeKeepAccents(s).replace(ARTICLE, "");
    const accentSlip = !answerVariants(expected, normalizeKeepAccents).some((v) => v.replace(ARTICLE, "") === strict(given));
    return { correct: true, accentSlip, typo: false };
  }
  for (const e of variants) {
    const tolerance = e.length >= 8 ? 2 : e.length >= 4 ? 1 : 0;
    if (tolerance && levenshtein(g, e) <= tolerance) return { correct: true, accentSlip: false, typo: true };
  }
  return no;
}

export function isCorrectAnswer(given: string, expected: string): boolean {
  return checkAnswer(given, expected).correct;
}

/** Accented / special characters used in a set's answers, for the on-screen character buttons. */
export function specialChars(texts: string[]): string[] {
  const chars = new Set<string>();
  for (const t of texts) for (const ch of t) if (/[^\x00-\x7F]/.test(ch) && /[\p{L}¿¡]/u.test(ch)) chars.add(ch.toLowerCase());
  // Looks like Spanish: offer the full set, not just the characters that happen to appear.
  if ([...chars].some((c) => "ñ¿¡".includes(c))) for (const c of "áéíóúüñ¿¡") chars.add(c);
  return [...chars].sort((a, b) => a.localeCompare(b)).slice(0, 16);
}

/** Pick `n` distractor answers that differ from the correct one. */
export function distractors(cards: Card[], correct: Card, answerWith: AnswerWith, n: number): string[] {
  const right = normalize(answerOf(correct, answerWith));
  const seen = new Set([right]);
  const out: string[] = [];
  for (const c of shuffle(cards)) {
    const ans = answerOf(c, answerWith);
    const key = normalize(ans);
    if (c.id === correct.id || seen.has(key)) continue;
    seen.add(key);
    out.push(ans);
    if (out.length === n) break;
  }
  return out;
}

export function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1) + "s";
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function masteryCounts(set: StudySet): MasteryCounts {
  const c = { fresh: 0, learning: 0, mastered: 0, total: set.cards.length };
  for (const card of set.cards) {
    const lv = set.progress?.[card.id] ?? 0;
    if (lv === 2) c.mastered++;
    else if (lv === 1) c.learning++;
    else c.fresh++;
  }
  return c;
}

/** Local-time YYYY-MM-DD key for a date (default: now). */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive days studied, ending today (or yesterday, so a streak isn't lost before you study today). */
export function streakFrom(days: string[]): { streak: number; studiedToday: boolean } {
  const set = new Set(days);
  const d = new Date();
  const studiedToday = set.has(dayKey(d));
  if (!studiedToday) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (set.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return { streak, studiedToday };
}

export function relativeTime(ts: number | undefined): string {
  if (!ts) return "Not studied yet";
  const days = Math.round((new Date(dayKey()).getTime() - new Date(dayKey(new Date(ts))).getTime()) / 86_400_000);
  if (days <= 0) return "Studied today";
  if (days === 1) return "Studied yesterday";
  if (days < 30) return `Studied ${days} days ago`;
  return `Studied ${new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
