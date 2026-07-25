import { loadAllRecords } from '../_lib/ln-rank-manifest.js';
import { normalizeRecord, rawSchool } from '../_lib/fenxi-normalizer.js';
import { normalizeFenxiCodes } from '../_lib/fenxi-code-normalizer.js';
import { mapStandardMajor } from '../_lib/standard-major-mapper.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import {
  detectSpecialProject,
  enrichSpecialProjectRecord
} from '../_lib/special-project-policy.js';
import { buildKeywordQuery } from '../_lib/keyword-query.js';
import { matchMajorProject } from '../_lib/major-project-matcher.js';
import { buildSearchIndex } from '../_lib/search-index-builder.js';
import { lookupScoreRank } from '../_lib/rank-table-provider.js';
import { resolveCanonicalPosition } from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { ALGORITHM_ORCHESTRATION_VERSION } from '../../shared/algorithms/algorithm-registry.js';
import {
  getSchoolEntity,
  publicSchoolEntity,
  entitySourceQuery
} from '../../shared/resources/schools/school-identity-center.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 120) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeText(value) {
  return clean(value, 240)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

function pageNumber(value, fallback = 0) {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const n = Math.floor(Number(text));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function rankContextForScore(score) {
  if (!Number.isFinite(score)) return null;
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
  if (!row) return null;
  const rankStart = Number(row.rankStart);
  const rankEnd = Number(row.rankEnd ?? row.cumulative ?? row.rankForGap);
  const sameCount = Number(row.sameCount);
  return {
    score: Number(row.score ?? score),
    rankStart: Number.isFinite(rankStart) ? rankStart : null,
    rankEnd: Number.isFinite(rankEnd) ? rankEnd : null,
    rankForGap: Number.isFinite(Number(row.rankForGap)) ? Number(row.rankForGap) : (Number.isFinite(rankEnd) ? rankEnd : null),
    sameCount: Number.isFinite(sameCount) ? sameCount : null,
    emptyScore: Boolean(row.emptyScore)
  };
}

function projectLabel(record = {}) {
  const types = Array.isArray(record.specialProject?.types) ? record.specialProject.types : [];
  if (types.length) return types.join(' / ');
  if (record.isSinoForeign) return '中外合作';
  if (record.isHighFee) return '高收费';
  return '普通招生记录';
}

function positionRecord(record, candidateScore, candidateRank) {
  if (!Number.isFinite(candidateScore)) return record;
  const canonicalPosition = resolveCanonicalPosition({
    candidateScore,
    candidateRank: candidateRank?.rankForGap,
    recordScore: record.score2026 ?? record.score,
    recordRank: record.rank2026 ?? record.rank,
    rangePreset: 'standard'
  });
  return {
    ...record,
    candidateScore,
    candidateReferenceScore: candidateScore,
    scoreDelta2026: canonicalPosition.scoreDelta,
    scoreDelta: canonicalPosition.scoreDelta,
    rankGap2026: canonicalPosition.rankGap,
    rankGap: canonicalPosition.rankGap,
    band: canonicalPosition.bandKey,
    bandKey: canonicalPosition.bandKey,
    statusKey: canonicalPosition.statusKey,
    statusLabel: canonicalPosition.statusLabel,
    position: canonicalPosition.position,
    canonicalPosition
  };
}

function compareRecords(a, b, sort) {
  const scoreA = Number(a.score2026 ?? a.score ?? -1);
  const scoreB = Number(b.score2026 ?? b.score ?? -1);
  const rawRankA = Number(a.rank2026 ?? a.rank);
  const rawRankB = Number(b.rank2026 ?? b.rank);
  const rankA = Number.isFinite(rawRankA) ? rawRankA : null;
  const rankB = Number.isFinite(rawRankB) ? rawRankB : null;
  if (sort === 'position-near') {
    const distanceA = Number(a.canonicalPosition?.positionDistance);
    const distanceB = Number(b.canonicalPosition?.positionDistance);
    const safeA = Number.isFinite(distanceA) ? distanceA : Number.MAX_SAFE_INTEGER;
    const safeB = Number.isFinite(distanceB) ? distanceB : Number.MAX_SAFE_INTEGER;
    if (safeA !== safeB) return safeA - safeB;
  }
  const rankDirection = sort === 'score-asc' ? -1 : 1;
  if (rankA != null && rankB != null && rankA !== rankB) return rankDirection * (rankA - rankB);
  if (rankA != null && rankB == null) return -1;
  if (rankA == null && rankB != null) return 1;
  const scoreDirection = sort === 'score-asc' ? 1 : -1;
  return scoreDirection * (scoreA - scoreB)
    || Number(a.sourceOrder ?? 0) - Number(b.sourceOrder ?? 0)
    || String(a.schoolCode2026 || '').localeCompare(String(b.schoolCode2026 || ''), 'zh-CN')
    || String(a.majorCode2026 || '').localeCompare(String(b.majorCode2026 || ''), 'zh-CN');
}

function schoolCandidates(records, query) {
  const needle = normalizeText(query);
  if (!needle) return [];
  const counts = new Map();
  for (const raw of records) {
    const name = clean(rawSchool(raw), 120);
    if (!name || !normalizeText(name).includes(needle)) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .slice(0, 8)
    .map(([school, count]) => ({ school, count }));
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  const started = Date.now();

  try {
    const url = new URL(context.request.url);
    const entityId = clean(url.searchParams.get('schoolEntityId') || '', 80);
    const schoolInput = clean(url.searchParams.get('school') || '', 120);
    const entity = entityId ? getSchoolEntity(entityId) : null;
    if (entityId && !entity) return json({ ok: false, message: '学校实体不存在，请重新选择学校。' }, 400);

    const school = clean(entitySourceQuery(entity, schoolInput) || entity?.displayName || schoolInput, 120);
    if (!school) return json({ ok: false, message: '请先输入或选择一所学校。' }, 400);

    const scoreText = String(url.searchParams.get('candidateScore') || '').trim();
    const candidateScore = scoreText ? Math.round(Number(scoreText)) : null;
    if (scoreText && (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750)) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }

    const majorKeyword = clean(url.searchParams.get('majorKeyword') || '', 160);
    const keywordQuery = buildKeywordQuery(majorKeyword);
    const requestedSort = clean(url.searchParams.get('sort') || '', 30);
    const sort = ['position-near', 'score-asc', 'score-desc'].includes(requestedSort)
      ? requestedSort
      : (candidateScore ? 'position-near' : 'score-desc');
    const offset = pageNumber(url.searchParams.get('offset'), 0);
    const limit = Math.max(20, Math.min(100, pageNumber(url.searchParams.get('limit'), 40)));
    const { manifest, records: rawRecords } = await loadAllRecords(context.request, context.env || {});

    const acceptedNames = new Set([
      school,
      entity?.displayName,
      entity?.sourceQuery,
      ...(Array.isArray(entity?.aliases) ? entity.aliases : [])
    ].map(normalizeText).filter(Boolean));

    const exactRaw = rawRecords.filter(raw => acceptedNames.has(normalizeText(rawSchool(raw))));
    if (!exactRaw.length) {
      return json({
        ok: false,
        code: 'school_not_resolved',
        message: '没有找到这所学校的2026辽宁物理类投档记录，请从候选学校中选择。',
        candidates: schoolCandidates(rawRecords, schoolInput || school)
      }, 404);
    }

    const candidateRank = rankContextForScore(candidateScore);
    const all = [];
    exactRaw.forEach((raw, sourceOrder) => {
      let record = { ...normalizeRecord(raw), sourceOrder };
      record.codes = normalizeFenxiCodes(raw);
      record.schoolCode2026 = clean(record.schoolCode2026 || record.codes.schoolCode2026 || raw.schoolCode || '', 40);
      record.majorCode2026 = clean(record.majorCode2026 || record.codes.majorCode2026 || raw.majorCode || '', 40);
      const standardMajor = mapStandardMajor({
        majorName: record.major,
        standardMajorCode: record.codes.standardMajorCode || (record.codes.rawFenxiMajorCodeLooksStandard ? record.codes.rawFenxiMajorCode : '')
      });
      record.standardMajor = standardMajor;
      if (!record.codes.standardMajorCode && standardMajor?.code) record.codes.standardMajorCode = standardMajor.code;
      Object.assign(record, buildDisplayTags(record));
      const specialProject = detectSpecialProject(record);
      record = specialProject.hasSpecialProject
        ? enrichSpecialProjectRecord({ ...record, specialProject })
        : { ...record, specialProject };
      record.projectLabel = projectLabel(record);
      record.schoolEntity = entity ? publicSchoolEntity(entity) : null;
      record = positionRecord(record, candidateScore, candidateRank);
      record.rawText = JSON.stringify(raw).slice(0, 900);
      const match = keywordQuery.rawKeywords.length
        ? matchMajorProject(buildSearchIndex([record])[0], keywordQuery)
        : { matched: true, score: 0, badges: [], matchLevel: '', matchLabel: '', matchReason: '', matchedKeyword: '', matchedTerms: [] };
      if (!match.matched) return;
      record.matchScore = Number(match.score || 0);
      record.matchBadges = match.badges || [];
      record.matchLevel = match.matchLevel || '';
      record.matchLabel = match.matchLabel || '';
      record.matchReason = match.matchReason || match.reason || '';
      record.matchedKeyword = match.matchedKeyword || '';
      record.matchedTerms = match.matchedTerms || [];
      all.push(record);
    });

    all.sort((a, b) => compareRecords(a, b, sort));
    const records = all.slice(offset, offset + limit);
    const hasMore = offset + records.length < all.length;
    const scores = all.map(item => Number(item.score2026 ?? item.score)).filter(Number.isFinite);
    const uniqueMajorKeys = new Set(all.map(item => normalizeText(
      item.standardMajor?.code
      || item.standardMajor?.name
      || item.major
    )).filter(Boolean));
    const nearest = candidateScore && all.length
      ? [...all].sort((a, b) => compareRecords(a, b, 'position-near'))[0]
      : null;
    const summary = {
      minScore: scores.length ? Math.min(...scores) : null,
      maxScore: scores.length ? Math.max(...scores) : null,
      uniqueMajorCount: uniqueMajorKeys.size,
      regularCount: all.filter(item => !item.specialProject?.hasSpecialProject).length,
      specialCount: all.filter(item => item.specialProject?.hasSpecialProject).length,
      upperCount: all.filter(item => item.bandKey === 'upper').length,
      nearCount: all.filter(item => item.bandKey === 'near').length,
      steadyCount: all.filter(item => item.bandKey === 'steady').length,
      outsideCount: all.filter(item => item.bandKey === 'outside').length,
      nearestRecord: nearest ? {
        major: nearest.major,
        score2026: nearest.score2026 ?? nearest.score,
        rank2026: nearest.rank2026 ?? nearest.rank,
        rankGap2026: nearest.rankGap2026 ?? nearest.rankGap,
        bandKey: nearest.bandKey
      } : null
    };

    return json({
      ok: true,
      meta: {
        mode: 'school-all',
        audienceYear: 2027,
        activeDataYear: 2026,
        rankYear: 2026,
        candidateScore,
        candidateReferenceRank2026: candidateRank?.rankForGap || null,
        school: entity?.displayName || school,
        schoolQuery: school,
        schoolEntity: entity ? publicSchoolEntity(entity) : null,
        schoolRecordTotal: exactRaw.length,
        filteredTotal: all.length,
        dataScope: '辽宁2026普通类本科批物理类专业投档记录',
        dataBoundary: '只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表该校全国全部本科专业，也不判断2027录取结果。',
        sort,
        keywordMode: 'any',
        keywordTerms: keywordQuery.rawKeywords,
        pagination: {
          offset,
          limit,
          returned: records.length,
          hasMore,
          nextOffset: hasMore ? offset + records.length : null
        },
        algorithmOrchestrationVersion: ALGORITHM_ORCHESTRATION_VERSION,
        elapsedMs: Date.now() - started
      },
      summary,
      keywordQuery,
      records,
      source: {
        dataYear: 2026,
        manifestVersion: manifest.version || '',
        totalRecords: manifest.totalRecords || rawRecords.length,
        rawScanned: rawRecords.length,
        exactSchoolRecords: exactRaw.length,
        mode: 'shared-records-school-exact'
      }
    });
  } catch (error) {
    return json({
      ok: false,
      message: error?.message || String(error),
      userMessage: '学校全部专业暂时没有读取成功，可以稍后重试。',
      engineerHint: '请检查2026 ln-rank manifest、统一学校实体和学校专业接口。'
    }, 500);
  }
}
