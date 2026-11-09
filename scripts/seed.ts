/**
 * Inserts the sample sets. Safe to re-run: existing sets (by id) are left untouched.
 * Usage: npm run db:seed
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cards, studySets } from "../src/db/schema";
import { SEED_SETS } from "../src/lib/seed";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  let added = 0;
  await db.transaction(async (tx) => {
    for (const set of SEED_SETS) {
      const inserted = await tx
        .insert(studySets)
        .values({
          id: set.id,
          title: set.title,
          description: set.description,
          createdAt: new Date(set.createdAt),
          updatedAt: new Date(set.updatedAt),
        })
        .onConflictDoNothing()
        .returning({ id: studySets.id });
      if (inserted.length === 0) continue;
      added++;
      await tx.insert(cards).values(
        set.cards.map((c, position) => ({ id: c.id, setId: set.id, position, term: c.term, definition: c.definition })),
      );
    }
  });
  console.log(`Seeded ${added} new sample set(s); ${SEED_SETS.length - added} already existed.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
