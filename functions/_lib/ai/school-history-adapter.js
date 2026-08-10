import { loadMatchingRecords } from '../ln-rank-manifest.js';
import { normalizeRecord, rawSchool } from '../fenxi-normalizer.js';
import { lookupScoreRank } from '../rank-table-provider.js';
import { resolveCanonicalPosition } from '../../../shared/algorithms/position/canonical-position.v3963_0.js';

export const AI_SCHOOL_HISTORY_RESOURCE_ADAPTER_VERSION = 'ai-school-history-resource-adapter-v3992_1';
const ADMISSION_DIRECTORY_PATH = '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json';

function clean(value, max = 220) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeName(value) {
  return clean(value, 260)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '')
    .trim();
}

function baseUrl(context = {}) {
  const raw = context?.request?.url || 'https://example.invalid/';
  return new URL(raw).origin;
}

async function fetchStaticJson(context, pathname) {
  const url = new URL(pathname, baseUrl(context));
  let response = null;
  if (context?.env?.ASSETS?.fetch) {
    try {
      response = await context.env.ASSETS.fetch(new Request(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' }
      }));
    } catch {
      response = null;
    }
  }
  if (!response || !response.ok) {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
  }
  if (!response.ok) throw new Error(`AI school directory fetch failed ${response.status}`);
  return response.json();
}

async function resolveExactAdmissionSchool(context, school) {
  const needle = normalizeName(school);
  if (!needle) return null;
  const directory = await fetchStaticJson(context, ADMISSION_DIRECTORY_PATH);
  if (directory?.contractVersion !== 'school-query-contract-v3969_0') {
    throw new Error('AI school history admission directory contract mismatch');
  }
  const matches = (Array.isArray(directory.schools) ? directory.schools : []).filter(item => {
    const names = [item?.officialName, ...(item?.admissionNames || []), ...(item?.searchNames || [])];
    return names.some(name => normalizeName(name) === needle);
  });
  if (matches.length !== 1) return { selection: null, directory };
  return { selection: matches[0], directory };
}

async function loadExactSchoolRecords(context, school) {
  const needle = normalizeName(school);
  if (!needle) return { selection: null, directory: null, manifest: null, records: [], scanned: 0, matchMode: 'empty' };

  // The command interpreter already resolves school aliases through the single
  // Tongxue resolver truth. For the common canonical-name path, scan the
  // current admissions manifest directly and do not materialize the larger
  // admission-directory object in the same AI turn. This keeps the AI Worker
  // request lean while retaining the current manifest/chunks as the fact truth.
  const direct = await loadMatchingRecords(
    context.request,
    context.env || {},
    raw => normalizeName(rawSchool(raw)) === needle
  );
  if (direct.records.length) {
    return {
      selection: { officialName: clean(school, 120), admissionNames: [clean(school, 120)], searchNames: [clean(school, 120)] },
      directory: null,
      manifest: direct.manifest,
      records: direct.records,
      scanned: direct.scanned,
      matchMode: 'canonical-direct'
    };
  }

  // Rare fallback for cases where the canonical entity maps to a different
  // admission display name/campus label. This still reuses the existing
  // directory truth and never creates a second alias or admissions resource.
  const exact = await resolveExactAdmissionSchool(context, school);
  const selection = exact?.selection;
  if (!selection) {
    return { selection: null, directory: exact?.directory || null, manifest: direct.manifest, records: [], scanned: direct.scanned, matchMode: 'unresolved' };
  }
  const acceptedNames = new Set([
    selection.officialName,
    ...(selection.admissionNames || []),
    ...(selection.searchNames || [])
  ].map(normalizeName).filter(Boolean));
  const fallback = await loadMatchingRecords(
    context.request,
    context.env || {},
    raw => acceptedNames.has(normalizeName(rawSchool(raw)))
  );
  return {
    selection,
    directory: exact.directory,
    manifest: fallback.manifest,
    records: fallback.records,
    scanned: direct.scanned + fallback.scanned,
    matchMode: 'directory-fallback'
  };
}

function majorTerms(keyword = '') {
  return [...new Set(clean(keyword, 180).split(/[\/、,，|]+/).map(item => normalizeName(item)).filter(Boolean))];
}

function majorMatches(record, terms = []) {
  if (!terms.length) return true;
  const haystack = normalizeName(record?.major || record?.majorName || '');
  return terms.some(term => haystack.includes(term));
}

function rankContext(score) {
  const numeric = Math.round(Number(score));
  if (!Number.isFinite(numeric)) return null;
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score: numeric });
  if (!row) return null;
  return {
    score: numeric,
    rankForGap: Number(row.rankForGap ?? row.rankEnd ?? row.cumulative) || null
  };
}

