"use client";

import { useEffect, useRef, useState } from "react";
import { recordMatchTime } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { formatTime, sample, shuffle } from "@/lib/utils";
import { ModeShell } from "./ModeShell";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "./ui";

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
    <span className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">{formatTime(elapsed)}</span>
  );

  return (
    <ModeShell set={set} mode="match" toolbar={phase === "playing" ? timer : undefined}>
      {phase === "ready" && (
        <Card padding={10} maxWidth={512} className="mx-auto text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-lg bg-pink-subtle text-pink-vivid">
            <Icon name="match" className="size-8" />
          </div>
          <h2 className="mt-5 font-heading text-3xl font-bold">Ready to play?</h2>
          <p className="mt-2 text-secondary">
            Match each term with its definition as fast as you can. Wrong matches add {PENALTY_MS / 1000} second to your time.
          </p>
          {set.bestMatchTime !== undefined && (
            <p className="mt-4 text-sm font-semibold">Your best: {formatTime(set.bestMatchTime)}</p>
          )}
          <Button variant="primary" size="lg" label="Start game" className="mt-8" onClick={start} />
        </Card>
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
                className={`flex min-h-32 items-center justify-center rounded-lg border-2 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent text-center font-medium break-words transition-all duration-200 ${
                  isMatched
                    ? "pointer-events-none scale-90 border-success bg-success-muted opacity-0"
                    : isWrong
                      ? "animate-shake border-error bg-error-muted"
                      : isSelected
                        ? "border-accent bg-accent-muted"
                        : "border-border bg-card hover:border-border-strong"
                }`}
              >
                <span className={tile.text.length > 60 ? "text-sm" : ""}>{tile.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {phase === "done" && result && (
        <Card padding={10} maxWidth={512} className="mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-secondary">{result.best ? "New personal best!" : "Nice matching"}</p>
          <div className="mt-2 font-mono text-6xl font-bold tabular-nums">{formatTime(result.time)}</div>
          {!result.best && set.bestMatchTime !== undefined && (
            <p className="mt-3 text-secondary">Your best is {formatTime(set.bestMatchTime)}</p>
          )}
          <Button variant="primary" size="lg" label="Play again" className="mt-8" onClick={start} />
        </Card>
      )}
    </ModeShell>
  );
}
