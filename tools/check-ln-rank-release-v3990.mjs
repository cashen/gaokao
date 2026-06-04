import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATEGORIES_2026_FULL, STANDARD_MAJOR_DISCIPLINES_2026 } from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import { KB_REGISTRY } from '../functions/_lib/kb/kb-registry.js';
import { MAJOR_FILTER_PRESET_KB } from '../functions/_lib/kb/major-filter-preset-kb.generated.js';
import { PROJECT_ATTRIBUTE_KB } from '../functions/_lib/kb/project-attribute-kb.generated.js';
import { classifyKeywordTokens } from '../functions/_lib/kb/keyword-token-classifier.js';
import { findCatalogMajorByNameOrCode } from '../functions/_lib/kb/catalog-accessor.js';
import { buildReviewPointsForRecord } from '../functions/_lib/kb/review-point-builder.js';
import { buildFeishuReport } from '../functions/_lib/feishu-report-builder.js';
import { buildSelectionPoolFeishuReport } from '../functions/_lib/feishu-selection-pool-report-builder.js';
import { buildSelectionPoolStyledBlocks } from '../functions/_lib/feishu-selection-pool-styled-builder.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function exists(p) { assert(fs.existsSync(path.join(root, p)), `missing ${p}`); }
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }

assert(STANDARD_MAJOR_CATALOG_2026_FULL.length === 883, 'full catalog not 883');
assert(STANDARD_MAJOR_CATEGORIES_2026_FULL.length === 92, 'category count not 92');
assert(STANDARD_MAJOR_DISCIPLINES_2026.length === 13, 'discipline count not 13');
for (const layer of Object.values(KB_REGISTRY.layers)) exists('functions/_lib/kb/' + layer.module.replace('./', ''));
assert(MAJOR_FILTER_PRESET_KB.defaultPresets.length === 10, 'default preset count changed');
assert(PROJECT_ATTRIBUTE_KB.items.sinoForeign, 'missing sinoForeign project attribute');

for (const p of [
  'ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html','ln-rank/self-check.html',
  'ln-rank/js/app.v3990.js','ln-rank/js/selection-pool.v3987.js','ln-rank/js/self-check.v3990.js',
  'ln-rank/js/keyword-token-classifier.v3990.js','ln-rank/js/review-point-builder.v3990.js',
  'functions/api/ln-rank-self-check.js'
]) exists(p);

for (const html of ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html','ln-rank/self-check.html']) {
  const text = read(html);
  const refs = [...text.matchAll(/(?:href|src)="\.\/([^"?]+)(?:\?[^" ]*)?"/g)].map(m => 'ln-rank/' + m[1]);
  for (const ref of refs) exists(ref);
}


for (const html of ['ln-rank/index.html','ln-rank/selection-pool.html']) {
  const text = read(html);
  assert(text.includes('版本：v3.9.9.0'), `${html} visible footer version not v3.9.9.0`);
  assert(!/版本：v3\.9\.8\.6/.test(text), `${html} still shows v3.9.8.6`);
}
assert(read('ln-rank/js/major-trend-render.v3990.js').includes('版本：v3.9.9.0'), 'major trend visible version not v3.9.9.0');
assert(!/major-trend-rules\.v3986/.test(read('ln-rank/js/major-trend-render.v3990.js')), 'major trend render still imports v3986 rules');
assert(/card-review-details/.test(read('ln-rank/js/feature/major-pool/major-pool-render.v3987.js')), 'card review details not collapsed');
assert(/快速判断带|band-tab/.test(read('ln-rank/css/layout-shell.v3990.css')), 'score band quick strip css missing');
assert(/控制面板|search-workbench/.test(read('ln-rank/css/search-workbench.v3990.css')), 'compact search workbench css missing');
assert(/UI readability/.test(read('ln-rank/css/major-search.v3990.css')), 'UI readability css missing');
assert(read('ln-rank/index.html').includes('bottomline.v3990.css'), 'index does not use bottomline v3990');
assert(read('ln-rank/index.html').includes('search-workbench.v3990.css'), 'index does not use compact search workbench v3990');
assert(/办学性质提醒|公办底线紧凑|v3\.9\.8\.9/.test(read('ln-rank/css/bottomline.v3990.css') + read('ln-rank/js/app.v3990.js')), 'bottomline compact assets missing');


