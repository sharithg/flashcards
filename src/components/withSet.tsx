"use client";

import type { ComponentType } from "react";
import { useSet } from "@/lib/store";
import type { StudySet } from "@/lib/types";
import { ButtonLink, Spinner } from "./ui";

/** Wraps a component that needs a loaded set, handling loading and not-found states. */
export function withSet<P extends object>(Component: ComponentType<P & { set: StudySet }>, minCards = 0) {
  function WithSet(props: P & { id: string }) {
    const set = useSet(props.id);
    if (set === null) return <Spinner />;
    if (set === undefined) {
      return (
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Set not found</h1>
          <p className="mt-2 text-muted">It may have been deleted, or it lives in another browser.</p>
          <ButtonLink href="/" className="mt-6">Back to library</ButtonLink>
        </div>
      );
    }
    if (set.cards.length < minCards) {
      return (
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Add a few more cards</h1>
          <p className="mt-2 text-muted">This mode needs at least {minCards} cards in the set.</p>
          <ButtonLink href={`/sets/${set.id}/edit`} className="mt-6">Edit set</ButtonLink>
        </div>
      );
    }
    return <Component {...props} set={set} />;
  }
  WithSet.displayName = `withSet(${Component.displayName ?? Component.name})`;
  return WithSet;
}
