import { ScoredJob } from "./types";

export function sortJobsByCo2(jobs: ScoredJob[]): ScoredJob[] {
  return [...jobs].sort((left, right) => {
    const leftValue = left.scoreValue ?? Number.POSITIVE_INFINITY;
    const rightValue = right.scoreValue ?? Number.POSITIVE_INFINITY;
    return leftValue - rightValue;
  });
}
