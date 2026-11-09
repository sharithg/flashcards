import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

export const studySets = pgTable("study_sets", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  pinned: boolean("pinned").notNull().default(false),
  bestMatchTimeMs: integer("best_match_time_ms"),
  lastStudiedAt: timestamp("last_studied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => studySets.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    term: text("term").notNull(),
    definition: text("definition").notNull(),
    starred: boolean("starred").notNull().default(false),
  },
  (t) => [index("cards_set_position_idx").on(t.setId, t.position)],
);

export const cardProgress = pgTable(
  "card_progress",
  {
    cardId: text("card_id")
      .primaryKey()
      .references(() => cards.id, { onDelete: "cascade" }),
    /** 0 = new, 1 = learning, 2 = mastered */
    level: smallint("level").notNull(),
  },
  (t) => [check("card_progress_level_range", sql`${t.level} between 0 and 2`)],
);

/** Local calendar days (as reported by the client) on which the user studied. */
export const studyDays = pgTable("study_days", {
  day: date("day", { mode: "string" }).primaryKey(),
});
