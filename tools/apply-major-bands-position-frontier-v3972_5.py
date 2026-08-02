from pathlib import Path


def replace_once(text, before, after, label):
    if before not in text:
        raise RuntimeError(f'missing patch anchor: {label}')
    return text.replace(before, after, 1)


# Bucket transfers need only the ranking tuple; browser responses retain the
# complete compact canonical-position contract.
path = Path('functions/_lib/major-bands-bucket-transfer.v3972_5.js')
text = path.read_text(encoding='utf-8')
anchor = """export function compactMajorBandsCanonicalPosition(position = null) {
  if (!position || typeof position !== 'object') return position || null;
  return pickMeaningful(position, [
"""
addition = """function compactMajorBandsRankingPosition(position = null) {
  if (!position || typeof position !== 'object') return position || null;
  return pickMeaningful(position, [
    'bandKey',
    'positionDistance',
    'evidenceStrength',
    'classificationBasis'
  ]);
}

"""
if addition not in text:
    if anchor not in text:
        raise RuntimeError('missing canonical position anchor')
    text = text.replace(anchor, addition + anchor, 1)
text = replace_once(
    text,
    "      candidate.canonicalPosition = compactMajorBandsCanonicalPosition(value);\n",
    "      candidate.canonicalPosition = compactMajorBandsRankingPosition(value);\n",
    'ranking position transfer'
)
path.write_text(text, encoding='utf-8')

# Parent reconstructs and validates the complete canonical position only for
# globally selected records.
path = Path('functions/api/major-bands.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "import { rankBandRangeText } from '../../shared/algorithms/position/canonical-position.v3963_0.js';\n",
    "import { resolveCanonicalPosition, rankBandRangeText } from '../../shared/algorithms/position/canonical-position.v3963_0.js';\n",
    'canonical position resolver import'
)
text = replace_once(
    text,
    """function finalizeRecordForResponse(record) {
  const item = materializeMajorBandsStaticRecord(record);
  return { ...item, ...buildDisplayTags(item) };
}
""",
    """function finalizeRecordForResponse(record, context = {}) {
  const canonicalPosition = resolveCanonicalPosition({
    candidateScore: context.candidateScore,
    candidateRank: context.candidateRank?.rankForGap,
    recordScore: record.score2026 ?? record.score,
    recordRank: record.rank2026 ?? record.rank,
    rangePreset: context.rangePreset
  });
  const transferredBand = record.canonicalPosition?.bandKey || record.bandKey || record.band || '';
  if (transferredBand && canonicalPosition.bandKey !== transferredBand) {
    throw new Error(`分桶排序位置与父级重建不一致：${record.id || `${record.school}|${record.major}`}，${transferredBand}/${canonicalPosition.bandKey}`);
  }
  const source = {
    ...record,
    band: canonicalPosition.bandKey,
    bandKey: canonicalPosition.bandKey,
    candidateScore: context.candidateScore,
    candidateReferenceScore: context.candidateScore,
    scoreDelta2026: canonicalPosition.scoreDelta,
    scoreDelta: canonicalPosition.scoreDelta,
    rankGap2026: canonicalPosition.rankGap,
    rankGap: canonicalPosition.rankGap,
    statusKey: canonicalPosition.statusKey,
    statusLabel: canonicalPosition.statusLabel,
    position: canonicalPosition.position,
    canonicalPosition
  };
  const item = materializeMajorBandsStaticRecord(source);
  return { ...item, ...buildDisplayTags(item) };
}
""",
    'parent canonical position reconstruction'
)
text = replace_once(
    text,
    """        : diversified.slice(offset, offset + pageLimit).map(record => compactMajorBandsResponseRecord(
          finalizeRecordForResponse(record)
        ));
""",
    """        : diversified.slice(offset, offset + pageLimit).map(record => compactMajorBandsResponseRecord(
          finalizeRecordForResponse(record, { candidateScore, candidateRank, rangePreset })
        ));
""",
    'parent finalization context'
)
path.write_text(text, encoding='utf-8')

# Audit the small ranking tuple and deterministic parent reconstruction owner.
path = Path('tools/audit-major-bands-bounded-fanout-v3972_5.mjs')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    """assert.equal(compactCandidate.canonicalPosition.ignoredInternalField, undefined);
assert.equal(compactCandidate.rankingTrace, undefined);
""",
    """assert.equal(compactCandidate.canonicalPosition.bandKey, 'near');
assert.equal(compactCandidate.canonicalPosition.positionDistance, 3);
assert.equal(compactCandidate.canonicalPosition.evidenceStrength, 'strong');
assert.equal(compactCandidate.canonicalPosition.version, undefined);
assert.equal(compactCandidate.canonicalPosition.candidateScore, undefined);
assert.equal(compactCandidate.canonicalPosition.ignoredInternalField, undefined);
assert.equal(compactCandidate.rankingTrace, undefined);
""",
    'audit minimal ranking position tuple'
)
text = replace_once(
    text,
    """assert.ok(source.includes('const item = materializeMajorBandsStaticRecord(record);'));
assert.ok(!source.includes('record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION'));
""",
    """assert.ok(source.includes('resolveCanonicalPosition, rankBandRangeText'));
assert.ok(source.includes('const item = materializeMajorBandsStaticRecord(source);'));
assert.ok(source.includes('分桶排序位置与父级重建不一致'));
assert.ok(source.includes('finalizeRecordForResponse(record, { candidateScore, candidateRank, rangePreset })'));
assert.ok(!source.includes('record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION'));
""",
    'audit deterministic parent position reconstruction'
)
path.write_text(text, encoding='utf-8')
