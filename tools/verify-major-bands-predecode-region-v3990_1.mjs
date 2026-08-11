import assert from 'node:assert/strict';
import fs from 'node:fs';
import { majorBandsStaticRowMatchesRegion, MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION } from '../functions/_lib/major-bands-static-provider.js';
import { matchRegionRule } from '../shared/resources/geo/china-region-catalog.v3990_1.js';
const manifest=JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json','utf8'));
const schema=manifest.recordSchema;
const idx=Object.fromEntries(['lnArea','province','city'].map(key=>[key,schema.indexOf(key)]));
const regions=['all','ln','outside','shenyang','dalian','ln-other','northwest','province:新疆','province:西藏','any:province:新疆|province:西藏','any:province:安徽|province:江苏'];
let total=0, west=0;
for(const bucket of manifest.buckets){
  const payload=JSON.parse(fs.readFileSync(bucket.file.replace(/^\//,''),'utf8'));
  for(const row of payload.rows){
    total+=1;
    const tiny={lnArea:row[idx.lnArea],province:row[idx.province],city:row[idx.city]};
    for(const region of regions){
      assert.equal(majorBandsStaticRowMatchesRegion(row,schema,region),matchRegionRule(tiny,region),`${bucket.file} ${region}`);
    }
    if(majorBandsStaticRowMatchesRegion(row,schema,'any:province:新疆|province:西藏')) west+=1;
  }
}
assert.equal(total,11628);
assert.ok(west>0&&west<total/5,`west reduction ${west}/${total}`);
assert.equal(MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,'major-bands-predecode-region-filter-v3990_1');
const api=fs.readFileSync('functions/api/major-bands.js','utf8');
const loader=fs.readFileSync('functions/_lib/major-bands-rank-bucket-loader.v3990_1.js','utf8');
assert.ok(api.includes('predecodeRegion: filters.region'));
assert.ok(loader.includes('predecodeRegion: options.predecodeRegion'));
console.log(JSON.stringify({ok:true,version:MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,total,west,regions:regions.length},null,2));
