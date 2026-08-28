import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const trace=JSON.parse(fs.readFileSync('shared/governance/derived-asset-trace.v3968_0.json','utf8'));
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
assert.equal(trace.version,'derivation-trace-v3968_0');
assert.ok(trace.items.length>=25,'academic background derivation coverage is incomplete');
for(const item of trace.items){
  assert.ok(fs.existsSync(item.source),`missing source ${item.source}`);
  assert.ok(fs.existsSync(item.derived),`missing derived ${item.derived}`);
  assert.equal(hash(item.source),item.sourceSha256,`stale source trace ${item.source}`);
  assert.equal(hash(item.derived),item.derivedSha256,`stale derived trace ${item.derived}`);
}
const pairs=new Set(trace.items.map(item=>`${item.source}->${item.derived}`));
for(const required of [
  'shared/resources/background/academic-background-contract.v3968_0.js->functions/_lib/academic-background-provider.js',
  'shared/resources/background/academic-background-source-registry.v3968_0.js->functions/_lib/academic-background-provider.js',
  'shared/algorithms/background/academic-background-matcher.v3968_0.js->functions/_lib/academic-background-provider.js',
  'functions/_lib/academic-background-api.js->functions/api/local-mainline.js',
  'functions/_lib/academic-background-api.js->functions/api/211-mainline.js',
  'ln-rank/js/academic-background/academic-background-app.v3968_0.js->ln-rank/local-mainline.html',
  'ln-rank/js/academic-background/academic-background-app.v3968_0.js->ln-rank/211-mainline.html'
]) assert.ok(pairs.has(required),`missing derivation pair ${required}`);
console.log(JSON.stringify({ok:true,version:trace.version,items:trace.items.length},null,2));