const cases = [
  ['机械设计制造及其自动化','mechanical_vehicle','080202',''],
  ['自动化','electrical_energy','080801',''],
  ['园艺','agri_food_env','090102',''],
  ['园林','agri_food_env','090502',''],
  ['风景园林','civil_arch_transport','082803',''],
  ['动物医学','agri_food_env','090401',''],
  ['食品科学与工程','agri_food_env','082701',''],
  ['中外','','','sinoForeign'],
  ['电气 中外','electrical_energy','','sinoForeign'],
  ['具身智能','computer_ai_software','140012TK',''],
  ['脑机科学与技术','medical_applied','140013TK',''],
  ['智能医学工程','medical_applied','140007T',''],
  ['公费师范','','','publicTeacher'],
  ['定向','','','targeted']
];
for (const [input, direction, code, project] of cases) {
  const classified = classifyKeywordTokens(input);
  if (direction) assert(classified.majorDirectionTokens[0]?.directionId === direction, `${input} direction mismatch`);
  if (project) assert(classified.projectAttributeTokens[0]?.id === project, `${input} project mismatch`);
  if (code) assert(findCatalogMajorByNameOrCode(input)?.code === code, `${input} code mismatch`);
  const points = buildReviewPointsForRecord({ major: input, standardMajor: findCatalogMajorByNameOrCode(input) || {} });
  assert(Array.isArray(points), `${input} review points not array`);
}

const rec = { school: '测试大学', major: '电气工程及其自动化', score2025: 520, rank2025: 40000, scoreDelta: 0, statusLabel: '主要参考', position: '主要承接', matchLabel: '精准匹配', matchReason: '专业名称直接包含该词', standardMajor: { code: '080601', name: '电气工程及其自动化', categoryCode: '0806', categoryName: '电气类', mappingStatus: 'exact' } };
const basic = buildFeishuReport({ candidateScore: 520, selectedBand: { key: 'near', title: '主要参考', rangeText: '515-525' }, filters: { region: 'all', majorKeyword: '电气' }, dataScope: '2025历史', counts: { upper: 1, near: 1, steady: 1, total: 3 }, selectedRecords: [rec], rangePreset: 'standard', keywordQuery: { rawKeywords: ['电气'] }, matchSummary: { exact: 1 } });
const pool = buildSelectionPoolFeishuReport({ candidateScore: 520, items: [rec], reportType: 'selectionPoolWithAnalysis', analysis: { summary: '整体可以作为重点核验', stats: { total: 1, rushCount: 0, stableCount: 1, safeCount: 0 }, aiNarrative: { overall: '整体可以作为重点核验', structureDiagnosis: '专业结构待补充', actions: ['建议补充后段专业'] } } });
const styled = buildSelectionPoolStyledBlocks({ title: '测试报告', candidateScore: 520, items: [rec], stats: { total: 1 }, summary: pool.summary, hasAnalysis: false });
const forbidden = /payload|raw|source|debug|model|JSON|workers-ai|fallback|AI_PATH_MODEL|internalDerived|sourceLevel/i;
for (const [name, text] of [['basic', basic.markdown], ['pool', pool.markdown]]) {
  assert(text.includes('专业+学校'), `${name} missing policy line`);
  assert(text.includes('专业代码'), `${name} missing major code`);
  assert(!forbidden.test(text), `${name} leaked technical word`);
}
assert(Array.isArray(styled) && styled.length > 5, 'styled report smoke failed');

for (const p of ['fenxi','functions/fenxi','functions/_middleware.js']) assert(!fs.existsSync(path.join(root, p)), `forbidden path present ${p}`);
console.log('check-ln-rank-release-v3990 ok');
