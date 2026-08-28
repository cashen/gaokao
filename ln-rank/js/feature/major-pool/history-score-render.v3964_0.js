import { fmt } from '../../core/number-utils.js?v=3951_0';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function row(year, score, rank) {
  if (!hasValue(score) && !hasValue(rank)) return '';
  const scoreText = hasValue(score) ? `${fmt(score)} 分` : '分数待核验';
  const rankText = hasValue(rank) ? `${fmt(rank)} 位` : '位次待核验';
  return `<span><b>${year}</b>：${scoreText} / ${rankText}</span>`;
}

export function renderHistoryScore(record = {}) {
  const rows = [
    row(2025, record.score2025, record.rank2025),
    row(2024, record.score2024, record.rank2024)
  ].filter(Boolean);
  if (!rows.length) return '';
  return `<section class="history-score history-score--appendix" aria-label="历史对照"><div class="history-score__label">历史对照（不参与2026当前分组）</div><div class="history-score__rows">${rows.join('')}</div></section>`;
}

export function compactHistoryScoreText(record = {}) {
  const rows = [];
  if (hasValue(record.score2025) || hasValue(record.rank2025)) rows.push(`2025：${hasValue(record.score2025) ? fmt(record.score2025) + '分' : '分数待核验'} / ${hasValue(record.rank2025) ? fmt(record.rank2025) + '位' : '位次待核验'}`);
  if (hasValue(record.score2024) || hasValue(record.rank2024)) rows.push(`2024：${hasValue(record.score2024) ? fmt(record.score2024) + '分' : '分数待核验'} / ${hasValue(record.rank2024) ? fmt(record.rank2024) + '位' : '位次待核验'}`);
  return rows.join('；');
}

export function historyScoreText(record = {}) {
  const text = compactHistoryScoreText(record);
  return text ? `历史对照（不参与2026当前分组）：${text}` : '历史对照（不参与2026当前分组）：暂无严格同口径记录';
}
