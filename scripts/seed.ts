/**
 * Adds the sample sets to one user's library. Safe to re-run: sets the user already has (by title)
 * are skipped. Ids are generated per user because set and card ids are global primary keys.
 * Usage: pnpm db:seed <clerk_user_id>
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cards, studySets } from "../src/db/schema";
import { SEED_SETS } from "../src/lib/seed";

async function main() {
  const userId = process.argv[2];
  if (!userId?.startsWith("user_")) {
    console.error("Usage: pnpm db:seed <clerk_user_id>   (find it in the Clerk Dashboard → Users)");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  let added = 0;
  await db.transaction(async (tx) => {
    for (const set of SEED_SETS) {
      const exists = await tx
        .select({ id: studySets.id })
        .from(studySets)
        .where(and(eq(studySets.userId, userId), eq(studySets.title, set.title)))
        .limit(1);
      if (exists.length) continue;
      const setId = randomUUID();
      await tx.insert(studySets).values({
        id: setId,
        userId,
        title: set.title,
        description: set.description,
        createdAt: new Date(set.createdAt),
        updatedAt: new Date(set.updatedAt),
      });
      await tx.insert(cards).values(
        set.cards.map((c, position) => ({
          id: randomUUID(),
          setId,
          position,
          term: c.term,
          definition: c.definition,
        })),
      );
      added++;
    }
  });
  console.log(`Seeded ${added} new sample set(s) for ${userId}; ${SEED_SETS.length - added} already existed.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
