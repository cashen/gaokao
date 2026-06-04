export function buildBottomLineCheck(filterState = {}, computedItems = []) {
  const mode = filterState.bottomLineMode || 'all';
  const violatedItems = (Array.isArray(computedItems) ? computedItems : []).filter(item => {
    if (mode === 'public_regular_only') return !(item.schoolNature === 'public' && item.feeType === 'normal');
    if (mode === 'public_include_sino') return item.schoolNature !== 'public';
    return false;
  });
  return { mode, violatedCount: violatedItems.length, violatedItems: violatedItems.slice(0, 5) };
}
export function buildParentDecisionContext({ candidateContext, filterState, computedItems, healthLights }) {
  const items = Array.isArray(computedItems) ? computedItems : [];
  const summary = {
    total: items.length,
    rush: items.filter(x => x.poolBand?.group === 'rush').length,
    stable: items.filter(x => x.poolBand?.group === 'stable').length,
    safe: items.filter(x => x.poolBand?.group === 'safe').length
  };
  return { candidateContext, filterState, selectionSummary: summary, bottomLineCheck: buildBottomLineCheck(filterState, items), healthLights };
}
