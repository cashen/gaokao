import { buildHistoryScore } from './history-score-engine.js';
import { buildHistoricalScoreRankEvidence } from './historical-score-rank-evidence.js';
import { normalizeLocation } from './location-normalizer.js';

export const MAJOR_BANDS_MATERIALIZATION_VERSION = 'major-bands-materialized-v3990_1';
export const MAJOR_BANDS_RANK_ROW_FILTER_VERSION = 'major-bands-rank-row-filter-v3990_1';
export const MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION = 'major-bands-rank-row-native-scan-v3990_1';
export const MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION = 'major-bands-page-id-native-prefilter-v3990_1';
export const MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION = 'major-bands-page-id-direct-row-lookup-v3990_1';
export const MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION = 'major-bands-rank-order-minimal-projection-v3990_1';

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

async function fetchStaticResponse(request, pathname, options = {}) {
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
  return { response, owner };
}

async function fetchStaticJson(request, pathname, options = {}) {
  const { response, owner } = await fetchStaticResponse(request, pathname, options);
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

export function decodeMajorBandsStaticRow(row, schema) {
  const sourceRow = typeof row === 'string' ? JSON.parse(row) : row;
  if (!Array.isArray(sourceRow)) throw new Error('静态专业原始行格式异常');
  return decodeRow(sourceRow, schema);
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
    fullSchema: schema,
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

export function decodeMajorBandsRankOrderRow(row = [], projectionSchema = {}, options = {}) {
  const value = key => Number.isInteger(projectionSchema[key]) && projectionSchema[key] >= 0
    ? row[projectionSchema[key]]
    : undefined;
  const specialHas = Boolean(value('specialHas'));
  const rawRowStorage = options.rawRowStorage === 'serialized-json'
    ? 'serialized-json'
    : 'array-reference';
  const rawRowValue = rawRowStorage === 'serialized-json' ? JSON.stringify(row) : row;
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
  Object.defineProperties(record, {
    majorBandsRawRow: {
      value: rawRowValue,
      enumerable: false,
      configurable: false,
      writable: false
    },
    majorBandsRawRowStorage: {
      value: rawRowStorage,
      enumerable: false,
      configurable: false,
      writable: false
    },
    majorBandsRawSchema: {
      value: projectionSchema.fullSchema,
      enumerable: false,
      configurable: false,
      writable: false
    }
  });
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

function findStaticRowsArrayStart(text) {
  const match = /"rows"\s*:\s*\[/.exec(String(text || ''));
  return match ? match.index + match[0].lastIndexOf('[') : -1;
}

function readTopLevelArrayScalars(rowText, indexes = []) {
  const source = String(rowText || '');
  const wanted = new Set(indexes.filter(index => Number.isInteger(index) && index >= 0));
  const values = new Map();
  if (!wanted.size || source[0] !== '[') return values;
  const maxIndex = Math.max(...wanted);
  let valueIndex = 0;
  let valueStart = 1;
  let nestedDepth = 0;
  let inString = false;
  let escaped = false;

  const capture = end => {
    if (wanted.has(valueIndex)) {
      const raw = source.slice(valueStart, end).trim();
      values.set(valueIndex, raw ? JSON.parse(raw) : undefined);
    }
  };

  for (let cursor = 1; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[' || char === '{') {
      nestedDepth += 1;
      continue;
    }
    if (char === ']' || char === '}') {
      if (char === ']' && nestedDepth === 0) {
        capture(cursor);
        break;
      }
      nestedDepth -= 1;
      if (nestedDepth < 0) throw new Error('静态专业位次桶标量预筛容器深度异常');
      continue;
    }
    if (char === ',' && nestedDepth === 0) {
      capture(cursor);
      if (valueIndex >= maxIndex) break;
      valueIndex += 1;
      valueStart = cursor + 1;
    }
  }
  return values;
}

function findTopLevelArrayEnd(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[' || char === '{') depth += 1;
    else if (char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) return cursor + 1;
      if (depth < 0) throw new Error('静态专业位次桶直接定位 row 容器深度异常');
    }
  }
  throw new Error('静态专业位次桶直接定位 row 未完整结束');
}

function findMajorBandsStaticRowTextById(source, rowsStart, id) {
  const canonicalId = String(id || '');
  if (!canonicalId) return '';
  const pattern = `[${JSON.stringify(canonicalId)},`;
  let from = rowsStart + 1;
  while (from < source.length) {
    const start = source.indexOf(pattern, from);
    if (start < 0) return '';
    let previous = start - 1;
    while (previous > rowsStart && /\s/.test(source[previous])) previous -= 1;
    if (source[previous] === '[' || source[previous] === ',') {
      const end = findTopLevelArrayEnd(source, start);
      return source.slice(start, end);
    }
    from = start + pattern.length;
  }
  return '';
}

export function scanMajorBandsStaticRankRowsText(text, options = {}) {
  const source = String(text || '');
  const rowsStart = findStaticRowsArrayStart(source);
  if (rowsStart < 0) throw new Error('静态专业位次桶 rows 数组不存在');
  const prefix = source.slice(0, rowsStart);
  const versionMatch = /"version"\s*:\s*"([^"]+)"/.exec(prefix);
  const version = versionMatch?.[1] || '';
  const expectedVersion = String(options.expectedVersion || '');
  if (expectedVersion && version !== expectedVersion) {
    throw new Error(`静态专业位次桶版本异常：${version || 'unknown'}`);
  }

  const rankIndex = Number.isInteger(options.rankIndex) ? options.rankIndex : -1;
  const idIndex = Number.isInteger(options.idIndex) ? options.idIndex : -1;
  const rankRange = options.rankRange && Number.isFinite(Number(options.rankRange.minRank)) && Number.isFinite(Number(options.rankRange.maxRank))
    ? Object.freeze({ minRank: Number(options.rankRange.minRank), maxRank: Number(options.rankRange.maxRank) })
    : null;
  const allowedIds = options.allowedIds instanceof Set ? options.allowedIds : null;
  const rows = [];
  const expectedRecordCount = Math.max(0, Number(options.expectedRecordCount || 0));
  let rowCount = 0;
  let rankMatchedCount = 0;
  let fullRowParseCount = 0;
  let pageIdScalarPrefilterCount = 0;
  let pageIdDirectLookupCount = 0;
  let pageIdDirectLookupHits = 0;

  if (allowedIds && idIndex === 0) {
    rowCount = expectedRecordCount;
    for (const id of allowedIds) {
      pageIdDirectLookupCount += 1;
      const rowText = findMajorBandsStaticRowTextById(source, rowsStart, id);
      if (!rowText) continue;
      const row = JSON.parse(rowText);
      fullRowParseCount += 1;
      if (!Array.isArray(row)) throw new Error('静态专业位次桶直接定位 row 解析后不是数组');
      if (String(row?.[idIndex] || '') !== String(id)) throw new Error('静态专业位次桶直接定位 ID 不一致');
      const rankMatch = rankRange && rankIndex >= 0
        ? majorBandsRankValueMatchesRange(row?.[rankIndex], rankRange)
        : true;
      if (!rankMatch) continue;
      rankMatchedCount += 1;
      pageIdDirectLookupHits += 1;
      rows.push(row);
    }
    const suffix = source.slice(source.lastIndexOf(']') + 1).trim();
    if (!suffix.endsWith('}')) throw new Error('静态专业位次桶外层 JSON 未完整结束');
    return {
      version,
      rows,
      rowCount,
      rankMatchedCount,
      rankMatchedCountMode: 'selected-page-ids-only',
      fullRowParseCount,
      pageIdScalarPrefilterCount,
      pageIdDirectLookupCount,
      pageIdDirectLookupHits,
      pageIdPrefilterVersion: MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,
      mode: 'native-page-id-direct-row-lookup',
      scanVersion: MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION
    };
  }

  let cursor = rowsStart + 1;
  let ended = false;

  while (cursor < source.length) {
    while (cursor < source.length && (/\s/.test(source[cursor]) || source[cursor] === ',')) cursor += 1;
    if (cursor >= source.length) break;
    if (source[cursor] === ']') {
      cursor += 1;
      ended = true;
      break;
    }
    if (source[cursor] !== '[') {
      throw new Error(`静态专业位次桶 row 必须是数组：${JSON.stringify(source[cursor])}`);
    }

    const start = cursor;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; cursor < source.length; cursor += 1) {
      const char = source[cursor];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '[' || char === '{') depth += 1;
      else if (char === ']' || char === '}') {
        depth -= 1;
        if (depth === 0) {
          cursor += 1;
          break;
        }
        if (depth < 0) throw new Error('静态专业位次桶 row 容器深度异常');
      }
    }
    if (depth !== 0 || inString) throw new Error('静态专业位次桶 row 未完整结束');

    const rowText = source.slice(start, cursor);
    rowCount += 1;
    if (allowedIds && idIndex >= 0) {
      const scalarValues = readTopLevelArrayScalars(rowText, [idIndex, rankIndex]);
      pageIdScalarPrefilterCount += 1;
      const rankMatch = rankRange && rankIndex >= 0
        ? majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)
        : true;
      if (!rankMatch) continue;
      rankMatchedCount += 1;
      if (!allowedIds.has(String(scalarValues.get(idIndex) || ''))) continue;
      const row = JSON.parse(rowText);
      fullRowParseCount += 1;
      if (!Array.isArray(row)) throw new Error('静态专业位次桶 row 解析后不是数组');
      rows.push(row);
      continue;
    }

    const row = JSON.parse(rowText);
    fullRowParseCount += 1;
    if (!Array.isArray(row)) throw new Error('静态专业位次桶 row 解析后不是数组');
    const rankMatch = rankRange && rankIndex >= 0
      ? majorBandsRankValueMatchesRange(row?.[rankIndex], rankRange)
      : true;
    if (!rankMatch) continue;
    rankMatchedCount += 1;
    rows.push(row);
  }

  if (!ended) throw new Error('静态专业位次桶 rows 数组未完整结束');
  if (expectedRecordCount && rowCount !== expectedRecordCount) {
    throw new Error(`静态专业位次桶记录数异常：${rowCount}/${expectedRecordCount}`);
  }
  const suffix = source.slice(cursor).trim();
  if (!suffix.endsWith('}')) throw new Error('静态专业位次桶外层 JSON 未完整结束');
  return {
    version,
    rows,
    rowCount,
    rankMatchedCount,
    fullRowParseCount,
    pageIdScalarPrefilterCount,
    pageIdDirectLookupCount,
    pageIdDirectLookupHits,
    pageIdPrefilterVersion: MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
    mode: 'native-row-text-scan',
    scanVersion: MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION
  };
}

