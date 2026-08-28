import crypto from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const OUTPUT='shared/governance/derived-asset-trace.v3969_0.json';
const DEFINITIONS=[
 ['shared/resources/release/current-release.js','ln-rank/active-assets.json','active asset graph bound to current release'],
 ['shared/governance/resource-execution-contract.v3969_0.js','ln-rank/active-assets.json','active asset graph bound to execution owners'],
 ['shared/algorithms/algorithm-registry.js','ln-rank/active-assets.json','active algorithm graph bound to algorithm registry'],
 ['shared/ui/component-registry.v3967_0.js','ln-rank/active-assets.json','active CSS and component graph bound to component registry'],
 ['shared/resources/schools/school-query-contract.v3969_0.js','ln-rank/active-assets.json','active graph bound to unified school query contract'],
 ['shared/resources/schools/school-query-engine.v3969_0.js','ln-rank/active-assets.json','active graph bound to single school query engine'],
 ['shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json','ln-rank/active-assets.json','active graph bound to admission availability directory'],
 ['shared/resources/release/current-release.js','ln-rank/release-meta.json','release metadata bound to current release'],
 ['shared/governance/resource-execution-contract.v3969_0.js','ln-rank/release-meta.json','release metadata bound to execution owners'],
 ['shared/resources/schools/school-query-contract.v3969_0.js','ln-rank/release-meta.json','release metadata bound to school query contract'],
 ['shared/resources/release/current-release.js','shared/resources/release/runtime-cache-contract.v3969_0.js','runtime cache graph bound to current release'],
 ['shared/governance/resource-execution-contract.v3969_0.js','shared/resources/resource-registry.js','public registry bound to execution policy'],
 ['shared/resources/schools/school-query-contract.v3969_0.js','shared/resources/schools/school-query-engine.v3969_0.js','query engine bound to query contract'],
 ['tongxue/data/school-search-index.20260617-v150.json','shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json','admission directory bound to national school directory'],
 ['fenxi/data/ln-rank-2026/manifest.json','shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json','admission directory bound to 2026 admission manifest'],
 ['shared/resources/schools/school-identity-center.js','shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json','admission directory bound to school entity identities'],
 ['tools/build-school-admission-directory-v3969.mjs','shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json','admission directory bound to deterministic generator'],
 ['shared/resources/schools/school-query-engine.v3969_0.js','functions/_lib/school-query-provider.v3969.js','server provider bound to query engine'],
 ['functions/_lib/school-query-provider.v3969.js','functions/api/school-majors.js','school search API delegates to shared provider'],
 ['functions/_lib/school-query-provider.v3969.js','functions/api/major-bands.js','score search school filter delegates to shared provider'],
 ['functions/_lib/school-query-provider.v3969.js','functions/_lib/report-data-service-v3956.js','report rebuild school filter delegates to shared provider'],
 ['ln-rank/js/feature/school-majors/school-all-mode.v3969_0.js','ln-rank/index.html','school candidate UI bound to unified query response'],
 ['ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js','ln-rank/index.html','workspace bound to current school query semantics'],
 ['shared/resources/exam/liaoning-physics.js','shared/resources/trends/liaoning-major-trend.v3967_0.js','trend resource bound to canonical exam years'],
 ['tools/ln-2026/rebuild-centered-trend-analysis.py','ln-rank/data/major-trend-2026.json','trend data derived by centered three-year builder'],
 ['shared/ui/component-registry.v3967_0.js','ln-rank/css/history-evidence.v3967_0.css','history geometry bound to component owner'],
 ['shared/resources/background/academic-background-contract.v3968_0.js','functions/_lib/academic-background-provider.js','background provider bound to evidence contract'],
 ['shared/resources/background/academic-background-source-registry.v3968_0.js','functions/_lib/academic-background-provider.js','background provider bound to official sources'],
 ['shared/algorithms/background/academic-background-matcher.v3968_0.js','functions/_lib/academic-background-provider.js','background provider bound to single matcher']
];
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
const payload={version:'derivation-trace-v3969_0',generatedAt:'2026-07-27T06:00:00Z',items:DEFINITIONS.map(([source,derived,reason])=>({source,sourceSha256:hash(source),derived,derivedSha256:hash(derived),reason}))};
const expected=JSON.stringify(payload,null,2)+'\n';
if(process.argv.includes('--write')){
 fs.writeFileSync(OUTPUT,expected);
 console.log(JSON.stringify({ok:true,written:OUTPUT,items:payload.items.length},null,2));
}else{
 assert.equal(fs.readFileSync(OUTPUT,'utf8'),expected,'derived asset trace is stale; run node tools/build-derived-asset-trace-v3969.mjs --write');
 console.log(JSON.stringify({ok:true,checked:OUTPUT,items:payload.items.length},null,2));
}
