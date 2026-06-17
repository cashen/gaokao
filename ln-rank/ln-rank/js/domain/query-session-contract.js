const LAST_QUERY_SIGNATURE_KEY = 'lnRank.querySession.lastSuccessfulSignature';
const LAST_QUERY_AT_KEY = 'lnRank.querySession.lastSuccessfulAt';

function normalizePart(value) {
  const text = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  return text || 'none';
}

function normalizeKeyword(value) {
  return String(value == null ? '' : value)
    .split(/[,，、/；;|\s]+/)
    .map(x => x.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    .join('/');
}

export function buildQuerySignature(input = {}) {
  const filters = input.filters || input || {};
  const keywordQuery = filters.keywordQuery || {};
  const directionKeywords = Array.isArray(input.directionKeywords) ? input.directionKeywords.join('/') : '';
  const parts = [
    normalizePart(input.score ?? input.candidateScore),
    normalizePart(input.rangePreset || input.rangeMode),
    normalizePart(input.bandFocus || input.activeBand),
    normalizeKeyword(filters.majorKeyword || input.majorKeyword || keywordQuery.raw || ''),
    normalizeKeyword(filters.schoolKeyword || input.schoolKeyword || ''),
    normalizePart(filters.region || input.region || 'all'),
    normalizePart(filters.bottomLineMode || input.bottomLineMode || 'all'),
    normalizePart(filters.specialProjectMode || input.specialProjectMode || 'hide_eligibility_projects'),
    normalizeKeyword(directionKeywords)
  ];
  return parts.join('|');
}

export function saveSuccessfulQuerySignature(signature) {
  try {
    localStorage.setItem(LAST_QUERY_SIGNATURE_KEY, String(signature || ''));
    localStorage.setItem(LAST_QUERY_AT_KEY, String(Date.now()));
  } catch {}
}

export function readSuccessfulQuerySignature() {
  try { return localStorage.getItem(LAST_QUERY_SIGNATURE_KEY) || ''; } catch { return ''; }
}

export function clearSuccessfulQuerySignature() {
  try {
    localStorage.removeItem(LAST_QUERY_SIGNATURE_KEY);
    localStorage.removeItem(LAST_QUERY_AT_KEY);
  } catch {}
}

export function resolveResultFreshness({ currentSignature = '', resultSignature = '', hasResult = false, loading = false, error = null } = {}) {
  if (loading) return 'loading';
  if (error) return 'error';
  if (!hasResult) return 'none';
  if (currentSignature && resultSignature && currentSignature === resultSignature) return 'fresh';
  return 'stale';
}

export function markResultStale(state, reason = 'query_changed') {
  if (!state || !state.bands) return;
  if (state.bands.data) {
    state.bands.stale = true;
    state.bands.staleReason = reason;
  }
}

export function clearResultState(state, reason = 'reset') {
  if (!state || !state.bands) return;
  state.bands.data = null;
  state.bands.stale = false;
  state.bands.staleReason = reason;
  state.bands.resultSignature = '';
  state.bands.querySignature = '';
}
