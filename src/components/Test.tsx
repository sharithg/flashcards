"use client";

import { useState } from "react";
import { recordStudy } from "@/lib/store";
import type { AnswerWith, Card, StudySet } from "@/lib/types";
import { answerOf, distractors, isCorrectAnswer, promptOf, sample, shuffle } from "@/lib/utils";
import { ModeShell } from "./ModeShell";
import { Button, Icon } from "./ui";

type QType = "tf" | "mc" | "written";
const TYPE_LABELS: Record<QType, string> = { tf: "True / False", mc: "Multiple choice", written: "Written" };

type Question =
  | { type: "tf"; card: Card; shown: string; isTrue: boolean }
  | { type: "mc"; card: Card; choices: string[] }
  | { type: "written"; card: Card };

type Config = { count: number; types: QType[]; answerWith: AnswerWith };

function buildTest(cards: Card[], cfg: Config): Question[] {
  const chosen = sample(cards, cfg.count);
  const types = shuffle(cfg.types);
  const qs: Question[] = chosen.map((card, i) => {
    const type = types[i % types.length];
    if (type === "tf") {
      const wrong = distractors(cards, card, cfg.answerWith, 1)[0];
      const isTrue = !wrong || Math.random() < 0.5;
      return { type, card, isTrue, shown: isTrue ? answerOf(card, cfg.answerWith) : wrong };
    }
    if (type === "mc") {
      return { type, card, choices: shuffle([answerOf(card, cfg.answerWith), ...distractors(cards, card, cfg.answerWith, 3)]) };
    }
    return { type, card };
  });
  const order: QType[] = ["tf", "mc", "written"];
  return qs.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}

function grade(q: Question, given: string | undefined, answerWith: AnswerWith): boolean {
  if (given === undefined) return false;
  const expected = answerOf(q.card, answerWith);
  if (q.type === "tf") return (given === "true") === q.isTrue;
  if (q.type === "mc") return given === expected;
  return isCorrectAnswer(given, expected);
}

export function Test({ set }: { set: StudySet }) {
  const [cfg, setCfg] = useState<Config>({
    count: Math.min(set.cards.length, 20),
    types: ["tf", "mc", "written"],
    answerWith: "definition",
  });
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function start(c = cfg) {
    setQuestions(buildTest(set.cards, c));
    setAnswers({});
    setSubmitted(false);
    window.scrollTo({ top: 0 });
  }

  if (!questions) {
    return (
      <ModeShell set={set} mode="test">
        <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Set up your test</h2>
          <div className="mt-6 space-y-6">
            <label className="flex items-center justify-between gap-4">
              <span className="font-semibold">Questions <span className="font-normal text-muted">(max {set.cards.length})</span></span>
              <input
                type="number"
                min={1}
                max={set.cards.length}
                value={cfg.count}
                onChange={(e) => setCfg({ ...cfg, count: Math.max(1, Math.min(set.cards.length, Number(e.target.value) || 1)) })}
                className="w-20 rounded-xl border border-line bg-bg px-3 py-2 text-center font-semibold"
              />
            </label>
            <div>
              <div className="font-semibold">Answer with</div>
              <div className="mt-2 inline-flex rounded-lg bg-surface-2 p-1 text-sm font-semibold">
                {(["definition", "term"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setCfg({ ...cfg, answerWith: a })}
                    className={`rounded-md px-4 py-1.5 capitalize ${cfg.answerWith === a ? "bg-surface shadow-sm" : "text-muted"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <fieldset>
              <legend className="font-semibold">Question types</legend>
              <div className="mt-2 space-y-2">
                {(Object.keys(TYPE_LABELS) as QType[]).map((t) => {
                  const on = cfg.types.includes(t);
                  return (
                    <label key={t} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={on && cfg.types.length === 1}
                        onChange={() => setCfg({ ...cfg, types: on ? cfg.types.filter((x) => x !== t) : [...cfg.types, t] })}
                        className="size-4 accent-accent"
                      />
                      {TYPE_LABELS[t]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
          <Button size="lg" className="mt-8 w-full" onClick={() => start()}>
            Start test
          </Button>
        </div>
      </ModeShell>
    );
  }

  const results = questions.map((q, i) => grade(q, answers[i], cfg.answerWith));
  const score = results.filter(Boolean).length;
  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length;
  const pct = Math.round((score / questions.length) * 100);

  return (
    <ModeShell set={set} mode="test">
      {submitted && (
        <div className="mb-8 flex flex-col items-center gap-6 rounded-xl border border-line bg-surface p-6 sm:flex-row sm:p-8">
          <div
            className="grid size-28 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--good) ${pct * 3.6}deg, var(--bad-soft) 0)` }}
          >
            <div className="grid size-22 place-items-center rounded-full bg-surface text-2xl font-bold">{pct}%</div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold">
              {pct === 100 ? "Perfect score!" : pct >= 80 ? "Great job!" : pct >= 50 ? "Getting there." : "Keep practicing."}
            </h2>
            <p className="mt-1 text-muted">
              {score} correct · {questions.length - score} incorrect
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => start()}>Retake test</Button>
            <Button variant="secondary" onClick={() => setQuestions(null)}>
              New settings
            </Button>
          </div>
        </div>
      )}

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const showHeader = i === 0 || questions[i - 1].type !== q.type;
          return (
            <li key={i}>
              {showHeader && <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-muted first:mt-0">{TYPE_LABELS[q.type]}</h3>}
              <QuestionCard
                n={i + 1}
                total={questions.length}
                q={q}
                answerWith={cfg.answerWith}
                value={answers[i]}
                onChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))}
                result={submitted ? results[i] : undefined}
              />
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">
            {answeredCount} of {questions.length} answered
          </p>
          <Button
            size="lg"
            onClick={() => {
              setSubmitted(true);
              recordStudy(set.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Submit test
          </Button>
        </div>
      )}
    </ModeShell>
  );
}

