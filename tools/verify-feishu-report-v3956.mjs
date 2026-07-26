import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildReportDataV3956, normalizeReportParams } from '../functions/_lib/report-data-service-v3956.js';
import { buildFeishuReport } from '../functions/_lib/feishu-report-builder.js';
import { buildSelectionPoolFeishuReport } from '../functions/_lib/feishu-selection-pool-report-builder.js';
import { FEISHU_REPORT_CONTRACT, FEISHU_REPORT_ROUTES, FEISHU_YEAR_CALIBER } from '../shared/resources/reports/feishu-report-contract.js';
import { isCompatibleDecisionSnapshot } from '../shared/algorithms/contracts/decision-snapshot.v3960_0.js';
import { onRequest as analyzeSelectionPath } from '../functions/api/path-analysis.js';

const record = {
  id: 'demo-2026', school: '大连理工大学（盘锦校区）', major: '能源化学工程',
  dataYear: 2026, primaryYear: 2026,
  score2026: 589, rank2026: 18420, score2025: 581, rank2025: 19100, score2024: 576, rank2024: 20500,
  scoreDelta2026: 9, band: 'upper', bandKey: 'upper',
  statusLabel: '稍高目标', position: '稍高目标区', matchLevel: 'related', matchLabel: '相关方向', matchReason: '专业名称符合当前方向',
  displayLocation: '辽宁 · 盘锦', geoEntity: '大连理工大学（盘锦校区）', schoolTags: ['公办', '盘锦校区'],
  schoolNature: 'public', feeType: 'normal',
  standardMajor: { code: '081304T', name: '能源化学工程', categoryCode: '0813', categoryName: '化工与制药类', mappingStatus: 'exact' },
  reviewPoints: ['确认化学与实验课程', '确认盘锦校区'],
  historyCompare: { rankTrendText: '近三年最低投档位置有一定变化' }
};

assert.equal(FEISHU_REPORT_CONTRACT.dataYear, 2026);
assert.equal(FEISHU_REPORT_CONTRACT.rankYear, 2026);
assert.equal(FEISHU_REPORT_CONTRACT.audienceYear, 2027);
assert.equal(FEISHU_REPORT_CONTRACT.version, 'v1.3.0');
assert.equal(FEISHU_REPORT_CONTRACT.yearCaliberVersion, 'ln-physics-report-years-v3964_0');
assert.deepEqual(FEISHU_REPORT_CONTRACT.historicalYears, [2025, 2024]);
assert.equal(FEISHU_REPORT_CONTRACT.historyPlacement, 'appendix-only');
assert.equal(FEISHU_REPORT_CONTRACT.historyParticipatesInCurrentGrouping, false);
assert.match(FEISHU_YEAR_CALIBER.reportCopy, /基于2026年/);
assert.match(FEISHU_YEAR_CALIBER.reportCopy, /2025、2024只作严格同口径历史对照/);
assert.match(FEISHU_YEAR_CALIBER.reportCopy, /正式填报以2027年/);
assert.equal(FEISHU_REPORT_ROUTES.currentBand, '/api/feishu-create-report');
assert.equal(normalizeReportParams({ candidateScore: 580 }).candidateScore, 580);
assert.throws(() => normalizeReportParams({ candidateScore: 149 }));

const payload = {
  candidateScore: 580,
  activeBand: 'upper',
  rangePreset: 'standard',
  filters: { region: 'ln', majorKeyword: '能源化学', bottomLineMode: 'all' },
  selectedRecords: [record],
  counts: { upper: 1, near: 4, steady: 2, total: 7 },
  maxRecords: 20
};
const reportData = await buildReportDataV3956(new Request('https://example.com/api/feishu-create-report'), {}, payload);
assert.equal(reportData.sourceMode, 'current-decision-snapshot');
assert.equal(reportData.dataScope, '辽宁2026物理类');
assert.equal(reportData.algorithmOrchestrationVersion, 'algorithm-orchestration-v3963');
assert.equal(reportData.selectedRecords[0].score2026, 589);
assert.equal(reportData.selectedRecords[0].canonicalPosition.bandKey, 'upper');
assert.equal(isCompatibleDecisionSnapshot(reportData.decisionSnapshot), true);
assert.equal(reportData.decisionSnapshot.records[0].id, record.id);
assert.equal(reportData.decisionSnapshot.records[0].bandKey, 'upper');
const current = buildFeishuReport(reportData);
const list = buildSelectionPoolFeishuReport({ candidateScore: 580, year: 2025, dataYear: 2025, rankYear: 2025, items: [record], reportType: 'selectionPoolOnly' });
const analyzed = buildSelectionPoolFeishuReport({ candidateScore: 580, year: 2025, dataYear: 2025, rankYear: 2025, items: [record], reportType: 'selectionPoolWithAnalysis', analysis: { stats: { total: 1, rushCount: 1, stableCount: 0, safeCount: 0 }, aiNarrative: { overall: '先确认孩子是否接受化学与实验课程。', actions: ['确认校区和培养方案'] } } });