function shapedRecord(raw, sourceOrder, candidateScore, candidateRank) {
  const record = normalizeRecord(raw);
  const score = Number(record.score2026 ?? record.score);
  const rank = Number(record.rank2026 ?? record.rank);
  const shaped = {
    id: clean(record.id || raw?.id || `${record.school || rawSchool(raw)}|${record.major || ''}|${sourceOrder}`, 220),
    school: clean(record.school || rawSchool(raw), 120),
    major: clean(record.major || record.majorName, 180),
    score2026: Number.isFinite(score) ? score : null,
    rank2026: Number.isFinite(rank) ? rank : null,
    schoolCode2026: clean(record.schoolCode2026 || raw?.schoolCode2026 || raw?.schoolCode, 40),
    majorCode2026: clean(record.majorCode2026 || raw?.majorCode2026 || raw?.majorCode, 40),
    projectLabel: clean(record.projectLabel || '', 80),
    displayLocation: clean(record.displayLocation || record.city || record.province, 80),
    sourceOrder
  };
  if (!candidateRank || !Number.isFinite(candidateScore)) return shaped;
  const canonical = resolveCanonicalPosition({
    candidateScore,
    candidateRank: candidateRank.rankForGap,
    recordScore: shaped.score2026,
    recordRank: shaped.rank2026,
    rangePreset: 'standard'
  });
  return {
    ...shaped,
    scoreDelta2026: canonical.scoreDelta,
    scoreDelta: canonical.scoreDelta,
    rankGap2026: canonical.rankGap,
    rankGap: canonical.rankGap,
    bandKey: canonical.bandKey,
    band: canonical.bandKey,
    statusKey: canonical.statusKey,
    statusLabel: canonical.statusLabel
  };
}

function sortHistory(records = [], candidateScore = null) {
  const list = [...records];
  if (Number.isFinite(candidateScore)) {
    return list.sort((a, b) => {
      const ar = Number(a.rankGap2026), br = Number(b.rankGap2026);
      const ag = Number.isFinite(ar) ? Math.abs(ar) : Math.abs(Number(a.scoreDelta2026) || 9999) * 100000;
      const bg = Number.isFinite(br) ? Math.abs(br) : Math.abs(Number(b.scoreDelta2026) || 9999) * 100000;
      return ag - bg || Number(b.score2026 || 0) - Number(a.score2026 || 0) || a.sourceOrder - b.sourceOrder;
    });
  }
  return list.sort((a, b) => Number(b.score2026 || 0) - Number(a.score2026 || 0) || Number(a.rank2026 || 0) - Number(b.rank2026 || 0) || a.sourceOrder - b.sourceOrder);
}

export async function queryAiSchoolHistory(context, { school, majorKeyword = '', candidateScore = null, limit = 100 } = {}) {
  const loaded = await loadExactSchoolRecords(context, school);
  const selection = loaded.selection;
  if (!selection) {
    return {
      ok: false,
      code: 'school_query_requires_choice',
      message: '没有在辽宁2026招生事实资源中精确确认这所学校；请先用统一学校简称解析确认正式校名。'
    };
  }
  const exactRaw = loaded.records;
  const manifest = loaded.manifest;
  const scanned = loaded.scanned;
  if (!exactRaw.length) {
    return { ok: false, code: 'school_history_unavailable', message: '已经确认学校，但没有找到该校的2026辽宁物理类投档记录。' };
  }

  const normalizedCandidateScore = Number.isFinite(Number(candidateScore)) ? Math.round(Number(candidateScore)) : null;
  const candidateRank = normalizedCandidateScore === null ? null : rankContext(normalizedCandidateScore);
  const terms = majorTerms(majorKeyword);
  const filtered = [];
  exactRaw.forEach((raw, index) => {
    const record = shapedRecord(raw, index, normalizedCandidateScore, candidateRank);
    if (majorMatches(record, terms)) filtered.push(record);
  });
  const ranked = sortHistory(filtered, normalizedCandidateScore);
  const records = ranked.slice(0, Math.max(20, Math.min(100, Number(limit || 100))));
  const scores = ranked.map(item => Number(item.score2026)).filter(Number.isFinite);
  const uniqueMajors = new Set(ranked.map(item => normalizeName(item.major)).filter(Boolean));
  const nearest = normalizedCandidateScore !== null ? ranked[0] || null : null;
  return {
    ok: true,
    school: selection.officialName || school,
    majorKeyword: clean(majorKeyword, 180),
    records,
    summary: {
      minScore: scores.length ? Math.min(...scores) : null,
      maxScore: scores.length ? Math.max(...scores) : null,
      uniqueMajorCount: uniqueMajors.size,
      nearestRecord: nearest ? {
        major: nearest.major,
        score2026: nearest.score2026,
        rank2026: nearest.rank2026,
        rankGap2026: nearest.rankGap2026,
        bandKey: nearest.bandKey
      } : null
    },
    meta: {
      school: selection.officialName || school,
      candidateScore: normalizedCandidateScore,
      candidateReferenceRank2026: candidateRank?.rankForGap || null,
      schoolRecordTotal: exactRaw.length,
      filteredTotal: ranked.length,
      admissionDirectoryVersion: loaded.directory?.version || '',
      admissionDirectorySourceHash: loaded.directory?.sourceHash || '',
      matchMode: loaded.matchMode,
      adapterVersion: AI_SCHOOL_HISTORY_RESOURCE_ADAPTER_VERSION
    },
    source: {
      dataYear: 2026,
      manifestVersion: manifest?.version || '',
      totalRecords: Number(manifest?.totalRecords || scanned || 0),
      rawScanned: scanned,
      exactSchoolRecords: exactRaw.length,
      mode: loaded.matchMode === 'canonical-direct' ? 'ai-canonical-school-streaming-shared-manifest' : 'ai-directory-fallback-streaming-shared-manifest'
    }
  };
}
