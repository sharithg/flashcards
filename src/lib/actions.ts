"use server";

import { and, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cardProgress, cards, studyDays, studySets } from "@/db/schema";
import { requireUserId } from "./auth";

/*
 * Mutations, each scoped to the signed-in Clerk user. Sets are owned directly (study_sets.user_id);
 * cards and progress are reached only through a set the caller owns.
 *
 * The client store applies each change optimistically and then calls these; they don't trigger a
 * route refresh because the client cache is already up to date.
 */

const id = z.string().min(1).max(64);
const day = z.iso.date(); // YYYY-MM-DD, the client's local day
const level = z.union([z.literal(0), z.literal(1), z.literal(2)]);

const setInput = z.object({
  id,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000),
  cards: z
    .array(
      z.object({
        id,
        term: z.string().trim().min(1).max(2000),
        definition: z.string().trim().min(1).max(5000),
        starred: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(2000)
    .refine((cs) => new Set(cs.map((c) => c.id)).size === cs.length, "Card ids must be unique"),
  createdAt: z.number().int().positive(),
});

export async function saveSetAction(input: z.input<typeof setInput>) {
  const userId = await requireUserId();
  const set = setInput.parse(input);
  const ids = set.cards.map((c) => c.id);

  await db.transaction(async (tx) => {
    // Set ids are global primary keys; refuse to overwrite someone else's set.
    const [existing] = await tx.select({ userId: studySets.userId }).from(studySets).where(eq(studySets.id, set.id));
    if (existing && existing.userId !== userId) throw new Error(`Set id ${set.id} is taken`);

    // Card ids are global primary keys; refuse to move a card out of another set.
    const clash = await tx
      .select({ id: cards.id })
      .from(cards)
      .where(and(inArray(cards.id, ids), ne(cards.setId, set.id)))
      .limit(1);
    if (clash.length) throw new Error(`Card id ${clash[0].id} belongs to another set`);

    await tx
      .insert(studySets)
      .values({ id: set.id, userId, title: set.title, description: set.description, createdAt: new Date(set.createdAt) })
      .onConflictDoUpdate({
        target: studySets.id,
        set: { title: set.title, description: set.description, updatedAt: sql`now()` },
        setWhere: eq(studySets.userId, userId),
      });

    // Removed cards (and, via cascade, their progress) go away.
    await tx.delete(cards).where(and(eq(cards.setId, set.id), notInArray(cards.id, ids)));

    await tx
      .insert(cards)
      .values(
        set.cards.map((c, position) => ({
          id: c.id,
          setId: set.id,
          position,
          term: c.term,
          definition: c.definition,
          starred: c.starred ?? false,
        })),
      )
      .onConflictDoUpdate({
        target: cards.id,
        set: {
          position: sql`excluded.position`,
          term: sql`excluded.term`,
          definition: sql`excluded.definition`,
          starred: sql`excluded.starred`,
        },
      });
  });
}

/** Matches the given set only if the caller owns it. */
function ownSet(userId: string, setId: string) {
  return and(eq(studySets.id, setId), eq(studySets.userId, userId));
}

/** Ids of every set the caller owns, as a subquery. */
function ownSetIds(userId: string) {
  return db.select({ id: studySets.id }).from(studySets).where(eq(studySets.userId, userId));
}

export async function deleteSetAction(setId: string) {
  const userId = await requireUserId();
  await db.delete(studySets).where(ownSet(userId, id.parse(setId)));
}

export async function setPinnedAction(setId: string, pinned: boolean) {
  const userId = await requireUserId();
  await db
    .update(studySets)
    .set({ pinned: z.boolean().parse(pinned) })
    .where(ownSet(userId, id.parse(setId)));
}

export async function setStarredAction(cardId: string, starred: boolean) {
  const userId = await requireUserId();
  await db
    .update(cards)
    .set({ starred: z.boolean().parse(starred) })
    .where(and(eq(cards.id, id.parse(cardId)), inArray(cards.setId, ownSetIds(userId))));
}

async function markStudied(tx: Pick<typeof db, "update" | "insert">, userId: string, setId: string, today: string) {
  const touched = await tx
    .update(studySets)
    .set({ lastStudiedAt: sql`now()` })
    .where(ownSet(userId, setId))
    .returning({ id: studySets.id });
  if (!touched.length) throw new Error("Set not found");
  await tx.insert(studyDays).values({ userId, day: today }).onConflictDoNothing();
}

export async function recordStudyAction(setId: string, today: string) {
  const userId = await requireUserId();
  const s = id.parse(setId);
  const d = day.parse(today);
  await db.transaction((tx) => markStudied(tx, userId, s, d));
}

export async function setMasteryAction(input: { setId: string; cardId: string; level: 0 | 1 | 2; today: string }) {
  const userId = await requireUserId();
  const p = z.object({ setId: id, cardId: id, level, today: day }).parse(input);
  await db.transaction(async (tx) => {
    // Only touch cards that really belong to the given set, and only if the caller owns that set.
    const owned = await tx
      .select({ id: cards.id })
      .from(cards)
      .innerJoin(studySets, eq(cards.setId, studySets.id))
      .where(and(eq(cards.id, p.cardId), ownSet(userId, p.setId)));
    if (!owned.length) throw new Error("Card not found in set");
    await tx
      .insert(cardProgress)
      .values({ cardId: p.cardId, level: p.level })
      .onConflictDoUpdate({ target: cardProgress.cardId, set: { level: p.level } });
    await markStudied(tx, userId, p.setId, p.today);
  });
}

export async function resetProgressAction(setId: string) {
  const userId = await requireUserId();
  const s = id.parse(setId);
  const ownedCards = db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(studySets, eq(cards.setId, studySets.id))
    .where(ownSet(userId, s));
  await db.delete(cardProgress).where(inArray(cardProgress.cardId, ownedCards));
}

export async function recordMatchTimeAction(setId: string, ms: number, today: string) {
  const userId = await requireUserId();
  const s = id.parse(setId);
  const t = z.number().int().positive().max(24 * 60 * 60 * 1000).parse(ms);
  const d = day.parse(today);
  await db.transaction(async (tx) => {
    await tx
      .update(studySets)
      .set({ bestMatchTimeMs: sql`least(coalesce(${studySets.bestMatchTimeMs}, ${t}), ${t})` })
      .where(ownSet(userId, s));
    await markStudied(tx, userId, s, d);
  });
}