for (const [name, report] of [['currentBand', current], ['selectionPoolOnly', list], ['selectionPoolWithAnalysis', analyzed]]) {
  assert.ok(report.markdown.includes('2026最低投档'), `${name} missing 2026 primary fields`);
  assert.ok(report.markdown.includes('2025') && report.markdown.includes('2024'), `${name} missing history years`);
  assert.ok(!report.markdown.includes('2025最低分') && !report.markdown.includes('2025最低位次'), `${name} still treats 2025 as primary`);
  assert.ok(report.markdown.includes('2027'), `${name} missing unpublished-year boundary`);
  assert.ok(!report.markdown.includes('基于 2025') && !report.markdown.includes('基于辽宁 2025'), `${name} contains stale 2025 primary copy`);
  assert.ok(!report.markdown.includes('数据口径：辽宁2025'), `${name} contains stale 2025 data scope`);
  assert.equal(report.dataYear, 2026);
  assert.equal(report.rankYear, 2026);
  assert.equal(report.audienceYear, 2027);
  assert.equal(report.yearCaliberVersion, FEISHU_REPORT_CONTRACT.yearCaliberVersion);
  const appendixIndex = report.markdown.indexOf('历史对照附录（不参与2026当前分组）');
  assert.ok(appendixIndex > 0, `${name} missing history appendix`);
  assert.ok(!report.markdown.slice(0, appendixIndex).includes('2025：'), `${name} still places 2025 inside current decision items`);
  assert.ok(!report.markdown.slice(0, appendixIndex).includes('2024：'), `${name} still places 2024 inside current decision items`);
}
assert.equal(list.reportType, 'selectionPoolOnly');
assert.equal(analyzed.reportType, 'selectionPoolWithAnalysis');
assert.equal(list.version, FEISHU_REPORT_CONTRACT.releaseVersion);
assert.equal(list.summary.candidateRankYear, 2026);
assert.equal(list.summary.enrichedItems[0].referenceRank, record.rank2026);
assert.match(JSON.stringify(list.styledBlocks), /六、历史对照附录/);
assert.match(JSON.stringify(list.styledBlocks), /七、数据和使用边界/);
assert.ok(JSON.stringify(list.styledBlocks).indexOf('六、历史对照附录') < JSON.stringify(list.styledBlocks).indexOf('七、数据和使用边界'));

const analysisResponse = await analyzeSelectionPath({
  request: new Request('https://example.com/api/path-analysis', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ candidateScore: 580, year: 2025, dataYear: 2025, rankYear: 2025, items: [record] })
  }),
  env: {}
});
assert.equal(analysisResponse.status, 200);
const analysisResult = await analysisResponse.json();
assert.equal(analysisResult.dataYear, 2026);
assert.equal(analysisResult.rankYear, 2026);
assert.equal(analysisResult.audienceYear, 2027);
assert.equal(analysisResult.yearCaliberVersion, FEISHU_REPORT_CONTRACT.yearCaliberVersion);
assert.equal(analysisResult.facts.config.year, 2026);
assert.match(analysisResult.reportText, /基于2026年/);
assert.doesNotMatch(analysisResult.reportText, /基于 2025|数据口径：辽宁2025|正式填报以 2026/);

const service = fs.readFileSync('functions/_lib/report-data-service-v3956.js', 'utf8');
assert.ok(service.includes('makeDecisionSnapshot'));
assert.ok(service.includes("'current-decision-snapshot'"));
assert.ok(service.includes("'canonical-server-rebuild-2026'"));
const routeCurrent = fs.readFileSync('functions/api/feishu-create-report.js', 'utf8');
const routePool = fs.readFileSync('functions/api/feishu-create-selection-pool-report.js', 'utf8');
for (const source of [routeCurrent, routePool]) {
  assert.ok(source.includes('createFeishuReportResponse'));
  assert.ok(!source.includes('getTenantAccessToken') && !source.includes('createFeishuDocument'));
}
assert.ok(routePool.includes('year: FEISHU_REPORT_CONTRACT.dataYear'));
assert.ok(routePool.includes('yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion'));
const frontendClient = fs.readFileSync('ln-rank/js/shared/feishu-api-client.v3964_0.js', 'utf8');
assert.ok(frontendClient.includes('FEISHU_REPORT_ROUTES'));
assert.ok(frontendClient.includes('AbortController'));
assert.ok(frontendClient.includes('data.yearCaliberVersion !== FEISHU_REPORT_CONTRACT.yearCaliberVersion'));
const currentPayload = fs.readFileSync('ln-rank/js/feature/report/payload-builder.v3964_0.js', 'utf8');
assert.ok(currentPayload.includes('selectedRecords') && currentPayload.includes('score2026') && currentPayload.includes('rank2026'));
assert.ok(currentPayload.includes('yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion'));
for (const file of [
  'ln-rank/js/feature/feishu/report-api.v3964_0.js',
  'ln-rank/js/feature/selection-pool/path-analysis-api.v3964_0.js',
  'ln-rank/js/feature/selection-pool/feishu-report-api.v3964_0.js'
]) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes('feishu-report-contract.v3964_0.js?v=3964_0'), `${file} does not use the active year contract`);
  assert.ok(!source.includes('feishu-report-contract.v3963_1.js'), `${file} retains stale report contract`);
}

console.log('FEISHU_REPORT_V3964_0_HISTORY_APPENDIX_OK');
