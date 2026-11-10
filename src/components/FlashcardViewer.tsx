"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { recordStudy, toggleStar } from "@/lib/store";
import type { Card, StudySet } from "@/lib/types";
import { pluralize, shuffle } from "@/lib/utils";
import { Button } from "@astryxdesign/core/Button";
import { Card as Panel } from "@astryxdesign/core/Card";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Kbd } from "@astryxdesign/core/Kbd";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Switch } from "@astryxdesign/core/Switch";
import { Icon } from "./ui";

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
      className={`flip-face ${back ? "flip-back" : ""} flex flex-col rounded-lg border border-border bg-card p-5 shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</span>
        <IconButton
          variant="ghost"
          label={card.starred ? "Unstar" : "Star"}
          aria-pressed={!!card.starred}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(card.setId, card.id);
          }}
          icon={<Icon name="star" filled={card.starred} />}
          className={`-mr-2 -mt-2 ${card.starred ? "text-warning" : ""}`}
        />
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-2 py-2 text-center">
        <p className={`${textSize(text)} font-medium leading-snug whitespace-pre-wrap break-words`}>{text}</p>
      </div>
      {hint && <p className="text-center text-xs text-secondary/70">Click or press Space to flip</p>}
    </div>
  );
}

// Key names follow Astryx Kbd's `keys` syntax.
const SHORTCUTS: [string[], string][] = [
  [["Space"], "Flip card"],
  [["left", "right"], "Previous / next (Still learning / Know when tracking)"],
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
      <Panel padding={10} className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-secondary">Round complete</p>
        <h2 className="mt-2 font-heading text-3xl font-bold">
          {tracking ? (learning.length === 0 ? "You know every card!" : "Nice progress.") : "You reviewed every card."}
        </h2>
        {tracking && total > 0 && (
          <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3">
            <div className="rounded-lg bg-success-muted p-4">
              <div className="text-3xl font-bold text-success">{known.length}</div>
              <div className="text-sm font-medium text-secondary">Know</div>
            </div>
            <div className="rounded-lg bg-warning-muted p-4">
              <div className="text-3xl font-bold text-warning">{learning.length}</div>
              <div className="text-sm font-medium text-secondary">Still learning</div>
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {tracking && learning.length > 0 && (
            <Button variant="primary" label={`Keep reviewing ${pluralize(learning.length, "term")}`} onClick={() => restart({ ids: learning })} />
          )}
          <Button variant="secondary" label="Restart flashcards" icon={<Icon name="rotate" className="size-4" />} onClick={() => restart()} />
          <Button href={`/sets/${set.id}/learn`} variant="ghost" label="Try Learn mode →" />
        </div>
      </Panel>
    );
  }

  if (!card) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-12 text-center text-secondary">
        {starredOnly ? (
          <>
            No starred cards.{" "}
            <Button
              variant="ghost"
              size="sm"
              label="Study all cards"
              onClick={() => {
                setStarredOnly(false);
                restart({ starredOnly: false });
              }}
            />
          </>
        ) : (
          "This set has no cards yet."
        )}
      </div>
    );
  }

  const back: Side = front === "term" ? "definition" : "term";
  const label = (s: Side) => (s === "term" ? "Term" : "Definition");
  // Toolbar labels collapse to icons on phones; `label` stays the accessible name.
  const short = (text: string) => <span className="hidden sm:inline">{text}</span>;

  return (
    <div ref={wrapRef} className="fs-wrap">
      {tracking && (
        <div className="mb-4 flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2 text-warning">
            <span className="grid min-w-8 place-items-center rounded-md border border-warning px-2 py-0.5">{learning.length}</span>
            Still learning
          </span>
          <span className="flex items-center gap-2 text-success">
            Know
            <span className="grid min-w-8 place-items-center rounded-md border border-success px-2 py-0.5">{known.length}</span>
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
            <Button
              size="sm"
              variant={showSettings ? "secondary" : "ghost"}
              label="Study options"
              aria-expanded={showSettings}
              icon={<Icon name="settings" className="size-4" />}
              onClick={() => setShowSettings((s) => !s)}
            >
              {short("Options")}
            </Button>
          )}
          <Button
            size="sm"
            variant={shuffled ? "secondary" : "ghost"}
            label={shuffled ? "Shuffled" : "Shuffle"}
            tooltip="Shuffle (S)"
            aria-pressed={shuffled}
            icon={<Icon name="shuffle" className="size-4" />}
            onClick={toggleShuffle}
          >
            {short(shuffled ? "Shuffled" : "Shuffle")}
          </Button>
        </div>

        {tracking ? (
          <div className="flex items-center gap-3">
            <IconButton
              size="lg"
              label="Still learning"
              tooltip="Still learning (←)"
              icon={<Icon name="x" className="size-5" />}
              onClick={() => mark(false)}
              className="border-2 border-warning text-warning"
            />
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
              {safeIndex + 1} / {deck.length}
            </span>
            <IconButton
              size="lg"
              label="Know"
              tooltip="Know (→)"
              icon={<Icon name="check" className="size-5" />}
              onClick={() => mark(true)}
              className="border-2 border-success text-success"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <IconButton
              size="lg"
              label="Previous card"
              tooltip="Previous (←)"
              icon={<Icon name="left" />}
              onClick={prev}
              isDisabled={safeIndex === 0}
            />
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
              {safeIndex + 1} / {deck.length}
            </span>
            <IconButton
              size="lg"
              label="Next card"
              tooltip="Next (→)"
              icon={<Icon name="right" />}
              onClick={next}
              isDisabled={compact && safeIndex === deck.length - 1}
            />
          </div>
        )}

        <div className="relative flex justify-end gap-1">
          <IconButton
            size="sm"
            variant={showKeys ? "secondary" : "ghost"}
            label="Keyboard shortcuts (?)"
            aria-expanded={showKeys}
            icon={<Icon name="help" className="size-4" />}
            onClick={() => setShowKeys((s) => !s)}
          />
          <Button
            size="sm"
            variant="ghost"
            label={compact ? "Expand" : "Fullscreen"}
            tooltip="Fullscreen (F)"
            icon={<Icon name="expand" className="size-4" />}
            onClick={toggleFullscreen}
          >
            {short(compact ? "Expand" : "Fullscreen")}
          </Button>
          {showKeys && (
            <div className="absolute bottom-12 right-0 z-30 w-72 rounded-lg border border-border bg-popover p-4 text-left shadow-lg">
              <div className="mb-2 text-sm font-semibold">Keyboard shortcuts</div>
              <ul className="space-y-1.5 text-sm text-secondary">
                {SHORTCUTS.map(([keys, desc]) => (
                  <li key={desc} className="flex items-center gap-3">
                    <span className="flex w-14 shrink-0 gap-1">
                      {keys.map((k) => (
                        <Kbd key={k} keys={k} />
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
        <div className="mx-auto mt-4 h-0.5 max-w-xs overflow-hidden rounded-full bg-track" aria-hidden="true">
          <div className="h-full bg-secondary/40 transition-all" style={{ width: `${((safeIndex + 1) / deck.length) * 100}%` }} />
        </div>
      )}

      {!compact && showSettings && (
        <Panel padding={5} className="mt-6 grid gap-4 sm:grid-cols-3">
          <Switch
            label="Track progress"
            description="Sort cards into Know / Still learning"
            value={tracking}
            onChange={(v) => {
              setTracking(v);
              restart();
            }}
          />
          <Switch
            label={`Starred only (${starredCount})`}
            description="Study just the cards you starred"
            value={starredOnly}
            isDisabled={starredCount === 0 && !starredOnly}
            disabledMessage="Star some cards first"
            onChange={(v) => {
              setStarredOnly(v);
              restart({ starredOnly: v });
            }}
          />
          <div>
            <div className="mb-2 text-sm font-semibold" aria-hidden="true">
              Front of card
            </div>
            <SegmentedControl
              label="Front of card"
              size="sm"
              value={front}
              onChange={(v) => {
                setFront(v as Side);
                setFlipped(false);
              }}
            >
              <SegmentedControlItem value="term" label="Term" />
              <SegmentedControlItem value="definition" label="Definition" />
            </SegmentedControl>
          </div>
        </Panel>
      )}
    </div>
  );
}
