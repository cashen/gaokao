import { fmt } from '../../core/number-utils.js?v=3933_9';

function has(value) {
  return value !== null && value !== undefined && value !== '';
}

function scoreRankText(score, rank) {
  const s = has(score) ? `${fmt(score)}分` : '分数待核验';
  const r = has(rank) ? `${fmt(rank)}位` : '位次待核验';
  return `${s} / ${r}`;
}

function normalizeTrendText(record = {}) {
  const trend = record?.historyCompare?.rankTrendText || '';
  if (!trend) return '';
  return String(trend)
    .replace(/^两年位次：前移约\s*/,'2025位次更靠前约 ')
    .replace(/^两年位次：后移约\s*/,'2025位次更靠后约 ')
    .replace(/^位次前移$/,'2025位次更靠前')
    .replace(/^位次后移$/,'2025位次更靠后');
}

export function hasHistory2024(record = {}) {
  return Boolean(record?.historyCompare?.has2024 || has(record.score2024) || has(record.rank2024));
}

export function historyScoreText(record = {}, { empty = '' } = {}) {
  if (!hasHistory2024(record)) return empty;
  const trend = normalizeTrendText(record);
  return `2024同口径参考：${scoreRankText(record.score2024, record.rank2024)}${trend ? `｜${trend}` : ''}`;
}

export function compactHistoryScoreText(record = {}, { empty = '' } = {}) {
  if (!hasHistory2024(record)) return empty;
  return `2024参考 ${scoreRankText(record.score2024, record.rank2024)}`;
}

export function renderHistoryScore(record) {
  const text = historyScoreText(record);
  if (!text) return '';
  return `
    <div class="history-score" aria-label="2024同口径参考">
      <span class="history-label">2024同口径参考</span>
      <span class="history-line">${text.replace(/^2024同口径参考：/, '')}</span>
    </div>
  `;
}
