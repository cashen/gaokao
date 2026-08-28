import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const moduleUrl = file => `${pathToFileURL(path.join(root, file)).href}?audit=v3964_0`;

const main = read('ln-rank/index.html');
const selection = read('ln-rank/selection-pool.html');
const app = read('ln-rank/js/app.v3964_0.js');
const appRuntime = read('ln-rank/js/app-runtime.v3964_0.js');
const orchestrator = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3964_0.js');
const school = read('ln-rank/js/feature/school-majors/school-all-mode.v3964_0.js');
const cards = read('ln-rank/js/feature/major-pool/render.v3964_0.js');
const history = read('ln-rank/js/feature/major-pool/history-score-render.v3964_0.js');
const selectionEntry = read('ln-rank/js/selection-pool.v3964_0.js');
const selectionRuntime = read('ln-rank/js/selection-pool-runtime.v3964_0.js');
const shell = read('shared/ui/shell/family-shell.v3964_0.js');
const registry = read('shared/ui/ui-registry.v3964_0.js');
const reportContract = read('shared/resources/reports/feishu-report-contract.v3964_0.js');
const reportClient = read('ln-rank/js/shared/feishu-api-client.v3964_0.js');
const reportPayload = read('ln-rank/js/feature/report/payload-builder.v3964_0.js');
const reportApi = read('ln-rank/js/feature/feishu/report-api.v3964_0.js');
const selectionReportApi = read('ln-rank/js/feature/selection-pool/feishu-report-api.v3964_0.js');
const selectionController = read('ln-rank/js/feature/selection-pool/controller.v3964_0.js');
const currentReport = read('functions/_lib/feishu-report-builder.js');
const selectionReport = read('functions/_lib/feishu-selection-pool-report-builder.js');
const styledReport = read('functions/_lib/feishu-selection-pool-styled-builder.js');
const releaseContract = read('functions/_lib/release-contract.js');
const active = json('ln-rank/active-assets.json');
const meta = json('ln-rank/release-meta.json');
const { CURRENT_RELEASE } = await import(moduleUrl('shared/resources/release/current-release.js'));
const { FEISHU_REPORT_CONTRACT } = await import(moduleUrl('shared/resources/reports/feishu-report-contract.v3964_0.js'));

assert.equal(CURRENT_RELEASE.display, 'v3.9.64.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3964_0');
assert.equal(CURRENT_RELEASE.uiOrchestrationVersion, 'ui-orchestration-v3964_0');
assert.equal(CURRENT_RELEASE.selectionWorkspaceVersion, 'selection-workspace-orchestration-v3964_0');
assert.equal(CURRENT_RELEASE.searchIntentVersion, 'score-school-search-v3964_0');
assert.equal(CURRENT_RELEASE.schoolAllModeVersion, 'school-all-mode-v3964_0');
assert.equal(CURRENT_RELEASE.runtimeCacheVersion, 'runtime-cache-coherence-v3964_0');
assert.equal(active.version, CURRENT_RELEASE.display);
assert.equal(meta.version, CURRENT_RELEASE.display);
assert.equal(active.assetVersion, CURRENT_RELEASE.assetVersion);

