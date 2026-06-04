import { getTrendHint } from './major-trend-retriever.js';

export function buildTrendReviewPoints({ score, keyword, directionId } = {}) {
  try {
    const hint = getTrendHint({ score, keyword, directionId });
    if (hint?.text) return [hint.text];
  } catch {}
  return [];
}
