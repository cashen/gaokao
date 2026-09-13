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
  '打印 A4',
  '<th colspan="9">',
  '<th class="col-actions">调整</th>'
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
  '.print-student-head th{display:table-cell!important}',
  '.col-check{width:36%;min-width:360px;display:none}',
  '.col-check{display:table-cell;width:36%;min-width:0}',
  '.col-school{width:15%}',
  '.col-major{width:18%}',
  '.history-cell{width:7%}',
  '.delta-cell{width:6%}',
  '.print-blank-wide{min-height:17px}'
], 'styles');

assert.equal(page.includes('学费：待核实'), false, 'page: must not hardcode 学费：待核实');
assert.equal(page.includes('校区：待核实'), false, 'page: must not hardcode 校区：待核实');
assert.equal(page.includes('2026招生计划：待核实'), false, 'page: must not hardcode 2026招生计划：待核实');
assert.match(runtime, /text \? esc\(text\) : '&nbsp;'/, 'runtime: blank manual fields remain blank in print');
assert.match(runtime, /readStored\(STORAGE_KEY\) \|\| readStored\(LEGACY_STORAGE_KEY\)/, 'runtime: legacy storage migration path exists');
assert.match(runtime, /manualCheck: \{ \.\.\.emptyManualCheck\(\), \.\.\.\(row\?\.manualCheck \|\| \{\}\) \}/, 'runtime: v001 rows gain empty manual fields');
assert.match(page, /<thead>[\s\S]*print-student-head[\s\S]*志愿[\s\S]*学校[\s\S]*专业（代码→中文）[\s\S]*报考核对[\s\S]*调整/, 'page: repeatable print head and nine-column screen table are aligned');

console.log('simulation-report-v002-paper-check-sheet: PASS');
console.log('Manual check fields: labels reserved, empty values remain blank');
console.log('Screen: manual check column hidden; expanded panel remains the editing surface');
console.log('Print: A4 landscape, repeating thead, non-splittable volunteer rows');
console.log('Print widths: 4+15+18+36+7+7+7+6 = 100%');
console.log('Compatibility: v001 localStorage data migrates into v002 without new admissions data owners');
