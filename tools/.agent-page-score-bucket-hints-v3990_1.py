from pathlib import Path

api = Path('functions/api/major-bands.js')
text = api.read_text()

replacements = [
("export const MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-canonical-v3990_1';",
 "export const MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-score-hints-v3990_1';\nexport const MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION = 'major-bands-requested-band-page-score-hints-v3990_1';"),
("export const MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION = 'major-bands-requested-band-response-edge-cache-canonical-v3990_1';",
 "export const MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION = 'major-bands-requested-band-response-edge-cache-score-hints-v3990_1';"),
]
for old, new in replacements:
    if text.count(old) != 1:
        raise SystemExit(f'constant anchor count={text.count(old)}: {old}')
    text = text.replace(old, new, 1)

cache_key_anchor = "  url.searchParams.set('__orderEdgeCache', MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION);"
cache_key_new = cache_key_anchor + "\n  url.searchParams.set('__pageScoreHints', MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION);"
if text.count(cache_key_anchor) != 1:
    raise SystemExit(f'order edge key anchor count={text.count(cache_key_anchor)}')
text = text.replace(cache_key_anchor, cache_key_new, 1)

read_anchor = """    const snapshot = payload?.snapshot;
    const orderedIds = Array.isArray(snapshot?.orderedIds) ? snapshot.orderedIds : [];
    if (payload?.version !== MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION) return null;
    if (snapshot?.version !== MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION) return null;
    if (!snapshot?.snapshot || orderedIds.length > REQUESTED_BAND_ORDER_CACHE_MAX_IDS_PER_ENTRY) return null;
    return snapshot;"""
read_new = """    const snapshot = payload?.snapshot;
    const orderedIds = Array.isArray(snapshot?.orderedIds) ? snapshot.orderedIds : [];
    const orderedScores = Array.isArray(snapshot?.orderedScores) ? snapshot.orderedScores : [];
    if (payload?.version !== MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION) return null;
    if (snapshot?.version !== MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION) return null;
    if (snapshot?.pageScoreHintVersion !== MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION) return null;
    if (!snapshot?.snapshot || orderedIds.length > REQUESTED_BAND_ORDER_CACHE_MAX_IDS_PER_ENTRY) return null;
    if (orderedScores.length !== orderedIds.length || orderedScores.some(score => !Number.isFinite(Number(score)))) return null;
    return snapshot;"""
if text.count(read_anchor) != 1:
    raise SystemExit(f'edge snapshot read anchor count={text.count(read_anchor)}')
text = text.replace(read_anchor, read_new, 1)

helper_anchor = "function requestedBandOrderCacheState(identity = '') {"
helpers = """function orderedPageScores(records = []) {
  return (Array.isArray(records) ? records : []).map(record => {
    const score = Number(record?.score2026 ?? record?.score);
    return Number.isFinite(score) ? score : null;
  });
}

function selectRequestedBandPageBucketsByScoreHints(selectedBuckets = [], pageScores = [], pageIdCount = 0) {
  const buckets = Array.isArray(selectedBuckets) ? selectedBuckets : [];
  const scores = Array.isArray(pageScores) ? pageScores.map(Number) : [];
  if (!pageIdCount) {
    return { status: 'empty-page', buckets: [], candidateCount: buckets.length, hintedCount: 0, scoreCount: 0 };
  }
  if (scores.length !== pageIdCount || scores.some(score => !Number.isFinite(score))) {
    return { status: 'fallback-invalid-hints', buckets, candidateCount: buckets.length, hintedCount: buckets.length, scoreCount: scores.length };
  }
  const uniqueScores = [...new Set(scores)];
  const hinted = buckets.filter(bucket => uniqueScores.some(score => (
    score >= Number(bucket?.minScore) && score <= Number(bucket?.maxScore)
  )));
  const covered = uniqueScores.every(score => hinted.some(bucket => (
    score >= Number(bucket?.minScore) && score <= Number(bucket?.maxScore)
  )));
  if (!covered || !hinted.length) {
    return { status: 'fallback-uncovered-score', buckets, candidateCount: buckets.length, hintedCount: buckets.length, scoreCount: scores.length };
  }
  return { status: 'applied', buckets: hinted, candidateCount: buckets.length, hintedCount: hinted.length, scoreCount: scores.length };
}

"""
if text.count(helper_anchor) != 1:
    raise SystemExit(f'helper insertion anchor count={text.count(helper_anchor)}')
