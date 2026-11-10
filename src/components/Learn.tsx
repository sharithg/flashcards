"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resetProgress, setMastery } from "@/lib/store";
import type { AnswerWith, Card, MasteryCounts, MasteryLevel, StudySet } from "@/lib/types";
import { answerOf, checkAnswer, distractors, promptOf, shuffle, specialChars, type AnswerCheck } from "@/lib/utils";
import { Confetti } from "./Confetti";
import { ModeShell } from "./ModeShell";
import { Button } from "@astryxdesign/core/Button";
import { Card as Panel } from "@astryxdesign/core/Card";
import { Kbd } from "@astryxdesign/core/Kbd";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Icon, MasteryBar } from "./ui";

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
    <Selector
      label="Answer with"
      isLabelHidden
      size="sm"
      variant="secondary"
      value={answerWith}
      onChange={(v) => {
        const aw = v as AnswerWith;
        setAnswerWith(aw);
        if (phase === "question") startRound(levels, aw);
      }}
      options={[
        { value: "definition", label: "Answer with definition" },
        { value: "term", label: "Answer with term" },
      ]}
    />
  );

  return (
    <ModeShell set={set} mode="learn" toolbar={toolbar}>
      {celebrate && <Confetti />}
      <MasteryBar counts={counts} legend className="mb-6" />

      {phase === "complete" && (
        <Panel padding={10} className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-success-muted text-success">
            <Icon name="check" className="size-8" />
          </div>
          <h2 className="mt-5 font-heading text-3xl font-bold">You&apos;ve mastered all {cards.length} terms!</h2>
          <p className="mt-2 text-secondary">Lock it in with a practice test, or start over from scratch.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href={`/sets/${set.id}/test`} variant="primary" label="Take a practice test" />
            <Button variant="secondary" label="Reset progress" icon={<Icon name="rotate" className="size-4" />} onClick={reset} />
          </div>
        </Panel>
      )}

      {phase === "summary" && (
        <Panel padding={8}>
          {round === 0 ? (
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold">Learn {set.title}</h2>
              <p className="mx-auto mt-2 max-w-md text-secondary">
                Work through rounds of {ROUND_SIZE} terms. Answer a multiple-choice question first, then type the answer from
                memory to master it.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  label={counts.learning + counts.mastered > 0 ? "Continue learning" : "Start learning"}
                  onClick={() => startRound(levels)}
                />
                {counts.learning + counts.mastered > 0 && <Button size="lg" variant="secondary" label="Start over" onClick={reset} />}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-wider text-secondary">Round {round} complete</p>
              <h2 className="mt-1 font-heading text-2xl font-bold">
                {counts.mastered} of {cards.length} terms mastered
              </h2>
              <ul className="mt-6 divide-y divide-border">
                {roundIds.map((id) => {
                  const c = byId.get(id);
                  if (!c) return null;
                  const lv = levels[id] ?? 0;
                  return (
                    <li key={id} className="flex items-center gap-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          lv === 2 ? "bg-success-muted text-success" : lv === 1 ? "bg-warning-muted text-warning" : "bg-gray-subtle text-secondary"
                        }`}
                      >
                        {lv === 2 ? "Mastered" : lv === 1 ? "Learning" : "Not yet"}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{c.term}</span>
                      <span className="hidden min-w-0 flex-1 truncate text-secondary sm:block">{c.definition}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-8 flex justify-end">
                <Button variant="primary" size="lg" label="Continue" onClick={() => startRound(levels)} />
              </div>
            </>
          )}
        </Panel>
      )}

      {phase === "question" && question && card && (
        <Panel padding={8}>
          <div className="flex items-center justify-between text-xs font-semibold text-secondary">
            <span className="uppercase tracking-wider">{answerWith === "definition" ? "Term" : "Definition"}</span>
            <span>
              Round {round} · Question {Math.min(pos + 1, queue.length)} of {queue.length}
            </span>
          </div>
          <p className="mt-3 text-2xl font-medium whitespace-pre-wrap sm:text-3xl">{promptOf(card, answerWith)}</p>

          <div className="mt-6">
            {question.type === "mc" ? (
              <>
                <p className="mb-3 text-sm font-semibold text-secondary">
                  {feedback ? (feedback.correct ? "Nice work!" : "Not quite — you'll see this one again.") : "Choose the matching answer"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.choices.map((choice, i) => {
                    const isAnswer = choice === answerOf(card, answerWith);
                    const isPicked = feedback?.given === choice;
                    let style = "border-border hover:border-border-strong hover:bg-overlay-hover";
                    if (feedback && isAnswer) style = "border-success bg-success-muted";
                    else if (feedback && isPicked) style = "border-error bg-error-muted animate-shake";
                    else if (feedback) style = "border-border opacity-50";
                    return (
                      <button
                        key={choice + i}
                        disabled={!!feedback}
                        onClick={() => answer(choice)}
                        className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default ${style}`}
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gray-subtle text-xs font-bold text-secondary">
                          {feedback && isAnswer ? <Icon name="check" className="size-4 text-success" /> : feedback && isPicked ? <Icon name="x" className="size-4 text-error" /> : i + 1}
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
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
              <span className="hidden items-center gap-1 text-xs text-secondary sm:flex">
                Press <Kbd keys="enter" /> to continue
              </span>
              <Button variant="primary" label="Continue" onClick={continueAfterMiss} />
            </div>
          )}
        </Panel>
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
            <div className="flex items-center gap-3 rounded-lg border-2 border-success bg-success-muted p-4 font-medium">
              <Icon name="check" className="size-5 text-success" /> {feedback.given}
            </div>
            {(feedback.accentSlip || feedback.typo) && (
              <p className="rounded-lg bg-warning-muted px-4 py-3 text-sm text-primary">
                <span className="font-semibold text-warning">{feedback.accentSlip ? "Correct. Watch the accents:" : "Almost. Check the spelling:"}</span>{" "}
                <span className="font-semibold">{expected}</span>
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-secondary">
              {feedback.given ? "Not quite — you'll see this one again." : "Skipped — here's the answer."}
            </p>
            {feedback.given && (
              <div className="rounded-lg border-2 border-error bg-error-muted p-4">
                <div className="text-xs font-semibold text-error">Your answer</div>
                <div className="mt-1 font-medium">{feedback.given}</div>
              </div>
            )}
            <div className="rounded-lg border-2 border-success bg-success-muted p-4">
              <div className="text-xs font-semibold text-success">Correct answer</div>
              <div className="mt-1 font-medium whitespace-pre-wrap">{expected}</div>
            </div>
            {feedback.given && (
              <Button variant="ghost" size="sm" label="Override: I was correct" onClick={onOverride} />
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
      <TextInput
        ref={inputRef}
        label="Type the answer"
        size="lg"
        width="100%"
        hasAutoFocus
        autoComplete="off"
        autoCapitalize="off"
        hasSpellCheck={false}
        value={typed}
        onChange={setTyped}
        placeholder="Type your answer"
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
              className="grid h-8 min-w-8 place-items-center rounded-md border border-border bg-card px-2 font-medium hover:border-border-strong hover:bg-overlay-hover focus-visible:outline-2 focus-visible:outline-accent"
            >
              {ch}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <span className="mr-auto hidden items-center gap-1 text-xs text-secondary sm:flex">
          Press <Kbd keys="enter" /> to answer
        </span>
        <Button variant="ghost" label="Don't know?" onClick={() => onSubmit("")} />
        <Button
          type="submit"
          variant="primary"
          label="Answer"
          isDisabled={!typed.trim()}
          tooltip={typed.trim() ? undefined : "Type an answer first"}
        />
      </div>
    </form>
  );
}
