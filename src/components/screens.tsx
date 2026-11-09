"use client";

import { FlashcardViewer } from "./FlashcardViewer";
import { Learn } from "./Learn";
import { Match } from "./Match";
import { ModeShell } from "./ModeShell";
import { SetEditor } from "./SetEditor";
import { SetOverview } from "./SetOverview";
import { Test } from "./Test";
import { withSet } from "./withSet";
import type { StudySet } from "@/lib/types";

export const SetOverviewScreen = withSet(SetOverview);
export const EditSetScreen = withSet(({ set }: { set: StudySet }) => <SetEditor initial={set} />);
export const FlashcardsScreen = withSet(({ set }: { set: StudySet }) => (
  <ModeShell set={set} mode="flashcards">
    <FlashcardViewer set={set} />
  </ModeShell>
));
export const LearnScreen = withSet(Learn, 2);
export const TestScreen = withSet(Test, 2);
export const MatchScreen = withSet(Match, 2);
