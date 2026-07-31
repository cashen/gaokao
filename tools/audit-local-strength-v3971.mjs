import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const html = read('ln-rank/local-mainline.html');
const app = read('ln-rank/js/local-strength/local-strength-app.v3971_0.js');
const css = read('ln-rank/css/local-strength.v3971_0.css');
const api = read('functions/_lib/local-strength-api.js');
const endpoint = read('functions/api/local-strength.js');
const release = read('shared/resources/release/current-release.js');
const presenter = read('shared/resources/release/release-presenter.v3971_0.js');

for (const required of [
  '/shared/ui/tokens/foundation.v3959_0.css',
  '/shared/ui/tokens/semantic.v3959_0.css',
  '/shared/ui/shell/family-shell.v3970_0.css',
  '/ln-rank/css/local-strength.v3971_0.css',
  '/ln-rank/js/local-strength/local-strength-app.v3971_0.js',
  'data-ui-page="background"',
  '全部背景专业',
  '按分数位置看',
  '按学校查询'
]) assert(html.includes(required), `local-mainline missing ${required}`);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert(new Set(ids).size === ids.length, 'local-mainline contains duplicate ids');
assert(!html.includes('academic-background-app.v3968_0.js'), 'local page still loads legacy runtime');
assert(!html.includes('family-shell.v3965_0'), 'local page still loads legacy shell');

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
assert(app.includes("view: 'list_all'"), 'list_all is not the default complete directory');
assert(app.includes('pageSizeForViewport'), 'responsive pagination missing');
assert(app.includes('schoolStatus'), 'school empty-state contract missing');
assert(css.includes('@media(max-width:767px)'), 'Android layout missing');
assert(css.includes('@media(max-width:1023px)'), 'Pad layout missing');
assert(css.includes('overflow-x:hidden'), 'horizontal overflow guard missing');

for (const required of [
  "display: 'v3.9.71.0'",
  "localStrengthVersion: 'local-strength-v3971_0'",
  "localStrengthApi: '/functions/api/local-strength.js'",
  "localStrengthPage: '/ln-rank/local-mainline.html'",
  "releasePresenter: '/shared/resources/release/release-presenter.v3971_0.js'"
]) assert(release.includes(required), `release contract missing ${required}`);
assert(presenter.includes('current-release.js?v=3971_0'), 'release presenter query not synchronized');

console.log(JSON.stringify({
  ok: true,
  page: '/ln-rank/local-mainline.html',
  release: 'v3.9.71.0',
  checks: {
    unifiedUi: true,
    fullRecordScan: true,
    localAnd211Background: true,
    coverageAudit: true,
    responsivePagination: true,
    uniqueIds: true
  }
}, null, 2));
