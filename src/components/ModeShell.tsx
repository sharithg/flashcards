import Link from "next/link";
import type { ReactNode } from "react";
import type { StudySet } from "@/lib/types";
import { Icon } from "./ui";

export const MODES = [
  { slug: "flashcards", label: "Flashcards", icon: "cards" },
  { slug: "learn", label: "Learn", icon: "learn" },
  { slug: "test", label: "Test", icon: "test" },
  { slug: "match", label: "Match", icon: "match" },
] as const;

export type ModeSlug = (typeof MODES)[number]["slug"];

export function ModeShell({
  set,
  mode,
  toolbar,
  children,
}: {
  set: StudySet;
  mode: ModeSlug;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
      <div className="flex flex-wrap items-center gap-3 py-5">
        <Link
          href={`/sets/${set.id}`}
          className="flex min-w-0 items-center gap-1 rounded-lg py-2 pr-3 text-sm font-semibold text-muted hover:text-ink"
        >
          <Icon name="left" className="size-4" />
          <span className="truncate">{set.title}</span>
        </Link>
        <nav className="order-last flex w-full gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1 sm:order-none sm:ml-auto sm:w-auto">
          {MODES.map((m) => (
            <Link
              key={m.slug}
              href={`/sets/${set.id}/${m.slug}`}
              aria-current={m.slug === mode ? "page" : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
                m.slug === mode ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <Icon name={m.icon} className="size-4" />
              {m.label}
            </Link>
          ))}
        </nav>
        {toolbar && <div className="ml-auto flex items-center gap-1 sm:ml-0">{toolbar}</div>}
      </div>
      {children}
    </div>
  );
}
