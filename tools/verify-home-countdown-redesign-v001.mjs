import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const home = read('index.html');
const runtime = read('ln-rank/js/ux/family-home.v3990_3.js');
const plan = read('docs/plans/home-countdown-redesign-v001.md');
const release = read('shared/resources/release/current-release.js');

for (const marker of [
  'data-home-ui-revision="r031-home-redesign"',
  'data-home-layout="r031-home-redesign"',
  'data-home-information-architecture-revision="r033-home-problem-entry"',
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
  'data-home-simulation-entry',
  'href="/ln-rank/"',
  'href="/ln-rank/simulation-report.html"',
  'href="/major-path/"',
  'href="/tongxue/"',
  'href="/Public_company/"'
]) assert.ok(home.includes(marker), `homepage missing ${marker}`);

assert.equal((home.match(/id="homePrimaryAction"/g) || []).length, 1, 'homepage must have one primary action');
assert.equal((home.match(/<section class="tool-group" data-tool-group=/g) || []).length, 4, 'homepage must have four explicit tool groups');
assert.equal((home.match(/<button class="tool-toggle" type="button" aria-expanded=/g) || []).length, 4, 'homepage must have four explicit disclosure buttons');
assert.equal((home.match(/aria-controls="tool-panel-/g) || []).length, 4, 'homepage disclosure controls must identify four panels');
assert.equal((home.match(/id="tool-panel-[^"]+" class="tool-list"/g) || []).length, 4, 'homepage must have four disclosure panels');
assert.ok(!/<details\b/i.test(home), 'homepage must not rely on native details disclosure');
assert.ok(!/<summary\b/i.test(home), 'homepage must not rely on native summary activation');
for (const group of ['understand', 'evidence', 'industry']) {
  assert.ok(home.includes('id="tool-panel-' + group + '" class="tool-list" hidden'), group + ' panel must start closed');
}
assert.equal((home.match(/data-home-major-path-entry/g) || []).length, 1, 'major path must have one homepage owner');
assert.equal((home.match(/data-home-industry-map-entry/g) || []).length, 1, 'industry map must have one homepage owner');
assert.equal((home.match(/data-home-simulation-entry/g) || []).length, 1, 'simulation must have one homepage owner');
assert.ok(home.indexOf('data-home-major-path-entry') < home.indexOf('data-score-equivalence-entry="home"'), 'major path must precede score history in DOM');
assert.ok(home.indexOf('data-score-equivalence-entry="home"') < home.indexOf('data-home-industry-map-entry'), 'score history must precede industry map in DOM');
const majorIndex = home.indexOf('<a class="tool-link" data-tool-kind="primary" href="/ln-rank/"');
const simulationIndex = home.indexOf('data-home-simulation-entry');
assert.ok(majorIndex >= 0 && majorIndex < simulationIndex, 'professional selection must precede simulation in mainline');
assert.equal((home.match(/data-home-simulation-entry/g) || []).length, 1, 'simulation must not be duplicated');
assert.equal((home.match(/class="action-section"/g) || []).length, 0, 'retired action section must be removed');
assert.equal((home.match(/class="section-index"/g) || []).length, 0, 'retired numeric section indexes must be removed');
assert.ok(!home.includes('现在先做什么'), 'retired action heading must be removed');
assert.ok(!home.includes('家庭方案与逐项复核'), 'retired family-plan homepage copy must be removed');
assert.ok(!home.includes('今日建议'), 'homepage must not invent a generic daily recommendation');
assert.ok(!home.includes('更多入口'), 'homepage must not use a flat more-entries section');
assert.ok(!home.includes('按天安排节奏'), 'homepage must not restore retired countdown copy');
assert.match(runtime, /HOME_RUNTIME_VERSION = 'family-home-runtime-v3990_3-r031'/);
assert.match(runtime, /HOME_UI_REVISION = 'r031-home-redesign'/);
assert.match(runtime, /HOME_INFORMATION_ARCHITECTURE_VERSION = 'home-information-architecture-v033'/);
assert.match(runtime, /setInterval\(renderCountdown, 1000\)/);
assert.match(runtime, /TOOL_GROUP_RUNTIME_VERSION = 'home-disclosure-stability-v001'/);
assert.match(runtime, /preventScroll: true/);
assert.match(runtime, /window\.scrollTo/);
assert.match(release, /homeEntryVersion: 'family-home-runtime-v3990_3-r031'/);
assert.match(release, /homeUiRevision: 'r031-home-redesign'/);
assert.match(plan, /开始专业初选.*唯一主要动作/);

console.log(JSON.stringify({
  ok: true,
  layout: 'r031-home-redesign',
  informationArchitecture: 'r033-home-problem-entry',
  toolGroups: 4,
  countdownCells: 4,
  primaryActions: 1,
  preservedRoutes: ['/ln-rank/', '/ln-rank/simulation-report.html', '/major-path/', '/tongxue/', '/Public_company/']
}, null, 2));
