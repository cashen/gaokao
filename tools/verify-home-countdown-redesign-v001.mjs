import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const home = read('index.html');
const runtime = read('ln-rank/js/ux/family-home.v3990_2.js');
const plan = read('docs/plans/home-countdown-redesign-v001.md');
const release = read('shared/resources/release/current-release.js');

for (const marker of [
  'data-home-ui-revision="r031-home-redesign"',
  'data-home-layout="r031-home-redesign"',
  'id="homePrimaryAction"',
  'id="examCountdown"',
  'data-countdown-precision="second"',
  'id="d2027"',
  'id="h2027"',
  'id="m2027"',
  'id="s2027"',
  'data-tool-group="mainline"',
  'data-tool-group="understand"',
  'data-tool-group="evidence"',
  'data-tool-group="industry"',
  'data-home-major-path-entry',
  'data-score-equivalence-entry="home"',
  'data-home-industry-map-entry',
  'href="/ln-rank/"',
  'href="/ln-rank/selection-pool.html"',
  'href="/major-path/"',
  'href="/tongxue/"',
  'href="/Public_company/"'
]) assert.ok(home.includes(marker), `homepage missing ${marker}`);

assert.equal((home.match(/id="homePrimaryAction"/g) || []).length, 1, 'homepage must have one primary action');
assert.equal((home.match(/<details class="tool-group" data-tool-group=/g) || []).length, 4, 'homepage must have four tool groups');
assert.equal((home.match(/data-home-major-path-entry/g) || []).length, 1, 'major path must have one homepage owner');
assert.equal((home.match(/data-home-industry-map-entry/g) || []).length, 1, 'industry map must have one homepage owner');
assert.ok(home.indexOf('data-home-major-path-entry') < home.indexOf('data-score-equivalence-entry="home"'), 'major path must precede score history in DOM');
assert.ok(home.indexOf('data-score-equivalence-entry="home"') < home.indexOf('href="/ln-rank/selection-pool.html"'), 'score history must precede family plan in DOM');
assert.ok(home.indexOf('data-score-equivalence-entry="home"') < home.indexOf('data-home-industry-map-entry'), 'score history must precede industry map in DOM');
assert.ok(!home.includes('今日建议'), 'homepage must not invent a generic daily recommendation');
assert.ok(!home.includes('更多入口'), 'homepage must not use a flat more-entries section');
assert.ok(!home.includes('按天安排节奏'), 'homepage must not restore retired countdown copy');
assert.match(runtime, /HOME_RUNTIME_VERSION = 'family-home-runtime-v3990_2-r031'/);
assert.match(runtime, /HOME_UI_REVISION = 'r031-home-redesign'/);
assert.match(runtime, /setInterval\(renderCountdown, 1000\)/);
assert.match(release, /homeEntryVersion: 'family-home-runtime-v3990_2-r031'/);
assert.match(release, /homeUiRevision: 'r031-home-redesign'/);
assert.match(plan, /开始专业初选.*唯一主要动作/);

console.log(JSON.stringify({
  ok: true,
  layout: 'r031-home-redesign',
  toolGroups: 4,
  countdownCells: 4,
  primaryActions: 1,
  preservedRoutes: ['/ln-rank/', '/ln-rank/selection-pool.html', '/major-path/', '/tongxue/', '/Public_company/']
}, null, 2));
