"use client";

import { useState } from "react";
import { recordStudy } from "@/lib/store";
import type { AnswerWith, Card, StudySet } from "@/lib/types";
import { answerOf, distractors, isCorrectAnswer, promptOf, sample, shuffle } from "@/lib/utils";
import { ModeShell } from "./ModeShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Eyebrow, Icon } from "./common";

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
        <div className="mx-auto max-w-lg rounded-md border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Set up your test</h2>
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="test-count" className="text-[15px] font-semibold">
                Questions <span className="font-normal text-muted-foreground">(max {set.cards.length})</span>
              </Label>
              <Input
                id="test-count"
                type="number"
                min={1}
                max={set.cards.length}
                value={cfg.count}
                onChange={(e) => setCfg({ ...cfg, count: Math.max(1, Math.min(set.cards.length, Number(e.target.value) || 1)) })}
                className="w-20 text-center font-semibold"
              />
            </div>
            <div>
              <div className="font-semibold">Answer with</div>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                value={cfg.answerWith}
                onValueChange={(v) => v && setCfg({ ...cfg, answerWith: v as AnswerWith })}
                aria-label="Answer with"
                className="mt-2"
              >
                <ToggleGroupItem value="definition" className="px-4">Definition</ToggleGroupItem>
                <ToggleGroupItem value="term" className="px-4">Term</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <fieldset>
              <legend className="font-semibold">Question types</legend>
              <div className="mt-2 space-y-2.5">
                {(Object.keys(TYPE_LABELS) as QType[]).map((t) => {
                  const on = cfg.types.includes(t);
                  return (
                    <Label key={t} className="cursor-pointer text-[15px] font-normal">
                      <Checkbox
                        checked={on}
                        disabled={on && cfg.types.length === 1}
                        onCheckedChange={() => setCfg({ ...cfg, types: on ? cfg.types.filter((x) => x !== t) : [...cfg.types, t] })}
                      />
                      {TYPE_LABELS[t]}
                    </Label>
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
        <div className="mb-8 flex flex-col items-center gap-6 rounded-md border bg-card p-6 sm:flex-row sm:p-8">
          <div
            className="grid size-28 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--good) ${pct * 3.6}deg, var(--bad-soft) 0)` }}
          >
            <div className="grid size-22 place-items-center rounded-full bg-card text-2xl font-bold tabular-nums">{pct}%</div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold">
              {pct === 100 ? "Perfect score!" : pct >= 80 ? "Great job!" : pct >= 50 ? "Getting there." : "Keep practicing."}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {score} correct · {questions.length - score} incorrect
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => start()}>Retake test</Button>
            <Button variant="outline" onClick={() => setQuestions(null)}>
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
              {showHeader && <h3 className="mt-8 mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase first:mt-0">{TYPE_LABELS[q.type]}</h3>}
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
          <p className="text-sm text-muted-foreground">
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
    let style = picked ? "border-primary-edge bg-warn-soft" : "border-border hover:border-foreground/40 hover:bg-accent/40";
    if (graded) {
      if (isRight) style = "border-good bg-good-soft";
      else if (picked) style = "border-bad bg-bad-soft";
      else style = "border-border opacity-50";
    }
    return (
      <button
        key={val}
        disabled={graded}
        onClick={() => onChange(val)}
        aria-pressed={picked}
        className={`rounded-md border-[1.5px] p-4 text-left font-medium whitespace-pre-wrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60 disabled:cursor-default ${style}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`rounded-md border bg-card p-6 sm:p-8 ${graded ? (result ? "border-good" : "border-bad") : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{promptLabel}</Eyebrow>
        <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tabular-nums">
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
          <div className="mt-5 rounded-md border bg-muted/60 p-4">
            <Eyebrow>{answerWith}</Eyebrow>
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
          <Input
            value={value ?? ""}
            disabled={graded}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type the answer"
            aria-label={`Answer for question ${n}`}
            autoComplete="off"
            className={`h-12 bg-background px-4 text-lg md:text-lg ${graded ? (result ? "border-good" : "border-bad") : ""}`}
          />
          {graded && !result && (
            <div className="mt-3 rounded-md border border-good/30 bg-good-soft p-4">
              <div className="text-xs font-semibold text-good">Correct answer</div>
              <div className="mt-1 font-medium whitespace-pre-wrap">{expected}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
