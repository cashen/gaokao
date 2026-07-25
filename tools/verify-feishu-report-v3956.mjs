import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildReportDataV3956, normalizeReportParams } from '../functions/_lib/report-data-service-v3956.js';
import { buildFeishuReport } from '../functions/_lib/feishu-report-builder.js';
import { buildSelectionPoolFeishuReport } from '../functions/_lib/feishu-selection-pool-report-builder.js';
import { FEISHU_REPORT_CONTRACT, FEISHU_REPORT_ROUTES } from '../shared/resources/reports/feishu-report-contract.js';
import { isCompatibleDecisionSnapshot } from '../shared/algorithms/contracts/decision-snapshot.v3960_0.js';

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
assert.equal(FEISHU_REPORT_CONTRACT.audienceYear, 2027);
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
const list = buildSelectionPoolFeishuReport({ candidateScore: 580, items: [record], reportType: 'selectionPoolOnly' });
const analyzed = buildSelectionPoolFeishuReport({ candidateScore: 580, items: [record], reportType: 'selectionPoolWithAnalysis', analysis: { stats: { total: 1, rushCount: 1, stableCount: 0, safeCount: 0 }, aiNarrative: { overall: '先确认孩子是否接受化学与实验课程。', actions: ['确认校区和培养方案'] } } });

for (const [name, report] of [['currentBand', current], ['selectionPoolOnly', list], ['selectionPoolWithAnalysis', analyzed]]) {
  assert.ok(report.markdown.includes('2026最低投档'), `${name} missing 2026 primary fields`);
  assert.ok(report.markdown.includes('2025') && report.markdown.includes('2024'), `${name} missing history years`);
  assert.ok(!report.markdown.includes('2025最低分') && !report.markdown.includes('2025最低位次'), `${name} still treats 2025 as primary`);
  assert.ok(report.markdown.includes('2027') || report.markdown.includes('当年'), `${name} missing current verification boundary`);
}
assert.equal(list.reportType, 'selectionPoolOnly');
assert.equal(analyzed.reportType, 'selectionPoolWithAnalysis');
assert.equal(list.version, FEISHU_REPORT_CONTRACT.releaseVersion);

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
const frontendClient = fs.readFileSync('ln-rank/js/shared/feishu-api-client.v3956_0.js', 'utf8');
assert.ok(frontendClient.includes('FEISHU_REPORT_ROUTES'));
assert.ok(frontendClient.includes('AbortController'));
const currentPayload = fs.readFileSync('ln-rank/js/feature/report/payload-builder.v3956_0.js', 'utf8');
assert.ok(currentPayload.includes('selectedRecords') && currentPayload.includes('score2026') && currentPayload.includes('rank2026'));

console.log('FEISHU_REPORT_V3960_OK');
