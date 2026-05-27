import { clamp } from "./number-utils.js";
export function getViewScore(candidateScore, viewDelta) {
  return clamp(Math.round(candidateScore + viewDelta), 150, 707);
}
export function getWindowByViewScore(viewScore) {
  return {
    lower: viewScore - 25,
    upper: viewScore + 10,
    upperRange: [viewScore + 1, viewScore + 10],
    nearRange: [viewScore - 10, viewScore],
    lowerRange: [viewScore - 25, viewScore - 11]
  };
}
