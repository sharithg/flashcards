"use client";

import Link from "next/link";
import { useState } from "react";
import { togglePin, useHydrated, useSets, useStudyDays } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { masteryCounts, pluralize, relativeTime, streakFrom } from "@/lib/utils";
import { ButtonLink, Icon, MasteryBar } from "./ui";

type Sort = "recent" | "alpha" | "least";

const SORTS: Record<Sort, { label: string; fn: (a: StudySet, b: StudySet) => number }> = {
  recent: {
    label: "Recently studied",
    fn: (a, b) => (b.lastStudiedAt ?? b.updatedAt) - (a.lastStudiedAt ?? a.updatedAt),
  },
  alpha: { label: "A–Z", fn: (a, b) => a.title.localeCompare(b.title) },
  least: {
    label: "Least mastered",
    fn: (a, b) => masteryCounts(a).mastered / (a.cards.length || 1) - masteryCounts(b).mastered / (b.cards.length || 1),
  },
};

function nextAction(set: StudySet): { label: string; href: string } {
  const c = masteryCounts(set);
  if (c.mastered === c.total) return { label: "Review with a test", href: `/sets/${set.id}/test` };
  if (c.mastered + c.learning === 0) return { label: `Start learning ${pluralize(c.total, "term")}`, href: `/sets/${set.id}/learn` };
  return { label: `Continue learning · ${c.total - c.mastered} left`, href: `/sets/${set.id}/learn` };
}

export function Library() {
  const sets = useSets();
  const days = useStudyDays();
  const hydrated = useHydrated();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const q = query.trim().toLowerCase();
  const filtered = (sets ?? [])
    .filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.cards.some((c) => c.term.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q)),
    )
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || SORTS[sort].fn(a, b));

  // "Today" depends on the viewer's clock and time zone, so only compute it in the browser.
  const { streak, studiedToday } = hydrated && days ? streakFrom(days) : { streak: 0, studiedToday: false };
  const toLearn = (sets ?? []).reduce((n, s) => n + s.cards.length - masteryCounts(s).mastered, 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6">
      <div className="pt-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your library</h1>
        {sets !== null && sets.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <span className="text-2xl" aria-hidden="true">{streak > 0 ? "🔥" : "✨"}</span>
              <div>
                <div className="font-bold">{streak > 0 ? `${streak}-day streak` : "Start a streak"}</div>
                <div className="text-xs text-muted">
                  {studiedToday ? "You studied today. Nice." : streak > 0 ? "Study today to keep it going" : "Study a little every day"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <span className="grid size-9 place-items-center rounded-lg bg-warn-soft text-warn">
                <Icon name="learn" />
              </span>
              <div>
                <div className="font-bold">{pluralize(toLearn, "term")} to learn</div>
                <div className="text-xs text-muted">across {pluralize(sets.length, "set")}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 basis-60">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sets and terms"
            aria-label="Search sets"
            className="h-10 w-full rounded-lg border border-line bg-surface pl-10 pr-4 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface pl-3 text-sm">
          <span className="text-muted">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-full rounded-lg bg-transparent pr-2 font-semibold outline-none"
          >
            {(Object.keys(SORTS) as Sort[]).map((k) => (
              <option key={k} value={k}>
                {SORTS[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sets === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-line p-12 text-center">
          <h2 className="text-xl font-bold">No study sets yet</h2>
          <p className="mt-1 text-muted">Create your first set of flashcards to get started.</p>
          <ButtonLink href="/create" className="mt-6">
            <Icon name="plus" className="size-4" /> Create a set
          </ButtonLink>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-muted">No sets match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map((s) => (
            <SetCard key={s.id} set={s} />
          ))}
          <Link
            href="/create?import"
            className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line p-6 text-center text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="plus" className="size-6" />
            <span className="mt-1 font-bold">New set</span>
            <span className="text-sm">Paste a list from a doc or spreadsheet to import it</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function SetCard({ set }: { set: StudySet }) {
  const hydrated = useHydrated();
  const counts = masteryCounts(set);
  const action = nextAction(set);
  return (
    <div className="group relative flex flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition-all hover:border-accent hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-lg font-bold">
            {/* Stretched link: the whole card opens the set; inner controls sit above it. */}
            <Link href={`/sets/${set.id}`} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-accent group-hover:text-accent">
              {set.title}
            </Link>
          </h2>
          <p className="mt-1 text-xs text-muted">
            {pluralize(set.cards.length, "term")}
            {hydrated && ` · ${relativeTime(set.lastStudiedAt)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => togglePin(set.id)}
          aria-pressed={!!set.pinned}
          aria-label={set.pinned ? "Unpin set" : "Pin set to top"}
          title={set.pinned ? "Unpin" : "Pin to top"}
          className={`relative z-10 -mr-2 -mt-1 grid size-9 place-items-center rounded-lg transition-colors hover:bg-surface-2 ${
            set.pinned ? "text-accent" : "text-muted opacity-60 hover:opacity-100"
          }`}
        >
          <Icon name="pin" filled={set.pinned} className="size-4" />
        </button>
      </div>
      {set.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{set.description}</p>}
      <div className="mt-auto pt-5">
        <MasteryBar counts={counts} />
        <p className="mt-2 text-xs text-muted">
          <span className="font-semibold text-good">{counts.mastered} mastered</span> ·{" "}
          <span className="font-semibold text-warn">{counts.learning} learning</span> · {counts.fresh} new
        </p>
        <Link
          href={action.href}
          className="relative z-10 mt-4 flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-ink"
        >
          {action.label}
          <Icon name="right" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