text = text.replace(helper_anchor, helpers + helper_anchor, 1)

# Add score hints to both all-band shared and cold requested-band snapshots.
snapshot_anchor = """      orderedIds: ordered.map(record => record.id),
      snapshot: majorBandsSnapshotId(ordered, identity)"""
snapshot_new = """      orderedIds: ordered.map(record => record.id),
      orderedScores: orderedPageScores(ordered),
      pageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
      snapshot: majorBandsSnapshotId(ordered, identity)"""
if text.count(snapshot_anchor) != 2:
    raise SystemExit(f'ordered snapshot anchor count={text.count(snapshot_anchor)}')
text = text.replace(snapshot_anchor, snapshot_new)

state_anchor = """  let orderPageSource = 'page-id-refetch';
  let orderCacheStatus = retained ? 'ordered-id-hit' : 'ordered-id-miss';"""
state_new = """  let orderPageSource = 'page-id-refetch';
  let orderPageBucketHintStatus = allBandsShared ? 'shared-projection' : 'not-needed';
  let orderPageBucketHintCandidateCount = 0;
  let orderPageBucketHintedCount = 0;
  let orderPageBucketSelectedCount = 0;
  let orderPageScoreHintCount = 0;
  let orderCacheStatus = retained ? 'ordered-id-hit' : 'ordered-id-miss';"""
if text.count(state_anchor) != 1:
    raise SystemExit(f'page hint state anchor count={text.count(state_anchor)}')
text = text.replace(state_anchor, state_new, 1)

refetch_anchor = """  if (!pageRecords) {
    selectedBuckets = selectMajorBandsRankBuckets(retained.rankWindows);
    const pageLoaded = await loadMajorBandsRankWindow(context, selectedBuckets, { allowedIds: new Set(pageIds) });
    loadedStats = pageLoaded.stats;
    const byId = new Map(pageLoaded.records.map(record => [record.id, record]));
    pageRecords = pageIds.map(id => byId.get(id)).filter(Boolean);
    orderPageSource = 'page-id-refetch';
  }"""
refetch_new = """  if (!pageRecords) {
    selectedBuckets = selectMajorBandsRankBuckets(retained.rankWindows);
    const pageScores = Array.isArray(retained.orderedScores)
      ? retained.orderedScores.slice(pageOffset, pageOffset + pageLimit)
      : [];
    const pageBucketHints = selectRequestedBandPageBucketsByScoreHints(selectedBuckets, pageScores, pageIds.length);
    orderPageBucketHintStatus = pageBucketHints.status;
    orderPageBucketHintCandidateCount = pageBucketHints.candidateCount;
    orderPageBucketHintedCount = pageBucketHints.hintedCount;
    orderPageScoreHintCount = pageBucketHints.scoreCount;
    selectedBuckets = pageBucketHints.buckets;
    const pageLoaded = await loadMajorBandsRankWindow(context, selectedBuckets, { allowedIds: new Set(pageIds) });
    orderPageBucketSelectedCount = selectedBuckets.length;
    loadedStats = pageLoaded.stats;
    const byId = new Map(pageLoaded.records.map(record => [record.id, record]));
    pageRecords = pageIds.map(id => byId.get(id)).filter(Boolean);
    orderPageSource = 'page-id-refetch';
  }"""
if text.count(refetch_anchor) != 1:
    raise SystemExit(f'page refetch anchor count={text.count(refetch_anchor)}')
text = text.replace(refetch_anchor, refetch_new, 1)

return_anchor = """    orderPageSourceVersion: MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION,
    orderPageSource,
    orderColdSecondAssetPass:"""
return_new = """    orderPageSourceVersion: MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION,
    orderPageSource,
    orderPageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
    orderPageBucketHintStatus,
    orderPageBucketHintCandidateCount,
    orderPageBucketHintedCount,
    orderPageBucketSelectedCount,
    orderPageScoreHintCount,
    orderColdSecondAssetPass:"""
if text.count(return_anchor) != 1:
    raise SystemExit(f'execution return telemetry anchor count={text.count(return_anchor)}')
text = text.replace(return_anchor, return_new, 1)

source_anchor = """        requestedBandOrderPageSourceVersion: execution.orderPageSourceVersion || MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION,
        requestedBandOrderPageSource: execution.orderPageSource || 'keyword-bypass',
        requestedBandOrderColdSecondAssetPass:"""
