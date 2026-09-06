import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const context = read('shared/decision-context/decision-context.v001.js');
const snapshot = read('shared/decision-context/return-snapshot.v001.js');
const school = read('ln-rank/js/feature/school-majors/school-all-mode.v3969_2.js');
const scoreCards = read('ln-rank/js/workspace/family-card-presenter.v3967_0.js');
const handoff = read('ln-rank/js/workspace/major-path-handoff.v003.js');
const majorStudentVoice = read('major-path/student-voice.v001.js');
const tongxue = read('tongxue/app/tongxue-runtime-result-view-v159.js');
const release = read('shared/resources/release/current-release.js');
const manifest = read('shared/resources/release/active-resource-manifest.v3990_3.js');
const plan = read('docs/plans/unified-cross-module-context-handoff-v001.md');

for (const [label, source, needles] of [
  ['context contract', context, ['resultMode', 'returnAnchor', 'contextKey']],
  ['snapshot owner', snapshot, ['RETURN_SNAPSHOT_MAX_ENTRIES', 'RETURN_SNAPSHOT_TTL_MS', 'sessionStorage', 'restoreReturnSnapshot']],
  ['school results handoff', school, ['createDecisionContext', 'buildTongxueSchoolHref', 'returnAnchor', 'captureCurrentReturnSnapshot']],
  ['score result handoff', scoreCards, ['createDecisionContext', 'buildTongxueSchoolHref', 'captureCurrentReturnSnapshot']],
  ['major result handoff', handoff, ['rememberBeforeNavigate', 'resultMode', 'returnAnchor']],
  ['major path student voice', majorStudentVoice, ['decisionContext', 'sourceKey', 'captureCurrentReturnSnapshot']],
  ['Tongxue copy', tongxue, ['回到来源查询', '独立查询']],
  ['release registration', release, ['crossModuleContextHandoffVersion', 'returnSnapshotVersion', 'returnSnapshot']],
  ['resource manifest', manifest, ['crossModuleContextHandoff', 'same-origin-bounded-readonly-context-and-return-snapshot-v001']],
  ['durable plan', plan, ['断网边界', '完成条件', 'head SHA']]
]) {
  for (const needle of needles) assert.ok(source.includes(needle), `${label} missing ${needle}`);
}
assert.ok(!school.includes('location.href =') && !handoff.includes('window.open('), 'handoff must keep explicit same-tab navigation ownership');
console.log('unified cross-module context handoff v001 static contract passed');