function QuestionCard({
  n,
  total,
  q,
  answerWith,
  value,
  onChange,
  result,
}: {
  n: number;
  total: number;
  q: Question;
  answerWith: AnswerWith;
  value: string | undefined;
  onChange: (v: string) => void;
  result: boolean | undefined;
}) {
  const graded = result !== undefined;
  const expected = answerOf(q.card, answerWith);
  const promptLabel = answerWith === "definition" ? "Term" : "Definition";

  const option = (val: string, label: string, isRight: boolean) => {
    const picked = value === val;
    let style = picked ? "border-accent bg-accent-soft" : "border-line hover:border-accent";
    if (graded) {
      if (isRight) style = "border-good bg-good-soft";
      else if (picked) style = "border-bad bg-bad-soft";
      else style = "border-line opacity-50";
    }
    return (
      <button
        key={val}
        disabled={graded}
        onClick={() => onChange(val)}
        aria-pressed={picked}
        className={`rounded-lg border-2 p-4 text-left font-medium whitespace-pre-wrap transition-colors disabled:cursor-default ${style}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`rounded-xl border bg-surface p-6 sm:p-8 ${
        graded ? (result ? "border-good" : "border-bad") : "border-line"
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        <span>{promptLabel}</span>
        <span className="flex items-center gap-2">
          {graded &&
            (result ? (
              <span className="flex items-center gap-1 text-good"><Icon name="check" className="size-4" /> Correct</span>
            ) : (
              <span className="flex items-center gap-1 text-bad"><Icon name="x" className="size-4" /> Incorrect</span>
            ))}
          {n} of {total}
        </span>
      </div>
      <p className="mt-3 text-xl font-medium whitespace-pre-wrap">{promptOf(q.card, answerWith)}</p>

      {q.type === "tf" && (
        <>
          <div className="mt-5 rounded-lg bg-surface-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">{answerWith}</div>
            <div className="mt-1 font-medium whitespace-pre-wrap">{q.shown}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {option("true", "True", q.isTrue)}
            {option("false", "False", !q.isTrue)}
          </div>
        </>
      )}

      {q.type === "mc" && <div className="mt-6 grid gap-3 sm:grid-cols-2">{q.choices.map((c) => option(c, c, c === expected))}</div>}

      {q.type === "written" && (
        <div className="mt-6">
          <input
            value={value ?? ""}
            disabled={graded}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type the answer"
            aria-label={`Answer for question ${n}`}
            autoComplete="off"
            className={`w-full rounded-lg border-2 bg-bg px-4 py-3 text-lg outline-none focus:border-accent ${
              graded ? (result ? "border-good" : "border-bad") : "border-line"
            }`}
          />
          {graded && !result && (
            <div className="mt-3 rounded-lg bg-good-soft p-4">
              <div className="text-xs font-semibold text-good">Correct answer</div>
              <div className="mt-1 font-medium whitespace-pre-wrap">{expected}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
