import {NEXT_ACTION_LABELS,nextActionsForTurn} from './next-action-engine.js';

export const AI_RESEARCH_RELATION_CONTRACT_VERSION='ai-research-relation-contract-v0.02';
export const RESEARCH_RELATION_LABELS=NEXT_ACTION_LABELS;

// Compatibility adapter for older callers. New product code passes the full
// turn/result/workspace context directly to nextActionsForTurn.
export function researchRelationActions(input={}){return nextActionsForTurn(input);}
