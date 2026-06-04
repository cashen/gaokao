import { buildCandidateContext, buildComputedSignature } from './candidate-context.v3959.js';
import { recomputeSelectionPool, getComputedStats } from './recompute-selection-pool.v3959.js';

export function buildFreshComputedState({ score, rawItems = [], orderSignature = '' }) {
  const candidateContext = buildCandidateContext(score);
  const items = recomputeSelectionPool(candidateContext, rawItems);
  const stats = getComputedStats(items);
  const signature = buildComputedSignature(candidateContext, orderSignature);
  return { rawItems, items, stats, candidateContext, orderSignature, signature, score: candidateContext.score, recomputedAt: new Date().toISOString() };
}

export function isComputedStateFresh(state, candidateContext, orderSignature = '') {
  if (!state || !candidateContext) return false;
  return state.signature === buildComputedSignature(candidateContext, orderSignature);
}
