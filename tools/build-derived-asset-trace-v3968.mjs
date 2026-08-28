import crypto from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const OUTPUT='shared/governance/derived-asset-trace.v3968_0.json';
const DEFINITIONS=[
  ['shared/resources/release/current-release.js','ln-rank/active-assets.json','active asset graph bound to current release'],
  ['shared/governance/resource-execution-contract.v3968_0.js','ln-rank/active-assets.json','active asset graph bound to execution owners'],
  ['shared/algorithms/algorithm-registry.js','ln-rank/active-assets.json','active algorithm graph bound to algorithm registry'],
  ['shared/ui/component-registry.v3967_0.js','ln-rank/active-assets.json','active CSS and component graph bound to component registry'],
  ['shared/resources/background/academic-background-contract.v3968_0.js','ln-rank/active-assets.json','academic background graph bound to evidence contract'],
  ['shared/resources/background/academic-background-source-registry.v3968_0.js','ln-rank/active-assets.json','academic background graph bound to official sources'],
  ['shared/algorithms/background/academic-background-matcher.v3968_0.js','ln-rank/active-assets.json','academic background graph bound to single matcher'],
  ['shared/resources/release/current-release.js','ln-rank/release-meta.json','release metadata bound to current release'],
  ['shared/governance/resource-execution-contract.v3968_0.js','ln-rank/release-meta.json','release metadata bound to execution owners'],
  ['shared/resources/exam/liaoning-physics.js','shared/resources/trends/liaoning-major-trend.v3967_0.js','trend resource bound to canonical exam years and population policy'],
  ['tools/ln-2026/rebuild-centered-trend-analysis.py','ln-rank/data/major-trend-2026.json','trend data derived by the centered three-year analysis builder'],
  ['shared/ui/component-registry.v3967_0.js','ln-rank/css/history-evidence.v3967_0.css','history component geometry bound to component owner'],
  ['shared/ui/component-registry.v3967_0.js','ln-rank/css/school-all-mode.v3967_0.css','school results layout bound to component owner'],
  ['shared/governance/resource-execution-contract.v3968_0.js','shared/resources/resource-registry.js','public resource registry bound to execution policy'],
  ['shared/resources/release/current-release.js','shared/resources/release/runtime-cache-contract.v3968_0.js','runtime cache graph bound to current release'],
  ['shared/resources/background/academic-background-contract.v3968_0.js','functions/_lib/academic-background-provider.js','background provider bound to evidence contract'],
  ['shared/resources/background/academic-background-source-registry.v3968_0.js','functions/_lib/academic-background-provider.js','background provider bound to official source registry'],
  ['shared/algorithms/background/academic-background-matcher.v3968_0.js','functions/_lib/academic-background-provider.js','background provider bound to single matcher'],
  ['functions/_lib/academic-background-provider.js','functions/_lib/academic-background-api.js','unified API service bound to provider'],
  ['functions/_lib/academic-background-api.js','functions/api/local-mainline.js','local compatibility API delegates to unified service'],
  ['functions/_lib/academic-background-api.js','functions/api/211-mainline.js','211 compatibility API delegates to unified service'],
  ['ln-rank/js/academic-background/academic-background-app.v3968_0.js','ln-rank/local-mainline.html','local page bound to shared background runtime'],
  ['ln-rank/js/academic-background/academic-background-app.v3968_0.js','ln-rank/211-mainline.html','211 page bound to shared background runtime'],
  ['ln-rank/css/academic-background.v3968_0.css','ln-rank/local-mainline.html','local page bound to shared background component CSS'],
  ['ln-rank/css/academic-background.v3968_0.css','ln-rank/211-mainline.html','211 page bound to shared background component CSS'],
  ['shared/algorithms/position/historical-rank-selection.v3967_0.js','just_for_liaoning.html','auxiliary historical rank UI delegates classification to shared algorithm'],
  ['shared/resources/auxiliary/liaoning-key-subjects.v3967_0.js','just_for_liaoning.html','auxiliary page bound to registered data and boundary contract']
];
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
const payload={version:'derivation-trace-v3968_0',generatedAt:'2026-07-27T04:30:00Z',items:DEFINITIONS.map(([source,derived,reason])=>({source,sourceSha256:hash(source),derived,derivedSha256:hash(derived),reason}))};
const expected=JSON.stringify(payload,null,2)+'\n';
if(process.argv.includes('--write')){
  fs.writeFileSync(OUTPUT,expected);
  console.log(JSON.stringify({ok:true,written:OUTPUT,items:payload.items.length},null,2));
}else{
  assert.equal(fs.readFileSync(OUTPUT,'utf8'),expected,'derived asset trace is stale; run node tools/build-derived-asset-trace-v3968.mjs --write');
  console.log(JSON.stringify({ok:true,checked:OUTPUT,items:payload.items.length},null,2));
}
