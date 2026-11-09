"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deleteSet, toggleStar, useHydrated } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { masteryCounts, pluralize, relativeTime } from "@/lib/utils";
import { FlashcardViewer } from "./FlashcardViewer";
import { MODES, type ModeSlug } from "./ModeShell";
import { ButtonLink, Icon, IconButton, MasteryBar, MasteryLegend } from "./ui";

const MODE_STYLE: Record<ModeSlug, { icon: string; hint: string }> = {
  flashcards: { icon: "bg-accent-soft text-accent", hint: "Flip through cards" },
  learn: { icon: "bg-violet-soft text-violet", hint: "Adaptive practice" },
  test: { icon: "bg-teal-soft text-teal", hint: "Check what you know" },
  match: { icon: "bg-rose-soft text-rose", hint: "Race the clock" },
};

function MoreMenu({ set }: { set: StudySet }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <IconButton label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="more" />
      </IconButton>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
          <Link role="menuitem" href={`/sets/${set.id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-2">
            <Icon name="edit" className="size-4" /> Edit set
          </Link>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-bad hover:bg-bad-soft"
            onClick={() => {
              setOpen(false);
              if (confirm(`Delete "${set.title}" and all ${set.cards.length} cards? This can't be undone.`)) {
                deleteSet(set.id);
                router.push("/");
              }
            }}
          >
            <Icon name="trash" className="size-4" /> Delete set
          </button>
        </div>
      )}
    </div>
  );
}

export function SetOverview({ set }: { set: StudySet }) {
  const [filter, setFilter] = useState<"all" | "starred">("all");
  const hydrated = useHydrated();
  const counts = masteryCounts(set);
  const progress = set.progress ?? {};
  const starred = set.cards.filter((c) => c.starred);
  const shown = filter === "starred" ? starred : set.cards;

  // Suggest one next step: keep learning while anything is unmastered, then test.
  const recommended: ModeSlug | null =
    counts.mastered === counts.total ? "test" : counts.learning + counts.mastered > 0 ? "learn" : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6">
      <div className="flex items-start justify-between gap-4 pt-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{set.title}</h1>
          {set.description && <p className="mt-2 text-muted">{set.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ButtonLink href={`/sets/${set.id}/edit`} variant="secondary" size="sm">
            <Icon name="edit" className="size-4" /> Edit
          </ButtonLink>
          <MoreMenu set={set} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="min-w-48 flex-1">
          <MasteryBar counts={counts} />
          <MasteryLegend counts={counts} className="mt-2" />
        </div>
        <span className="text-xs text-muted">{hydrated ? relativeTime(set.lastStudiedAt) : ""}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODES.map((m) => {
          const isRec = m.slug === recommended;
          return (
            <Link
              key={m.slug}
              href={`/sets/${set.id}/${m.slug}`}
              className={`relative flex items-center gap-3 rounded-xl border bg-surface p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isRec ? "border-accent ring-1 ring-accent" : "border-line hover:border-accent"
              }`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${MODE_STYLE[m.slug].icon}`}>
                <Icon name={m.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{m.label}</span>
                <span className="block truncate text-xs text-muted">{isRec ? "Suggested next" : MODE_STYLE[m.slug].hint}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <FlashcardViewer set={set} compact />
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Terms in this set ({set.cards.length})</h2>
          <div className="inline-flex rounded-lg bg-surface-2 p-1 text-sm font-semibold">
            {(["all", "starred"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-md px-3 py-1 ${filter === f ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                {f === "all" ? "All" : `Starred (${starred.length})`}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-muted">
            Star terms to collect the tricky ones here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {shown.map((c) => {
              const lv = progress[c.id] ?? 0;
              const status = lv === 2 ? "Mastered" : lv === 1 ? "Learning" : "New";
              return (
                <li key={c.id} className="flex items-start gap-3 p-4 sm:items-center">
                  <span
                    role="img"
                    aria-label={status}
                    title={status}
                    className={`mt-2 size-2 shrink-0 rounded-full sm:mt-0 ${lv === 2 ? "bg-good" : lv === 1 ? "bg-warn" : "bg-line"}`}
                  />
                  <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[1fr_2fr] sm:gap-6">
                    <span className="font-semibold break-words whitespace-pre-wrap sm:border-r sm:border-line sm:pr-6">{c.term}</span>
                    <span className="break-words whitespace-pre-wrap text-muted sm:text-ink">{c.definition}</span>
                  </div>
                  <div className="flex shrink-0">
                    <IconButton
                      label={c.starred ? "Unstar" : "Star"}
                      onClick={() => toggleStar(set.id, c.id)}
                      className={c.starred ? "text-warn hover:text-warn" : ""}
                    >
                      <Icon name="star" filled={c.starred} className="size-4" />
                    </IconButton>
                    <Link
                      href={`/sets/${set.id}/edit#card-${c.id}`}
                      aria-label={`Edit ${c.term}`}
                      title="Edit"
                      className="grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <Icon name="edit" className="size-4" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-sm text-muted">
          {pluralize(set.cards.length, "term")} ·{" "}
          <Link href={`/sets/${set.id}/edit`} className="font-semibold text-accent hover:underline">
            Add or remove terms
          </Link>
        </p>
      </section>
    </div>
  );
}
