export type Card = {
  id: string;
  term: string;
  definition: string;
  starred?: boolean;
};

/** 0 = new (not studied), 1 = learning (got multiple choice right), 2 = mastered (got written right) */
export type MasteryLevel = 0 | 1 | 2;

export type StudySet = {
  id: string;
  title: string;
  description: string;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
  progress?: Record<string, MasteryLevel>;
  bestMatchTime?: number;
  lastStudiedAt?: number;
  pinned?: boolean;
};

export type AnswerWith = "definition" | "term";

/** Card counts by mastery level. */
export type MasteryCounts = { fresh: number; learning: number; mastered: number; total: number };
