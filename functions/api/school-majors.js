import { loadSchoolRuntimeRecords, SCHOOL_RUNTIME_PROJECTION_VERSION } from '../_lib/school-record-runtime-provider.vnext.js';
import { normalizeRecord, rawSchool } from '../_lib/fenxi-normalizer.js';
import { normalizeFenxiCodes } from '../_lib/fenxi-code-normalizer.js';
import { mapStandardMajor } from '../_lib/standard-major-mapper.js';
import { resolveMajorDomainQuery } from '../_lib/major-domain-runtime-adapter.v001.js';
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
import { rankResultRecords } from '../../shared/algorithms/ranking/result-ranking.v3967_0.js';
import {
  getSchoolEntity,
  publicSchoolEntity,
  entitySourceQuery
} from '../../shared/resources/schools/school-identity-center.js';
import {
  resolveAdmissionSchoolQuery,
  resolveExactAdmissionSchool,
  getAdmissionSchoolDirectoryMeta
} from '../_lib/school-query-provider.v3969.js';
import {
  SCHOOL_QUERY_CONTRACT_VERSION,
  SCHOOL_QUERY_STATUSES,
  normalizeSchoolQueryIntent
} from '../../shared/resources/schools/school-query-contract.v3969_0.js';
import {
  normalizeUnifiedSchoolName,
  admissionEntityIdForName
} from '../../shared/resources/schools/school-query-engine.v3969_0.js';

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

function queryMessage(queryResult) {
  if (queryResult?.status === SCHOOL_QUERY_STATUSES.AMBIGUOUS) {
    return '这个输入同时可能表示学校所在地或学校名称，请先选择你真正想看的学校。';
  }
  if (queryResult?.status === SCHOOL_QUERY_STATUSES.NOT_AVAILABLE) {
    return '已经识别到学校，但没有找到该校的2026辽宁物理类投档记录。';
  }
  return '没有精确确认这所学校，请从统一学校目录候选中选择。';
}

function unresolvedPayload(queryResult, directoryMeta) {
  const candidates = Array.isArray(queryResult?.candidates) ? queryResult.candidates : [];
  return {
    ok: false,
    code: 'school_query_requires_choice',
    message: queryMessage(queryResult),
    query: queryResult,
    candidates,
    candidateTotal: queryResult?.pagination?.total ?? candidates.length,
    candidateReturned: candidates.length,
    candidateHasMore: Boolean(queryResult?.pagination?.hasMore),
    schoolQueryContractVersion: SCHOOL_QUERY_CONTRACT_VERSION,
    admissionDirectory: directoryMeta
  };
}

function acceptedNamesForSelection(selection, entity) {
  return new Set([
    ...(Array.isArray(selection?.admissionNames) ? selection.admissionNames : []),
    selection?.admissionName,
    selection?.officialName,
    entity?.displayName,
    entity?.sourceQuery,
    ...(Array.isArray(entity?.aliases) ? entity.aliases : [])
  ].map(normalizeUnifiedSchoolName).filter(Boolean));
}