source_new = """        requestedBandOrderPageSourceVersion: execution.orderPageSourceVersion || MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION,
        requestedBandOrderPageSource: execution.orderPageSource || 'keyword-bypass',
        requestedBandOrderPageScoreHintVersion: execution.orderPageScoreHintVersion || MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
        requestedBandOrderPageBucketHintStatus: execution.orderPageBucketHintStatus || 'keyword-bypass',
        requestedBandOrderPageBucketHintCandidates: Number(execution.orderPageBucketHintCandidateCount || 0),
        requestedBandOrderPageBucketHints: Number(execution.orderPageBucketHintedCount || 0),
        requestedBandOrderPageSelectedBuckets: Number(execution.orderPageBucketSelectedCount || 0),
        requestedBandOrderPageScoreHints: Number(execution.orderPageScoreHintCount || 0),
        requestedBandOrderColdSecondAssetPass:"""
if text.count(source_anchor) != 1:
    raise SystemExit(f'response source telemetry anchor count={text.count(source_anchor)}')
text = text.replace(source_anchor, source_new, 1)

api.write_text(text)

verify = Path('tools/verify-major-bands-preview-concurrency-v3990_1.mjs')
v = verify.read_text()
v = v.replace(
    "const expectedOrderEdgeCacheVersion = 'major-bands-requested-band-order-edge-cache-canonical-v3990_1';",
    "const expectedOrderEdgeCacheVersion = 'major-bands-requested-band-order-edge-cache-score-hints-v3990_1';\nconst expectedPageScoreHintVersion = 'major-bands-requested-band-page-score-hints-v3990_1';",
    1
)
v = v.replace(
    "const expectedRequestedBandResponseEdgeCacheVersion = 'major-bands-requested-band-response-edge-cache-canonical-v3990_1';",
    "const expectedRequestedBandResponseEdgeCacheVersion = 'major-bands-requested-band-response-edge-cache-score-hints-v3990_1';",
    1
)
page_source_anchor = """  assert.ok(['raw-row-reuse', 'full-record-reuse', 'page-id-refetch', 'all-bands-shared-projection'].includes(result.payload?.source?.requestedBandOrderPageSource), `${result.scenario}: invalid order page source`);
  assert.equal(result.payload?.source?.requestedBandOrderColdSecondAssetPass, false, `${result.scenario}: cold ordered query performed a second asset pass`);"""
page_source_new = """  assert.ok(['raw-row-reuse', 'full-record-reuse', 'page-id-refetch', 'all-bands-shared-projection'].includes(result.payload?.source?.requestedBandOrderPageSource), `${result.scenario}: invalid order page source`);
  assert.equal(result.payload?.source?.requestedBandOrderPageScoreHintVersion, expectedPageScoreHintVersion, `${result.scenario}: page score hint deployment`);
  assert.ok(['not-needed', 'shared-projection', 'applied', 'empty-page', 'fallback-invalid-hints', 'fallback-uncovered-score', 'keyword-bypass'].includes(result.payload?.source?.requestedBandOrderPageBucketHintStatus), `${result.scenario}: invalid page bucket hint status`);
  assert.equal(result.payload?.source?.requestedBandOrderColdSecondAssetPass, false, `${result.scenario}: cold ordered query performed a second asset pass`);"""
if v.count(page_source_anchor) != 1:
    raise SystemExit(f'verifier page source anchor count={v.count(page_source_anchor)}')
v = v.replace(page_source_anchor, page_source_new, 1)

cache_hit_anchor = """    if (['ordered-id-hit', 'ordered-id-edge-hit'].includes(result.payload?.source?.requestedBandOrderCacheStatus)) {
      assert.ok(Number(result.payload?.source?.rankDecodedRowCount || 0) <= Number(group.pagination?.limit || 0), `${result.scenario}: ordered-ID hit decoded more than current page`);
      assert.ok(Number(result.payload?.source?.requestedBandPageDecodedRecords || 0) <= Number(group.pagination?.limit || 0), `${result.scenario}: ordered-ID page exceeded limit`);
    }"""
