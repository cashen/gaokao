import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('ln-rank/simulation-report.html');
const runtime = read('ln-rank/js/simulation-report.v001.js');
const styles = read('ln-rank/css/simulation-report.v001.css');

const mustContain = (text, needles, label) => {
  for (const needle of needles) assert.ok(text.includes(needle), `${label}: missing ${needle}`);
};

mustContain(page, [
  'simulation-report.v001.css?v=002-paper-check',
  '辽宁物理类模拟志愿填报单',
  'volunteerRows',
  'col-check',
  '报考核对',
  'sheet-title',
  'printStudentName',
  'printTotalScore',
  'printRank',
  'printSubject',
  'printDate',
  '打印 A4'
], 'page');

mustContain(runtime, [
  "const STORAGE_KEY = 'gaokao:simulation-report:v002'",
  "const LEGACY_STORAGE_KEY = 'gaokao:simulation-report:v001'",
  'function emptyManualCheck()',
  'function normalizeVolunteer(row, index)',
  'manualCheck',
  'institutionCode',
  'groupCode',
  'campus',
  'studyLocation',
  'tuition',
  'accommodationFee',
  'planCount',
  'studyLength',
  'trainingMode',
  'subjectRequirement',
  'remark',
  'familyDecision',
  'familyStatus',
  'familyNote',
  "state.volunteers.length >= 30",
  'function moveRow(rowId, delta)',
  'dragstart',
  'drop',
  'function fetchHistory(row)',
  'function fetchCandidateRank()'
], 'runtime');

mustContain(styles, [
  '@page{size:A4 landscape;',
  '@media print',
  '.sheet-table thead{display:table-header-group}',
  '.sheet-table tbody tr{break-inside:avoid;page-break-inside:avoid}',
  '.col-actions{display:none!important}',
  '.print-student-head th{display:table-cell!important}'
], 'styles');

assert.equal(page.includes('学费：待核实'), false, 'print/page: must not hardcode 学费：待核实');
assert.equal(page.includes('校区：待核实'), false, 'print/page: must not hardcode 校区：待核实');
assert.equal(page.includes('2026招生计划：待核实'), false, 'print/page: must not hardcode 2026招生计划：待核实');
assert.match(runtime, /const shown = text \? esc\(text\) : '&nbsp;';/, 'runtime: blank manual fields remain blank in print');
assert.match(runtime, /localStorage\.getItem\(STORAGE_KEY\) \|\| localStorage\.getItem\(LEGACY_STORAGE_KEY\)/, 'runtime: legacy storage migration path exists');
assert.match(runtime, /return \{[\s\S]*version: 2,[\s\S]*manualCheck: \{ \.\.\.emptyManualCheck\(\), \.\.\.\(row\?\.manualCheck \|\| \{\}\) \}/, 'runtime: v001 rows gain empty manual fields');
assert.match(page, /<thead>[\s\S]*print-student-head[\s\S]*志愿[\s\S]*学校[\s\S]*专业（代码→中文）[\s\S]*报考核对/, 'page: repeatable print head contains student identity and column head');

console.log('simulation-report-v002-paper-check-sheet: PASS');
console.log('Manual check fields: labels reserved, empty values remain blank');
console.log('Print: A4 landscape, repeating thead, non-splittable volunteer rows');
console.log('Compatibility: v001 localStorage data migrates into v002 without new admissions data owners');
