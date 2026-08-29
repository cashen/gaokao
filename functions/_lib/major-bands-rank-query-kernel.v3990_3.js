import { matchRegion } from './major-filter.v3990_3.js';
import {
  getBottomLineEligibility,
  getBottomLineSortWeight
} from './bottomline-policy.js';
import { buildKeywordQuery } from './keyword-query.js';
import { matchMajorProject } from './major-project-matcher.js';
import { buildSearchIndex } from './search-index-builder.js';
import { resolveCanonicalPosition } from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { rankMajorBandsRecordsOnce } from './major-bands-result-order.v3990_3.js';
import { matchesPlatformUpgradeRecord, normalizePlatformTarget } from './platform-upgrade-policy.js';
import {
  detectSpecialProject,
  enrichSpecialProjectRecord,
  shouldHideSpecialProject,
  createSpecialProjectStats,
  addSpecialProjectStat
} from './special-project-policy.js';

export const MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION = 'major-bands-rank-query-kernel-v3990_3';
export const MAJOR_BANDS_RANK_QUERY_MEMORY_MODE = 'requested-band-lightweight-order-current-page-v3990_3';

const BAND_KEYS = Object.freeze(['upper', 'near', 'steady']);
const BAND_KEY_SET = new Set(BAND_KEYS);

