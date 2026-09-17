import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalAdmissionIdentity, isComplete, buildSimulationChoiceHref, parseSimulationChoiceHref, normalizeSimulationChoice } from '../shared/resources/simulation/simulation-choice-contract.v001.js';

const read = path => fs.readFileSync(path, 'utf8');
const html = read('ln-rank/simulation-report.html');
const runtime = read('ln-rank/js/simulation-runtime.js');
const pdf = read('ln-rank/js/simulation-report-pdf-service.js');
const release = JSON.parse(read('ln-rank/data/simulation-workbench-release-v016.json'));
const workflow = read('.github/workflows/verify-simulation-workspace-v016.yml');
const contract = read('shared/resources/simulation/simulation-choice-contract.v001.js');

assert.equal(html.match(/simulation-runtime\.js/g)?.length, 1, 'one simulation runtime owner');
assert.equal(html.match(/simulation-report\.css/g)?.length, 1, 'one simulation CSS owner');
assert.match(html, /simulation-report\.css\?v=v016\.67-r157/);
assert.match(html, /simulation-runtime\.js\?v=v016\.67-r157/);
assert.match(html, /data-simulation-page-version="v1\.3"/);
assert.match(html, /release-footer\.v3990_3\.js\?v=v3990_3&r=r157-simulation-choice-contract/);

assert.equal(release.version, 'simulation-workspace-v016.67');
assert.equal(release.revision, 'r157-simulation-choice-contract');
assert.equal(release.pageVersion, 'v1.3');
assert.equal(release.runtimeRevision, 'v016.67-r157');
assert.equal(release.pdfRuntimeRevision, 'v016.67-r157');
assert.equal(release.choiceContract, '/shared/resources/simulation/simulation-choice-contract.v001.js');
assert.equal(release.architecture.singleStateOwner, true);
assert.equal(release.architecture.singleChoiceContractOwner, true);

