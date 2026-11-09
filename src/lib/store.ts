"use client";

/*
 * Client cache over the Postgres-backed Server Actions.
 *
 * The server renders <StoreProvider initial={…}> with a full snapshot, so the first paint (SSR
 * included) already has data. After hydration the snapshot is copied into this module-level
 * store; every mutation updates it optimistically and then calls the matching Server Action.
 * Next runs a client's Server Actions one at a time, so writes reach the database in order.
 * If a write fails, the store resyncs from /api/data once the queue drains (rolling back the
 * optimistic change). It also resyncs when the tab becomes visible, to pick up other tabs' edits.
 */

import { createContext, createElement, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  deleteSetAction,
  recordMatchTimeAction,
  recordStudyAction,
  resetProgressAction,
  saveSetAction,
  setMasteryAction,
  setPinnedAction,
  setStarredAction,
} from "./actions";
import type { LibraryData } from "./store-types";
import type { MasteryLevel, StudySet } from "./types";
import { dayKey } from "./utils";

let state: LibraryData | null = null;
let pending = 0;
let needsResync = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function resync() {
  try {
    const res = await fetch("/api/data", { cache: "no-store" });
    if (!res.ok) throw new Error(`GET /api/data ${res.status}`);
    const data = (await res.json()) as LibraryData;
    // Don't clobber optimistic changes that were made while we were fetching.
    if (pending === 0) {
      state = data;
      emit();
    } else {
      needsResync = true;
    }
  } catch (err) {
    console.error("Couldn't refresh data", err);
  }
}

/** Apply a change locally right away, then persist it. */
function mutate(apply: (d: LibraryData) => LibraryData, persist: () => Promise<unknown>) {
  if (!state) return;
  state = apply(state);
  emit();
  pending++;
  persist()
    .catch((err) => {
      console.error("Couldn't save change; reloading data from the server", err);
      needsResync = true;
    })
    .finally(() => {
      pending--;
      if (pending === 0 && needsResync) {
        needsResync = false;
        void resync();
      }
    });
}

const InitialData = createContext<LibraryData | null>(null);

export function StoreProvider({ initial, children }: { initial: LibraryData; children: ReactNode }) {
  useEffect(() => {
    if (pending === 0) {
      state = initial;
      emit();
    }
  }, [initial]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && pending === 0) void resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return createElement(InitialData.Provider, { value: initial }, children);
}

function useData(): LibraryData | null {
  const initial = useContext(InitialData);
  const local = useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
  return local ?? initial;
}

/** All sets, or `null` if no data has loaded. */
export function useSets(): StudySet[] | null {
  return useData()?.sets ?? null;
}

/** Days (YYYY-MM-DD, local time) on which the user studied anything. */
export function useStudyDays(): string[] | null {
  return useData()?.studyDays ?? null;
}

/** A single set: `null` while loading, `undefined` if it doesn't exist. */
export function useSet(id: string): StudySet | null | undefined {
  const sets = useSets();
  if (sets === null) return null;
  return sets.find((s) => s.id === id);
}

/** False during SSR and hydration; true afterwards. Use it to gate output that depends on the viewer's clock or time zone. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ---- mutations -------------------------------------------------------------------------------

function mapSet(d: LibraryData, setId: string, fn: (s: StudySet) => StudySet): LibraryData {
  return { ...d, sets: d.sets.map((s) => (s.id === setId ? fn(s) : s)) };
}

function withStudy(d: LibraryData, setId: string, today: string): LibraryData {
  return {
    sets: d.sets.map((s) => (s.id === setId ? { ...s, lastStudiedAt: Date.now() } : s)),
    studyDays: d.studyDays.includes(today) ? d.studyDays : [...d.studyDays, today],
  };
}

export function saveSet(set: StudySet) {
  mutate(
    (d) => {
      const exists = d.sets.some((s) => s.id === set.id);
      return { ...d, sets: exists ? d.sets.map((s) => (s.id === set.id ? set : s)) : [set, ...d.sets] };
    },
    () =>
      saveSetAction({
        id: set.id,
        title: set.title,
        description: set.description,
        createdAt: set.createdAt,
        cards: set.cards.map((c) => ({ id: c.id, term: c.term, definition: c.definition, starred: !!c.starred })),
      }),
  );
}

export function deleteSet(id: string) {
  mutate(
    (d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) }),
    () => deleteSetAction(id),
  );
}

export function togglePin(id: string) {
  const pinned = !state?.sets.find((s) => s.id === id)?.pinned;
  mutate(
    (d) => mapSet(d, id, (s) => ({ ...s, pinned })),
    () => setPinnedAction(id, pinned),
  );
}

export function toggleStar(setId: string, cardId: string) {
  const starred = !state?.sets.find((s) => s.id === setId)?.cards.find((c) => c.id === cardId)?.starred;
  mutate(
    (d) => mapSet(d, setId, (s) => ({ ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, starred } : c)) })),
    () => setStarredAction(cardId, starred),
  );
}

/** Mark that the user studied this set now (feeds "last studied" and the daily streak). */
export function recordStudy(setId: string) {
  const today = dayKey();
  mutate(
    (d) => withStudy(d, setId, today),
    () => recordStudyAction(setId, today),
  );
}

export function setMastery(setId: string, cardId: string, level: MasteryLevel) {
  const today = dayKey();
  mutate(
    (d) => withStudy(mapSet(d, setId, (s) => ({ ...s, progress: { ...s.progress, [cardId]: level } })), setId, today),
    () => setMasteryAction({ setId, cardId, level, today }),
  );
}

export function resetProgress(setId: string) {
  mutate(
    (d) => mapSet(d, setId, (s) => ({ ...s, progress: {} })),
    () => resetProgressAction(setId),
  );
}

/** Records a finished Match game; returns whether it's a new personal best. */
export function recordMatchTime(setId: string, ms: number): boolean {
  const prev = state?.sets.find((s) => s.id === setId)?.bestMatchTime;
  const isBest = prev === undefined || ms < prev;
  const today = dayKey();
  mutate(
    (d) => withStudy(isBest ? mapSet(d, setId, (s) => ({ ...s, bestMatchTime: ms })) : d, setId, today),
    () => recordMatchTimeAction(setId, ms, today),
  );
  return isBest;
}
