import { fmt } from '../../core/number-utils.js?v=3921_2';

function has(value) {
  return value !== null && value !== undefined && value !== '';
}

function scoreRankText(score, rank) {
  const s = has(score) ? `${fmt(score)}分` : '分数待核验';
  const r = has(rank) ? `${fmt(rank)}位` : '位次待核验';
  return `${s} / ${r}`;
}

export function renderHistoryScore(record) {
  const has2024 = record?.historyCompare?.has2024 || has(record.score2024) || has(record.rank2024);

  if (!has2024) {
    return `
      <div class="history-score">
        <span class="history-label">历史参考</span>
        <span class="history-line">2024：暂无同口径数据</span>
      </div>
    `;
  }

  const trend = record?.historyCompare?.rankTrendText || '';
  return `
    <div class="history-score">
      <span class="history-label">历史参考</span>
      <span class="history-line">2024：${scoreRankText(record.score2024, record.rank2024)}</span>
      ${trend ? `<span class="history-line">${trend}</span>` : ''}
    </div>
  `;
}
