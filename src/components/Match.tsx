"use client";

import { useEffect, useRef, useState } from "react";
import { recordMatchTime } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { formatTime, sample, shuffle } from "@/lib/utils";
import { ModeShell } from "./ModeShell";
import { Button } from "@/components/ui/button";
import { Eyebrow, Icon } from "./common";

const PAIRS = 6;
const PENALTY_MS = 1000;
const now = () => Date.now();

type Tile = { key: string; cardId: string; text: string };

export function Match({ set }: { set: StudySet }) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ time: number; best: boolean } | null>(null);
  const startRef = useRef(0);
  const penaltyRef = useRef(0);
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => setElapsed(now() - startRef.current + penaltyRef.current), 100);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => () => clearTimeout(wrongTimer.current), []);

  function start() {
    const cards = sample(set.cards, PAIRS);
    setTiles(
      shuffle(
        cards.flatMap((c) => [
          { key: c.id + ":t", cardId: c.id, text: c.term },
          { key: c.id + ":d", cardId: c.id, text: c.definition },
        ]),
      ),
    );
    setMatched(new Set());
    setSelected(null);
    setWrong([]);
    setElapsed(0);
    setResult(null);
    startRef.current = now();
    penaltyRef.current = 0;
    setPhase("playing");
  }

  function pick(tile: Tile) {
    if (matched.has(tile.key) || wrong.length) return;
    if (!selected) return setSelected(tile.key);
    if (selected === tile.key) return setSelected(null);

    const other = tiles.find((t) => t.key === selected)!;
    setSelected(null);
    if (other.cardId === tile.cardId) {
      const next = new Set(matched).add(tile.key).add(other.key);
      setMatched(next);
      if (next.size === tiles.length) {
        const time = now() - startRef.current + penaltyRef.current;
        setElapsed(time);
        setResult({ time, best: recordMatchTime(set.id, time) });
        setPhase("done");
      }
    } else {
      penaltyRef.current += PENALTY_MS;
      setWrong([tile.key, other.key]);
      wrongTimer.current = setTimeout(() => setWrong([]), 450);
    }
  }

  const timer = (
    <span className="rounded-md border bg-card px-3 py-1 font-mono text-sm font-semibold tabular-nums">{formatTime(elapsed)}</span>
  );

  return (
    <ModeShell set={set} mode="match" toolbar={phase === "playing" ? timer : undefined}>
      {phase === "ready" && (
        <div className="mx-auto max-w-lg rounded-md border bg-card p-8 text-center sm:p-12">
          <div className="mx-auto grid size-16 place-items-center rounded-md border border-rose/30 bg-rose-soft text-rose">
            <Icon name="match" className="size-8" />
          </div>
          <h2 className="mt-5 text-3xl font-bold">Ready to play?</h2>
          <p className="mt-2 text-muted-foreground">
            Match each term with its definition as fast as you can. Wrong matches add {PENALTY_MS / 1000} second to your time.
          </p>
          {set.bestMatchTime !== undefined && (
            <p className="mt-4 text-sm font-semibold">Your best: {formatTime(set.bestMatchTime)}</p>
          )}
          <Button size="lg" className="mt-8" onClick={start}>
            Start game
          </Button>
        </div>
      )}

      {phase === "playing" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.key);
            const isSelected = selected === tile.key;
            const isWrong = wrong.includes(tile.key);
            return (
              <button
                key={tile.key}
                onClick={() => pick(tile)}
                disabled={isMatched}
                aria-pressed={isSelected}
                className={`flex min-h-32 items-center justify-center rounded-md border-[1.5px] p-4 text-center font-medium break-words transition-all duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/60 ${
                  isMatched
                    ? "pointer-events-none scale-90 border-good bg-good-soft opacity-0"
                    : isWrong
                      ? "animate-shake border-bad bg-bad-soft"
                      : isSelected
                        ? "-translate-y-0.5 border-primary-edge bg-warn-soft shadow-[0_3px_0_0_var(--primary-base)]"
                        : "border-border bg-card hover:border-foreground/40"
                }`}
              >
                <span className={tile.text.length > 60 ? "text-sm" : ""}>{tile.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {phase === "done" && result && (
        <div className="mx-auto max-w-lg rounded-md border bg-card p-8 text-center sm:p-12">
          <Eyebrow className="text-brand">{result.best ? "New personal best!" : "Nice matching"}</Eyebrow>
          <div className="mt-2 font-mono text-6xl font-bold tabular-nums">{formatTime(result.time)}</div>
          {!result.best && set.bestMatchTime !== undefined && (
            <p className="mt-3 text-muted-foreground">Your best is {formatTime(set.bestMatchTime)}</p>
          )}
          <Button size="lg" className="mt-8" onClick={start}>
            Play again
          </Button>
        </div>
      )}
    </ModeShell>
  );
}
