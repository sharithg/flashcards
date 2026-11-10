"use client";

import type { ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import type { StudySet } from "@/lib/types";
import { Icon } from "./ui";

export const MODES = [
  { slug: "flashcards", label: "Flashcards", icon: "cards" },
  { slug: "learn", label: "Learn", icon: "learn" },
  { slug: "test", label: "Test", icon: "test" },
  { slug: "match", label: "Match", icon: "match" },
] as const;

export type ModeSlug = (typeof MODES)[number]["slug"];

const noop = () => {};

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
        <Button
          href={`/sets/${set.id}`}
          variant="ghost"
          size="sm"
          label={set.title}
          icon={<Icon name="left" className="size-4" />}
          className="min-w-0 max-w-full"
        />
        {/* Link tabs: navigation happens through each tab's href, so onChange has nothing to do. */}
        <TabList aria-label="Study modes" value={mode} onChange={noop} size="sm" className="order-last w-full sm:order-none sm:ml-auto sm:w-auto">
          {MODES.map((m) => (
            <Tab key={m.slug} value={m.slug} label={m.label} href={`/sets/${set.id}/${m.slug}`} icon={<Icon name={m.icon} className="size-4" />} />
          ))}
        </TabList>
        {toolbar && <div className="ml-auto flex items-center gap-1 sm:ml-0">{toolbar}</div>}
      </div>
      {children}
    </div>
  );
}
