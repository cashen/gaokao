import { buildHistoryScore } from './history-score-engine.js';
import { buildHistoricalScoreRankEvidence } from './historical-score-rank-evidence.js';
import { normalizeLocation } from './location-normalizer.js';

export const MAJOR_BANDS_MATERIALIZATION_VERSION = 'major-bands-materialized-v3990_0';
export const MAJOR_BANDS_RANK_ROW_FILTER_VERSION = 'major-bands-rank-row-filter-v3990_0';
export const MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION = 'major-bands-rank-order-minimal-projection-v3990_0';

const MANIFEST_PATH = '/ln-rank/data/major-bands-static-v3972_2/manifest.json';
const MANIFEST_TTL = 5 * 60 * 1000;
let manifestCache = null;

function fresh(item) {
  return item && Date.now() - item.time < MANIFEST_TTL;
}

function origin(request) {
  return new URL(request.url).origin;
}

function hasPagesAssets(options = {}) {
  return Boolean(options.assets && typeof options.assets.fetch === 'function');
}

async function fetchStaticJson(request, pathname, options = {}) {
  const url = `${origin(request)}${pathname}`;
  const assetRequest = new Request(url, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });
  const owner = hasPagesAssets(options) ? 'pages-assets-binding' : 'same-origin-fallback';
  const response = hasPagesAssets(options)
    ? await options.assets.fetch(assetRequest)
    : await fetch(assetRequest, {
      cf: { cacheTtl: 300, cacheEverything: false }
    });
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok) throw new Error(`静态专业分数索引读取失败：${pathname}，HTTP ${response.status}，owner=${owner}`);
  if (contentType.includes('text/html')) throw new Error(`静态专业分数索引返回 HTML：${pathname}，owner=${owner}`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`静态专业分数索引 JSON 解析失败：${pathname}，owner=${owner}。${error?.message || String(error)}`);
  }
}

export async function loadMajorBandsStaticManifest(request, options = {}) {
  if (fresh(manifestCache)) return manifestCache.data;
  const manifest = await fetchStaticJson(request, MANIFEST_PATH, options);
  if (manifest?.version !== 'major-bands-static-v3972_2') throw new Error(`静态专业分数索引版本异常：${manifest?.version || 'unknown'}`);
  if (manifest?.architecture !== 'build-time-static-score-index') throw new Error('静态专业分数索引架构异常');
  if (manifest?.encoding !== 'schema-row-array-atomic-v2') throw new Error(`静态专业分数索引编码异常：${manifest?.encoding || 'unknown'}`);
  if (!manifest?.integrity?.completeEvaluation || Number(manifest?.recordCount) !== 11628) throw new Error('静态专业分数索引覆盖不完整');
  if (Number(manifest?.integrity?.duplicateRecordCount) !== 0 || Number(manifest?.integrity?.unresolvedRecordCount) !== 0) throw new Error('静态专业分数索引完整性异常');
  manifestCache = { time: Date.now(), data: manifest };
  return manifest;
}

function decodeRow(row, schema) {
  const record = {};
  for (let index = 0; index < schema.length; index += 1) {
    const value = row[index];
    if (value !== null && value !== undefined) record[schema[index]] = value;
  }
  record.schoolName = record.school;
  record.majorName = record.major;
  record.score = record.score2026;
  record.rank = record.rank2026;
  record.region = record.lnArea;
  record.codes = {
    rawFenxiMajorCode: record.rawFenxiMajorCode || '',
    standardMajorCode: record.standardMajorCode || '',
    rawFenxiMajorCodeLooksStandard: Boolean(record.rawFenxiMajorCodeLooksStandard)
  };
  record.standardMajor = record.standardMajorCode || record.standardMajorName
    ? {
        code: record.standardMajorCode || '',
        name: record.standardMajorName || '',
        categoryCode: record.standardMajorCategoryCode || '',
        categoryName: record.standardMajorCategoryName || ''
      }
    : null;
  record.specialProject = {
    hasSpecialProject: Boolean(record.specialHas),
    keys: Array.isArray(record.specialKeys) ? record.specialKeys : [],
    labels: Array.isArray(record.specialLabels) ? record.specialLabels : [],
    primaryLabel: record.specialPrimaryLabel || '',
    reviewPoints: Array.isArray(record.specialReviewPoints) ? record.specialReviewPoints : []
  };
  return record;
}


const NO_SPECIAL_PROJECT_FOR_ORDER = Object.freeze({
  hasSpecialProject: false,
  keys: Object.freeze([]),
  labels: Object.freeze([]),
  primaryLabel: '',
  reviewPoints: Object.freeze([])
});

