import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const page = read('tongxue/index.html');
const searchView = read('tongxue/app/tongxue-runtime-search-view-v159.js');
const resultView = read('tongxue/app/tongxue-runtime-result-view-v159.js');
const release = read('shared/resources/release/current-release.js');
const changelog = read('tongxue/changelog.html');

assert.ok(page.includes('data-tongxue-ui-revision="r052-tongxue-school-social-labels"'), 'Tongxue UI revision marker missing');
assert.ok(page.includes('<a class="brand" href="/tongxue/" data-tongxue-home>'), 'Tongxue home must be a native link');
assert.ok(page.includes('r=r052-tongxue-school-social-labels'), 'Tongxue wrapper cache identity missing');
assert.ok(!page.includes('r=r040-human-reading-flow"'), 'retired Tongxue UI cache identity still active');
assert.ok(searchView.includes('ui.result?.contains(document.activeElement)'), 'result-internal viewport guard missing');
assert.ok(resultView.includes('这是一次独立查询'), 'standalone direct-entry context missing');
assert.ok(resultView.includes('回到专业升学地图'), 'major-path return label missing');
assert.ok(resultView.includes('回到刚才的分数结果'), 'ln-rank return label missing');
assert.ok(release.includes("releaseRevision: 'r052-tongxue-school-social-labels'"), 'canonical release revision missing');
assert.ok(release.includes("tongxueHumanJourneyUiVersion: 'tongxue-human-journey-ui-v003'"), 'Tongxue UI capability version missing');
assert.ok(changelog.includes('r052-tongxue-school-social-labels'), 'Tongxue changelog entry missing');

console.log(JSON.stringify({
  ok: true,
  contract: 'tongxue-human-journey-ui-v001',
  revision: 'r052-tongxue-school-social-labels',
  nativeHomeLink: true,
  resultInternalViewportPreserved: true,
  standaloneContextExplained: true,
  releaseRevision: 'r052-tongxue-school-social-labels'
}, null, 2));