export async function loadMajorBandsStaticRankBucket(request, bucketFile, options = {}) {
  const manifest = await loadMajorBandsStaticManifest(request, options);
  const bucket = (manifest.buckets || []).find(item => item.file === bucketFile);
  if (!bucket) throw new Error(`静态专业分数桶不在发布清单中：${bucketFile || 'empty'}`);
  const { response, owner } = await fetchStaticResponse(request, bucket.file, options);
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
  const text = await response.text();
  const scan = scanMajorBandsStaticRankRowsText(text, {
    expectedVersion: manifest.version,
    expectedRecordCount: Number(bucket.recordCount || 0),
    rankIndex,
    idIndex,
    rankRange,
    allowedIds
  });
  const selectedRows = scan.rows;
  const projectionVersion = options.projection === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    : 'full-record-v3990_1';
  const projectionSchema = projectionVersion === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION
    ? buildMajorBandsRankOrderProjectionSchema(schema)
    : null;
  const records = projectionSchema
    ? selectedRows.map(row => decodeMajorBandsRankOrderRow(row, projectionSchema, {
        rawRowStorage: options.rawRowStorage
      }))
    : selectedRows.map(row => decodeRow(row, schema));
  return {
    manifest,
    bucket,
    records,
    projectionVersion,
    minimalProjection: projectionVersion === MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
    rawRowStorage: projectionSchema
      ? (options.rawRowStorage === 'serialized-json' ? 'serialized-json' : 'array-reference')
      : 'full-record',
    rowCount: scan.rowCount,
    decodedRowCount: selectedRows.length,
    rankRowsSkipped: scan.rowCount - selectedRows.length,
    pageIdRowsSkipped: scan.rankMatchedCount - selectedRows.length,
    pageIdFilterCount: allowedIds?.size || 0,
    pageIdFilterVersion: 'major-bands-page-id-predecode-filter-v3990_1',
    rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
    rowScanVersion: scan.scanVersion,
    rowScanMode: scan.mode,
    rankRange,
    bytes: Number(bucket.bytes || 0),
    assetOwner: owner
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