export function buildMajorBandsRankOrderProjectionSchema(schema = []) {
  const index = key => schema.indexOf(key);
  return Object.freeze({
    id: index('id'),
    school: index('school'),
    major: index('major'),
    score2026: index('score2026'),
    rank2026: index('rank2026'),
    specialHas: index('specialHas'),
    specialKeys: index('specialKeys'),
    specialLabels: index('specialLabels'),
    specialPrimaryLabel: index('specialPrimaryLabel'),
    specialReviewPoints: index('specialReviewPoints')
  });
}

export function decodeMajorBandsRankOrderRow(row = [], projectionSchema = {}) {
  const value = key => Number.isInteger(projectionSchema[key]) && projectionSchema[key] >= 0
    ? row[projectionSchema[key]]
    : undefined;
  const specialHas = Boolean(value('specialHas'));
  const record = {
    id: value('id'),
    school: value('school'),
    major: value('major'),
    score2026: value('score2026'),
    rank2026: value('rank2026'),
    specialProject: NO_SPECIAL_PROJECT_FOR_ORDER
  };
  if (specialHas) {
    record.specialProject = {
      hasSpecialProject: true,
      keys: Array.isArray(value('specialKeys')) ? value('specialKeys') : [],
      labels: Array.isArray(value('specialLabels')) ? value('specialLabels') : [],
      primaryLabel: value('specialPrimaryLabel') || '',
      reviewPoints: Array.isArray(value('specialReviewPoints')) ? value('specialReviewPoints') : []
    };
  }
  return record;
}

function intersects(bucket, scoreWindow) {
  return Number(bucket?.maxScore) >= Number(scoreWindow.min)
    && Number(bucket?.minScore) <= Number(scoreWindow.max);
}

export async function selectMajorBandsStaticBuckets(request, scoreWindow, options = {}) {
  const manifest = await loadMajorBandsStaticManifest(request, options);
  const buckets = (manifest.buckets || []).filter(bucket => intersects(bucket, scoreWindow));
  return { manifest, buckets };
}

/**
 * Load exactly one manifest-approved five-point bucket. The caller cannot pass
 * an arbitrary path or ask this function to combine buckets.
 */
export async function loadMajorBandsStaticBucket(request, bucketFile, scoreWindow, options = {}) {
  const manifest = await loadMajorBandsStaticManifest(request, options);
  const bucket = (manifest.buckets || []).find(item => item.file === bucketFile);
  if (!bucket) throw new Error(`静态专业分数桶不在发布清单中：${bucketFile || 'empty'}`);
  if (!intersects(bucket, scoreWindow)) throw new Error(`静态专业分数桶超出当前查询窗口：${bucketFile}`);
  const payload = await fetchStaticJson(request, bucket.file, options);
  if (payload?.version !== manifest.version || !Array.isArray(payload?.rows)) {
    throw new Error(`静态专业分数桶合同异常：${bucket.file}`);
  }
  const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
  const records = [];
  for (const row of payload.rows) {
    const record = decodeRow(row, schema);
    const score = Number(record.score2026);
    if (Number.isFinite(score) && score >= scoreWindow.min && score <= scoreWindow.max) records.push(record);
  }
  return {
    manifest,
    bucket,
    records,
    rowCount: payload.rows.length,
    bytes: Number(bucket.bytes || 0),
    assetOwner: hasPagesAssets(options) ? 'pages-assets-binding' : 'same-origin-fallback'
  };
}

/**
 * Load one manifest-approved immutable bucket without applying the legacy score
 * prefilter. The v3990 rank query kernel performs the authoritative canonical
 * rank classification after all selected buckets are decoded in one Worker.
 */

export function majorBandsRankValueMatchesRange(rankLike, range = null) {
  const minRank = Number(range?.minRank);
  const maxRank = Number(range?.maxRank);
  if (!Number.isFinite(minRank) || !Number.isFinite(maxRank)) return true;
  const rank = Number(rankLike);
  // Preserve missing/invalid rank rows for the canonical score fallback.
  if (!Number.isFinite(rank) || rank <= 0) return true;
  return rank >= minRank && rank <= maxRank;
}

