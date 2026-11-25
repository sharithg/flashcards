import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./index";
import { cards, studySets } from "./schema";

/* Data access for the `repaso` CLI's API (src/app/api/cli). Every query is scoped to the caller. */

export const newSetInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  cards: z
    .array(z.object({ term: z.string().trim().min(1).max(2000), definition: z.string().trim().min(1).max(5000) }))
    .min(1)
    .max(2000),
});

export async function listSets(userId: string) {
  return db
    .select({
      id: studySets.id,
      title: studySets.title,
      description: studySets.description,
      cardCount: count(cards.id),
      pinned: studySets.pinned,
      updatedAt: studySets.updatedAt,
    })
    .from(studySets)
    .leftJoin(cards, eq(cards.setId, studySets.id))
    .where(eq(studySets.userId, userId))
    .groupBy(studySets.id)
    .orderBy(desc(studySets.updatedAt));
}

export async function getSet(userId: string, setId: string) {
  const [set] = await db
    .select({
      id: studySets.id,
      title: studySets.title,
      description: studySets.description,
      pinned: studySets.pinned,
      createdAt: studySets.createdAt,
      updatedAt: studySets.updatedAt,
    })
    .from(studySets)
    .where(and(eq(studySets.id, setId), eq(studySets.userId, userId)));
  if (!set) return null;
  const rows = await db
    .select({ id: cards.id, term: cards.term, definition: cards.definition, starred: cards.starred })
    .from(cards)
    .where(eq(cards.setId, setId))
    .orderBy(asc(cards.position));
  return { ...set, cards: rows };
}

export async function createSet(userId: string, input: z.output<typeof newSetInput>) {
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(studySets).values({ id, userId, title: input.title, description: input.description });
    await tx
      .insert(cards)
      .values(
        input.cards.map((c, position) => ({ id: randomUUID(), setId: id, position, term: c.term, definition: c.definition })),
      );
  });
  return id;
}

/** True if the set existed and belonged to the caller. */
export async function deleteSet(userId: string, setId: string) {
  const deleted = await db
    .delete(studySets)
    .where(and(eq(studySets.id, setId), eq(studySets.userId, userId)))
    .returning({ id: studySets.id });
  return deleted.length > 0;
}
