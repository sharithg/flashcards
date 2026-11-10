"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resetProgress, setMastery } from "@/lib/store";
import type { AnswerWith, Card, MasteryCounts, MasteryLevel, StudySet } from "@/lib/types";
import { answerOf, checkAnswer, distractors, promptOf, shuffle, specialChars, type AnswerCheck } from "@/lib/utils";
import { Confetti } from "./Confetti";
import { ModeShell } from "./ModeShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ButtonLink, Eyebrow, Icon, Kbd, MasteryBar } from "./common";

const ROUND_SIZE = 7;

type Question = { cardId: string; type: "mc" | "written"; choices: string[] };
type Feedback = ({ given: string } & AnswerCheck) | null;
type Levels = Record<string, MasteryLevel>;

function makeQuestion(card: Card, cards: Card[], level: MasteryLevel, answerWith: AnswerWith): Question {
  const type = level >= 1 || cards.length < 2 ? "written" : "mc";
  const choices = type === "mc" ? shuffle([answerOf(card, answerWith), ...distractors(cards, card, answerWith, 3)]) : [];
  return { cardId: card.id, type, choices };
}

function countLevels(cards: Card[], levels: Levels): MasteryCounts {
  const c = { fresh: 0, learning: 0, mastered: 0, total: cards.length };
  for (const card of cards) {
    const lv = levels[card.id] ?? 0;
    if (lv === 2) c.mastered++;
    else if (lv === 1) c.learning++;
    else c.fresh++;
  }
  return c;
}