export async function loadMajorBandsStaticRankBucket(request, bucketFile, options = {}) {
  const manifest = await loadMajorBandsStaticManifest(request, options);
  const bucket = (manifest.buckets || []).find(item => item.file === bucketFile);
  if (!bucket) throw new Error(`静态专业分数桶不在发布清单中：${bucketFile || 'empty'}`);
  const payload = await fetchStaticJson(request, bucket.file, options);
  if (payload?.version !== manifest.version || !Array.isArray(payload?.rows)) {
    throw new Error(`静态专业位次桶合同异常：${bucket.file}`);
  }
  if (payload.rows.length !== Number(bucket.recordCount || 0)) {
    throw new Error(`静态专业位次桶记录数异常：${bucket.file}`);
  }
  const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
  const rankIndex = schema.indexOf('rank2026');
  const idIndex = schema.indexOf('id');
  const rankRange = options.rankRange && Number.isFinite(Number(options.rankRange.minRank)) && Number.isFinite(Number(options.rankRange.maxRank))
    ? Object.freeze({
        minRank: Number(options.rankRange.minRank),
        maxRank: Number(options.rankRange.maxRank)
      })
    : null;
  const allowedIds = options.allowedIds instanceof Set ? options.allowedIds : null;
  const rankFilteredRows = rankRange && rankIndex >= 0
    ? payload.rows.filter(row => majorBandsRankValueMatchesRange(row?.[rankIndex], rankRange))
    : payload.rows;
  const selectedRows = allowedIds && idIndex >= 0
    ? rankFilteredRows.filter(row => allowedIds.has(String(row?.[idIndex] || '')))
    : rankFilteredRows;
  const projectionVersion = options.projection === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    : 'full-record-v3990_0';
  const projectionSchema = projectionVersion === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    ? buildMajorBandsRankOrderProjectionSchema(schema)
    : null;
  const records = projectionSchema
    ? selectedRows.map(row => decodeMajorBandsRankOrderRow(row, projectionSchema))
    : selectedRows.map(row => decodeRow(row, schema));
  return {
    manifest,
    bucket,
    records,
    projectionVersion,
    minimalProjection: projectionVersion === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
    rowCount: payload.rows.length,
    decodedRowCount: selectedRows.length,
    rankRowsSkipped: payload.rows.length - selectedRows.length,
    pageIdRowsSkipped: rankFilteredRows.length - selectedRows.length,
    pageIdFilterCount: allowedIds?.size || 0,
    pageIdFilterVersion: 'major-bands-page-id-predecode-filter-v3990_0',
    rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
    rankRange,
    bytes: Number(bucket.bytes || 0),
    assetOwner: hasPagesAssets(options) ? 'pages-assets-binding' : 'same-origin-fallback'
  };
}

/** Compatibility helper for local audits; production orchestration uses one bucket per Worker. */
export async function loadMajorBandsStaticWindow(request, scoreWindow, options = {}) {
  const { manifest, buckets } = await selectMajorBandsStaticBuckets(request, scoreWindow, options);
  const records = [];
  let bytes = 0;
  for (const bucket of buckets) {
    const loaded = await loadMajorBandsStaticBucket(request, bucket.file, scoreWindow, options);
    records.push(...loaded.records);
    bytes += loaded.bytes;
  }
  return { manifest, records, buckets, bytes };
}

export function materializeMajorBandsStaticRecord(record = {}) {
  if (record?.majorBandsMaterializationVersion === MAJOR_BANDS_MATERIALIZATION_VERSION) return record;
  const historyCompare = buildHistoryScore(record);
  const location = normalizeLocation(record, record.school, record.major);
  const expanded = {
    ...record,
    dataYear: 2026,
    primaryYear: 2026,
    historyCompare,
    lnArea: location.lnArea,
    region: location.lnArea,
    province: location.province,
    city: location.city,
    displayLocation: location.displayLocation,
    locationSource: location.locationSource,
    locationConfidence: location.locationConfidence,
    locationWarning: location.locationWarning,
    geoEntity: location.geoEntity || '',
    schoolCanonical: location.schoolCanonical || record.schoolCanonical || '',
    regionGroups: location.regionGroups || [],
    geoSourceMethod: location.geoSourceMethod || '',
    geoSourceName: location.geoSourceName || '',
    geoSourceUrl: location.geoSourceUrl || '',
    geoSourceYear: location.geoSourceYear || '',
    geoMatchNote: location.geoMatchNote || '',
    schoolIdentifier: location.schoolIdentifier || '',
    tuitionSourceYear: record.tuition ? 2026 : null
  };
  const historyEvidence = buildHistoricalScoreRankEvidence(expanded);
  return {
    ...expanded,
    majorBandsMaterializationVersion: MAJOR_BANDS_MATERIALIZATION_VERSION,
    historyEvidence,
    rank2026Source: historyEvidence.years[2026].rankSource,
    rank2025Source: historyEvidence.years[2025].rankSource,
    rank2024Source: historyEvidence.years[2024].rankSource
  };
}