function clean(value, max = 120) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeSchoolName(value) {
  return clean(value, 160)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

function exactSchoolSet(values) {
  const set = new Set();
  for (const value of values || []) {
    const normalized = normalizeSchoolName(value);
    if (normalized) set.add(normalized);
  }
  return set;
}

function hasKeywordFilters(keywordQuery = {}) {
  return Boolean(keywordQuery?.hasMajorKeyword || keywordQuery?.hasProjectKeyword || keywordQuery?.hasIndustryKeyword);
}

function matchAllKeywordResult() {
  return {
    matched: true,
    score: 0,
    badges: [],
    reason: '',
    matchLevel: '',
    matchLabel: '',
    matchReason: '',
    matchedKeyword: '',
    matchedTerms: []
  };
}

function compactCanonicalPositionForRanking(position = {}) {
  return {
    bandKey: position.bandKey || '',
    positionDistance: Number(position.positionDistance),
    evidenceStrength: position.evidenceStrength || 'weak',
    classificationBasis: position.classificationBasis || 'unresolved'
  };
}

function explicitSpecialProjectIntent(value = '') {
  return /公费师范|优师|定向|专项|预科|民族班|公安|警察|司法|航海|轮机/.test(String(value || ''));
}

function emptyGroup() {
  return { count: 0, ordered: [] };
}

function emptyResult(candidateRank, keywordQuery, requestedBand = '') {
  return {
    grouped: {
      upper: emptyGroup(),
      near: emptyGroup(),
      steady: emptyGroup()
    },
    keywordQuery,
    stats: {
      version: MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
      memoryMode: MAJOR_BANDS_RANK_QUERY_MEMORY_MODE,
      rankingCandidateMode: 'lightweight-order-current-page-v3990_3',
      deferredResponseEnrichment: true,
      responseEnrichedCandidates: 0,
      requestedBand,
      sourceRecordsMutated: false,
      rankUnavailable: !Number.isFinite(Number(candidateRank?.rankForGap)),
      rawScanned: 0,
      canonicalCandidate: 0,
      rawCandidate: 0,
      normalized: 0,
      bottomLineExcluded: 0,
      bottomLineUnresolved: 0,
      platformTarget: '',
      platformTargetExcluded: 0,
      majorKeywordExcluded: 0,
      majorHitCount: 0,
      projectHitCount: 0,
      industryHitCount: 0,
      specialProjectHidden: 0,
      specialProjectShown: 0,
      specialProjectStats: createSpecialProjectStats(),
      matchSummary: { exact: 0, related: 0, industry: 0, project: 0, weak: 0 },
      sortPasses: 0
    }
  };
}

export function processMajorBandsRankWindow(records, options = {}) {
  const candidateScore = Math.round(Number(options.candidateScore));
  const candidateRank = options.candidateRank || null;
  const candidateRankValue = Number(candidateRank?.rankForGap);
  const rangePreset = clean(options.rangePreset || 'standard', 20);
  const region = clean(options.region || 'all', 30);
  const majorKeyword = clean(options.majorKeyword || '', 160);
  const bottomLineMode = clean(options.bottomLineMode || 'all', 40);
  const platformTarget = normalizePlatformTarget(options.platformTarget || '');
  const specialProjectMode = clean(options.specialProjectMode || 'hide_eligibility_projects', 50);
  const schoolFilter = Boolean(options.schoolFilter);
  const acceptedSchoolNames = exactSchoolSet(options.acceptedSchoolNames);
  const requestedBandInput = clean(
    options.requestedBand || records?.majorBandsRequestedBand || '',
    20
  );
  const requestedBand = BAND_KEY_SET.has(requestedBandInput) ? requestedBandInput : '';
  const mutateSourceRecords = options.mutateSourceRecords === undefined
    ? Boolean(records?.majorBandsMutateSourceRecords)
    : Boolean(options.mutateSourceRecords);
  const keywordQuery = buildKeywordQuery(majorKeyword);

  if (!Number.isFinite(candidateRankValue) || candidateRankValue <= 0) {
    return emptyResult(candidateRank, keywordQuery, requestedBand);
  }

  const hasKeywordSearch = hasKeywordFilters(keywordQuery);
  const deferResponseEnrichment = !hasKeywordSearch;
  const specialIntent = explicitSpecialProjectIntent(majorKeyword);
  const grouped = {
    upper: emptyGroup(),
    near: emptyGroup(),
    steady: emptyGroup()
  };
  const specialProjectStats = createSpecialProjectStats();
  const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };

  let canonicalCandidate = 0;
  let normalized = 0;
  let bottomLineExcluded = 0;
  let bottomLineUnresolved = 0;
  let platformTargetExcluded = 0;
  let majorKeywordExcluded = 0;
  let majorHitCount = 0;
  let projectHitCount = 0;
  let industryHitCount = 0;
  let specialProjectHidden = 0;
  let specialProjectShown = 0;

  function resolveCandidate(source) {
    if (!source?.id || !source.school || !source.major) return null;
    const canonicalPosition = resolveCanonicalPosition({
      candidateScore,
      candidateRank: candidateRankValue,
      recordScore: source.score2026 ?? source.score,
      recordRank: source.rank2026 ?? source.rank,
      rangePreset
    });
    if (!BAND_KEY_SET.has(canonicalPosition.bandKey)) return null;
    if (requestedBand && canonicalPosition.bandKey !== requestedBand) return null;
    if (schoolFilter && !acceptedSchoolNames.has(normalizeSchoolName(source.school))) return null;
    if (!matchRegion(source, region)) return null;
    if (platformTarget && !matchesPlatformUpgradeRecord(source, platformTarget)) {
      platformTargetExcluded += 1;
      return null;
    }
    canonicalCandidate += 1;
    return { source, canonicalPosition };
  }

  function commitCandidate(source, canonicalPosition, match) {
    if (!match.matched) {
      majorKeywordExcluded += 1;
      return;
    }

    const bottomLineEligibility = bottomLineMode === 'all'
      ? { status: 'pass', reason: 'mode_does_not_exclude', record: source }
      : getBottomLineEligibility(source, bottomLineMode);
    if (bottomLineEligibility.status === 'fail') {
      bottomLineExcluded += 1;
      return;
    }
    if (bottomLineEligibility.status === 'unresolved') bottomLineUnresolved += 1;

    const specialProject = source.specialProject?.hasSpecialProject != null
      ? source.specialProject
      : detectSpecialProject(source);
    const hideSpecial = specialProject.hasSpecialProject
      && !specialIntent
      && shouldHideSpecialProject({ ...source, specialProject }, specialProjectMode);
    if (hideSpecial) {
      specialProjectHidden += 1;
      addSpecialProjectStat(specialProjectStats, specialProject, canonicalPosition.bandKey, 'hidden');
      return;
    }

    // Score-search ordering keeps only fields consumed by the comparator. Full
    // canonical status, match arrays and special-project display fields are
    // materialized after pagination for the current page only.
    const record = mutateSourceRecords ? source : { ...source };
    if (deferResponseEnrichment) {
      Object.assign(record, {
        band: canonicalPosition.bandKey,
        bandKey: canonicalPosition.bandKey,
        canonicalPosition: compactCanonicalPositionForRanking(canonicalPosition),
        bottomLineEligibility: bottomLineEligibility.status,
        bottomLineEligibilityReason: bottomLineEligibility.reason,
        specialProject
      });
    } else {
      Object.assign(record, {
        band: canonicalPosition.bandKey,
        bandKey: canonicalPosition.bandKey,
        candidateScore,
        candidateReferenceScore: candidateScore,
        scoreDelta2026: canonicalPosition.scoreDelta,
        scoreDelta: canonicalPosition.scoreDelta,
        rankGap2026: canonicalPosition.rankGap,
        rankGap: canonicalPosition.rankGap,
        statusKey: canonicalPosition.statusKey,
        statusLabel: canonicalPosition.statusLabel,
        position: canonicalPosition.position,
        canonicalPosition,
        bottomLineEligibility: bottomLineEligibility.status,
        bottomLineEligibilityReason: bottomLineEligibility.reason,
        matchBadges: match.badges,
        matchLevel: match.matchLevel || '',
        matchLabel: match.matchLabel || '',
        matchReason: match.matchReason || match.reason || '',
        matchedKeyword: match.matchedKeyword || '',
        matchedTerms: match.matchedTerms || [],
        matchScore: match.score,
        specialProject
      });
    }

    if (specialProject.hasSpecialProject) {
      specialProjectShown += 1;
      if (!deferResponseEnrichment) {
        Object.assign(record, enrichSpecialProjectRecord(record));
        record.specialProjectExplicitIntent = specialIntent;
      }
      addSpecialProjectStat(specialProjectStats, specialProject, canonicalPosition.bandKey, 'shown');
    }

    normalized += 1;
    if (record.matchLevel && Object.prototype.hasOwnProperty.call(matchSummary, record.matchLevel)) {
      matchSummary[record.matchLevel] += 1;
    }
    if (record.matchLevel === 'exact' || record.matchLevel === 'related') majorHitCount += 1;
    if (record.matchLevel === 'project') projectHitCount += 1;
    if (record.matchLevel === 'industry') industryHitCount += 1;
    grouped[canonicalPosition.bandKey].ordered.push(record);
  }

  if (hasKeywordSearch) {
    const canonicalCandidates = [];
    for (const source of records || []) {
      const candidate = resolveCandidate(source);
      if (candidate) canonicalCandidates.push(candidate);
    }
    const searchIndex = buildSearchIndex(canonicalCandidates.map(item => item.source));
    for (let index = 0; index < canonicalCandidates.length; index += 1) {
      const { source, canonicalPosition } = canonicalCandidates[index];
      commitCandidate(source, canonicalPosition, matchMajorProject(searchIndex[index], keywordQuery));
    }
  } else {
    // The dominant score-search path has no keyword query. Classify and commit
    // each source record in one pass. Requested-band pagination also rejects
    // adjacent-band rows before enrichment, sorting and snapshot construction.
    for (const source of records || []) {
      const candidate = resolveCandidate(source);
      if (!candidate) continue;
      commitCandidate(candidate.source, candidate.canonicalPosition, matchAllKeywordResult());
    }
  }

  let sortPasses = 0;
  const sortKeys = requestedBand ? [requestedBand] : BAND_KEYS;
  for (const key of sortKeys) {
    const group = grouped[key];
    group.ordered = rankMajorBandsRecordsOnce(group.ordered, {
      intent: 'score-search',
      sortMode: 'canonical-staged',
      diversify: !schoolFilter,
      windowSize: 8,
      maxPerSchool: 2,
      getSoftPreferenceWeight: record => getBottomLineSortWeight(record, bottomLineMode)
    });
    group.count = group.ordered.length;
    if (group.count > 1) sortPasses += 1;
  }

  return {
    grouped,
    keywordQuery,
    stats: {
      version: MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
      memoryMode: MAJOR_BANDS_RANK_QUERY_MEMORY_MODE,
      rankingCandidateMode: deferResponseEnrichment
        ? 'lightweight-order-current-page-v3990_3'
        : 'full-keyword-candidate-v3990_3',
      deferredResponseEnrichment: deferResponseEnrichment,
      responseEnrichedCandidates: deferResponseEnrichment ? 0 : normalized,
      requestedBand,
      sourceRecordsMutated: mutateSourceRecords,
      rankUnavailable: false,
      rawScanned: Array.isArray(records) ? records.length : 0,
      canonicalCandidate,
      rawCandidate: canonicalCandidate,
      normalized,
      bottomLineExcluded,
      bottomLineUnresolved,
      platformTarget,
      platformTargetExcluded,
      majorKeywordExcluded,
      majorHitCount,
      projectHitCount,
      industryHitCount,
      specialProjectHidden,
      specialProjectShown,
      specialProjectStats,
      matchSummary,
      sortPasses
    }
  };
}
