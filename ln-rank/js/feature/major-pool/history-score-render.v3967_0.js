import {
  HISTORY_SCORE_RANK_STATES,
  formatHistoricalEvidenceSummary,
  formatHistoricalEvidenceText,
  formatHistoryNumber,
  formatHistoryYearText,
  getHistoryScoreRankEvidence,
  historyRankRangeText,
  historyYearEvidence
} from '../../../../shared/resources/exam/historical-score-rank-contract.js?v=3967_0';

export const HISTORY_EVIDENCE_PRESENTER_VERSION = 'history-evidence-presenter-v3967_0';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
  return yearEvidence.sourceName ? `来源：${yearEvidence.sourceName}` : '';
}

function renderYear(yearEvidence = {}) {
  const score = Number(yearEvidence.score);
  const hasScore = Number.isFinite(score);
  const state = String(yearEvidence.evidenceState || yearEvidence.validationStatus || 'unknown');
  const scoreText = hasScore ? `${formatHistoryNumber(score)}分` : '分数记录缺失';
  const rankText = historyRankRangeText(yearEvidence);
  const note = state === HISTORY_SCORE_RANK_STATES.DERIVED
    ? '位次由当年官方一分一段按分数补齐'
    : state === HISTORY_SCORE_RANK_STATES.CONFLICT
      ? '原记录与当年官方一分一段不一致，本次不参与跨年比较'
      : state === HISTORY_SCORE_RANK_STATES.RANK_TABLE_UNAVAILABLE
        ? '暂不参与跨年难度判断'
        : sourceText(yearEvidence);
  return `<article class="ln-history-evidence__year is-${escapeHtml(state)}" data-history-year="${escapeHtml(yearEvidence.year)}">
    <header class="ln-history-evidence__year-head"><b>${escapeHtml(yearEvidence.year)}</b><span>${escapeHtml(yearStateLabel(yearEvidence))}</span></header>
    <div class="ln-history-evidence__value"><strong>${escapeHtml(scoreText)}</strong><em>${escapeHtml(rankText)}</em></div>
    ${note ? `<small>${escapeHtml(note)}</small>` : ''}
  </article>`;
}

function rowsFor(record, years, includeMissing = false) {
  const evidence = getHistoryScoreRankEvidence(record);
  return years
    .map(year => evidence.years?.[year] || evidence.years?.[String(year)])
    .filter(row => row && (includeMissing || row.evidenceState !== HISTORY_SCORE_RANK_STATES.NO_RECORD));
}

export function renderCurrentScoreRank(record = {}) {
  const row = historyYearEvidence(record, 2026);
  if (!row) return '';
  const score = Number(row.score);
  const scoreText = Number.isFinite(score) ? `${formatHistoryNumber(score)}分` : '分数记录缺失';
  return `<b>${escapeHtml(scoreText)}</b><span>同分位置${escapeHtml(historyRankRangeText(row))}</span>`;
}

export function renderHistoryScore(record = {}) {
  const rows = rowsFor(record, [2025, 2024]);
  if (!rows.length) return '';
  return `<section class="ln-history-evidence ln-history-evidence--compact" data-ui-component="history-evidence" data-ui-variant="compact-card" aria-label="历史成绩与位次">
    <header class="ln-history-evidence__header"><b>历史对照</b><span>不参与2026当前分组</span></header>
    <div class="ln-history-evidence__years">${rows.map(renderYear).join('')}</div>
    <p class="ln-history-evidence__boundary">跨年优先比较位次及同口径位次比例，不直接用分数高低判断难度变化。</p>
  </section>`;
}

export function renderThreeYearEvidenceDetail(record = {}) {
  const rows = rowsFor(record, [2026, 2025, 2024], true);
  return `<section class="ln-history-evidence ln-history-evidence--detail" data-ui-component="history-evidence" data-ui-variant="three-year-detail" aria-label="2024至2026成绩与位次">
    <header class="ln-history-evidence__header"><b>三年成绩与位次</b><span>${escapeHtml(formatHistoricalEvidenceSummary(record))}</span></header>
    <div class="ln-history-evidence__years">${rows.map(renderYear).join('')}</div>
    <p class="ln-history-evidence__boundary">怎么看：优先比较位次。只有分数或位次正在复核的年份，不参与跨年难度判断；历史最低投档记录不代表下一年度录取结果。</p>
  </section>`;
}

export function compactHistoryScoreText(record = {}) {
  return formatHistoricalEvidenceText(record, { years: [2025, 2024], prefix: false });
}

export function historyScoreText(record = {}, options = {}) {
  return formatHistoricalEvidenceText(record, {
    years: [2025, 2024], prefix: options.prefix !== false,
    empty: options.empty || '历史对照（不参与2026当前分组）：暂无严格同口径记录'
  });
}

export function historyYearText(record = {}, year) {
  const row = historyYearEvidence(record, year);
  return row ? formatHistoryYearText(row) : `${year}：暂无严格同口径记录`;
}
