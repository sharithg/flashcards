"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { recordStudy, toggleStar } from "@/lib/store";
import type { Card, StudySet } from "@/lib/types";
import { pluralize, shuffle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Eyebrow, Icon, IconButton, Kbd } from "./common";

type Side = "term" | "definition";
type DeckCard = Card & { setId: string };

function textSize(text: string) {
  if (text.length > 160) return "text-lg sm:text-xl";
  if (text.length > 80) return "text-xl sm:text-2xl";
  if (text.length > 30) return "text-2xl sm:text-3xl";
  if (text.length > 14) return "text-3xl sm:text-4xl";
  return "text-4xl sm:text-5xl";
}

function Face({ card, side, label, back, hint }: { card: DeckCard; side: Side; label: string; back?: boolean; hint?: boolean }) {
  const text = side === "term" ? card.term : card.definition;
  return (
    <div
      className={`flip-face ${back ? "flip-back" : ""} flex flex-col rounded-md border bg-card p-5 shadow-[0_4px_0_0_var(--border)]`}
    >
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <IconButton
          label={card.starred ? "Unstar" : "Star"}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(card.setId, card.id);
          }}
          size="icon-sm"
          className={`-mt-1.5 -mr-2 ${card.starred ? "text-warn hover:text-warn" : "text-muted-foreground"}`}
        >
          <Icon name="star" filled={card.starred} className="size-4" />
        </IconButton>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-2 py-2 text-center">
        <p className={`${textSize(text)} font-medium leading-snug whitespace-pre-wrap break-words`}>{text}</p>
      </div>
      {hint && <p className="text-center text-xs text-muted-foreground">Click or press Space to flip</p>}
    </div>
  );
}

const SHORTCUTS: [string[], string][] = [
  [["Space"], "Flip card"],
  [["←", "→"], "Previous / next (Still learning / Know when tracking)"],
  [["S"], "Shuffle on / off"],
  [["F"], "Fullscreen"],
  [["?"], "Show / hide shortcuts"],
];

