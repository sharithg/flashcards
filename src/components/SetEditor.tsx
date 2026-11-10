"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveSet } from "@/lib/store";
import type { Card, StudySet } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow, Icon, IconButton } from "./common";

const blank = (id: string = uid()): Card => ({ id, term: "", definition: "" });

const TERM_SEPS = { tab: "\t", comma: ",", dash: " - " } as const;
const CARD_SEPS = { newline: "\n", semicolon: ";" } as const;

function parseImport(text: string, termSep: string, cardSep: string): Card[] {
  return text
    .split(cardSep)
    .map((line) => {
      const i = line.indexOf(termSep);
      if (i === -1) return { term: line.trim(), definition: "" };
      return { term: line.slice(0, i).trim(), definition: line.slice(i + termSep.length).trim() };
    })
    .filter((c) => c.term || c.definition)
    .map((c) => ({ id: uid(), ...c }));
}

export function SetEditor({ initial, startWithImport = false }: { initial?: StudySet; startWithImport?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cards, setCards] = useState<Card[]>(() => (initial?.cards.length ? initial.cards : [blank("new-1"), blank("new-2"), blank("new-3")]));
  const [error, setError] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(startWithImport);
  const [importText, setImportText] = useState("");
  const [termSep, setTermSep] = useState<keyof typeof TERM_SEPS>("tab");
  const [cardSep, setCardSep] = useState<keyof typeof CARD_SEPS>("newline");

  // Arriving from a term's edit button (#card-<id>): scroll to that card and focus its term.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("card-")) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center" });
    el?.querySelector("textarea")?.focus({ preventScroll: true });
  }, []);

  const imported = parseImport(importText, TERM_SEPS[termSep], CARD_SEPS[cardSep]);

  function update(id: string, patch: Partial<Card>) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function move(index: number, dir: -1 | 1) {
    setCards((cs) => {
      const next = [...cs];
      const j = index + dir;
      if (j < 0 || j >= next.length) return cs;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function addCard() {
    const c = blank();
    setCards((cs) => [...cs, c]);
    setFocusId(c.id);
  }

  function doImport() {
    if (!imported.length) return;
    setCards((cs) => [...cs.filter((c) => c.term.trim() || c.definition.trim()), ...imported]);
    setImportText("");
    setImportOpen(false);
  }

  function save() {
    const filled = cards
      .map((c) => ({
        ...c,
        // The first blank rows use fixed "new-N" ids so the page can prerender; give them real ids.
        id: c.id.startsWith("new-") ? uid() : c.id,
        term: c.term.trim(),
        definition: c.definition.trim(),
      }))
      .filter((c) => c.term || c.definition);
    if (!title.trim()) return setError("Give your set a title.");
    if (filled.length < 2) return setError("Add at least two cards.");
    if (filled.some((c) => !c.term || !c.definition)) return setError("Every card needs both a term and a definition.");

    const keep = new Set(filled.map((c) => c.id));
    const now = Date.now();
    const id = initial?.id ?? uid();
    saveSet({
      ...initial,
      id,
      title: title.trim(),
      description: description.trim(),
      cards: filled,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      progress: Object.fromEntries(Object.entries(initial?.progress ?? {}).filter(([k]) => keep.has(k))),
    });
    router.push(`/sets/${id}`);
  }

  const inputCls =
    "w-full resize-none border-0 border-b-2 border-border bg-transparent px-0 py-2 text-base outline-none field-sizing-content focus:border-primary";

  return (
    <form
      className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          save();
        }
      }}
    >
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-4 border-b border-transparent bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <h1 className="text-2xl font-bold">{initial ? "Edit set" : "Create a new study set"}</h1>
        <div className="flex gap-2">
          {initial && (
            <Button variant="outline" onClick={() => router.push(`/sets/${initial.id}`)}>
              Cancel
            </Button>
          )}
          <Button type="submit">{initial ? "Save" : "Create"}</Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-bad-soft">
          <AlertDescription className="font-semibold text-bad">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          placeholder='Enter a title, like "Biology – Chapter 22"'
          aria-label="Title"
          autoFocus={!initial && !startWithImport}
          className="h-12 px-4 text-lg font-semibold md:text-lg"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description…"
          aria-label="Description"
          rows={2}
          className="resize-none px-4 py-3"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setImportOpen((o) => !o)} aria-expanded={importOpen}>
          <Icon name="plus" className="size-4" /> Import
        </Button>
        <span className="text-sm text-muted-foreground">{cards.length} cards</span>
      </div>

      {importOpen && (
        <div className="mt-4 rounded-md border bg-card p-5">
          <div className="font-bold">Import your data</div>
          <p className="text-sm text-muted-foreground">Copy and paste from Word, Excel, Google Docs, etc.</p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            autoFocus
            placeholder={`Word 1${TERM_SEPS[termSep]}Definition 1${CARD_SEPS[cardSep]}Word 2${TERM_SEPS[termSep]}Definition 2`}
            className="mt-3 min-h-32 bg-background font-mono text-sm md:text-sm"
          />
          <div className="mt-3 flex flex-wrap items-end gap-6 text-sm">
            <Radio label="Between term and definition" value={termSep} options={["tab", "comma", "dash"]} onChange={setTermSep} />
            <Radio label="Between cards" value={cardSep} options={["newline", "semicolon"]} onChange={setCardSep} />
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={!imported.length} onClick={doImport}>
                Import {imported.length || ""} cards
              </Button>
            </div>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-4">
        {cards.map((card, i) => (
          <li key={card.id} id={`card-${card.id}`} className="scroll-mt-36 rounded-md border bg-card transition-colors focus-within:border-primary-edge">
            <div className="flex items-center justify-between border-b px-4 py-1">
              <span className="font-mono text-sm font-bold text-muted-foreground">{i + 1}</span>
              <div className="flex">
                <IconButton size="icon-sm" className="text-muted-foreground" label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <Icon name="up" className="size-4" />
                </IconButton>
                <IconButton size="icon-sm" className="text-muted-foreground" label="Move down" onClick={() => move(i, 1)} disabled={i === cards.length - 1}>
                  <Icon name="down" className="size-4" />
                </IconButton>
                <IconButton
                  size="icon-sm"
                  label="Delete card"
                  onClick={() => setCards((cs) => cs.filter((c) => c.id !== card.id))}
                  disabled={cards.length <= 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Icon name="trash" className="size-4" />
                </IconButton>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-8">
              <label className="block">
                <textarea
                  value={card.term}
                  onChange={(e) => {
                    update(card.id, { term: e.target.value });
                    setError("");
                  }}
                  autoFocus={focusId === card.id}
                  rows={1}
                  className={inputCls}
                />
                <Eyebrow className="mt-1">Term</Eyebrow>
              </label>
              <label className="block">
                <textarea
                  value={card.definition}
                  onChange={(e) => {
                    update(card.id, { definition: e.target.value });
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    // Tab out of the last definition to add another card, like a spreadsheet.
                    if (e.key === "Tab" && !e.shiftKey && i === cards.length - 1) {
                      e.preventDefault();
                      addCard();
                    }
                  }}
                  rows={1}
                  className={inputCls}
                />
                <Eyebrow className="mt-1">Definition</Eyebrow>
              </label>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={addCard}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-6 font-bold text-muted-foreground transition-colors outline-none hover:border-foreground/40 hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <Icon name="plus" /> Add card
      </button>

      <div className="mt-8 flex justify-end">
        <Button type="submit" size="lg">
          {initial ? "Save changes" : "Create set"}
        </Button>
      </div>
    </form>
  );
}

function Radio<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{label}</legend>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as T)} className="flex gap-4">
        {options.map((o) => (
          <Label key={o} className="cursor-pointer font-normal capitalize">
            <RadioGroupItem value={o} />
            {o}
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
