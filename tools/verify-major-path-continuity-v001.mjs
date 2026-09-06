import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  MAJOR_PATH_NAVIGATION_META,
  buildMajorPathHref,
  inspectMajorPathReturnTarget,
  readMajorPathSourceContext
} from '../shared/resources/majors/major-path-navigation.v004.js';

const read = path => fs.readFileSync(path, 'utf8');
const app = read('major-path/app.v006.js');
const core = read('major-path/app-core.v006.js');
const background = read('major-path/background-context.v002.js');
const html = read('major-path/index.html');

assert.equal(MAJOR_PATH_NAVIGATION_META.version, 'major-path-navigation-v0.04');
assert.deepEqual(inspectMajorPathReturnTarget(''), { target: '', state: 'missing' });
assert.equal(inspectMajorPathReturnTarget('https://evil.example/x').state, 'invalid');
assert.equal(inspectMajorPathReturnTarget('/ln-rank/?score=580#results').state, 'available');

const href = buildMajorPathHref({
  majorCode: '080301', canonicalName: '测控技术与仪器', sourceSurface: 'tongxue-major', returnTo: '/tongxue/?scope=major'
});
const url = new URL(href, 'https://gaokao.powers.org.cn');
assert.equal(url.searchParams.get('from'), 'tongxue');
assert.equal(url.searchParams.get('sourceSurface'), 'tongxue-major');
assert.equal(url.searchParams.get('returnState'), 'available');

const longContext = { contextId: 'x'.repeat(40), sourceSurface: 'ln-rank', sourceAction: 'view_major_path', score: 580, selectionSnapshot: Array.from({ length: 8 }, (_, i) => ({ id: `record-${i}`, school: '辽宁某大学', major: '工程管理', regionLabel: '辽宁', score: 580, rank: 10000 })) };
const longHref = buildMajorPathHref({ majorCode: '120103', canonicalName: '工程管理', sourceSurface: 'ln-rank-score', returnTo: `/ln-rank/?note=${'x'.repeat(1700)}`, decisionContext: longContext });
const longUrl = new URL(longHref, 'https://gaokao.powers.org.cn');
assert.equal(longUrl.searchParams.get('contextState'), 'omitted');
assert.equal(readMajorPathSourceContext(longUrl).contextState, 'omitted');

assert.match(app, /contextForMajor/);
assert.match(app, /decisionContext: null/);
assert.doesNotMatch(app, /history\.back\(\)/);
assert.match(core, /method="get"|majorHref/);
assert.match(core, /class="disambiguation-card" data-major-code=.*href=/);
assert.match(background, /AbortController/);
assert.match(background, /major-background-retry/);
assert.match(html, /action="\/major-path\/" method="get"/);
assert.match(html, /name="major"/);

console.log(JSON.stringify({
  ok: true,
  version: 'major-path-continuity-verifier-v0.01',
  sourceStates: ['available', 'missing', 'invalid'],
  contextIsolation: true,
  nativeFallback: true,
  offlineRetry: true
}, null, 2));
