"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteSet, toggleStar, useHydrated } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { masteryCounts, pluralize, relativeTime } from "@/lib/utils";
import { FlashcardViewer } from "./FlashcardViewer";
import { MODES, type ModeSlug } from "./ModeShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ButtonLink, Icon, IconButton, MasteryBar, MasteryLegend } from "./common";

const MODE_STYLE: Record<ModeSlug, { icon: string; hint: string }> = {
  flashcards: { icon: "bg-warn-soft text-warn", hint: "Flip through cards" },
  learn: { icon: "bg-violet-soft text-violet", hint: "Adaptive practice" },
  test: { icon: "bg-blue-soft text-blue", hint: "Check what you know" },
  match: { icon: "bg-rose-soft text-rose", hint: "Race the clock" },
};

function MoreMenu({ set }: { set: StudySet }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label="More options" variant="outline" size="icon-sm">
            <Icon name="more" className="size-4" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/sets/${set.id}/edit`}>
              <Icon name="edit" className="size-4" /> Edit set
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
            <Icon name="trash" className="size-4" /> Delete set
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{set.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the set and all {pluralize(set.cards.length, "card")}. It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteSet(set.id);
                router.push("/");
              }}
            >
              Delete set
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
          <h1 className="text-3xl font-bold sm:text-4xl">{set.title}</h1>
          {set.description && <p className="mt-2 text-muted-foreground">{set.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ButtonLink href={`/sets/${set.id}/edit`} variant="outline" size="sm">
            <Icon name="edit" className="size-4" /> Edit
          </ButtonLink>
          <MoreMenu set={set} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border bg-card px-4 py-3">
        <div className="min-w-48 flex-1">
          <MasteryBar counts={counts} />
          <MasteryLegend counts={counts} className="mt-2" />
        </div>
        <span className="text-xs text-muted-foreground">{hydrated ? relativeTime(set.lastStudiedAt) : ""}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MODES.map((m) => {
          const isRec = m.slug === recommended;
          return (
            <Link
              key={m.slug}
              href={`/sets/${set.id}/${m.slug}`}
              className={`relative flex items-center gap-3 rounded-md border bg-card p-3.5 transition-[translate,box-shadow,border-color] outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 ${
                isRec
                  ? "border-[1.5px] border-primary-edge shadow-[0_3px_0_0_var(--primary-base)]"
                  : "hover:border-foreground/40 hover:shadow-[0_3px_0_0_var(--border)]"
              }`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-md ${MODE_STYLE[m.slug].icon}`}>
                <Icon name={m.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{m.label}</span>
                <span className={`block truncate text-xs ${isRec ? "font-semibold text-brand" : "text-muted-foreground"}`}>{isRec ? "Suggested next" : MODE_STYLE[m.slug].hint}</span>
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
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={filter}
            onValueChange={(v) => v && setFilter(v as "all" | "starred")}
            aria-label="Filter terms"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="starred">Starred ({starred.length})</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {shown.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed p-8 text-center text-muted-foreground">
            Star terms to collect the tricky ones here.
          </p>
        ) : (
          <ul className="mt-4 divide-y overflow-hidden rounded-md border bg-card">
            {shown.map((c) => {
              const lv = progress[c.id] ?? 0;
              const status = lv === 2 ? "Mastered" : lv === 1 ? "Learning" : "New";
              return (
                <li key={c.id} className="flex items-start gap-3 p-4 sm:items-center">
                  <span
                    role="img"
                    aria-label={status}
                    title={status}
                    className={`mt-2 size-2 shrink-0 rounded-[2px] sm:mt-0 ${lv === 2 ? "bg-good" : lv === 1 ? "bg-primary" : "border bg-muted"}`}
                  />
                  <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[1fr_2fr] sm:gap-6">
                    <span className="font-semibold break-words whitespace-pre-wrap sm:border-r sm:pr-6">{c.term}</span>
                    <span className="break-words whitespace-pre-wrap text-muted-foreground sm:text-foreground">{c.definition}</span>
                  </div>
                  <div className="flex shrink-0">
                    <IconButton
                      label={c.starred ? "Unstar" : "Star"}
                      onClick={() => toggleStar(set.id, c.id)}
                      size="icon-sm"
                      className={c.starred ? "text-warn hover:text-warn" : "text-muted-foreground"}
                    >
                      <Icon name="star" filled={c.starred} className="size-4" />
                    </IconButton>
                    <ButtonLink
                      href={`/sets/${set.id}/edit#card-${c.id}`}
                      aria-label={`Edit ${c.term}`}
                      title="Edit"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                    >
                      <Icon name="edit" className="size-4" />
                    </ButtonLink>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {pluralize(set.cards.length, "term")} ·{" "}
          <Link href={`/sets/${set.id}/edit`} className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand">
            Add or remove terms
          </Link>
        </p>
      </section>
    </div>
  );
}
