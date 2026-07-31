import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const html = read('ln-rank/local-mainline.html');
const app = read('ln-rank/js/local-strength/local-strength-app.v3971_1.js');
const css = read('ln-rank/css/local-strength.v3971_1.css');
const api = read('functions/_lib/local-strength-api.js');
const endpoint = read('functions/api/local-strength.js');
const release = read('shared/resources/release/current-release.js');
const presenter = read('shared/resources/release/release-presenter.v3971_1.js');

for (const required of [
  '/shared/ui/tokens/foundation.v3959_0.css',
  '/shared/ui/tokens/semantic.v3959_0.css',
  '/shared/ui/shell/family-shell.v3970_0.css',
  '/ln-rank/css/local-strength.v3971_1.css',
  '/ln-rank/js/local-strength/local-strength-app.v3971_1.js',
  'role="tablist"',
  'role="tabpanel"',
  '没有具体分数？按分数段浏览',
  'data-filter-summary',
  '全部背景专业',
  '按分数位置看',
  '按学校查询'
]) assert(html.includes(required), `local-mainline missing ${required}`);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert(new Set(ids).size === ids.length, 'local-mainline contains duplicate ids');
assert(!html.includes('local-strength-app.v3971_0.js'), 'local page still loads old runtime');
assert(!html.includes('local-strength.v3971_0.css'), 'local page still loads old styles');
assert(!html.includes('academic-background-app.v3968_0.js'), 'local page still loads legacy runtime');

for (const required of [
  'loadAllRecords',
  "matchAcademicBackground(record, 'liaoning')",
  "matchAcademicBackground(record, '211')",
  'evaluatedRecordCount',
  'localAdmissionRecordCount',
  'duplicatePublicRecordCount',
  "mode === 'list_all'",
  'pageSize',
  'OUT_OF_SCOPE_CAMPUSES'
]) assert(api.includes(required), `local strength api missing ${required}`);
assert(endpoint.includes('handleLocalStrengthRequest'), 'local strength endpoint is not wired');

for (const required of [
  "view: 'list_all'",
  'scoreView:',
  'schoolView:',
  'listView:',
  'commonFilters:',
  'setResultsIdle',
  'renderActiveFilters',
  'bindTabsKeyboard',
  'pageSizeForViewport',
  'firstRecordIndex',
  'schoolStatus'
]) assert(app.includes(required), `human UI runtime missing ${required}`);
assert(!app.includes("if (state.q) params.set('q', state.q)"), 'hidden global query state can still pollute other modes');

for (const required of [
  '.ls-chip-row{display:grid',
  'grid-template-columns:repeat(2,minmax(0,1fr))',
  '.ls-tab-label-short{display:inline}',
  '.ls-pagination{display:grid;grid-template-columns:1fr auto 1fr',
  '.ls-summary{order:4',
  '@media(max-width:767px)',
  '@media(max-width:1023px)',
  'overflow-x:hidden'
]) assert(css.includes(required), `responsive human UI styles missing ${required}`);
assert(!css.includes('.ls-chip-row{display:flex'), 'score bands still use horizontal flex scrolling');

for (const required of [
  "display: 'v3.9.71.1'",
  "localStrengthVersion: 'local-strength-v3971_1'",
  "localStrengthRuntime: '/ln-rank/js/local-strength/local-strength-app.v3971_1.js'",
  "localStrengthStyles: '/ln-rank/css/local-strength.v3971_1.css'",
  "releasePresenter: '/shared/resources/release/release-presenter.v3971_1.js'"
]) assert(release.includes(required), `release contract missing ${required}`);
assert(presenter.includes('current-release.js?v=3971_1'), 'release presenter query not synchronized');

console.log(JSON.stringify({
  ok: true,
  page: '/ln-rank/local-mainline.html',
  release: 'v3.9.71.1',
  checks: {
    unifiedUi: true,
    fullRecordScan: true,
    modeIsolation: true,
    scoreBandGrid: true,
    idleContext: true,
    filterDisclosure: true,
    responsivePagination: true,
    resizeContinuity: true,
    uniqueIds: true
  }
}, null, 2));