export function Learn({ set }: { set: StudySet }) {
  const cards = set.cards;
  const byId = new Map(cards.map((c) => [c.id, c]));

  const [answerWith, setAnswerWith] = useState<AnswerWith>("definition");
  const [levels, setLevels] = useState<Levels>(() => ({ ...set.progress }));
  const [phase, setPhase] = useState<"question" | "summary" | "complete">("summary");
  const [round, setRound] = useState(0);
  const [roundIds, setRoundIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [typed, setTyped] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const counts = countLevels(cards, levels);
  const card = question ? byId.get(question.cardId) : undefined;
  const chars = useMemo(() => specialChars(cards.map((c) => answerOf(c, answerWith))), [cards, answerWith]);

  function startRound(lv: Levels, aw: AnswerWith = answerWith) {
    clearTimeout(advanceTimer.current);
    const remaining = cards.filter((c) => (lv[c.id] ?? 0) < 2);
    if (remaining.length === 0) {
      setCelebrate(round > 0);
      setPhase("complete");
      setQuestion(null);
      return;
    }
    // Prioritise cards already in progress so they get finished, then fill with new ones.
    const ordered = [
      ...shuffle(remaining.filter((c) => (lv[c.id] ?? 0) === 1)),
      ...shuffle(remaining.filter((c) => (lv[c.id] ?? 0) === 0)),
    ];
    const ids = ordered.slice(0, ROUND_SIZE).map((c) => c.id);
    setRoundIds(ids);
    setQueue(ids);
    setPos(0);
    setRound((r) => r + 1);
    setFeedback(null);
    setTyped("");
    const first = byId.get(ids[0])!;
    setQuestion(makeQuestion(first, cards, lv[first.id] ?? 0, aw));
    setPhase("question");
  }

  function advance(q: string[], lv: Levels, fromPos: number) {
    const nextPos = fromPos + 1;
    setFeedback(null);
    setTyped("");
    if (nextPos >= q.length) {
      setPhase("summary");
      setQuestion(null);
      return;
    }
    const nextCard = byId.get(q[nextPos]);
    if (!nextCard) return advance(q, lv, nextPos);
    setPos(nextPos);
    setQuestion(makeQuestion(nextCard, cards, lv[nextCard.id] ?? 0, answerWith));
  }

  function updateLevel(cardId: string, level: MasteryLevel): Levels {
    const next = { ...levels, [cardId]: level };
    setLevels(next);
    setMastery(set.id, cardId, level);
    return next;
  }

  function answer(given: string) {
    if (!question || !card || feedback) return;
    const expected = answerOf(card, answerWith);
    const check: AnswerCheck =
      question.type === "mc" ? { correct: given === expected, accentSlip: false, typo: false } : checkAnswer(given, expected);
    const correct = check.correct;
    const current = levels[card.id] ?? 0;
    const newLevel: MasteryLevel = correct ? (question.type === "mc" ? 1 : 2) : question.type === "mc" ? 0 : 1;
    const lv = updateLevel(card.id, Math.max(newLevel, correct ? current : 0) as MasteryLevel);
    setFeedback({ given, ...check });
    if (correct) {
      // Linger a little longer when there's a spelling/accent note to read.
      const delay = check.accentSlip || check.typo ? 2200 : 900;
      advanceTimer.current = setTimeout(() => advance(queue, lv, pos), delay);
    } else {
      // Missed cards come back at the end of the round.
      setQueue([...queue, card.id]);
    }
  }

  function continueAfterMiss() {
    advance(queue, levels, pos);
  }

  function overrideCorrect() {
    if (!card) return;
    const lv = updateLevel(card.id, 2);
    // Remove the re-queued copy we added when the answer was marked wrong.
    const q = [...queue];
    const idx = q.lastIndexOf(card.id);
    if (idx > pos) q.splice(idx, 1);
    setQueue(q);
    advance(q, lv, pos);
  }

  function reset() {
    resetProgress(set.id);
    setLevels({});
    setRound(0);
    setCelebrate(false);
    startRound({});
  }

  // Keyboard: 1-4 to pick an option, Enter to continue after a miss.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "question" || !question) return;
      if (feedback && !feedback.correct && e.key === "Enter" && !(e.target as HTMLElement).closest("input")) {
        e.preventDefault();
        continueAfterMiss();
      } else if (!feedback && question.type === "mc") {
        const n = Number(e.key);
        if (n >= 1 && n <= question.choices.length) answer(question.choices[n - 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toolbar = (
    <Select
      value={answerWith}
      onValueChange={(v) => {
        const aw = v as AnswerWith;
        setAnswerWith(aw);
        if (phase === "question") startRound(levels, aw);
      }}
    >
      <SelectTrigger size="sm" aria-label="Answer with" className="text-sm">
        <span className="text-muted-foreground">Answer with:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        <SelectItem value="definition">Definition</SelectItem>
        <SelectItem value="term">Term</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <ModeShell set={set} mode="learn" toolbar={toolbar}>
      {celebrate && <Confetti />}
      <MasteryBar counts={counts} legend className="mb-6" />

      {phase === "complete" && (
        <div className="rounded-md border bg-card p-8 text-center sm:p-12">
          <div className="mx-auto grid size-16 place-items-center rounded-md border border-good/30 bg-good-soft text-good">
            <Icon name="check" className="size-8" />
          </div>
          <h2 className="mt-5 text-3xl font-bold">You&apos;ve mastered all {cards.length} terms!</h2>
          <p className="mt-2 text-muted-foreground">Lock it in with a practice test, or start over from scratch.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={`/sets/${set.id}/test`}>Take a practice test</ButtonLink>
            <Button variant="outline" onClick={reset}>
              <Icon name="rotate" className="size-4" /> Reset progress
            </Button>
          </div>
        </div>
      )}

      {phase === "summary" && (
        <div className="rounded-md border bg-card p-6 sm:p-10">
          {round === 0 ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold">Learn {set.title}</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Work through rounds of {ROUND_SIZE} terms. Answer a multiple-choice question first, then type the answer from
                memory to master it.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => startRound(levels)}>
                  {counts.learning + counts.mastered > 0 ? "Continue learning" : "Start learning"}
                </Button>
                {counts.learning + counts.mastered > 0 && (
                  <Button size="lg" variant="outline" onClick={reset}>
                    Start over
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <Eyebrow className="text-brand">Round {round} complete</Eyebrow>
              <h2 className="mt-1 text-2xl font-bold">
                {counts.mastered} of {cards.length} terms mastered
              </h2>
              <ul className="mt-6 divide-y rounded-md border">
                {roundIds.map((id) => {
                  const c = byId.get(id);
                  if (!c) return null;
                  const lv = levels[id] ?? 0;
                  return (
                    <li key={id} className="flex items-center gap-4 px-4 py-3">
                      <Badge variant={lv === 2 ? "good" : lv === 1 ? "warn" : "secondary"} className="w-18">
                        {lv === 2 ? "Mastered" : lv === 1 ? "Learning" : "Not yet"}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate font-medium">{c.term}</span>
                      <span className="hidden min-w-0 flex-1 truncate text-muted-foreground sm:block">{c.definition}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-8 flex justify-end">
                <Button size="lg" onClick={() => startRound(levels)}>
                  Continue
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {phase === "question" && question && card && (
        <div className="rounded-md border bg-card p-6 sm:p-10">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>{answerWith === "definition" ? "Term" : "Definition"}</Eyebrow>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              Round {round} · Question {Math.min(pos + 1, queue.length)} of {queue.length}
            </span>
          </div>
          <p className="mt-3 text-2xl font-medium whitespace-pre-wrap sm:text-3xl">{promptOf(card, answerWith)}</p>

          <div className="mt-6">
            {question.type === "mc" ? (
              <>
                <p className="mb-3 text-sm font-semibold text-muted-foreground">
                  {feedback ? (feedback.correct ? "Nice work!" : "Not quite — you'll see this one again.") : "Choose the matching answer"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.choices.map((choice, i) => {
                    const isAnswer = choice === answerOf(card, answerWith);
                    const isPicked = feedback?.given === choice;
                    let style = "border-border bg-card hover:border-foreground/40 hover:bg-accent/40";
                    if (feedback && isAnswer) style = "border-good bg-good-soft";
                    else if (feedback && isPicked) style = "border-bad bg-bad-soft animate-shake";
                    else if (feedback) style = "border-border opacity-50";
                    return (
                      <button
                        key={choice + i}
                        disabled={!!feedback}
                        onClick={() => answer(choice)}
                        className={`flex items-center gap-3 rounded-md border-[1.5px] p-4 text-left font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60 disabled:cursor-default ${style}`}
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-sm border bg-muted font-mono text-xs font-bold text-muted-foreground">
                          {feedback && isAnswer ? <Icon name="check" className="size-4 text-good" /> : feedback && isPicked ? <Icon name="x" className="size-4 text-bad" /> : i + 1}
                        </span>
                        <span className="whitespace-pre-wrap">{choice}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <WrittenAnswer
                key={question.cardId + pos}
                expected={answerOf(card, answerWith)}
                typed={typed}
                setTyped={setTyped}
                feedback={feedback}
                chars={chars}
                onSubmit={answer}
                onOverride={overrideCorrect}
              />
            )}
          </div>

          {feedback && !feedback.correct && (
            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-5">
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                Press <Kbd>Enter ↵</Kbd> to continue
              </span>
              <Button onClick={continueAfterMiss}>Continue</Button>
            </div>
          )}
        </div>
      )}
    </ModeShell>
  );
}

function WrittenAnswer({
  expected,
  typed,
  setTyped,
  feedback,
  chars,
  onSubmit,
  onOverride,
}: {
  expected: string;
  typed: string;
  setTyped: (s: string) => void;
  feedback: Feedback;
  chars: string[];
  onSubmit: (given: string) => void;
  onOverride: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function insert(ch: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? typed.length;
    const end = el?.selectionEnd ?? typed.length;
    setTyped(typed.slice(0, start) + ch + typed.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + ch.length, start + ch.length);
    });
  }

  if (feedback) {
    return (
      <div className="space-y-3">
        {feedback.correct ? (
          <>
            <div className="flex items-center gap-3 rounded-md border-[1.5px] border-good bg-good-soft p-4 font-medium">
              <Icon name="check" className="size-5 text-good" /> {feedback.given}
            </div>
            {(feedback.accentSlip || feedback.typo) && (
              <p className="rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm">
                <span className="font-semibold text-warn">{feedback.accentSlip ? "Correct. Watch the accents:" : "Almost. Check the spelling:"}</span>{" "}
                <span className="font-semibold">{expected}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-muted-foreground">
              {feedback.given ? "Not quite — you'll see this one again." : "Skipped — here's the answer."}
            </p>
            {feedback.given && (
              <div className="rounded-md border-[1.5px] border-bad bg-bad-soft p-4">
                <div className="text-xs font-semibold text-bad">Your answer</div>
                <div className="mt-1 font-medium">{feedback.given}</div>
              </div>
            )}
            <div className="rounded-md border-[1.5px] border-good bg-good-soft p-4">
              <div className="text-xs font-semibold text-good">Correct answer</div>
              <div className="mt-1 font-medium whitespace-pre-wrap">{expected}</div>
            </div>
            {feedback.given && (
              <Button variant="link" size="sm" onClick={onOverride}>
                Override: I was correct
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (typed.trim()) onSubmit(typed);
      }}
    >
      <label className="mb-2 block text-sm font-semibold text-muted-foreground" htmlFor="learn-answer">
        Type the answer
      </label>
      <Input
        id="learn-answer"
        ref={inputRef}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Type your answer"
        className="h-13 bg-background px-4 text-lg md:text-lg"
      />
      {chars.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Insert special character">
          {chars.map((ch) => (
            <button
              key={ch}
              type="button"
              // Keep focus (and the caret) in the input.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(ch)}
              className="grid h-8 min-w-8 place-items-center rounded-sm border border-b-2 bg-card px-2 font-medium hover:border-foreground/40 hover:bg-accent"
            >
              {ch}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <span className="mr-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          Press <Kbd>Enter ↵</Kbd> to answer
        </span>
        <Button variant="ghost" onClick={() => onSubmit("")}>
          Don&apos;t know?
        </Button>
        <Button type="submit" disabled={!typed.trim()} title={typed.trim() ? undefined : "Type an answer first"}>
          Answer
        </Button>
      </div>
    </form>
  );
}
