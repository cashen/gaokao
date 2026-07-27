#!/usr/bin/env python3
from pathlib import Path
import json,sys

ROOT=Path(__file__).resolve().parents[2]
errors=[]
def text(rel):
 p=ROOT/rel
 if not p.exists(): errors.append(f'missing {rel}'); return ''
 return p.read_text(encoding='utf-8')
def require(condition,message):
 if not condition: errors.append(message)

current=text('shared/resources/release/current-release.js')
for marker in [
 "display: 'v3.9.69.0'",
 "assetVersion: 'v3969_0'",
 "resourceExecutionVersion: 'resource-execution-v3969_0'",
 "algorithmOrchestrationVersion: 'algorithm-orchestration-v3969'",
 "schoolQueryVersion: 'school-query-contract-v3969_0'",
 "schoolAdmissionDirectoryVersion: 'liaoning-2026-admission-school-directory-v3969_0'",
 "academicBackgroundVersion: 'academic-background-v3968_0'",
 "historyEvidenceVersion: 'ln-physics-history-evidence-v3967_0'"
]: require(marker in current,f'current release missing {marker}')

required=[
 'shared/governance/resource-execution-contract.v3969_0.js',
 'shared/resources/release/runtime-cache-contract.v3969_0.js',
 'shared/resources/release/release-presenter.v3969_0.js',
 'shared/resources/schools/school-query-contract.v3969_0.js',
 'shared/resources/schools/school-query-engine.v3969_0.js',
 'shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',
 'functions/_lib/school-query-provider.v3969.js',
 'functions/api/school-majors.js','functions/api/major-bands.js','functions/_lib/report-data-service-v3956.js',
 'ln-rank/js/app.v3969_0.js','ln-rank/js/app-runtime.v3969_0.js',
 'ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js',
 'ln-rank/js/feature/school-majors/school-all-mode.v3969_0.js',
 'tools/build-school-admission-directory-v3969.mjs','tools/audit-school-query-v3969.mjs','tools/browser-school-query-v3969.mjs',
 'shared/resources/background/academic-background-contract.v3968_0.js',
 'ln-rank/js/academic-background/academic-background-app.v3968_0.js',
 'shared/ui/component-registry.v3967_0.js'
]
for rel in required: require((ROOT/rel).exists(),f'missing required {rel}')

index=text('ln-rank/index.html')
require('data-release="v3.9.69.0"' in index,'main release display stale')
require('app.v3969_0.js?v=3969_0' in index,'main v3969 bootstrap not active')
require('城市请用地区' in index,'school/region boundary copy missing')
require('app.v3968_0.js?v=3968_0' not in index,'old main bootstrap active')

runtime=text('ln-rank/js/app-runtime.v3969_0.js')
for marker in ['release-presenter.v3969_0.js?v=3969_0','runtime-cache-contract.v3969_0.js?v=3969_0','selection-workspace-orchestrator.v3969_0.js?v=3969_0','school-all-mode.v3969_0.js?v=3969_0']:
 require(marker in runtime,f'runtime missing {marker}')

active=json.loads(text('ln-rank/active-assets.json') or '{}')
require(active.get('version')=='v3.9.69.0','active version mismatch')
require(active.get('assetVersion')=='v3969_0','active asset mismatch')
require(active.get('resourceExecutionVersion')=='resource-execution-v3969_0','active execution mismatch')
for flag in ['unifiedSchoolQueryContract','schoolRegionNameAmbiguityContract','noSilentSchoolCandidateTruncationContract','admissionRecordCountTiebreakOnlyContract','scoreSchoolReportQueryParityContract']:
 require(active.get(flag) is True,f'active flag missing {flag}')
for rel in [
 'js/app.v3969_0.js','js/app-runtime.v3969_0.js',
 'js/workspace/selection-workspace-orchestrator.v3969_0.js',
 'js/feature/school-majors/school-all-mode.v3969_0.js',
 '../shared/resources/release/runtime-cache-contract.v3969_0.js',
 '../shared/resources/release/release-presenter.v3969_0.js',
 '../shared/governance/resource-execution-contract.v3969_0.js',
 '../shared/resources/schools/school-query-contract.v3969_0.js',
 '../shared/resources/schools/school-query-engine.v3969_0.js',
 '../shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json'
]: require(rel in active.get('jsEntry',[]),f'active entry missing {rel}')

admission=json.loads(text('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json') or '{}')
require(admission.get('contractVersion')=='school-query-contract-v3969_0','admission contract mismatch')
require(admission.get('generatorVersion')=='school-admission-directory-builder-v3969_0','admission generator mismatch')
require(admission.get('admissionRecordCount')==11628,'admission record count mismatch')
require(int(admission.get('schoolCount',0))>=900,'admission school count too small')
require(any(row.get('officialName')=='沈阳化工大学' for row in admission.get('schools',[])),'沈阳化工大学 missing')

school=text('functions/api/school-majors.js'); score=text('functions/api/major-bands.js'); report=text('functions/_lib/report-data-service-v3956.js')
for rel,src in [('school-majors',school),('major-bands',score),('report-data',report)]:
 require('school-query-provider.v3969.js' in src,f'{rel} does not use unified query provider')
for forbidden in ['.slice(0, 8)','record.school.includes(filters.schoolKeyword)','rawSchool(raw).includes(keyword)']:
 require(forbidden not in school+score+report,f'forbidden local school query remains: {forbidden}')

contract=text('functions/_lib/release-contract.js')
for marker in ['unifiedSchoolQueryContract: true','schoolRegionNameAmbiguityContract: true','noSilentSchoolCandidateTruncationContract: true','admissionRecordCountTiebreakOnlyContract: true','scoreSchoolReportQueryParityContract: true','export const LN_RANK_RELEASE_CONTRACT','export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT']:
 require(marker in contract,f'release contract missing {marker}')

for stale in ['.github/workflows/materialize-v3969-core.yml','.github/workflows/finalize-v3969-release.yml','.github/workflows/regenerate-v3969-directory.yml','tools/apply-v3969-school-query-release.mjs','tools/finalize-v3969-release.mjs','tools/run-v3969-finalize.txt']:
 require(not (ROOT/stale).exists(),f'stale self-mutating mechanism {stale}')

if errors:
 print('\n'.join('ERROR: '+error for error in errors),file=sys.stderr)
 sys.exit(1)
print(json.dumps({'ok':True,'version':'v3.9.69.0','requiredFiles':len(required),'admissionSchools':admission.get('schoolCount'),'admissionRecords':admission.get('admissionRecordCount')},ensure_ascii=False,indent=2))