const mainCss = [...main.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(match => match[1].split('?')[0]);
const selectionCss = [...selection.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map(match => match[1].split('?')[0]);
assert.deepEqual(mainCss, [
  '/shared/ui/tokens/foundation.v3959_0.css',
  '/shared/ui/tokens/semantic.v3959_0.css',
  '/shared/ui/components/mode-switch.v3963_0.css',
  '/shared/ui/shell/family-shell.v3964_0.css',
  '/ln-rank/css/ln-rank-workspace.v3964_0.css'
]);
assert.deepEqual(selectionCss, [
  '/shared/ui/tokens/foundation.v3959_0.css',
  '/shared/ui/tokens/semantic.v3959_0.css',
  '/shared/ui/shell/family-shell.v3964_0.css',
  '/ln-rank/css/selection-pool.v3964_0.css'
]);
for (const forbidden of [
  'ln-rank-main.v3949_0.css',
  'ln-rank-selection.v3949_0.css',
  'ln-rank-multi-terminal.v3949_4.css',
  'gaokao-human-ui.v3950_0.css',
  'family-human-layer.v3952_0.css',
  'family-decision-workspace.v3955_0.css',
  'selection-workspace.v3963_1.css',
  'school-all-mode.v3963_0.css'
]) {
  assert.ok(!main.includes(forbidden), `main still mounts legacy layer ${forbidden}`);
  assert.ok(!selection.includes(forbidden), `selection still mounts legacy layer ${forbidden}`);
}
assert.ok(!selection.includes('ux/multi-terminal'));
assert.ok(!selection.includes('ux/family-presentation'));

for (const [name, html] of [['main', main], ['selection', selection]]) {
  for (const marker of ['data-ui-global-header-mount', 'data-ui-family-status-mount', 'data-runtime-state="loading"']) {
    assert.ok(html.includes(marker), `${name} missing static/readiness marker ${marker}`);
  }
}
for (const marker of [
  'id="scoreAdvancedOptions"',
  'id="familyConditionsDetails"',
  '看一所学校的在辽专业',
  'data-runtime-control',
  '/ln-rank/js/app.v3964_0.js?v=3964_0',
  'id="selectionPoolShell"'
]) assert.ok(main.includes(marker), `main missing ${marker}`);
for (const marker of [
  'id="selectionRuntimeStatus"',
  'data-selection-runtime-control disabled',
  '/ln-rank/js/selection-pool.v3964_0.js?v=3964_0'
]) assert.ok(selection.includes(marker), `selection missing ${marker}`);

assert.equal((orchestrator.match(/getElementById\('queryButton'\)\?\.addEventListener\('click'/g) || []).length, 1);
assert.ok(orchestrator.includes('查看${label}在辽2026物理类投档专业'));
assert.ok(orchestrator.includes("classList.toggle('has-query-results'"));
assert.ok(orchestrator.includes("moreConditions.open = schoolMode"));
assert.ok(app.includes("import('./app-runtime.v3964_0.js?v=3964_0')"));
assert.ok(app.includes("setRuntimeState('error')"));
assert.ok(appRuntime.includes('selectionWorkspaceReady') && appRuntime.includes('schoolAllModeReady'));
assert.ok(selectionEntry.includes("dataset.runtimeState = 'ready'"));
assert.ok(selectionEntry.includes("dataset.runtimeState = 'error'"));
assert.ok(selectionRuntime.includes('analysis-not-run'));
assert.ok(selectionRuntime.includes('data-only-item'));
assert.ok(!selectionRuntime.includes('data-drag-id'));
assert.ok(!selectionRuntime.includes('autoScrollWhileDragging'));
assert.ok(!selectionController.includes('document.createElement'));
assert.ok(!selectionController.includes('appendChild'));

for (const [name, source] of Object.entries({ app, appRuntime, orchestrator, school, selectionEntry, selectionRuntime, shell, selectionController })) {
  assert.ok(!source.includes('MutationObserver'), `${name} introduced MutationObserver ownership`);
  assert.ok(!/setTimeout\s*\(/.test(source), `${name} introduced delayed runtime ownership`);
}
for (const forbidden of ['queryButton', 'mobileDirtyButton', 'stopImmediatePropagation']) {
  assert.ok(!shell.includes(forbidden), `shared shell took business action ownership: ${forbidden}`);
}
assert.ok(shell.includes("ROUTE_ORDER = Object.freeze(['home', 'selection', 'selected', 'difficulty'])"));
assert.ok(shell.includes("status.selectedCount > 0 || hasResults"));
assert.ok(registry.includes("mobileActionNeverSubmitsSearch: true"));

assert.ok(cards.includes('<details class="major-card-details">'));
assert.ok(cards.includes('为什么出现、历史对照与核验项'));
assert.ok(cards.includes('major-card-actions--primary'));
assert.ok(cards.includes('可讨论专业 · '));
assert.ok(!read('ln-rank/css/ln-rank-workspace.v3964_0.css').includes('results-title::before'));
for (const copy of ['近两年录取位置基本稳定', '2026年录取所需位次']) {
  assert.ok(!cards.includes(copy), `card copy still contains ${copy}`);
  assert.ok(!history.includes(copy), `history copy still contains ${copy}`);
}

assert.equal(FEISHU_REPORT_CONTRACT.dataYear, 2026);
assert.equal(FEISHU_REPORT_CONTRACT.rankYear, 2026);
assert.equal(FEISHU_REPORT_CONTRACT.audienceYear, 2027);
assert.deepEqual(FEISHU_REPORT_CONTRACT.historicalYears, [2025, 2024]);
assert.equal(FEISHU_REPORT_CONTRACT.historyPlacement, 'appendix-only');
assert.equal(FEISHU_REPORT_CONTRACT.historyParticipatesInCurrentGrouping, false);
for (const [name, source] of Object.entries({ reportClient, reportPayload, reportApi, selectionReportApi })) {
  assert.ok(source.includes('feishu-report-contract.v3964_0.js?v=3964_0'), `${name} is not bound to the active report contract`);
  assert.ok(!source.includes('feishu-report-contract.v3963_1.js'), `${name} retains the stale report contract`);
}
for (const source of [currentReport, selectionReport, styledReport]) {
  assert.ok(source.includes('历史对照附录（不参与2026当前分组）'));
}
const currentList = currentReport.slice(currentReport.indexOf('data.selectedRecords.forEach'), currentReport.indexOf('lines.push("## 历史对照附录'));
assert.ok(!currentList.includes('historyText(record)'), 'current-band items still inline history');
const selectionList = selectionReport.slice(selectionReport.indexOf("lines.push('## 四、最终排序清单"), selectionReport.indexOf("lines.push('## 六、历史对照附录"));
assert.ok(!selectionList.includes('historyText(item)'), 'selection items still inline history');
const itemRuns = styledReport.slice(styledReport.indexOf('function itemRuns'), styledReport.indexOf('function analysisBlocks'));
assert.ok(!itemRuns.includes('historyScoreText(item)'), 'styled current items still inline history');
assert.ok(selectionReport.indexOf('## 六、历史对照附录') < selectionReport.indexOf('## 七、数据和使用边界'));
assert.ok(styledReport.indexOf("heading2('六、历史对照附录") < styledReport.indexOf("heading2('七、数据和使用边界"));

assert.ok(releaseContract.includes('export const LN_RANK_RELEASE_CONTRACT'));
assert.ok(releaseContract.includes('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'));
for (const flag of [
  'staticActionReadinessContract',
  'singleActivePageStylesheetContract',
  'progressiveResultCardContract',
  'reportHistoryAppendixContract',
  'historyNeverParticipatesInCurrentGroupingContract',
  'feishuFrontendRuntimeContract',
  'staticSelectionShellMountContract'
]) {
  assert.equal(active[flag], true, `active manifest missing ${flag}`);
  assert.ok(releaseContract.includes(`${flag}: true`), `release contract missing ${flag}`);
}

const activeCss = new Set(active.cssEntry);
for (const asset of ['../shared/ui/shell/family-shell.v3964_0.css', 'css/ln-rank-workspace.v3964_0.css', 'css/selection-pool.v3964_0.css']) {
  assert.ok(activeCss.has(asset), `active CSS missing ${asset}`);
}
for (const asset of [
  'js/app.v3964_0.js',
  'js/app-runtime.v3964_0.js',
  'js/selection-pool.v3964_0.js',
  'js/selection-pool-runtime.v3964_0.js',
  'js/workspace/selection-workspace-orchestrator.v3964_0.js',
  'js/feature/school-majors/school-all-mode.v3964_0.js',
  '../shared/resources/reports/feishu-report-contract.v3964_0.js',
  'js/feature/feishu/index.v3964_0.js',
  'js/feature/selection-pool/controller.v3964_0.js',
  'js/shared/feishu-api-client.v3964_0.js',
  '../shared/ui/shell/family-shell.v3964_0.js'
]) assert.ok(active.jsEntry.includes(asset), `active JS missing ${asset}`);

console.log(JSON.stringify({
  ok: true,
  contract: 'human-task-ui-v3964_0',
  version: CURRENT_RELEASE.display,
  directMainCss: mainCss,
  directSelectionCss: selectionCss,
  reportHistoryPlacement: FEISHU_REPORT_CONTRACT.historyPlacement
}, null, 2));
