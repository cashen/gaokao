import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const trace=JSON.parse(fs.readFileSync('shared/governance/derived-asset-trace.v3967_0.json','utf8'));
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
assert.equal(trace.version,'derivation-trace-v3967_0');
for(const item of trace.items){
  assert.ok(fs.existsSync(item.source),`missing source ${item.source}`);
  assert.ok(fs.existsSync(item.derived),`missing derived ${item.derived}`);
  assert.equal(hash(item.source),item.sourceSha256,`stale source trace ${item.source}`);
  assert.equal(hash(item.derived),item.derivedSha256,`stale derived trace ${item.derived}`);
}
console.log(JSON.stringify({ok:true,version:trace.version,items:trace.items.length},null,2));
