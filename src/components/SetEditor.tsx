"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveSet } from "@/lib/store";
import type { Card, StudySet } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Button, Icon, IconButton } from "./ui";

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
    "w-full border-0 border-b-2 border-line bg-transparent px-0 py-2 text-base outline-none field-sizing-content resize-none focus:border-accent";

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
      <div className="sticky top-16 z-10 -mx-4 flex items-center justify-between gap-4 bg-bg/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <h1 className="text-2xl font-bold">{initial ? "Edit set" : "Create a new study set"}</h1>
        <div className="flex gap-2">
          {initial && (
            <Button variant="secondary" onClick={() => router.push(`/sets/${initial.id}`)}>
              Cancel
            </Button>
          )}
          <Button type="submit">{initial ? "Save" : "Create"}</Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          placeholder='Enter a title, like "Biology – Chapter 22"'
          aria-label="Title"
          autoFocus={!initial && !startWithImport}
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg font-semibold outline-none focus:border-accent"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description…"
          aria-label="Description"
          rows={2}
          className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={() => setImportOpen((o) => !o)}>
          <Icon name="plus" className="size-4" /> Import
        </Button>
        <span className="text-sm text-muted">{cards.length} cards</span>
      </div>

      {importOpen && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-5">
          <div className="text-sm font-semibold">Import your data</div>
          <p className="text-sm text-muted">Copy and paste from Word, Excel, Google Docs, etc.</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            autoFocus
            placeholder={`Word 1${TERM_SEPS[termSep]}Definition 1${CARD_SEPS[cardSep]}Word 2${TERM_SEPS[termSep]}Definition 2`}
            className="mt-3 w-full rounded-xl border border-line bg-bg p-3 font-mono text-sm outline-none focus:border-accent"
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
          <li key={card.id} id={`card-${card.id}`} className="scroll-mt-36 rounded-lg border border-line bg-surface focus-within:border-accent">
            <div className="flex items-center justify-between border-b border-line px-4 py-1.5">
              <span className="text-sm font-bold text-muted">{i + 1}</span>
              <div className="flex">
                <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                  <Icon name="up" className="size-4" />
                </IconButton>
                <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === cards.length - 1}>
                  <Icon name="down" className="size-4" />
                </IconButton>
                <IconButton
                  label="Delete card"
                  onClick={() => setCards((cs) => cs.filter((c) => c.id !== card.id))}
                  disabled={cards.length <= 1}
                  className="hover:text-bad"
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
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-muted">Term</span>
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
                <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-muted">Definition</span>
              </label>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={addCard}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line py-6 font-bold text-muted transition-colors hover:border-accent hover:text-accent"
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
      <legend className="mb-1 font-semibold">{label}</legend>
      <div className="flex gap-4">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-1.5 capitalize">
            <input type="radio" checked={value === o} onChange={() => onChange(o)} className="accent-accent" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
