"use client";

import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { togglePin, useHydrated, useSets, useStudyDays } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { masteryCounts, pluralize, relativeTime, streakFrom } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ButtonLink, Icon, IconButton, MasteryBar } from "./common";

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
        <h1 className="text-3xl font-bold sm:text-4xl">Your library</h1>
        {sets !== null && sets.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatTile
              icon={streak > 0 ? <Flame className="size-5" /> : <Sparkles className="size-5" />}
              tone="bg-warn-soft text-warn"
              title={streak > 0 ? `${streak}-day streak` : "Start a streak"}
              hint={studiedToday ? "You studied today. Nice." : streak > 0 ? "Study today to keep it going" : "Study a little every day"}
            />
            <StatTile
              icon={<Icon name="learn" />}
              tone="bg-violet-soft text-violet"
              title={`${pluralize(toLearn, "term")} to learn`}
              hint={`across ${pluralize(sets.length, "set")}`}
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sets and terms"
            aria-label="Search sets"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger aria-label="Sort sets" className="min-w-44">
            <span className="text-muted-foreground">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" position="popper">
            {(Object.keys(SORTS) as Sort[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORTS[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sets === null ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-52 rounded-md" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed bg-card p-12 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-md border bg-muted">
            <Icon name="cards" className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold">No study sets yet</h2>
          <p className="mt-1 text-muted-foreground">Create your first set of flashcards to get started.</p>
          <ButtonLink href="/create" className="mt-6">
            <Icon name="plus" className="size-4" /> Create a set
          </ButtonLink>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">No sets match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map((s) => (
            <SetCard key={s.id} set={s} />
          ))}
          <Link
            href="/create?import"
            className="flex min-h-52 flex-col items-center justify-center gap-1 rounded-md border border-dashed p-6 text-center text-muted-foreground transition-colors outline-none hover:border-foreground/40 hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60"
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

function StatTile({ icon, tone, title, hint }: { icon: ReactNode; tone: string; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-md ${tone}`}>{icon}</span>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function SetCard({ set }: { set: StudySet }) {
  const hydrated = useHydrated();
  const counts = masteryCounts(set);
  const action = nextAction(set);
  return (
    <div className="group relative flex flex-col rounded-md border bg-card p-5 transition-colors hover:border-foreground/40">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-lg leading-snug font-bold">
            {/* Stretched link: the whole card opens the set; inner controls sit above it. */}
            <Link
              href={`/sets/${set.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/60 group-hover:underline group-hover:decoration-foreground/30 group-hover:underline-offset-4"
            >
              {set.title}
            </Link>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {pluralize(set.cards.length, "term")}
            {hydrated && ` · ${relativeTime(set.lastStudiedAt)}`}
          </p>
        </div>
        <IconButton
          label={set.pinned ? "Unpin set" : "Pin set to top"}
          size="icon-sm"
          onClick={() => togglePin(set.id)}
          aria-pressed={!!set.pinned}
          className={`relative z-10 -mt-1 -mr-2 ${set.pinned ? "text-brand" : "text-muted-foreground opacity-70 hover:opacity-100"}`}
        >
          <Icon name="pin" filled={set.pinned} className="size-4" />
        </IconButton>
      </div>
      {set.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{set.description}</p>}
      <div className="mt-auto pt-5">
        <MasteryBar counts={counts} legend />
        <Link
          href={action.href}
          className="relative z-10 mt-4 flex items-center justify-between rounded-md border bg-muted/60 px-3 py-2 text-sm font-semibold transition-colors outline-none hover:border-primary-edge hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          {action.label}
          <Icon name="right" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