cache_hit_new = """    if (['ordered-id-hit', 'ordered-id-edge-hit'].includes(result.payload?.source?.requestedBandOrderCacheStatus)) {
      assert.ok(Number(result.payload?.source?.rankDecodedRowCount || 0) <= Number(group.pagination?.limit || 0), `${result.scenario}: ordered-ID hit decoded more than current page`);
      assert.ok(Number(result.payload?.source?.requestedBandPageDecodedRecords || 0) <= Number(group.pagination?.limit || 0), `${result.scenario}: ordered-ID page exceeded limit`);
      if (Number(group.pagination?.returned || 0) > 0) {
        assert.equal(result.payload?.source?.requestedBandOrderPageBucketHintStatus, 'applied', `${result.scenario}: cached page score hints not applied`);
        assert.equal(Number(result.payload?.source?.requestedBandOrderPageScoreHints || 0), Number(group.pagination?.returned || 0), `${result.scenario}: page score hint count`);
        assert.ok(Number(result.payload?.source?.requestedBandOrderPageSelectedBuckets || 0) > 0, `${result.scenario}: page score hint selected no buckets`);
        assert.ok(Number(result.payload?.source?.requestedBandOrderPageSelectedBuckets || 0) <= Number(result.payload?.source?.requestedBandOrderPageBucketHintCandidates || 0), `${result.scenario}: page score hint expanded buckets`);
      }
    }"""
if v.count(cache_hit_anchor) != 1:
    raise SystemExit(f'verifier cache hit anchor count={v.count(cache_hit_anchor)}')
v = v.replace(cache_hit_anchor, cache_hit_new, 1)

safe_anchor = """    if (result.scenario === 'safe-449-near') {
      assert.equal(Number(result.payload?.source?.chunksRead), 6, 'safe-449-near: requested band must read exactly six buckets');
      assert.equal(Number(result.payload?.source?.staticIndexBytes), 621156, 'safe-449-near: scoped static bytes drift');
    }"""
safe_new = """    if (result.scenario === 'safe-449-near') {
      if (result.payload?.source?.requestedBandOrderPageSource === 'page-id-refetch') {
        assert.ok(Number(result.payload?.source?.chunksRead) >= 1 && Number(result.payload?.source?.chunksRead) <= 6, 'safe-449-near: page hint bucket scope');
        assert.ok(Number(result.payload?.source?.staticIndexBytes) > 0 && Number(result.payload?.source?.staticIndexBytes) <= 621156, 'safe-449-near: page hint static bytes');
      } else {
        assert.equal(Number(result.payload?.source?.chunksRead), 6, 'safe-449-near: cold requested band must read exactly six buckets');
        assert.equal(Number(result.payload?.source?.staticIndexBytes), 621156, 'safe-449-near: cold scoped static bytes drift');
      }
    }"""
if v.count(safe_anchor) != 1:
    raise SystemExit(f'verifier safe anchor count={v.count(safe_anchor)}')
v = v.replace(safe_anchor, safe_new, 1)
verify.write_text(v)

audit = Path('tools/audit-major-bands-rank-kernel-v3990_1.mjs')
a = audit.read_text()
audit_anchor = """for (const required of [
            "MAJOR_BANDS_RANK_ROW_FILTER_VERSION = 'major-bands-rank-row-filter-v3990_1'","""
audit_new = """for (const required of [
            "MAJOR_BANDS_RANK_ROW_FILTER_VERSION = 'major-bands-rank-row-filter-v3990_1'",
            "MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION = 'major-bands-requested-band-page-score-hints-v3990_1'",
            'orderedScores: orderedPageScores(ordered)',
            'selectRequestedBandPageBucketsByScoreHints',"""
if a.count(audit_anchor) != 1:
    raise SystemExit(f'audit source contract anchor count={a.count(audit_anchor)}')
a = a.replace(audit_anchor, audit_new, 1)
# Also prove every generated rank bucket can support score-based page narrowing.
bucket_anchor = "assert.equal(MAJOR_BANDS_RANK_INDEX_RECORD_COUNT, 11628, 'rank index record count');" if "assert.equal(MAJOR_BANDS_RANK_INDEX_RECORD_COUNT, 11628, 'rank index record count');" in a else None
if bucket_anchor:
    a = a.replace(bucket_anchor, bucket_anchor + "\nfor (const bucket of MAJOR_BANDS_RANK_BUCKETS) {\n  assert.ok(Number.isFinite(Number(bucket.minScore)) && Number.isFinite(Number(bucket.maxScore)), `rank bucket score hint range missing: ${bucket.file}`);\n  assert.ok(Number(bucket.minScore) <= Number(bucket.maxScore), `rank bucket score hint range inverted: ${bucket.file}`);\n}", 1)
audit.write_text(a)
