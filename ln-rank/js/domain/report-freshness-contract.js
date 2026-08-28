const REPORT_STATE_KEY = 'lnRank.reportFreshness.state';
const REPORT_SIGNATURE_KEY = 'lnRank.reportFreshness.signature';
const REPORT_AT_KEY = 'lnRank.reportFreshness.at';

export const REPORT_FRESHNESS = {
  NONE: 'none',
  GENERATING: 'generating',
  FRESH: 'fresh',
  STALE: 'stale',
  FAILED: 'failed'
};

function text(value) { return String(value == null ? '' : value).trim(); }

export function buildSelectionSignature({ items = [], score = '', querySignature = '', orderSignature = '', computedSignature = '' } = {}) {
  const itemSig = (Array.isArray(items) ? items : [])
    .map((item, index) => `${index}:${text(item.id || item.school)}:${text(item.major)}:${text(item.score2025 || item.score)}`)
    .join('|');
  return [text(score), text(querySignature), text(orderSignature), text(computedSignature), itemSig].join('||');
}

export function markReportGenerating(signature = '') {
  try {
    localStorage.setItem(REPORT_STATE_KEY, REPORT_FRESHNESS.GENERATING);
    localStorage.setItem(REPORT_SIGNATURE_KEY, signature || '');
    localStorage.setItem(REPORT_AT_KEY, String(Date.now()));
  } catch {}
}

export function markReportFresh(signature = '') {
  try {
    localStorage.setItem(REPORT_STATE_KEY, REPORT_FRESHNESS.FRESH);
    localStorage.setItem(REPORT_SIGNATURE_KEY, signature || '');
    localStorage.setItem(REPORT_AT_KEY, String(Date.now()));
  } catch {}
}

export function markReportFailed(signature = '') {
  try {
    localStorage.setItem(REPORT_STATE_KEY, REPORT_FRESHNESS.FAILED);
    if (signature) localStorage.setItem(REPORT_SIGNATURE_KEY, signature);
    localStorage.setItem(REPORT_AT_KEY, String(Date.now()));
  } catch {}
}

export function expireReport(reason = 'changed') {
  try {
    const current = localStorage.getItem(REPORT_STATE_KEY);
    if (current === REPORT_FRESHNESS.FRESH || current === REPORT_FRESHNESS.GENERATING) {
      localStorage.setItem(REPORT_STATE_KEY, REPORT_FRESHNESS.STALE);
      localStorage.setItem('lnRank.reportFreshness.staleReason', String(reason || 'changed'));
      localStorage.setItem(REPORT_AT_KEY, String(Date.now()));
    }
  } catch {}
}

export function clearReportFreshness() {
  try {
    localStorage.removeItem(REPORT_STATE_KEY);
    localStorage.removeItem(REPORT_SIGNATURE_KEY);
    localStorage.removeItem(REPORT_AT_KEY);
    localStorage.removeItem('lnRank.reportFreshness.staleReason');
  } catch {}
}

export function readReportFreshness(currentSignature = '') {
  try {
    const state = localStorage.getItem(REPORT_STATE_KEY) || REPORT_FRESHNESS.NONE;
    const sig = localStorage.getItem(REPORT_SIGNATURE_KEY) || '';
    if (state === REPORT_FRESHNESS.FRESH && currentSignature && sig && sig !== currentSignature) return REPORT_FRESHNESS.STALE;
    if (state === REPORT_FRESHNESS.GENERATING && currentSignature && sig && sig !== currentSignature) return REPORT_FRESHNESS.STALE;
    return state;
  } catch { return REPORT_FRESHNESS.NONE; }
}