export function FlashcardViewer({ set, compact = false }: { set: StudySet; compact?: boolean }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<string[]>(() => set.cards.map((c) => c.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hasFlipped, setHasFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [front, setFront] = useState<Side>("term");
  const [tracking, setTracking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [learning, setLearning] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const byId = useMemo(() => new Map(set.cards.map((c) => [c.id, c])), [set.cards]);
  const deck: DeckCard[] = order.flatMap((id) => {
    const c = byId.get(id);
    return c ? [{ ...c, setId: set.id }] : [];
  });
  const starredCount = set.cards.filter((c) => c.starred).length;
  const safeIndex = Math.min(index, Math.max(deck.length - 1, 0));
  const card = deck[safeIndex];

  function flip() {
    setFlipped((f) => !f);
    setHasFlipped(true);
  }

  function restart(opts: { shuffled?: boolean; starredOnly?: boolean; ids?: string[] } = {}) {
    const doShuffle = opts.shuffled ?? shuffled;
    const onlyStarred = opts.starredOnly ?? starredOnly;
    let ids = opts.ids ?? set.cards.filter((c) => !onlyStarred || c.starred).map((c) => c.id);
    if (doShuffle) ids = shuffle(ids);
    setOrder(ids);
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setLearning([]);
    setDone(false);
  }

  function toggleShuffle() {
    setShuffled(!shuffled);
    restart({ shuffled: !shuffled });
  }

  function toggleFullscreen() {
    if (compact) return router.push(`/sets/${set.id}/flashcards`);
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  }

  function next() {
    if (safeIndex < deck.length - 1) {
      setIndex(safeIndex + 1);
      setFlipped(false);
    } else if (!compact) {
      setDone(true);
      recordStudy(set.id);
    }
  }

  function prev() {
    if (safeIndex > 0) {
      setIndex(safeIndex - 1);
      setFlipped(false);
    }
  }

  function mark(knewIt: boolean) {
    if (!card) return;
    const id = card.id;
    setKnown((k) => (knewIt ? [...k.filter((x) => x !== id), id] : k.filter((x) => x !== id)));
    setLearning((l) => (knewIt ? l.filter((x) => x !== id) : [...l.filter((x) => x !== id), id]));
    next();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable]');
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") return setShowKeys((s) => !s);
      if (done) return;
      // Let Space activate a focused button/checkbox instead of flipping (the card itself is fine).
      const onControl = t.closest("button, input, a") && !t.classList.contains("flip-scene");
      const k = e.key.toLowerCase();
      if ((e.key === " " && !onControl) || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") {
        if (tracking) mark(true);
        else next();
      } else if (e.key === "ArrowLeft") {
        if (tracking) mark(false);
        else prev();
      } else if (k === "s") {
        toggleShuffle();
      } else if (k === "f") {
        toggleFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (done) {
    const total = known.length + learning.length;
    return (
      <div className="rounded-md border bg-card p-8 text-center sm:p-12">
        <Eyebrow className="text-brand">Round complete</Eyebrow>
        <h2 className="mt-2 text-3xl font-bold">
          {tracking ? (learning.length === 0 ? "You know every card!" : "Nice progress.") : "You reviewed every card."}
        </h2>
        {tracking && total > 0 && (
          <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3">
            <div className="rounded-md border border-good/30 bg-good-soft p-4">
              <div className="text-3xl font-bold text-good">{known.length}</div>
              <div className="text-sm font-medium text-muted-foreground">Know</div>
            </div>
            <div className="rounded-md border border-warn/30 bg-warn-soft p-4">
              <div className="text-3xl font-bold text-warn">{learning.length}</div>
              <div className="text-sm font-medium text-muted-foreground">Still learning</div>
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {tracking && learning.length > 0 && (
            <Button onClick={() => restart({ ids: learning })}>Keep reviewing {pluralize(learning.length, "term")}</Button>
          )}
          <Button variant="secondary" onClick={() => restart()}>
            <Icon name="rotate" className="size-4" /> Restart flashcards
          </Button>
          <Button asChild variant="link">
            <Link href={`/sets/${set.id}/learn`}>Try Learn mode →</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
        {starredOnly ? (
          <>
            No starred cards.{" "}
            <Button
              variant="link"
              onClick={() => {
                setStarredOnly(false);
                restart({ starredOnly: false });
              }}
            >
              Study all cards
            </Button>
          </>
        ) : (
          "This set has no cards yet."
        )}
      </div>
    );
  }

  const back: Side = front === "term" ? "definition" : "term";
  const label = (s: Side) => (s === "term" ? "Term" : "Definition");
  return (
    <div ref={wrapRef} className="fs-wrap">
      {tracking && (
        <div className="mb-4 flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2 text-warn">
            <span className="grid min-w-8 place-items-center rounded-md border border-warn px-2 py-0.5">{learning.length}</span>
            Still learning
          </span>
          <span className="flex items-center gap-2 text-good">
            Know
            <span className="grid min-w-8 place-items-center rounded-md border border-good px-2 py-0.5">{known.length}</span>
          </span>
        </div>
      )}

      <div
        key={card.id + front}
        className={`flip-scene w-full cursor-pointer select-none ${compact ? "h-60 sm:h-64" : "h-72 sm:h-80"}`}
        onClick={flip}
        role="button"
        tabIndex={0}
        aria-label={flipped ? "Show front" : "Show back"}
        aria-live="polite"
        onKeyDown={(e) => {
          if (e.key === "Enter") flip();
        }}
      >
        <div className={`flip-inner ${flipped ? "is-flipped" : ""}`}>
          <Face card={card} side={front} label={label(front)} hint={!hasFlipped} />
          <Face card={card} side={back} label={label(back)} back />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-1">
          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings((s) => !s)}
              aria-expanded={showSettings}
              title="Study options"
            >
              <Icon name="settings" className="size-4" />
              <span className="hidden sm:inline">Options</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={toggleShuffle} aria-pressed={shuffled} title="Shuffle (S)">
            <Icon name="shuffle" className="size-4" />
            <span className="hidden sm:inline">{shuffled ? "Shuffled" : "Shuffle"}</span>
          </Button>
        </div>

        {tracking ? (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => mark(false)}
              aria-label="Still learning"
              title="Still learning (←)"
              className="border-warn/60 text-warn hover:bg-warn-soft"
            >
              <Icon name="x" className="size-5" />
            </Button>
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
              {safeIndex + 1} / {deck.length}
            </span>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => mark(true)}
              aria-label="Know"
              title="Know (→)"
              className="border-good/60 text-good hover:bg-good-soft"
            >
              <Icon name="check" className="size-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon-lg" onClick={prev} disabled={safeIndex === 0} aria-label="Previous card" title="Previous (←)">
              <Icon name="left" />
            </Button>
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
              {safeIndex + 1} / {deck.length}
            </span>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={next}
              disabled={compact && safeIndex === deck.length - 1}
              aria-label="Next card"
              title="Next (→)"
            >
              <Icon name="right" />
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-1">
          <Popover open={showKeys} onOpenChange={setShowKeys}>
            <PopoverTrigger asChild>
              <IconButton label="Keyboard shortcuts (?)" size="icon-sm" className="text-muted-foreground">
                <Icon name="help" className="size-4" />
              </IconButton>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-72">
              <div className="mb-2 text-sm font-bold">Keyboard shortcuts</div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {SHORTCUTS.map(([keys, desc]) => (
                  <li key={desc} className="flex items-center gap-3">
                    <span className="flex w-14 shrink-0 gap-1">
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                    {desc}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} title="Fullscreen (F)">
            <Icon name="expand" className="size-4" />
            <span className="hidden sm:inline">{compact ? "Expand" : "Fullscreen"}</span>
          </Button>
        </div>
      </div>

      {!compact && (
        <div className="mx-auto mt-4 h-1 max-w-xs overflow-hidden rounded-sm bg-muted" aria-hidden="true">
          <div className="h-full bg-primary transition-all" style={{ width: `${((safeIndex + 1) / deck.length) * 100}%` }} />
        </div>
      )}

      {!compact && showSettings && (
        <div className="mt-6 grid gap-5 rounded-md border bg-card p-5 sm:grid-cols-3">
          <Toggle
            id="fc-tracking"
            label="Track progress"
            hint="Sort cards into Know / Still learning"
            checked={tracking}
            onChange={(v) => {
              setTracking(v);
              restart();
            }}
          />
          <Toggle
            id="fc-starred"
            label={`Starred only (${starredCount})`}
            hint="Study just the cards you starred"
            checked={starredOnly}
            disabled={starredCount === 0 && !starredOnly}
            onChange={(v) => {
              setStarredOnly(v);
              restart({ starredOnly: v });
            }}
          />
          <div>
            <div className="text-sm font-semibold">Front of card</div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={front}
              onValueChange={(v) => {
                if (!v) return;
                setFront(v as Side);
                setFlipped(false);
              }}
              aria-label="Front of card"
              className="mt-2"
            >
              <ToggleGroupItem value="term">Term</ToggleGroupItem>
              <ToggleGroupItem value="definition">Definition</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${disabled ? "opacity-50" : ""}`}>
      <Label htmlFor={id} className="flex flex-col items-start gap-0.5">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
      </Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}