function canonicalEntityForSelection(selection) {
  const known = selection?.entityId ? getSchoolEntity(selection.entityId) : null;
  if (known) return known;
  const displayName = clean(selection?.officialName || selection?.admissionName || '', 120);
  const entityId = clean(selection?.entityId || '', 80);
  if (!displayName || !entityId.startsWith('admission:') || entityId !== admissionEntityIdForName(displayName)) return null;
  return {
    entityId,
    displayName,
    entityType: clean(selection?.entityType || 'official_school', 40),
    parentEntityId: '',
    sourceQuery: clean(selection?.admissionName || displayName, 120),
    aliases: Array.isArray(selection?.admissionNames) ? selection.admissionNames.filter(Boolean) : [],
    province: clean(selection?.province || '', 40),
    city: clean(selection?.city || '', 40),
    sourceStatus: 'admission-directory'
  };
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  const started = Date.now();

  try {
    const url = new URL(context.request.url);
    const entityId = clean(url.searchParams.get('schoolEntityId') || '', 80);
    const schoolInput = clean(url.searchParams.get('school') || '', 120);
    if (!schoolInput && !entityId) return json({ ok: false, message: '请先输入或选择一所学校。' }, 400);

    const scoreText = String(url.searchParams.get('candidateScore') || '').trim();
    const candidateScore = scoreText ? Math.round(Number(scoreText)) : null;
    if (scoreText && (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750)) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }

    const majorKeyword = clean(url.searchParams.get('majorKeyword') || '', 160);
    const keywordQuery = buildKeywordQuery(majorKeyword);
    const majorDomain = resolveMajorDomainQuery(majorKeyword);
    const requestedSort = clean(url.searchParams.get('sort') || '', 30);
    const sort = ['position-near', 'score-asc', 'score-desc'].includes(requestedSort)
      ? requestedSort
      : (candidateScore ? 'position-near' : 'score-desc');
    const offset = pageNumber(url.searchParams.get('offset'), 0);
    const limit = Math.max(20, Math.min(100, pageNumber(url.searchParams.get('limit'), 40)));
    const candidateOffset = pageNumber(url.searchParams.get('candidateOffset'), 0);
    const candidateLimit = Math.max(8, Math.min(500, pageNumber(url.searchParams.get('candidateLimit'), 200)));
    const schoolIntent = normalizeSchoolQueryIntent(url.searchParams.get('schoolIntent') || 'auto');
    const resolveOnly = url.searchParams.get('resolveOnly') === '1';

    const directoryMeta = await getAdmissionSchoolDirectoryMeta(context.request);

    let entity = entityId ? getSchoolEntity(entityId) : null;
    if (entityId && !entity && !entityId.startsWith('admission:')) return json({ ok: false, message: '学校实体不存在，请重新选择学校。' }, 400);

    let selection = null;
    let queryResult = null;
    if (entity) {
      const officialName = entity.displayName;
      selection = {
        officialName,
        admissionName: entitySourceQuery(entity, officialName),
        admissionNames: [entitySourceQuery(entity, officialName)],
        entityId: entity.entityId,
        entityType: entity.entityType
      };
    } else if (entityId) {
      selection = await resolveExactAdmissionSchool(context.request, schoolInput);
      if (!selection || selection.entityId !== entityId) return json({ ok: false, message: '学校实体与招生目录不匹配，请重新选择学校。' }, 400);
      entity = canonicalEntityForSelection(selection);
      if (!entity) return json({ ok: false, message: '学校实体无法从统一招生目录确认，请重新选择学校。' }, 409);
    } else {
      const exactSelection = schoolIntent === 'school'
        ? await resolveExactAdmissionSchool(context.request, schoolInput)
        : null;
      if (exactSelection) {
        selection = exactSelection;
        entity = canonicalEntityForSelection(selection);
      } else {
        queryResult = await resolveAdmissionSchoolQuery(context.request, {
          query: schoolInput,
          intent: schoolIntent,
          offset: candidateOffset,
          limit: candidateLimit
        });
        if (queryResult.status !== SCHOOL_QUERY_STATUSES.RESOLVED || !queryResult.resolvedSchool) {
          const status = queryResult.status === SCHOOL_QUERY_STATUSES.NOT_FOUND ? 404 : 409;
          return json(unresolvedPayload(queryResult, directoryMeta), status);
        }
        selection = queryResult.resolvedSchool;
        entity = canonicalEntityForSelection(selection);
      }
    }

    if (resolveOnly) {
      if (!selection?.entityId || !entity) {
        const fallback = queryResult || { status: SCHOOL_QUERY_STATUSES.NOT_FOUND, candidates: [] };
        return json(unresolvedPayload(fallback, directoryMeta), 409);
      }
      return json({
        ok: true,
        mode: 'school-resolve-only',
        meta: {
          mode: 'school-resolve-only',
          school: selection.officialName || selection.admissionName,
          schoolQuery: schoolInput || selection.officialName || selection.admissionName,
          schoolEntity: publicSchoolEntity(entity),
          schoolQueryContractVersion: SCHOOL_QUERY_CONTRACT_VERSION,
          schoolQueryIntent: 'school',
          admissionDirectoryVersion: directoryMeta.version,
          admissionDirectorySourceHash: directoryMeta.sourceHash
        }
      });
    }

    const acceptedNames = acceptedNamesForSelection(selection, entity);
    const exactSchoolNames2026 = [...new Set([
      ...(Array.isArray(selection?.admissionNames) ? selection.admissionNames : []),
      selection?.admissionName,
      selection?.officialName,
      ...acceptedNames
    ].map(value => String(value || '').trim()).filter(Boolean))];
    const exactLoad = await loadSchoolRuntimeRecords(context, { schoolNames: exactSchoolNames2026 });
    const { manifest, records: exactRaw, rawScanned } = exactLoad;
    const chunkFiles2026 = exactLoad.shardFiles || [];
    if (!exactRaw.length) {
      const fallback = queryResult || await resolveAdmissionSchoolQuery(context.request, {
        query: schoolInput || selection.officialName,
        intent: schoolIntent,
        offset: candidateOffset,
        limit: candidateLimit
      });
      return json(unresolvedPayload({ ...fallback, status: SCHOOL_QUERY_STATUSES.NOT_AVAILABLE }, directoryMeta), 404);
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

    const rankedAll = rankResultRecords(all, { intent: 'school-search', sortMode: sort, diversify: false });
    const records = rankedAll.slice(offset, offset + limit);
    const hasMore = offset + records.length < rankedAll.length;
    const scores = rankedAll.map(item => Number(item.score2026 ?? item.score)).filter(Number.isFinite);
    const uniqueMajorKeys = new Set(rankedAll.map(item => normalizeText(
      item.standardMajor?.code
      || item.standardMajor?.name
      || item.major
    )).filter(Boolean));
    const nearest = candidateScore && all.length
      ? rankResultRecords(rankedAll, { intent: 'school-search', sortMode: 'position-near', diversify: false })[0]
      : null;
    const summary = {
      minScore: scores.length ? Math.min(...scores) : null,
      maxScore: scores.length ? Math.max(...scores) : null,
      uniqueMajorCount: uniqueMajorKeys.size,
      regularCount: rankedAll.filter(item => !item.specialProject?.hasSpecialProject).length,
      specialCount: rankedAll.filter(item => item.specialProject?.hasSpecialProject).length,
      upperCount: rankedAll.filter(item => item.bandKey === 'upper').length,
      nearCount: rankedAll.filter(item => item.bandKey === 'near').length,
      steadyCount: rankedAll.filter(item => item.bandKey === 'steady').length,
      outsideCount: rankedAll.filter(item => item.bandKey === 'outside').length,
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
        school: selection.officialName || selection.admissionName,
        schoolQuery: schoolInput || selection.officialName,
        schoolEntity: entity ? publicSchoolEntity(entity) : null,
        schoolRecordTotal: exactRaw.length,
        filteredTotal: all.length,
        dataScope: '辽宁2026普通类本科批物理类专业投档记录',
        dataBoundary: '只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表该校全国全部本科专业，也不判断2027录取结果。',
        sort,
        keywordMode: 'any',
        keywordTerms: keywordQuery.rawKeywords,
        majorDomain,
        schoolQueryContractVersion: SCHOOL_QUERY_CONTRACT_VERSION,
        schoolQueryIntent: 'school',
        admissionDirectoryVersion: directoryMeta.version,
        admissionDirectorySourceHash: directoryMeta.sourceHash,
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
        totalRecords: manifest.totalRecords || rawScanned,
        rawScanned,
        exactSchoolRecords: exactRaw.length,
        mode: 'school-runtime-projection-vnext',
        projectionVersion: SCHOOL_RUNTIME_PROJECTION_VERSION,
        chunkFiles2026,
        chunkReadModes: Array.isArray(exactLoad.modes) ? exactLoad.modes : [],
        shardCount: chunkFiles2026.length,
        cacheStatus: exactLoad.cacheStatus || ''
      }
    });
  } catch (error) {
    return json({
      ok: false,
      message: error?.message || String(error),
      userMessage: '学校全部专业暂时没有读取成功，可以稍后重试。',
      engineerHint: '请检查2026 ln-rank manifest、统一学校查询合同、招生学校目录和学校专业接口。'
    }, 500);
  }
}
