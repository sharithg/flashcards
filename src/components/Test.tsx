"use client";

import { useState } from "react";
import { recordStudy } from "@/lib/store";
import type { AnswerWith, Card, StudySet } from "@/lib/types";
import { answerOf, distractors, isCorrectAnswer, promptOf, sample, shuffle } from "@/lib/utils";
import { ModeShell } from "./ModeShell";
import { Button } from "@astryxdesign/core/Button";
import { Card as Panel } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Icon } from "./ui";

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
        <Panel padding={8} maxWidth={512} className="mx-auto">
          <h2 className="font-heading text-2xl font-bold">Set up your test</h2>
          <div className="mt-6 space-y-6">
            <NumberInput
              label="Questions"
              description={`Up to ${set.cards.length}`}
              min={1}
              max={set.cards.length}
              value={cfg.count}
              onChange={(n) => setCfg({ ...cfg, count: Math.max(1, Math.min(set.cards.length, n || 1)) })}
              width={160}
            />
            <div>
              <div className="mb-2 text-sm font-semibold" aria-hidden="true">
                Answer with
              </div>
              <SegmentedControl label="Answer with" value={cfg.answerWith} onChange={(v) => setCfg({ ...cfg, answerWith: v as AnswerWith })}>
                <SegmentedControlItem value="definition" label="Definition" />
                <SegmentedControlItem value="term" label="Term" />
              </SegmentedControl>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold">Question types</legend>
              <div className="mt-2 space-y-2">
                {(Object.keys(TYPE_LABELS) as QType[]).map((t) => {
                  const on = cfg.types.includes(t);
                  return (
                    <CheckboxInput
                      key={t}
                      label={TYPE_LABELS[t]}
                      value={on}
                      isDisabled={on && cfg.types.length === 1}
                      disabledMessage="Keep at least one question type"
                      onChange={() => setCfg({ ...cfg, types: on ? cfg.types.filter((x) => x !== t) : [...cfg.types, t] })}
                    />
                  );
                })}
              </div>
            </fieldset>
          </div>
          <Button variant="primary" size="lg" label="Start test" width="100%" className="mt-8" onClick={() => start()} />
        </Panel>
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
        <Panel padding={8} className="mb-8 flex flex-col items-center gap-6 sm:flex-row">
          <div
            className="grid size-28 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--color-success) ${pct * 3.6}deg, var(--color-error-muted) 0)` }}
          >
            <div className="grid size-22 place-items-center rounded-full bg-card text-2xl font-bold">{pct}%</div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-heading text-2xl font-bold">
              {pct === 100 ? "Perfect score!" : pct >= 80 ? "Great job!" : pct >= 50 ? "Getting there." : "Keep practicing."}
            </h2>
            <p className="mt-1 text-secondary">
              {score} correct · {questions.length - score} incorrect
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" label="Retake test" onClick={() => start()} />
            <Button variant="secondary" label="New settings" onClick={() => setQuestions(null)} />
          </div>
        </Panel>
      )}

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const showHeader = i === 0 || questions[i - 1].type !== q.type;
          return (
            <li key={i}>
              {showHeader && <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-secondary first:mt-0">{TYPE_LABELS[q.type]}</h3>}
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
          <p className="text-sm text-secondary">
            {answeredCount} of {questions.length} answered
          </p>
          <Button
            variant="primary"
            size="lg"
            label="Submit test"
            onClick={() => {
              setSubmitted(true);
              recordStudy(set.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
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
    let style = picked ? "border-accent bg-accent-muted" : "border-border hover:border-border-strong";
    if (graded) {
      if (isRight) style = "border-success bg-success-muted";
      else if (picked) style = "border-error bg-error-muted";
      else style = "border-border opacity-50";
    }
    return (
      <button
        key={val}
        disabled={graded}
        onClick={() => onChange(val)}
        aria-pressed={picked}
        className={`rounded-lg border-2 p-4 text-left font-medium whitespace-pre-wrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default ${style}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`rounded-lg border bg-card p-6 sm:p-8 ${
        graded ? (result ? "border-success" : "border-error") : "border-border"
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-secondary">
        <span>{promptLabel}</span>
        <span className="flex items-center gap-2">
          {graded &&
            (result ? (
              <span className="flex items-center gap-1 text-success"><Icon name="check" className="size-4" /> Correct</span>
            ) : (
              <span className="flex items-center gap-1 text-error"><Icon name="x" className="size-4" /> Incorrect</span>
            ))}
          {n} of {total}
        </span>
      </div>
      <p className="mt-3 text-xl font-medium whitespace-pre-wrap">{promptOf(q.card, answerWith)}</p>

      {q.type === "tf" && (
        <>
          <div className="mt-5 rounded-md bg-gray-subtle p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary">{answerWith}</div>
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
          <TextInput
            label={`Answer for question ${n}`}
            isLabelHidden
            size="lg"
            width="100%"
            value={value ?? ""}
            isReadOnly={graded}
            onChange={onChange}
            placeholder="Type the answer"
            autoComplete="off"
            status={graded ? { type: result ? "success" : "error" } : undefined}
          />
          {graded && !result && (
            <div className="mt-3 rounded-md bg-success-muted p-4">
              <div className="text-xs font-semibold text-success">Correct answer</div>
              <div className="mt-1 font-medium whitespace-pre-wrap">{expected}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
