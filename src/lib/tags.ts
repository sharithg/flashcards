import { z } from "zod";

/*
 * Set tags: short free-form labels ("Language Transfer", "LT Track 8") for filtering and sorting
 * the library. Stored trimmed with inner whitespace collapsed, deduplicated case-insensitively,
 * in the order the user added them.
 */

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;

export function cleanTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}

/** Trims, drops empties, and removes case-insensitive duplicates (first spelling wins). */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = cleanTag(raw);
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export const tagsInput = z
  .array(z.string().max(200))
  .max(100)
  .transform(normalizeTags)
  .pipe(z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS));

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Natural order, so "LT Track 5" sorts before "LT Track 10". */
export const compareTags = (a: string, b: string) => collator.compare(a, b);

export const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Orders sets by their tags: each set's tags are sorted naturally and compared element by
 * element, so sets sharing a course tag fall together and then by track number. Untagged sets go last.
 */
export function compareByTags(a: string[], b: string[]): number {
  if (!a.length || !b.length) return Number(!a.length) - Number(!b.length);
  const sa = [...a].sort(compareTags);
  const sb = [...b].sort(compareTags);
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const c = compareTags(sa[i], sb[i]);
    if (c) return c;
  }
  return sa.length - sb.length;
}
