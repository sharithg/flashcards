"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { MAX_TAG_LENGTH, MAX_TAGS, cleanTag, compareTags, normalizeTags, sameTag } from "@/lib/tags";
import { Icon } from "./common";

/** Chips plus a text box: Enter or comma adds a tag, Backspace on an empty box removes the last one. */
export function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags used on other sets, offered as autocomplete. */
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const full = value.length >= MAX_TAGS;

  function commit(text = draft) {
    const parts = text.split(",").map(cleanTag).filter(Boolean);
    if (parts.length) onChange(normalizeTags([...value, ...parts]).slice(0, MAX_TAGS));
    setDraft("");
  }

  const offered = [...new Set(suggestions)].filter((s) => !value.some((v) => sameTag(v, s))).sort(compareTags);

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 focus-within:border-primary-edge focus-within:ring-3 focus-within:ring-ring/30">
      <Icon name="tag" className="ml-1 size-4 shrink-0 text-muted-foreground" />
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5 rounded-sm border bg-muted py-0.5 pr-0.5 pl-2 text-sm font-semibold">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== t))}
            aria-label={`Remove tag ${t}`}
            className="grid size-5 place-items-center rounded-sm text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          // Picking a suggestion or pasting "a, b" adds immediately.
          if (v.includes(",") || offered.includes(v)) commit(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit()}
        list={listId}
        maxLength={MAX_TAG_LENGTH}
        disabled={full}
        placeholder={value.length ? (full ? "" : "Add tag") : "Add tags, like a course or source (Enter to add)"}
        aria-label="Add tag"
        className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      <datalist id={listId}>
        {offered.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

/** Read-only tag chips. With `hrefFor`, each chip links somewhere (e.g. to filter the library by it). */
export function TagList({
  tags,
  active,
  hrefFor,
  className = "",
}: {
  tags: string[];
  active?: string | null;
  hrefFor?: (tag: string) => string;
  className?: string;
}) {
  if (!tags.length) return null;
  const chip = "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs font-semibold";
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Tags">
      {[...tags].sort(compareTags).map((t) => {
        const on = !!active && sameTag(active, t);
        return (
          <li key={t}>
            {hrefFor ? (
              <Link
                href={hrefFor(t)}
                className={`${chip} relative z-10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                  on ? "border-primary-edge bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {t}
              </Link>
            ) : (
              <span className={`${chip} bg-muted text-muted-foreground`}>{t}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
