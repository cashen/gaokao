from pathlib import Path
p=Path('tools/audit-major-bands-query-execution-cache-v3990_0.mjs')
s=p.read_text()
old="""  \"MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-canonical-v3990_0'\",\n  \"url.searchParams.delete('offset')\",\n  \"writeRequestedBandOrderEdgeSnapshot(orderEdgeCache, orderEdgeCacheRequest, retained)\",\n"""
new="""  \"MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-score-hints-v3990_0'\",\n  \"MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION = 'major-bands-requested-band-page-score-hints-v3990_0'\",\n  \"MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION = 'major-bands-requested-band-response-edge-cache-score-hints-v3990_0'\",\n  'selectRequestedBandPageBucketsByScoreHints',\n  'requestedBandOrderPageBucketHintStatus: execution.orderPageBucketHintStatus',\n  'requestedBandOrderPageScoreHints: Number(execution.orderPageScoreHintCount || 0)',\n  'requestedBandResponseEdgeCacheRequest',\n  'context?.majorBandsInternalBandRequest !== true',\n  'predecodeRegion: filters.region',\n  \"url.searchParams.delete('offset')\",\n  \"writeRequestedBandOrderEdgeSnapshot(orderEdgeCache, orderEdgeCacheRequest, retained)\",\n"""
if old not in s:
    raise SystemExit('query cache edge audit anchor missing')
p.write_text(s.replace(old,new,1))
