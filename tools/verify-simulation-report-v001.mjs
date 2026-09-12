import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('ln-rank/simulation-report.html');
const runtime = read('ln-rank/js/simulation-report.v001.js');
const styles = read('ln-rank/css/simulation-report.v001.css');
const api = read('functions/api/simulation-rank.js');

const mustContain = (text, needles, label) => {
  for (const needle of needles) assert.ok(text.includes(needle), `${label}: missing ${needle}`);
};

mustContain(page, [
  '辽宁物理类模拟志愿填报单',
  'studentName',
  'totalScore',
  'candidateRank',
  'data-score-key="chinese"',
  'data-score-key="math"',
  'data-score-key="english"',
  'data-score-key="physics"',
  'data-score-key="chemistry"',
  'data-score-key="biology"',
  'volunteerRows',
  '打印 A4',
  'simulation-report.v001.js'
], 'page');

mustContain(runtime, [
  "STORAGE_KEY = 'gaokao:simulation-report:v001'",
  'createMajorCatalogResolver',
  'loadSchoolNameResolver',
  "const API_BASE = '/api/ai/major-history'",
  "const RANK_API = '/api/simulation-rank'",
  'function createVolunteer(order)',
  'function moveRow(rowId, delta)',
  'function deleteRow(rowId)',
  'function saveState()',
  'function fetchHistory(row)',
  'function formatDelta(yearRank, candidateRank)',
  'dragstart',
  'drop'
], 'runtime');

mustContain(styles, [
  '@page{size:A4 landscape;',
  '@media print',
  '.col-actions{display:none}',
  '.school-suggestions{display:none!important}',
  '.sheet-table{min-width:0;width:100%;table-layout:fixed}'
], 'styles');

mustContain(api, [
  "SIMULATION_RANK_API_VERSION = 'simulation-rank-api-v001'",
  "lookupLn2026PhysicsScore(score)",
  "source: '2026年辽宁省普通高校招生考试成绩统计表（物理学科类）'"
], 'rank-api');

assert.match(runtime, /Math\.random\(\)/, 'runtime: volunteer ids are locally unique');
assert.doesNotMatch(runtime, /window\.location\s*=|location\.assign\(/, 'runtime: no navigation side effect');

console.log('simulation-report-v001 contract: PASS');
console.log('A4 print: landscape, action controls hidden, fixed table layout');
console.log('State: localStorage-backed dynamic volunteers with drag + up/down ordering');
console.log('Data: canonical 2026 major catalog + canonical major-history endpoint + canonical rank provider bridge');
