"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { deleteSet, toggleStar, useHydrated } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { masteryCounts, pluralize, relativeTime } from "@/lib/utils";
import { FlashcardViewer } from "./FlashcardViewer";
import { MODES, type ModeSlug } from "./ModeShell";
import { Icon, MasteryBar, MasteryLegend } from "./ui";

const MODE_STYLE: Record<ModeSlug, { icon: string; hint: string }> = {
  flashcards: { icon: "bg-blue-subtle text-blue-vivid", hint: "Flip through cards" },
  learn: { icon: "bg-purple-subtle text-purple-vivid", hint: "Adaptive practice" },
  test: { icon: "bg-teal-subtle text-teal-vivid", hint: "Check what you know" },
  match: { icon: "bg-pink-subtle text-pink-vivid", hint: "Race the clock" },
};

function SetActions({ set }: { set: StudySet }) {
  const router = useRouter();
  return (
    <MoreMenu
      alignment="end"
      items={[
        { label: "Edit set", icon: <Icon name="edit" className="size-4" />, href: `/sets/${set.id}/edit` },
        { type: "divider" },
        {
          label: "Delete set",
          variant: "destructive",
          icon: <Icon name="trash" className="size-4" />,
          onClick: () => {
            if (confirm(`Delete "${set.title}" and all ${set.cards.length} cards? This can't be undone.`)) {
              deleteSet(set.id);
              router.push("/");
            }
          },
        },
      ]}
    />
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
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{set.title}</h1>
          {set.description && <p className="mt-2 text-secondary">{set.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button href={`/sets/${set.id}/edit`} variant="secondary" size="sm" label="Edit" icon={<Icon name="edit" className="size-4" />} />
          <SetActions set={set} />
        </div>
      </div>

      <Card padding={4} className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-48 flex-1">
          <MasteryBar counts={counts} />
          <MasteryLegend counts={counts} className="mt-2" />
        </div>
        <span className="text-xs text-secondary">{hydrated ? relativeTime(set.lastStudiedAt) : ""}</span>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODES.map((m) => {
          const isRec = m.slug === recommended;
          return (
            <Link
              key={m.slug}
              href={`/sets/${set.id}/${m.slug}`}
              className={`relative flex items-center gap-3 rounded-lg border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                isRec ? "border-accent ring-1 ring-accent" : "border-border hover:border-border-strong"
              }`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-md ${MODE_STYLE[m.slug].icon}`}>
                <Icon name={m.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{m.label}</span>
                <span className="block truncate text-xs text-secondary">{isRec ? "Suggested next" : MODE_STYLE[m.slug].hint}</span>
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
          <h2 className="font-heading text-xl font-bold">Terms in this set ({set.cards.length})</h2>
          <SegmentedControl label="Filter terms" size="sm" value={filter} onChange={(v) => setFilter(v as "all" | "starred")}>
            <SegmentedControlItem value="all" label="All" />
            <SegmentedControlItem value="starred" label={`Starred (${starred.length})`} />
          </SegmentedControl>
        </div>
        {shown.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border-strong p-8 text-center text-secondary">
            Star terms to collect the tricky ones here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {shown.map((c) => {
              const lv = progress[c.id] ?? 0;
              const status = lv === 2 ? "Mastered" : lv === 1 ? "Learning" : "New";
              return (
                <li key={c.id} className="flex items-start gap-3 p-4 sm:items-center">
                  <span
                    role="img"
                    aria-label={status}
                    title={status}
                    className={`mt-2 size-2 shrink-0 rounded-full sm:mt-0 ${lv === 2 ? "bg-success" : lv === 1 ? "bg-warning" : "bg-border-strong"}`}
                  />
                  <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[1fr_2fr] sm:gap-6">
                    <span className="font-semibold break-words whitespace-pre-wrap sm:border-r sm:border-border sm:pr-6">{c.term}</span>
                    <span className="break-words whitespace-pre-wrap text-secondary sm:text-primary">{c.definition}</span>
                  </div>
                  <div className="flex shrink-0">
                    <IconButton
                      variant="ghost"
                      label={c.starred ? "Unstar" : "Star"}
                      aria-pressed={!!c.starred}
                      onClick={() => toggleStar(set.id, c.id)}
                      icon={<Icon name="star" filled={c.starred} className="size-4" />}
                      className={c.starred ? "text-warning" : ""}
                    />
                    <IconButton
                      variant="ghost"
                      href={`/sets/${set.id}/edit#card-${c.id}`}
                      label={`Edit ${c.term}`}
                      icon={<Icon name="edit" className="size-4" />}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-sm text-secondary">
          {pluralize(set.cards.length, "term")} ·{" "}
          <Link href={`/sets/${set.id}/edit`} className="font-semibold text-accent underline-offset-2 hover:underline">
            Add or remove terms
          </Link>
        </p>
      </section>
    </div>
  );
}
