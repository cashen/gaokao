import { buildHistoricalScoreRankEvidence } from './historical-score-rank-evidence.js';

const MANIFEST_PATH = '/ln-rank/data/major-bands-static-v3972_2/manifest.json';
const MANIFEST_TTL = 5 * 60 * 1000;
let manifestCache = null;

function fresh(item) {
  return item && Date.now() - item.time < MANIFEST_TTL;
}

function origin(request) {
  return new URL(request.url).origin;
}

async function fetchStaticJson(request, path) {
  const url = `${origin(request)}${path}`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 300, cacheEverything: false }
  });
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok) throw new Error(`静态专业分数索引读取失败：${path}，HTTP ${response.status}`);
  if (contentType.includes('text/html')) throw new Error(`静态专业分数索引返回 HTML：${path}`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`静态专业分数索引 JSON 解析失败：${path}。${error?.message || String(error)}`);
  }
}

export async function loadMajorBandsStaticManifest(request) {
  if (fresh(manifestCache)) return manifestCache.data;
  const manifest = await fetchStaticJson(request, MANIFEST_PATH);
  if (manifest?.version !== 'major-bands-static-v3972_2') throw new Error(`静态专业分数索引版本异常：${manifest?.version || 'unknown'}`);
  if (manifest?.architecture !== 'build-time-static-score-index') throw new Error('静态专业分数索引架构异常');
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

function intersects(bucket, scoreWindow) {
  return Number(bucket?.maxScore) >= Number(scoreWindow.min)
    && Number(bucket?.minScore) <= Number(scoreWindow.max);
}

/**
 * Load only compact score buckets that intersect the current candidate window.
 * Bucket payloads remain request-scoped and are not stored in module globals.
 */
export async function loadMajorBandsStaticWindow(request, scoreWindow) {
  const manifest = await loadMajorBandsStaticManifest(request);
  const schema = Array.isArray(manifest.recordSchema) ? manifest.recordSchema : [];
  const buckets = (manifest.buckets || []).filter(bucket => intersects(bucket, scoreWindow));
  const records = [];
  let bytes = 0;
  for (const bucket of buckets) {
    const payload = await fetchStaticJson(request, bucket.file);
    if (payload?.version !== manifest.version || !Array.isArray(payload?.rows)) {
      throw new Error(`静态专业分数桶合同异常：${bucket.file}`);
    }
    bytes += Number(bucket.bytes || 0);
    for (const row of payload.rows) {
      const record = decodeRow(row, schema);
      const score = Number(record.score2026);
      if (Number.isFinite(score) && score >= scoreWindow.min && score <= scoreWindow.max) records.push(record);
    }
  }
  return { manifest, records, buckets, bytes };
}

export function materializeMajorBandsStaticRecord(record = {}) {
  const historyEvidence = buildHistoricalScoreRankEvidence(record);
  return {
    ...record,
    dataYear: 2026,
    primaryYear: 2026,
    historyEvidence,
    rank2026Source: historyEvidence.years[2026].rankSource,
    rank2025Source: historyEvidence.years[2025].rankSource,
    rank2024Source: historyEvidence.years[2024].rankSource
  };
}
