import fs from 'node:fs';
import assert from 'node:assert/strict';

const FILES=['ln-rank/active-assets.json','ln-rank/release-meta.json'];

function normalize(data){
 const next=structuredClone(data);
 Object.assign(next,{
  version:'v3.9.69.0',
  assetVersion:'v3969_0',
  releaseName:'v3.9.69.0-unified-school-query-admission-directory-no-fenxi',
  generatedAt:'2026-07-27T06:40:50.837Z',
  sharedResourceCenterVersion:'v3969_0',
  resourceOwnershipVersion:'resource-ownership-v3969_0',
  resourceExecutionVersion:'resource-execution-v3969_0',
  derivationTraceVersion:'derivation-trace-v3969_0',
  uiOrchestrationVersion:'ui-orchestration-v3969_0',
  selectionWorkspaceVersion:'selection-workspace-orchestration-v3969_0',
  searchIntentVersion:'school-query-contract-v3969_0',
  schoolQueryVersion:'school-query-contract-v3969_0',
  schoolAdmissionDirectoryVersion:'liaoning-2026-admission-school-directory-v3969_0',
  algorithmOrchestrationVersion:'algorithm-orchestration-v3969',
  runtimeCacheQueryVersion:'v3969_0',
  runtimeCacheContractVersion:'runtime-cache-coherence-v3969_0',
  mainJs:'js/app.v3969_0.js',
  mainRuntimeJs:'js/app-runtime.v3969_0.js',
  runtimeCacheResource:'../shared/resources/release/runtime-cache-contract.v3969_0.js',
  resourceExecutionRegistry:'../shared/governance/resource-execution-contract.v3969_0.js',
  schoolAllModeVersion:'school-all-mode-v3969_0',
  schoolUiGovernanceVersion:'school-ui-governance-v3969_0',
  schoolModeMountVersion:'school-mode-static-mount-v3969_0',
  sharedSchoolQueryContract:'../shared/resources/schools/school-query-contract.v3969_0.js',
  sharedSchoolQueryEngine:'../shared/resources/schools/school-query-engine.v3969_0.js',
  sharedSchoolAdmissionDirectory:'../shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',
  schoolQueryProvider:'../functions/_lib/school-query-provider.v3969.js',
  unifiedSchoolQueryContract:true,
  schoolRegionNameAmbiguityContract:true,
  noSilentSchoolCandidateTruncationContract:true,
  admissionRecordCountTiebreakOnlyContract:true,
  scoreSchoolReportQueryParityContract:true
 });
 const replacements=new Map([
  ['js/app.v3968_0.js','js/app.v3969_0.js'],
  ['js/app-runtime.v3968_0.js','js/app-runtime.v3969_0.js'],
  ['js/workspace/selection-workspace-orchestrator.v3967_0.js','js/workspace/selection-workspace-orchestrator.v3969_0.js'],
  ['js/feature/school-majors/school-all-mode.v3967_0.js','js/feature/school-majors/school-all-mode.v3969_0.js'],
  ['../shared/resources/release/runtime-cache-contract.v3968_0.js','../shared/resources/release/runtime-cache-contract.v3969_0.js'],
  ['../shared/resources/release/release-presenter.v3968_0.js','../shared/resources/release/release-presenter.v3969_0.js'],
  ['../shared/governance/resource-execution-contract.v3968_0.js','../shared/governance/resource-execution-contract.v3969_0.js'],
  ['../shared/governance/resource-execution-contract.v3967_0.js','../shared/governance/resource-execution-contract.v3969_0.js']
 ]);
 next.jsEntry=[...new Set((next.jsEntry||[]).map(item=>replacements.get(item)||item).concat([
  '../shared/resources/schools/school-query-contract.v3969_0.js',
  '../shared/resources/schools/school-query-engine.v3969_0.js',
  '../shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json'
 ]))];
 return next;
}

let changed=0;
for(const file of FILES){
 const current=fs.readFileSync(file,'utf8');
 const expected=JSON.stringify(normalize(JSON.parse(current)),null,2)+'\n';
 if(process.argv.includes('--write')){
  if(current!==expected){fs.writeFileSync(file,expected);changed+=1;}
 }else{
  assert.equal(current,expected,`${file} is stale; run node tools/build-active-release-metadata-v3969.mjs --write`);
 }
}
console.log(JSON.stringify({ok:true,files:FILES,changed,mode:process.argv.includes('--write')?'write':'check'},null,2));
