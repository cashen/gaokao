import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(ROOT, file), content);
const replaceOne = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, got ${count}`);
  return source.replace(before, after);
};

let html = read('ln-rank/index.html');
html = replaceOne(html, 'data-release="v3.9.68.0"', 'data-release="v3.9.69.0"', 'page release');
html = replaceOne(html, '<span data-current-release>v3.9.68.0</span>', '<span data-current-release>v3.9.69.0</span>', 'visible release');
html = replaceOne(html, '/ln-rank/js/app.v3968_0.js?v=3968_0', '/ln-rank/js/app.v3969_0.js?v=3969_0', 'app entry');
html = replaceOne(html, 'placeholder="如：大连、辽宁大学"', 'placeholder="如：辽大、沈阳化工大学；城市请用地区"', 'school placeholder');
html = replaceOne(html, '完整学校名称会尽量按本部、分校、校区精确筛选；只输入名称片段时按学校名称包含关系扩大查看。', '学校条件统一按正式校名、简称和学校实体解析；查看沈阳、大连等城市范围请使用地区条件。', 'school help');
write('ln-rank/index.html', html);
write('VERSION.txt', 'v3.9.69.0\n');

let releaseContract = read('functions/_lib/release-contract.js');
releaseContract = replaceOne(releaseContract,
  '  schoolSelectionLightRefreshContract: true,',
  `  schoolSelectionLightRefreshContract: true,
  unifiedSchoolQueryContract: true,
  schoolRegionNameAmbiguityContract: true,
  noSilentSchoolCandidateTruncationContract: true,
  admissionRecordCountTiebreakOnlyContract: true,
  scoreSchoolReportQueryParityContract: true,`,
  'release school contracts');
write('functions/_lib/release-contract.js', releaseContract);

function updateMeta(file) {
  const data = JSON.parse(read(file));
  data.version = 'v3.9.69.0';
  data.assetVersion = 'v3969_0';
  data.releaseName = 'v3.9.69.0-unified-school-query-admission-directory-no-fenxi';
  data.generatedAt = new Date().toISOString();
  data.releaseGate = 'resource-execution-v3969_0, unified-school-query, no-silent-candidate-truncation, region-name-ambiguity, admission-directory-trace, protected-fenxi-runtime-unchanged';
  data.sharedResourceCenterVersion = 'v3969_0';
  data.resourceOwnershipVersion = 'resource-ownership-v3969_0';
  data.resourceExecutionVersion = 'resource-execution-v3969_0';
  data.derivationTraceVersion = 'derivation-trace-v3969_0';
  data.uiOrchestrationVersion = 'ui-orchestration-v3969_0';
  data.selectionWorkspaceVersion = 'selection-workspace-orchestration-v3969_0';
  data.searchIntentVersion = 'school-query-contract-v3969_0';
  data.schoolQueryVersion = 'school-query-contract-v3969_0';
  data.schoolAdmissionDirectoryVersion = 'liaoning-2026-admission-school-directory-v3969_0';
  data.algorithmOrchestrationVersion = 'algorithm-orchestration-v3969';
  data.runtimeCacheQueryVersion = 'v3969_0';
  data.runtimeCacheContractVersion = 'runtime-cache-coherence-v3969_0';
  data.mainJs = 'js/app.v3969_0.js';
  data.mainRuntimeJs = 'js/app-runtime.v3969_0.js';
  data.runtimeCacheResource = '../shared/resources/release/runtime-cache-contract.v3969_0.js';
  data.sharedSchoolQueryContract = '../shared/resources/schools/school-query-contract.v3969_0.js';
  data.sharedSchoolQueryEngine = '../shared/resources/schools/school-query-engine.v3969_0.js';
  data.sharedSchoolAdmissionDirectory = '../shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json';
  data.schoolQueryProvider = '../functions/_lib/school-query-provider.v3969.js';
  const replacements = new Map([
    ['js/app.v3968_0.js','js/app.v3969_0.js'],
    ['js/app-runtime.v3968_0.js','js/app-runtime.v3969_0.js'],
    ['../shared/resources/release/runtime-cache-contract.v3968_0.js','../shared/resources/release/runtime-cache-contract.v3969_0.js'],
    ['../shared/resources/release/release-presenter.v3968_0.js','../shared/resources/release/release-presenter.v3969_0.js'],
    ['../shared/governance/resource-execution-contract.v3968_0.js','../shared/governance/resource-execution-contract.v3969_0.js'],
    ['js/workspace/selection-workspace-orchestrator.v3967_0.js','js/workspace/selection-workspace-orchestrator.v3969_0.js'],
    ['js/feature/school-majors/school-all-mode.v3967_0.js','js/feature/school-majors/school-all-mode.v3969_0.js']
  ]);
  data.jsEntry = [...new Set((data.jsEntry || []).map(item => replacements.get(item) || item).concat([
    '../shared/resources/schools/school-query-contract.v3969_0.js',
    '../shared/resources/schools/school-query-engine.v3969_0.js',
    '../shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json'
  ]))];
  data.unifiedSchoolQueryContract = true;
  data.schoolRegionNameAmbiguityContract = true;
  data.noSilentSchoolCandidateTruncationContract = true;
  data.admissionRecordCountTiebreakOnlyContract = true;
  data.scoreSchoolReportQueryParityContract = true;
  write(file, `${JSON.stringify(data, null, 2)}\n`);
}

updateMeta('ln-rank/active-assets.json');
updateMeta('ln-rank/release-meta.json');
console.log(JSON.stringify({ ok: true, version: 'v3.9.69.0' }, null, 2));
