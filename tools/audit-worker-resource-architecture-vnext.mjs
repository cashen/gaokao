import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const functionFiles=walk(path.join(root,'functions')).filter(f=>/\.(?:js|mjs)$/.test(f));
const violations=[];
for(const file of functionFiles){
  const rel=path.relative(root,file).replaceAll('\\','/');
  const text=fs.readFileSync(file,'utf8');
  if(/\bloadAllRecords\s*\(/.test(text)) violations.push(`${rel}: production loadAllRecords`);
  if(/Promise\.all\s*\(\s*chunks\.map/.test(text)) violations.push(`${rel}: all-chunk Promise.all fanout`);
  if(/const\s+chunkCache\s*=\s*new\s+Map/.test(text)) violations.push(`${rel}: module-global parsed chunk cache`);
}
const school=fs.readFileSync('functions/api/school-majors.js','utf8');
if(!school.includes('school-record-runtime-provider.vnext.js')) violations.push('school-majors: shared school runtime provider missing');
if(school.includes('loadExactSchoolRecordsFromFiles')||school.includes('loadMatchingRecords(')) violations.push('school-majors: legacy large-chunk fallback remains');
const report=fs.readFileSync('functions/_lib/report-data-service-v3956.js','utf8');
if(!report.includes('loadMajorBandsStaticBucket')||report.includes('loadAllRecords')) violations.push('report: bounded major-bands owner missing');
const provider=fs.readFileSync('functions/_lib/school-record-runtime-provider.vnext.js','utf8');
if(!provider.includes('SHARD_CACHE_MAX_ENTRIES = 4')||!provider.includes('INDEX_CACHE_MAX_ENTRIES = 1')) violations.push('school provider: cache budget contract missing');
const index=JSON.parse(fs.readFileSync('data/zy2026/school-index.json','utf8'));
if(index.runtimeProjectionShardCount!==100||index.runtimeProjectionRecordCount!==11628||index.runtimeProjectionSchoolCount!==956) violations.push('school projection: coverage metadata invalid');
const shardFiles=fs.readdirSync('data/zy2026/chunks').filter(n=>/^school-\d{2}\.json$/.test(n));
if(shardFiles.length!==100) violations.push(`school projection: shard count ${shardFiles.length}`);
const maxBytes=Math.max(...shardFiles.map(n=>fs.statSync(path.join('data/zy2026/chunks',n)).size));
if(maxBytes>350000) violations.push(`school projection: shard budget exceeded ${maxBytes}`);

const majorIndex=JSON.parse(fs.readFileSync('data/zy2026/major-index.json','utf8'));
if(majorIndex.runtimeProjectionShardCount!==100||majorIndex.runtimeProjectionRecordCount!==11628)violations.push('major projection: coverage metadata invalid');
const majorShardFiles=fs.readdirSync('data/zy2026/chunks').filter(n=>/^major-runtime-\d{2}\.json$/.test(n));
if(majorShardFiles.length!==100)violations.push(`major projection: shard count ${majorShardFiles.length}`);
const maxMajorBytes=Math.max(...majorShardFiles.map(n=>fs.statSync(path.join('data/zy2026/chunks',n)).size));if(maxMajorBytes>350000)violations.push(`major projection: shard budget exceeded ${maxMajorBytes}`);
for(const required of ['functions/_lib/background-position-engine.js','functions/api/major-window.js','functions/api/school-geo-audit.js','functions/api/fenxi-catalog.js']){const t=fs.readFileSync(required,'utf8');if(t.includes('loadAllRecords'))violations.push(`${required}: legacy full loader remains`);}
const bg=fs.readFileSync('functions/_lib/background-position-engine.js','utf8');if(!bg.includes('loadMajorRuntimeRecords')||!bg.includes('loadSchoolRuntimeRecords')||!bg.includes('loadMajorBandsStaticBucket'))violations.push('background-position-engine: bounded owners missing');
const legacy=fs.readFileSync('functions/api/major-window.js','utf8');if(!legacy.includes('bounded-major-bands-static-buckets'))violations.push('major-window: bounded owner missing');
const catalog=fs.readFileSync('functions/api/fenxi-catalog.js','utf8');if(!catalog.includes('legacy_full_scan_catalog_retired'))violations.push('fenxi-catalog: unsafe export not retired');

if(violations.length){console.error(violations.join('\n'));process.exit(1);}
console.log(JSON.stringify({ok:true,productionFullLoadUsage:0,productionAllChunkPromiseFanout:0,schoolProjection:{records:11628,schools:956,shards:100,maxBytes},reportOwner:'major-bands-static-v3972_2',majorProjection:{records:11628,shards:100,maxBytes:maxMajorBytes}},null,2));
