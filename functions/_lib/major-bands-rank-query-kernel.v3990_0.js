import { matchRegion } from './major-filter.js';
import {
  getBottomLineEligibility,
  getBottomLineSortWeight
} from './bottomline-policy.js';
import { buildKeywordQuery } from './keyword-query.js';
import { matchMajorProject } from './major-project-matcher.js';
import { buildSearchIndex } from './search-index-builder.js';
import { resolveCanonicalPosition } from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { rankMajorBandsRecordsOnce } from './major-bands-result-order.v3990_0.js';
import {
  detectSpecialProject,
  enrichSpecialProjectRecord,
  shouldHideSpecialProject,
  createSpecialProjectStats,
  addSpecialProjectStat
} from './special-project-policy.js';

export const MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION = 'major-bands-rank-query-kernel-v3990_0';

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

function explicitSpecialProjectIntent(value = '') {
  return /公费师范|优师|定向|专项|预科|民族班|公安|警察|司法|航海|轮机/.test(String(value || ''));
}

function emptyGroup() {
  return { count: 0, ordered: [] };
}

function emptyResult(candidateRank, keywordQuery) {
  return {
    grouped: {
      upper: emptyGroup(),
      near: emptyGroup(),
      steady: emptyGroup()
    },
    keywordQuery,
    stats: {
      version: MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
      rankUnavailable: !Number.isFinite(Number(candidateRank?.rankForGap)),
      rawScanned: 0,
      canonicalCandidate: 0,
      rawCandidate: 0,
      normalized: 0,
      bottomLineExcluded: 0,
      bottomLineUnresolved: 0,
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
  const specialProjectMode = clean(options.specialProjectMode || 'hide_eligibility_projects', 50);
  const schoolFilter = Boolean(options.schoolFilter);
  const acceptedSchoolNames = exactSchoolSet(options.acceptedSchoolNames);
  const keywordQuery = buildKeywordQuery(majorKeyword);

  if (!Number.isFinite(candidateRankValue) || candidateRankValue <= 0) {
    return emptyResult(candidateRank, keywordQuery);
  }

  const hasKeywordSearch = hasKeywordFilters(keywordQuery);
  const specialIntent = explicitSpecialProjectIntent(majorKeyword);
  const canonicalCandidates = [];

  for (const source of records || []) {
    if (!source?.id || !source.school || !source.major) continue;
    const canonicalPosition = resolveCanonicalPosition({
      candidateScore,
      candidateRank: candidateRankValue,
      recordScore: source.score2026 ?? source.score,
      recordRank: source.rank2026 ?? source.rank,
      rangePreset
    });
    if (!['upper', 'near', 'steady'].includes(canonicalPosition.bandKey)) continue;
    if (schoolFilter && !acceptedSchoolNames.has(normalizeSchoolName(source.school))) continue;
    if (!matchRegion(source, region)) continue;
    canonicalCandidates.push({ source, canonicalPosition });
  }

  const searchIndex = hasKeywordSearch
    ? buildSearchIndex(canonicalCandidates.map(item => item.source))
    : null;
  const grouped = {
    upper: emptyGroup(),
    near: emptyGroup(),
    steady: emptyGroup()
  };
  const specialProjectStats = createSpecialProjectStats();
  const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };

  let normalized = 0;
  let bottomLineExcluded = 0;
  let bottomLineUnresolved = 0;
  let majorKeywordExcluded = 0;
  let majorHitCount = 0;
  let projectHitCount = 0;
  let industryHitCount = 0;
  let specialProjectHidden = 0;
  let specialProjectShown = 0;

  for (let index = 0; index < canonicalCandidates.length; index += 1) {
    const { source, canonicalPosition } = canonicalCandidates[index];
    const match = hasKeywordSearch
      ? matchMajorProject(searchIndex[index], keywordQuery)
      : matchAllKeywordResult();
    if (!match.matched) {
      majorKeywordExcluded += 1;
      continue;
    }

    const bottomLineEligibility = bottomLineMode === 'all'
      ? { status: 'pass', reason: 'mode_does_not_exclude', record: source }
      : getBottomLineEligibility(source, bottomLineMode);
    if (bottomLineEligibility.status === 'fail') {
      bottomLineExcluded += 1;
      continue;
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
      continue;
    }

    const record = {
      ...source,
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
    };

    if (specialProject.hasSpecialProject) {
      specialProjectShown += 1;
      Object.assign(record, enrichSpecialProjectRecord(record));
      record.specialProjectExplicitIntent = specialIntent;
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

  let sortPasses = 0;
  for (const key of ['upper', 'near', 'steady']) {
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
      rankUnavailable: false,
      rawScanned: Array.isArray(records) ? records.length : 0,
      canonicalCandidate: canonicalCandidates.length,
      rawCandidate: canonicalCandidates.length,
      normalized,
      bottomLineExcluded,
      bottomLineUnresolved,
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

