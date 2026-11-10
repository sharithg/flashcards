import Link from "next/link";
import type { ReactNode } from "react";
import type { StudySet } from "@/lib/types";
import { Icon } from "./common";

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
          className="flex min-w-0 items-center gap-1 rounded-md py-1.5 pr-2 text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <Icon name="left" className="size-4" />
          <span className="truncate">{set.title}</span>
        </Link>
        <nav className="order-last flex w-full gap-0.5 overflow-x-auto rounded-md border bg-card p-0.5 sm:order-none sm:ml-auto sm:w-auto">
          {MODES.map((m) => (
            <Link
              key={m.slug}
              href={`/sets/${set.id}/${m.slug}`}
              aria-current={m.slug === mode ? "page" : undefined}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-transparent px-2 py-1 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 aria-[current=page]:border-border aria-[current=page]:bg-accent aria-[current=page]:text-foreground sm:flex-none sm:px-3"
            >
              <Icon name={m.icon} className="hidden size-4 min-[420px]:block" />
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
