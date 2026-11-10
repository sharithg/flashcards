"use client";

import Link from "next/link";
import { useState } from "react";
import { togglePin, useHydrated, useSets, useStudyDays } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { masteryCounts, pluralize, relativeTime, streakFrom } from "@/lib/utils";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon as AstryxIcon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Icon, MasteryBar } from "./ui";

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
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Your library</h1>
        {sets !== null && sets.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Card padding={3} className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{streak > 0 ? "🔥" : "✨"}</span>
              <div>
                <div className="font-bold">{streak > 0 ? `${streak}-day streak` : "Start a streak"}</div>
                <div className="text-xs text-secondary">
                  {studiedToday ? "You studied today. Nice." : streak > 0 ? "Study today to keep it going" : "Study a little every day"}
                </div>
              </div>
            </Card>
            <Card padding={3} className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-yellow-subtle text-yellow-vivid">
                <Icon name="learn" />
              </span>
              <div>
                <div className="font-bold">{pluralize(toLearn, "term")} to learn</div>
                <div className="text-xs text-secondary">across {pluralize(sets.length, "set")}</div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <TextInput
            type="search"
            label="Search sets"
            isLabelHidden
            value={query}
            onChange={setQuery}
            placeholder="Search sets and terms"
            startIcon={<AstryxIcon icon="search" />}
            hasClear
            width="100%"
          />
        </div>
        <Selector
          label="Sort by"
          isLabelHidden
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={(Object.keys(SORTS) as Sort[]).map((k) => ({ value: k, label: SORTS[k].label }))}
        />
      </div>

      {sets === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} index={i} height={192} />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <Card padding={10} className="mt-6">
          <EmptyState
            headingLevel={2}
            title="No study sets yet"
            description="Create your first set of flashcards to get started."
            actions={<Button href="/create" variant="primary" label="Create a set" icon={<Icon name="plus" className="size-4" />} />}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-secondary">No sets match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map((s) => (
            <SetCard key={s.id} set={s} />
          ))}
          <Link
            href="/create?import"
            className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong p-6 text-center text-secondary transition-colors hover:border-accent hover:text-primary"
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
    <Card padding={5} className="group relative flex flex-col border border-border transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-heading text-lg font-bold">
            {/* Stretched link: the whole card opens the set; inner controls sit above it. */}
            <Link href={`/sets/${set.id}`} className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-accent group-hover:underline">
              {set.title}
            </Link>
          </h2>
          <p className="mt-1 text-xs text-secondary">
            {pluralize(set.cards.length, "term")}
            {hydrated && ` · ${relativeTime(set.lastStudiedAt)}`}
          </p>
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => togglePin(set.id)}
          aria-pressed={!!set.pinned}
          label={set.pinned ? "Unpin set" : "Pin set to top"}
          tooltip={set.pinned ? "Unpin" : "Pin to top"}
          icon={<Icon name="pin" filled={set.pinned} className="size-4" />}
          className={`relative z-10 -mr-2 -mt-1 ${set.pinned ? "" : "opacity-60 hover:opacity-100"}`}
        />
      </div>
      {set.description && <p className="mt-2 line-clamp-2 text-sm text-secondary">{set.description}</p>}
      <div className="mt-auto pt-5">
        <MasteryBar counts={counts} />
        <p className="mt-2 text-xs text-secondary">
          <span className="font-semibold text-success">{counts.mastered} mastered</span> ·{" "}
          <span className="font-semibold text-warning">{counts.learning} learning</span> · {counts.fresh} new
        </p>
        <Button href={action.href} variant="secondary" label={action.label} width="100%" className="relative z-10 mt-4" />
      </div>
    </Card>
  );
}
