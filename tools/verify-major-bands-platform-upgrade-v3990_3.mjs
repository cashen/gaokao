import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildMajorBandsRankOrderProjectionSchema,
  decodeMajorBandsRankOrderRow,
  decodeMajorBandsStaticRow,
  MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  majorBandsStaticRowMatchesPlatformUpgrade,
  shouldUseMajorBandsNativeWholeBucketJson
} from '../functions/_lib/major-bands-static-provider.js';
import { buildDisplayTags } from '../functions/_lib/school-display-tags.js';
import {
  matchesPlatformUpgradeRecord,
  normalizePlatformTarget,
  platformUpgradePolicyState
} from '../functions/_lib/platform-upgrade-policy.js';
import { processMajorBandsRankWindow } from '../functions/_lib/major-bands-rank-query-kernel.v3990_3.js';
import { lookupLn2026PhysicsScore } from '../functions/_lib/ln-2026-physics-score-rank.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json', 'utf8'));
const schema = manifest.recordSchema;
const projectionSchema = buildMajorBandsRankOrderProjectionSchema(schema);
const full = [];
const projected = [];
let checkedRows = 0;
for (const bucket of manifest.buckets) {
  const payload = JSON.parse(fs.readFileSync(bucket.file.replace(/^\//, ''), 'utf8'));
  for (const row of payload.rows) {
    const record = decodeMajorBandsStaticRow(row, schema);
    const light = decodeMajorBandsRankOrderRow(row, projectionSchema, { rawRowStorage: 'array-reference' });
    assert.equal(light.isSinoForeign, Boolean(record.isSinoForeign), `${record.id}: sino projection`);
    assert.equal(light.isHighFee, Boolean(record.isHighFee), `${record.id}: high-fee projection`);
    const tagged = { ...record, ...buildDisplayTags(record) };
    for (const target of ['985', '211']) {
      const oldSemantics = (target === '985' ? tagged.is985 === true : tagged.is211 === true)
        && (tagged.isSinoForeign === true || tagged.isHighFee === true || ['sino_foreign', 'high_fee'].includes(tagged.feeType));
      assert.equal(matchesPlatformUpgradeRecord(record, target), oldSemantics, `${record.id}/${target}: policy truth`);
      assert.equal(majorBandsStaticRowMatchesPlatformUpgrade(row, schema, target), oldSemantics, `${record.id}/${target}: raw-row truth`);
      assert.equal(matchesPlatformUpgradeRecord(light, target), oldSemantics, `${record.id}/${target}: projection truth`);
    }
    full.push(record);
    projected.push(light);
    checkedRows += 1;
  }
}
assert.equal(checkedRows, 11628, 'platform verifier must cover every static record');
assert.equal(normalizePlatformTarget('985'), '985');
assert.equal(normalizePlatformTarget('211'), '211');
assert.equal(normalizePlatformTarget('双一流'), '');

assert.equal(shouldUseMajorBandsNativeWholeBucketJson({
  projection: MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  rawRowStorage: 'array-reference',
  rankRange: { minRank: 100, maxRank: 200 },
  bucketRankBounds: { minRank: 80, maxRank: 180 },
  platformTarget: '985'
}), true, 'platformTarget must preserve native whole-bucket decode on a partial rank bucket');

const cases = [];
for (const score of [580, 620]) {
  const rank = lookupLn2026PhysicsScore(score);
  assert.ok(rank?.rankForGap, `${score}: rank missing`);
  for (const target of ['211', '985']) {
    for (const region of ['all', 'province:辽宁']) {
      for (const bottomLineMode of ['all', 'public_include_sino']) {
        for (const band of ['upper', 'near', 'steady']) {
          const options = {
            candidateScore: score,
            candidateRank: rank,
            rangePreset: 'standard',
            region,
            majorKeyword: '',
            bottomLineMode,
            specialProjectMode: 'hide_eligibility_projects',
            requestedBand: band,
            mutateSourceRecords: false
          };
          const manualSource = full.filter(record => matchesPlatformUpgradeRecord(record, target));
          const expected = processMajorBandsRankWindow(manualSource, options);
          const actual = processMajorBandsRankWindow(projected, { ...options, platformTarget: target });
          assert.deepEqual(
            actual.grouped[band].ordered.map(record => record.id),
            expected.grouped[band].ordered.map(record => record.id),
            `${score}/${target}/${region}/${bottomLineMode}/${band}: ordered truth`
          );
          assert.equal(actual.grouped[band].count, expected.grouped[band].count, `${score}/${target}/${region}/${bottomLineMode}/${band}: count`);
          cases.push(`${score}/${target}/${region}/${bottomLineMode}/${band}`);
        }
      }
    }
  }
}

const api = fs.readFileSync('functions/api/major-bands.js', 'utf8');
const tools = fs.readFileSync('functions/_lib/ai/tool-registry.js', 'utf8');
assert.ok(api.includes("platformTarget: normalizePlatformTarget(url.searchParams.get('platformTarget') || '')"), 'major-bands must parse platformTarget');
assert.ok(api.includes('platformTarget: filters.platformTarget'), 'platformTarget must enter query identity/kernel calls');
assert.ok(api.includes('predecodeRegion: input.filters.region,\n        platformTarget: input.filters.platformTarget'), 'all-bands platformTarget must be pushed into static rank loading');
assert.ok(api.includes('predecodeRegion: filters.region,\n        platformTarget: filters.platformTarget'), 'requested-band platformTarget must be pushed into static rank loading');
assert.ok(api.includes('specialProjectMode: input.filters.specialProjectMode,\n        platformTarget: input.filters.platformTarget,\n        schoolFilter: false'), 'all-bands shared kernel must retain platformTarget truth');
assert.ok(tools.includes("url.searchParams.set('platformTarget',params.platformTarget)"), 'AI bridge must delegate platformTarget');
assert.ok(tools.includes('matchesPlatformUpgradeRecord(record,tier)'), 'AI preview must share platform policy');
const state = platformUpgradePolicyState();
assert.equal(state.bounded, true, 'school tier cache must remain bounded');
console.log(JSON.stringify({ version: 'major-bands-platform-upgrade-v3990_3', checkedRows, cases: cases.length, policyState: state, status: 'ok' }, null, 2));
