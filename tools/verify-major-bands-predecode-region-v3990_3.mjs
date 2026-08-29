import assert from 'node:assert/strict';
import fs from 'node:fs';
import { majorBandsStaticRowMatchesRegion, MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION } from '../functions/_lib/major-bands-static-provider.js';
import { matchRegionRule } from '../shared/resources/geo/china-region-catalog.v3990_3.js';
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
assert.equal(MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,'major-bands-predecode-region-filter-v3990_3');
const api=fs.readFileSync('functions/api/major-bands.js','utf8');
const loader=fs.readFileSync('functions/_lib/major-bands-rank-bucket-loader.v3990_3.js','utf8');
assert.ok(api.includes('predecodeRegion: filters.region'));
assert.ok(loader.includes('predecodeRegion: options.predecodeRegion'));
const provider=fs.readFileSync('functions/_lib/major-bands-static-provider.js','utf8');
const scanStart=provider.indexOf('export function scanMajorBandsStaticRankRowsText');
const idStage=provider.indexOf("allowedIds.has(String(scalarValues.get(idIndex) || ''))",scanStart);
const rankStage=provider.indexOf('majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)',scanStart);
const regionStage=provider.indexOf('const regionMatch = matchRegionRule',scanStart);
const parseStage=provider.indexOf('const row = JSON.parse(rowText);',scanStart);
assert.ok(scanStart>=0&&idStage>scanStart&&rankStage>idStage&&regionStage>rankStage&&parseStage>regionStage,'native page scan must be ID -> rank -> region -> full parse; cold scan skips ID stage');
assert.ok(provider.includes("MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION = 'major-bands-rank-row-native-scan-v3990_3'"));
assert.ok(provider.includes('shouldUseMajorBandsNativeWholeBucketJson({'),'hybrid rank-bucket decode policy must own native/scanner choice');
assert.ok(loader.includes('bucketRankBounds: {'),'rank loader must pass immutable rank-index bucket bounds');
assert.ok(provider.includes("mode: 'native-whole-bucket-json-filter'"),'native whole-bucket filter mode missing');
assert.ok(provider.includes('majorBandsStaticRowMatchesRegion(row, schema, predecodeRegion)'),'native whole-bucket path must reuse canonical region matcher');
assert.ok(provider.includes('partial requested-band boundary bucket') || provider.includes('rank-boundary buckets'),'hybrid boundary-scan contract missing');
console.log(JSON.stringify({ok:true,version:MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,total,west,regions:regions.length},null,2));