for (const token of ['confirmedSchool', 'schoolCode', 'majorQuery', 'majorCode2026', 'majorRecordId', 'admissionProject', 'canonicalAdmissionKey', 'threeYearHistory', 'familyNote', 'source', 'createdAt', 'updatedAt']) assert.match(contract, new RegExp(token));
for (const token of ['canonicalAdmissionIdentity', 'normalizeSimulationChoice', 'buildSimulationChoiceHref', 'parseSimulationChoiceHref', 'writeSimulationChoiceHref']) assert.match(runtime, new RegExp(token));
assert.match(runtime, /state: 'history-error'/);
assert.match(runtime, /state: 'record-missing'/);
assert.match(runtime, /暂时无法获取，请稍后重试/);
assert.match(runtime, /暂无对应投档记录/);
assert.match(pdf, /normalizeSimulationChoice/);
assert.match(pdf, /majorRecordId/);
assert.match(pdf, /majorCode2026/);
assert.match(pdf, /暂无对应投档记录/);
assert.doesNotMatch(pdf, /standardMajorCode.*===|standardMajorCode.*match|majorCode.*includes\(/, 'PDF must not rematch admission identity');

for (const legacy of [
  'browser-simulation-unified-runtime-r149.mjs',
  'browser-simulation-family-note-r152.mjs',
  'browser-simulation-pdf-r149.mjs',
  'browser-simulation-p0-r156.mjs'
]) assert.doesNotMatch(workflow, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `workflow cannot depend on legacy ${legacy}`);
assert.match(workflow, /tools\/browser-simulation-workspace-r157\.mjs/);
assert.match(workflow, /tests\/verify-simulation-choice-contract-r157\.mjs/);

const blank = normalizeSimulationChoice({ id: 'volunteer-row-1', school: '辽宁科技大学', order: 1, state: 'school-entered' });
assert.equal(blank.majorRecordId, '', 'volunteer row id must never become admission record identity');
assert.equal(blank.canonicalAdmissionKey, '', 'incomplete volunteer must not fabricate canonical admission identity');
const note = '学费可以接受，但校区需要再核实。';
assert.equal(normalizeSimulationChoice({ familyNote: note }).familyNote, note, 'family note is free text and must preserve user punctuation');

const explicitProject = normalizeSimulationChoice({ id: 'choice-c', school: '辽宁科技大学', confirmedSchool: '辽宁科技大学', schoolCode: '0146', major: '冶金工程', majorCode2026: '05', majorRecordId: 'ln-2026-0146-05', admissionProject: { kind: 'sino', label: '自定义招生项目' }, threeYearHistory: { status: 'ready', recordId: 'ln-2026-0146-05', years: { 2026: { score: 497, rank: 54846 }, 2025: { score: 494, rank: 59521 }, 2024: { score: 473, rank: 66025 } } } });
assert.equal(explicitProject.admissionProject.kind, 'sino', 'explicit project identity must survive normalization');
assert.equal(explicitProject.admissionProject.label, '自定义招生项目', 'explicit project label must survive normalization');

const ordinary = normalizeSimulationChoice({ id: 'choice-a', school: '辽宁科技大学', confirmedSchool: '辽宁科技大学', schoolCode: '0146', major: '冶金工程', majorCode2026: '05', majorRecordId: 'ln-2026-0146-05', standardMajorName: '冶金工程', standardMajorCode: '080404', threeYearHistory: { status: 'ready', recordId: 'ln-2026-0146-05', years: { 2026: { score: 497, rank: 54846 }, 2025: { score: 494, rank: 59521 }, 2024: { score: 473, rank: 66025 } } } });
const sino = normalizeSimulationChoice({ id: 'choice-b', school: '辽宁科技大学', confirmedSchool: '辽宁科技大学', schoolCode: '0146', major: '冶金工程(中外合作办学)', majorCode2026: 'H1', majorRecordId: 'ln-2026-0146-H1', threeYearHistory: { status: 'ready', recordId: 'ln-2026-0146-H1', years: { 2026: { score: 427, rank: 87013 }, 2025: { score: 448, rank: 82763 }, 2024: { score: 437, rank: 83835 } } } });
assert.equal(canonicalAdmissionIdentity(ordinary).value, 'ln-2026-0146-05');
assert.equal(canonicalAdmissionIdentity(sino).value, 'ln-2026-0146-H1');
assert.notEqual(ordinary.canonicalAdmissionKey, sino.canonicalAdmissionKey);
assert.equal(isComplete(ordinary), true);
assert.equal(isComplete(sino), true);
const href = buildSimulationChoiceHref(sino, { base: '/ln-rank/simulation-report.html' });
const parsed = parseSimulationChoiceHref(`https://gaokao.powers.org.cn${href}`);
assert.equal(parsed.majorRecordId, 'ln-2026-0146-H1');
assert.equal(parsed.majorCode2026, 'H1');
assert.equal(parsed.schoolCode, '0146');
assert.equal(parsed.major, '冶金工程(中外合作办学)');
assert.equal(parsed.hasChoiceIdentity, true);
const fallbackParsed = parseSimulationChoiceHref('https://gaokao.powers.org.cn/ln-rank/simulation-report.html?school=%E8%BE%BD%E5%AE%81%E7%A7%91%E6%8A%80%E5%A4%A7%E5%AD%A6&schoolCode=0146&majorName=%E5%86%B6%E9%87%91%E5%B7%A5%E7%A8%8B&majorCode2026=05');
assert.equal(fallbackParsed.hasChoiceIdentity, true, 'schoolCode + majorCode2026 is the only valid no-record-id fallback identity');
const weakParsed = parseSimulationChoiceHref('https://gaokao.powers.org.cn/ln-rank/simulation-report.html?school=%E8%BE%BD%E5%AE%81%E7%A7%91%E6%8A%80%E5%A4%A7%E5%AD%A6&majorCode2026=05');
assert.equal(weakParsed.hasChoiceIdentity, false, 'majorCode2026 alone is not a canonical identity');

assert.deepEqual(
  ['simulation', 'ln-rank', 'tongxue', 'major-path', 'aiplus'].map(module => parseSimulationChoiceHref(`https://gaokao.powers.org.cn${buildSimulationChoiceHref({ ...sino, source: { module, entry: 'test' } })}`).source.module),
  ['simulation', 'ln-rank', 'tongxue', 'major-path', 'aiplus'],
  'all supported modules must enter through the same SimulationChoice source contract'
);

console.log('simulation choice contract r157: PASS');
