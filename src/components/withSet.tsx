"use client";

import type { ComponentType } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useSet } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { Spinner } from "./ui";

/** Wraps a component that needs a loaded set, handling loading and not-found states. */
export function withSet<P extends object>(Component: ComponentType<P & { set: StudySet }>, minCards = 0) {
  function WithSet(props: P & { id: string }) {
    const set = useSet(props.id);
    if (set === null) return <Spinner />;
    if (set === undefined) {
      return (
        <div className="mx-auto max-w-md px-4 py-24">
          <EmptyState
            headingLevel={1}
            title="Set not found"
            description="It may have been deleted, or it lives in another browser."
            actions={<Button href="/" variant="primary" label="Back to library" />}
          />
        </div>
      );
    }
    if (set.cards.length < minCards) {
      return (
        <div className="mx-auto max-w-md px-4 py-24">
          <EmptyState
            headingLevel={1}
            title="Add a few more cards"
            description={`This mode needs at least ${minCards} cards in the set.`}
            actions={<Button href={`/sets/${set.id}/edit`} variant="primary" label="Edit set" />}
          />
        </div>
      );
    }
    return <Component {...props} set={set} />;
  }
  WithSet.displayName = `withSet(${Component.displayName ?? Component.name})`;
  return WithSet;
}
