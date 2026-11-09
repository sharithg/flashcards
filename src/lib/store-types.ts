import type { StudySet } from "./types";

/** The full client-side snapshot of the user's data. */
export type LibraryData = { sets: StudySet[]; studyDays: string[] };
