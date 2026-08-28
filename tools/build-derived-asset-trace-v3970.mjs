import crypto from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const OUTPUT='shared/governance/derived-asset-trace.v3970_0.json';
const DEFINITIONS=[
 ['shared/resources/release/current-release.js','ln-rank/active-assets.json','active asset graph bound to the current release'],
 ['shared/governance/resource-execution-contract.v3970_0.js','ln-rank/active-assets.json','active graph bound to execution owners'],
 ['shared/ui/component-registry.v3970_0.js','ln-rank/active-assets.json','active UI graph bound to the component registry'],
 ['shared/ui/contracts/copy-contract.v3970_0.js','shared/ui/components/family-plan-entry.v3970_0.js','family plan entry consumes the single public copy owner'],
 ['shared/ui/contracts/action-contract.v3970_0.js','shared/ui/component-registry.v3970_0.js','family action priority bound to the component registry'],
 ['ln-rank/js/domain/family-decision-contract.v3970_0.js','shared/ui/components/family-plan-entry.v3970_0.js','family plan entry derives count and next state from one domain owner'],
 ['shared/ui/components/family-plan-entry.v3970_0.js','ln-rank/index.html','main page family plan entry uses the shared component'],
 ['shared/ui/components/family-plan-entry.v3970_0.css','ln-rank/index.html','main page family plan geometry uses the shared component stylesheet'],
 ['ln-rank/js/domain/family-plan-copy-adapter.v3970_0.js','ln-rank/js/app-runtime.v3970_0.js','legacy immutable card consumers receive current family-plan language through one adapter'],
 ['shared/ui/shell/family-shell.v3970_0.js','ln-rank/selection-pool.html','selection page uses the shared shell without a fixed mobile action'],
 ['shared/resources/release/current-release.js','ln-rank/release-meta.json','release metadata bound to the current release'],
 ['shared/resources/release/current-release.js','shared/resources/release/runtime-cache-contract.v3970_0.js','runtime cache graph bound to the current release']
];
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
const payload={version:'derivation-trace-v3970_0',generatedAt:'2026-07-28T08:00:00Z',items:DEFINITIONS.map(([source,derived,reason])=>({source,sourceSha256:hash(source),derived,derivedSha256:hash(derived),reason}))};
const expected=JSON.stringify(payload,null,2)+'\n';
if(process.argv.includes('--write')){
 fs.writeFileSync(OUTPUT,expected);
 console.log(JSON.stringify({ok:true,written:OUTPUT,items:payload.items.length},null,2));
}else{
 assert.equal(fs.readFileSync(OUTPUT,'utf8'),expected,'derived asset trace is stale; run node tools/build-derived-asset-trace-v3970.mjs --write');
 console.log(JSON.stringify({ok:true,checked:OUTPUT,items:payload.items.length},null,2));
}
