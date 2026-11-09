"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { recordStudy, toggleStar } from "@/lib/store";
import type { Card, StudySet } from "@/lib/types";
import { pluralize, shuffle } from "@/lib/utils";
import { Button, Icon, IconButton, Kbd } from "./ui";

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
      className={`flip-face ${back ? "flip-back" : ""} flex flex-col rounded-xl border border-line bg-surface p-5 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)]`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        <IconButton
          label={card.starred ? "Unstar" : "Star"}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(card.setId, card.id);
          }}
          className={`-mr-2 -mt-2 ${card.starred ? "text-warn hover:text-warn" : ""}`}
        >
          <Icon name="star" filled={card.starred} />
        </IconButton>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-2 py-2 text-center">
        <p className={`${textSize(text)} font-medium leading-snug whitespace-pre-wrap break-words`}>{text}</p>
      </div>
      {hint && <p className="text-center text-xs text-muted/70">Click or press Space to flip</p>}
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
      <div className="rounded-xl border border-line bg-surface p-8 text-center sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Round complete</p>
        <h2 className="mt-2 text-3xl font-bold">
          {tracking ? (learning.length === 0 ? "You know every card!" : "Nice progress.") : "You reviewed every card."}
        </h2>
        {tracking && total > 0 && (
          <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3">
            <div className="rounded-lg bg-good-soft p-4">
              <div className="text-3xl font-bold text-good">{known.length}</div>
              <div className="text-sm font-medium text-muted">Know</div>
            </div>
            <div className="rounded-lg bg-warn-soft p-4">
              <div className="text-3xl font-bold text-warn">{learning.length}</div>
              <div className="text-sm font-medium text-muted">Still learning</div>
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
          <Link href={`/sets/${set.id}/learn`} className="inline-flex h-11 items-center px-5 text-sm font-semibold text-accent hover:underline">
            Try Learn mode →
          </Link>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="rounded-xl border border-dashed border-line p-12 text-center text-muted">
        {starredOnly ? (
          <>
            No starred cards.{" "}
            <button
              className="font-semibold text-accent hover:underline"
              onClick={() => {
                setStarredOnly(false);
                restart({ starredOnly: false });
              }}
            >
              Study all cards
            </button>
          </>
        ) : (
          "This set has no cards yet."
        )}
      </div>
    );
  }

  const back: Side = front === "term" ? "definition" : "term";
  const label = (s: Side) => (s === "term" ? "Term" : "Definition");
  const navBtn =
    "grid size-11 place-items-center rounded-lg border border-line bg-surface transition-colors hover:bg-surface-2 disabled:opacity-40";
  const toolBtn = (active: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors ${
      active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
    }`;

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

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-1">
          {!compact && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              aria-expanded={showSettings}
              className={toolBtn(showSettings)}
              title="Study options"
            >
              <Icon name="settings" className="size-4" />
              <span className="hidden sm:inline">Options</span>
            </button>
          )}
          <button onClick={toggleShuffle} aria-pressed={shuffled} className={toolBtn(shuffled)} title="Shuffle (S)">
            <Icon name="shuffle" className="size-4" />
            <span className="hidden sm:inline">{shuffled ? "Shuffled" : "Shuffle"}</span>
          </button>
        </div>

        {tracking ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => mark(false)}
              aria-label="Still learning"
              title="Still learning (←)"
              className="grid size-11 place-items-center rounded-lg border-2 border-warn text-warn transition-colors hover:bg-warn-soft"
            >
              <Icon name="x" className="size-5" />
            </button>
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
              {safeIndex + 1} / {deck.length}
            </span>
            <button
              onClick={() => mark(true)}
              aria-label="Know"
              title="Know (→)"
              className="grid size-11 place-items-center rounded-lg border-2 border-good text-good transition-colors hover:bg-good-soft"
            >
              <Icon name="check" className="size-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={prev} disabled={safeIndex === 0} aria-label="Previous card" title="Previous (←)" className={navBtn}>
              <Icon name="left" />
            </button>
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
              {safeIndex + 1} / {deck.length}
            </span>
            <button
              onClick={next}
              disabled={compact && safeIndex === deck.length - 1}
              aria-label="Next card"
              title="Next (→)"
              className={navBtn}
            >
              <Icon name="right" />
            </button>
          </div>
        )}

        <div className="relative flex justify-end gap-1">
          <IconButton label="Keyboard shortcuts (?)" onClick={() => setShowKeys((s) => !s)} className={showKeys ? "bg-surface-2 text-ink" : ""}>
            <Icon name="help" />
          </IconButton>
          <button onClick={toggleFullscreen} className={toolBtn(false)} title="Fullscreen (F)">
            <Icon name="expand" className="size-4" />
            <span className="hidden sm:inline">{compact ? "Expand" : "Fullscreen"}</span>
          </button>
          {showKeys && (
            <div className="absolute bottom-12 right-0 z-30 w-72 rounded-lg border border-line bg-surface p-4 text-left shadow-lg">
              <div className="mb-2 text-sm font-semibold">Keyboard shortcuts</div>
              <ul className="space-y-1.5 text-sm text-muted">
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
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mx-auto mt-4 h-0.5 max-w-xs overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <div className="h-full bg-muted/40 transition-all" style={{ width: `${((safeIndex + 1) / deck.length) * 100}%` }} />
        </div>
      )}

      {!compact && showSettings && (
        <div className="mt-6 grid gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-3">
          <Toggle
            label="Track progress"
            hint="Sort cards into Know / Still learning"
            checked={tracking}
            onChange={(v) => {
              setTracking(v);
              restart();
            }}
          />
          <Toggle
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
            <div className="mt-2 inline-flex rounded-lg bg-surface-2 p-1 text-sm font-semibold">
              {(["term", "definition"] as const).map((s) => (
                <button
                  key={s}
                  aria-pressed={front === s}
                  onClick={() => {
                    setFront(s);
                    setFlipped(false);
                  }}
                  className={`rounded-md px-3 py-1 capitalize ${front === s ? "bg-surface shadow-sm" : "text-muted"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-start justify-between gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
