import {
  HISTORY_SCORE_RANK_STATES,
  formatHistoricalEvidenceSummary,
  formatHistoricalEvidenceText,
  formatHistoryNumber,
  formatHistoryYearText,
  getHistoryScoreRankEvidence,
  historyRankRangeText,
  historyYearEvidence
} from '../../../../shared/resources/exam/historical-score-rank-contract.js?v=3966_0';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function yearStateLabel(yearEvidence = {}) {
  const state = String(yearEvidence.evidenceState || yearEvidence.validationStatus || '');
  if (yearEvidence.year === 2026) return '当前主要参考';
  if (state === HISTORY_SCORE_RANK_STATES.CONFLICT) return '位次复核中';
  if (yearEvidence.comparable) return '历史同口径';
  if ([HISTORY_SCORE_RANK_STATES.SCORE_ONLY, HISTORY_SCORE_RANK_STATES.RANK_TABLE_UNAVAILABLE].includes(state)) return '仅作分数线索';
  if (state === HISTORY_SCORE_RANK_STATES.NO_RECORD) return '无同口径记录';
  return '历史参考';
}

function sourceText(yearEvidence = {}) {
  if (!yearEvidence.sourceName) return '';
  return `来源：${yearEvidence.sourceName}`;
}

function renderYear(yearEvidence = {}) {
  const score = Number(yearEvidence.score);
  const hasScore = Number.isFinite(score);
  const state = String(yearEvidence.evidenceState || yearEvidence.validationStatus || '');
  const scoreText = hasScore ? `${formatHistoryNumber(score)}分` : '分数记录缺失';
  const rankText = historyRankRangeText(yearEvidence);
  const note = state === HISTORY_SCORE_RANK_STATES.DERIVED
    ? '位次由当年官方一分一段按分数补齐'
    : state === HISTORY_SCORE_RANK_STATES.CONFLICT
      ? '原记录与当年官方一分一段不一致，本次不参与跨年比较'
      : state === HISTORY_SCORE_RANK_STATES.RANK_TABLE_UNAVAILABLE
        ? '暂不参与跨年难度判断'
        : sourceText(yearEvidence);
  return `<div class="history-evidence-year is-${escapeHtml(state || 'unknown')}">
    <div class="history-evidence-year__head"><b>${escapeHtml(yearEvidence.year)}</b><span>${escapeHtml(yearStateLabel(yearEvidence))}</span></div>
    <div class="history-evidence-year__value"><strong>${escapeHtml(scoreText)}</strong><em>${escapeHtml(rankText)}</em></div>
    ${note ? `<small>${escapeHtml(note)}</small>` : ''}
  </div>`;
}

export function renderCurrentScoreRank(record = {}) {
  const row = historyYearEvidence(record, 2026);
  if (!row) return '';
  const score = Number(row.score);
  const scoreText = Number.isFinite(score) ? `${formatHistoryNumber(score)}分` : '分数记录缺失';
  return `<b>${escapeHtml(scoreText)}</b><span>同分位置${escapeHtml(historyRankRangeText(row))}</span>`;
}

export function renderHistoryScore(record = {}) {
  const evidence = getHistoryScoreRankEvidence(record);
  const rows = [2025, 2024]
    .map(year => evidence.years?.[year] || evidence.years?.[String(year)])
    .filter(row => row && row.evidenceState !== HISTORY_SCORE_RANK_STATES.NO_RECORD);
  if (!rows.length) return '';
  return `<section class="history-score history-score--appendix history-evidence" aria-label="历史成绩与位次">
    <div class="history-score__label">历史对照（不参与2026当前分组）</div>
    <div class="history-score__rows history-evidence__rows">${rows.map(renderYear).join('')}</div>
    <p class="history-evidence__boundary">跨年优先比较位次及同口径位次比例，不直接用分数高低判断难度变化。</p>
  </section>`;
}

export function renderThreeYearEvidenceDetail(record = {}) {
  const evidence = getHistoryScoreRankEvidence(record);
  const rows = [2026, 2025, 2024]
    .map(year => evidence.years?.[year] || evidence.years?.[String(year)])
    .filter(Boolean);
  return `<section class="history-evidence-detail" aria-label="2024至2026成绩与位次">
    <header><b>三年成绩与位次</b><span>${escapeHtml(formatHistoricalEvidenceSummary(record))}</span></header>
    <div class="history-evidence-detail__grid">${rows.map(renderYear).join('')}</div>
    <p>怎么看：优先比较位次。只有分数或位次正在复核的年份，不参与跨年难度判断；历史最低投档记录不代表下一年度录取结果。</p>
  </section>`;
}

export function compactHistoryScoreText(record = {}) {
  return formatHistoricalEvidenceText(record, { years: [2025, 2024], prefix: false });
}

export function historyScoreText(record = {}, options = {}) {
  return formatHistoricalEvidenceText(record, {
    years: [2025, 2024],
    prefix: options.prefix !== false,
    empty: options.empty || '历史对照（不参与2026当前分组）：暂无严格同口径记录'
  });
}

export function historyYearText(record = {}, year) {
  const row = historyYearEvidence(record, year);
  return row ? formatHistoryYearText(row) : `${year}：暂无严格同口径记录`;
}
