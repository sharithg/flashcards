/**
 * Gives the data created before accounts existed (owner 'unclaimed', set by migration 0001) to a user.
 * Usage: pnpm db:claim <clerk_user_id>
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { studyDays, studySets } from "../src/db/schema";

const UNCLAIMED = "unclaimed";

async function main() {
  const userId = process.argv[2];
  if (!userId?.startsWith("user_")) {
    console.error("Usage: pnpm db:claim <clerk_user_id>   (find it in the Clerk Dashboard → Users)");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const { sets, days } = await db.transaction(async (tx) => {
    const sets = await tx
      .update(studySets)
      .set({ userId })
      .where(eq(studySets.userId, UNCLAIMED))
      .returning({ id: studySets.id });
    // Days the user already has would collide with the composite key, so insert-and-ignore instead of updating.
    const old = await tx.delete(studyDays).where(eq(studyDays.userId, UNCLAIMED)).returning({ day: studyDays.day });
    if (old.length) await tx.insert(studyDays).values(old.map((d) => ({ userId, day: d.day }))).onConflictDoNothing();
    return { sets: sets.length, days: old.length };
  });
  console.log(`Gave ${sets} set(s) and ${days} study day(s) to ${userId}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
