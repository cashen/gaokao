import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildMajorBandsRankOrderProjectionSchema,
  decodeMajorBandsRankOrderRow,
  decodeMajorBandsStaticRow,
  majorBandsRankValueMatchesRange
} from '../functions/_lib/major-bands-static-provider.js';
import { processMajorBandsRankWindow } from '../functions/_lib/major-bands-rank-query-kernel.v3990_1.js';
import { scopeMajorBandsRankBucketsForRequest } from '../functions/_lib/major-bands-rank-bucket-loader.v3990_1.js';
import {
  MAJOR_BANDS_RANK_BUCKETS,
  selectMajorBandsRankBuckets
} from '../functions/_lib/major-bands-rank-index.v3990_1.js';
import {
  LN_2026_PHYSICS_SCORE_RANK_META,
  lookupLn2026PhysicsScore
} from '../functions/_lib/ln-2026-physics-score-rank.js';
import { rankWindowsForCandidate } from '../shared/algorithms/position/canonical-position.v3963_0.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/data/major-bands-static-v3972_2/manifest.json', 'utf8'));
const schema = manifest.recordSchema;
const projectionSchema = buildMajorBandsRankOrderProjectionSchema(schema);
const requiredProjectionFields = Object.freeze([
  'id','school','major','score2026','rank2026',
  'lnArea','province','city',
  'nature','natureRaw','natureType','schoolNature','feeType',
  'tuition','tuitionText','flags','schoolTags','cooperationType'
]);
for (const field of requiredProjectionFields) {
  assert.ok(Number.isInteger(projectionSchema[field]) && projectionSchema[field] >= 0, `projection field missing: ${field}`);
}

const fullByFile = new Map();
const projectedByFile = new Map();
let checkedRows = 0;
for (const bucket of manifest.buckets) {
  const payload = JSON.parse(fs.readFileSync(bucket.file.replace(/^\//, ''), 'utf8'));
  const full = [];
  const projected = [];
  for (const row of payload.rows) {
    const fullRecord = decodeMajorBandsStaticRow(row, schema);
    const projectedRecord = decodeMajorBandsRankOrderRow(row, projectionSchema);
    for (const field of requiredProjectionFields) {
      assert.deepEqual(projectedRecord[field], fullRecord[field], `${fullRecord.id}: projection ${field}`);
    }
    assert.equal(projectedRecord.specialProject.hasSpecialProject, fullRecord.specialProject.hasSpecialProject, `${fullRecord.id}: special project flag`);
    assert.deepEqual(projectedRecord.specialProject.keys, fullRecord.specialProject.keys, `${fullRecord.id}: special keys`);
    assert.equal(Object.prototype.propertyIsEnumerable.call(projectedRecord, 'majorBandsRawRow'), false, `${fullRecord.id}: raw row enumerable`);
    full.push(fullRecord);
    projected.push(projectedRecord);
    checkedRows += 1;
  }
  fullByFile.set(bucket.file, full);
  projectedByFile.set(bucket.file, projected);
}
assert.equal(checkedRows, 11628, 'projection coverage must include all static rows');
assert.equal(MAJOR_BANDS_RANK_BUCKETS.length, manifest.buckets.length, 'rank bucket manifest drift');

const scores = [350, 440, 500, 580, 620, 650];
const presets = ['standard', 'safe'];
const regions = ['all', 'province:辽宁', 'shenyang', 'outside', 'any:province:新疆|province:西藏'];
const bottomLineModes = ['all', 'public_first', 'public_regular_only', 'public_include_sino'];
const bands = ['upper', 'near', 'steady'];
let cases = 0;

function recordsFor(files, source) {
  return files.flatMap(bucket => source.get(bucket.file) || []);
}

for (const score of scores) {
  const rankRow = lookupLn2026PhysicsScore(score);
  assert.ok(rankRow, `${score}: rank row missing`);
  const candidateRank = { rankForGap: rankRow.rankForGap };
  for (const preset of presets) {
    const windows = rankWindowsForCandidate(
      candidateRank.rankForGap,
      preset,
      LN_2026_PHYSICS_SCORE_RANK_META.totalAt150
    );
    const unionBuckets = selectMajorBandsRankBuckets(windows);
    for (const band of bands) {
      const scoped = scopeMajorBandsRankBucketsForRequest(unionBuckets, {
        candidateScore: score,
        rangePreset: preset,
        band
      });
      const fullRows = recordsFor(scoped.buckets, fullByFile).filter(record => (
        majorBandsRankValueMatchesRange(record.rank2026, windows[band])
      ));
      const projectedRows = recordsFor(scoped.buckets, projectedByFile).filter(record => (
        majorBandsRankValueMatchesRange(record.rank2026, windows[band])
      ));
      for (const region of regions) {
        for (const bottomLineMode of bottomLineModes) {
          const options = {
            candidateScore: score,
            candidateRank,
            rangePreset: preset,
            region,
            majorKeyword: '',
            bottomLineMode,
            specialProjectMode: 'hide_eligibility_projects',
            schoolFilter: false,
            acceptedSchoolNames: [],
            requestedBand: band,
            mutateSourceRecords: false
          };
          const fullResult = processMajorBandsRankWindow(fullRows, options);
          const projectedResult = processMajorBandsRankWindow(projectedRows, options);
          const fullIds = fullResult.grouped[band].ordered.map(record => record.id);
          const projectedIds = projectedResult.grouped[band].ordered.map(record => record.id);
          assert.deepEqual(projectedIds, fullIds, `${score}/${preset}/${band}/${region}/${bottomLineMode}: projected order`);
          for (const key of [
            'canonicalCandidate','normalized','bottomLineExcluded','bottomLineUnresolved',
            'specialProjectHidden','specialProjectShown','sortPasses'
          ]) {
            assert.equal(projectedResult.stats[key], fullResult.stats[key], `${score}/${preset}/${band}/${region}/${bottomLineMode}: ${key}`);
          }
          cases += 1;
        }
      }
    }
  }
}

const apiSource = fs.readFileSync('functions/api/major-bands.js', 'utf8');
assert.ok(apiSource.includes("const minimalOrderProjection = !schoolFilter\n    && filters.specialProjectMode === 'hide_eligibility_projects';"), 'requested-band refinement must keep lightweight projection');
assert.ok(!apiSource.includes("minimalOrderProjection = filters.region === 'all'"), 'region refinement regressed to full-record ordering');
assert.ok(apiSource.includes("rawRowStorage: minimalOrderProjection ? 'array-reference' : undefined"), 'explicit-band projection must reuse request-local raw-row references');
assert.ok(!apiSource.includes("rawRowStorage: minimalOrderProjection ? 'serialized-json' : undefined"), 'explicit-band projection must not stringify every candidate raw row');
console.log(JSON.stringify({
  version: 'major-bands-refinement-projection-v3990_1',
  checkedRows,
  cases,
  scores,
  presets,
  regions,
  bottomLineModes,
  status: 'ok'
}, null, 2));
