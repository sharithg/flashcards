import "server-only";
import { asc, eq } from "drizzle-orm";
import type { LibraryData } from "@/lib/store-types";
import type { MasteryLevel, StudySet } from "@/lib/types";
import { db } from "./index";
import { cardProgress, cards, studyDays, studySets } from "./schema";

/**
 * Everything one user's library needs, in the shape the client store uses.
 * Four simple queries assembled in memory; fine for a personal library of a few thousand cards.
 */
export async function getLibraryData(userId: string): Promise<LibraryData> {
  const [setRows, cardRows, progressRows, dayRows] = await Promise.all([
    db.select().from(studySets).where(eq(studySets.userId, userId)),
    db
      .select({ card: cards })
      .from(cards)
      .innerJoin(studySets, eq(cards.setId, studySets.id))
      .where(eq(studySets.userId, userId))
      .orderBy(asc(cards.setId), asc(cards.position))
      .then((rows) => rows.map((r) => r.card)),
    db
      .select({ cardId: cardProgress.cardId, level: cardProgress.level })
      .from(cardProgress)
      .innerJoin(cards, eq(cardProgress.cardId, cards.id))
      .innerJoin(studySets, eq(cards.setId, studySets.id))
      .where(eq(studySets.userId, userId)),
    db.select({ day: studyDays.day }).from(studyDays).where(eq(studyDays.userId, userId)).orderBy(asc(studyDays.day)),
  ]);

  const levelByCard = new Map(progressRows.map((p) => [p.cardId, p.level as MasteryLevel]));
  const bySet = new Map<string, StudySet>();
  for (const s of setRows) {
    bySet.set(s.id, {
      id: s.id,
      title: s.title,
      description: s.description,
      cards: [],
      progress: {},
      pinned: s.pinned,
      bestMatchTime: s.bestMatchTimeMs ?? undefined,
      lastStudiedAt: s.lastStudiedAt?.getTime(),
      createdAt: s.createdAt.getTime(),
      updatedAt: s.updatedAt.getTime(),
    });
  }
  for (const c of cardRows) {
    const set = bySet.get(c.setId);
    if (!set) continue;
    set.cards.push({ id: c.id, term: c.term, definition: c.definition, starred: c.starred });
    const level = levelByCard.get(c.id);
    if (level !== undefined) set.progress![c.id] = level;
  }

  return { sets: [...bySet.values()], studyDays: dayRows.map((d) => d.day) };
}
