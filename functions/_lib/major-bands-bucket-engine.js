import { makeBands } from './band-engine.js';
import { matchRegion } from './major-filter.js';
import {
  getBottomLineEligibility,
  getBottomLineSortWeight
} from './bottomline-policy.js';
import { buildKeywordQuery } from './keyword-query.js';
import { matchMajorProject } from './major-project-matcher.js';
import { buildSearchIndex } from './search-index-builder.js';
import { lookupScoreRank } from './rank-table-provider.js';
import { resolveCanonicalPosition } from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { rankResultRecords } from '../../shared/algorithms/ranking/result-ranking.v3967_0.js';
import { compactMajorBandsBucketCandidate } from './major-bands-bucket-transfer.v3972_5.js';
import {
  detectSpecialProject,
  enrichSpecialProjectRecord,
  shouldHideSpecialProject,
  createSpecialProjectStats,
  addSpecialProjectStat
} from './special-project-policy.js';

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

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return {
    min: Math.min(...all.map(band => band.minScore)),
    max: Math.max(...all.map(band => band.maxScore))
  };
}

function rankContextForScore(score) {
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
  if (!row) return null;
  const rankEnd = Number(row.rankEnd ?? row.cumulative ?? row.rankForGap);
  return {
    rankForGap: Number.isFinite(Number(row.rankForGap))
      ? Number(row.rankForGap)
      : (Number.isFinite(rankEnd) ? rankEnd : null)
  };
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

function initGrouped() {
  return {
    upper: { count: 0, candidates: [] },
    near: { count: 0, candidates: [] },
    steady: { count: 0, candidates: [] }
  };
}

function pushCandidate(grouped, record, context) {
  const canonicalPosition = resolveCanonicalPosition({
    candidateScore: context.candidateScore,
    candidateRank: context.candidateRank?.rankForGap,
    recordScore: record.score2026 ?? record.score,
    recordRank: record.rank2026 ?? record.rank,
    rangePreset: context.rangePreset
  });
  if (!['upper', 'near', 'steady'].includes(canonicalPosition.bandKey)) return '';
  const item = {
    ...record,
    band: canonicalPosition.bandKey,
    bandKey: canonicalPosition.bandKey,
    candidateScore: context.candidateScore,
    candidateReferenceScore: context.candidateScore,
    scoreDelta2026: canonicalPosition.scoreDelta,
    scoreDelta: canonicalPosition.scoreDelta,
    rankGap2026: canonicalPosition.rankGap,
    rankGap: canonicalPosition.rankGap,
    statusKey: canonicalPosition.statusKey,
    statusLabel: canonicalPosition.statusLabel,
    position: canonicalPosition.position,
    canonicalPosition,
    bottomLineEligibility: context.bottomLineEligibility.status,
    bottomLineEligibilityReason: context.bottomLineEligibility.reason
  };
  grouped[canonicalPosition.bandKey].count += 1;
  grouped[canonicalPosition.bandKey].candidates.push(item);
  return canonicalPosition.bandKey;
}

function rankBucketCandidates(candidates, maxCandidates, bottomLineMode) {
  return rankResultRecords(candidates, {
    intent: 'score-search',
    sortMode: 'canonical-staged',
    diversify: false,
    getSoftPreferenceWeight: record => getBottomLineSortWeight(record, bottomLineMode)
  }).slice(0, maxCandidates).map(compactMajorBandsBucketCandidate);
}

export function processMajorBandsStaticBucket(records, options = {}) {
  const candidateScore = Math.round(Number(options.candidateScore));
  const rangePreset = clean(options.rangePreset || 'standard', 20);
  const region = clean(options.region || 'all', 30);
  const majorKeyword = clean(options.majorKeyword || '', 160);
  const bottomLineMode = clean(options.bottomLineMode || 'all', 40);
  const specialProjectMode = clean(options.specialProjectMode || 'hide_eligibility_projects', 50);
  const schoolFilter = Boolean(options.schoolFilter);
  const acceptedSchoolNames = exactSchoolSet(options.acceptedSchoolNames);
  const maxCandidates = Math.max(16, Math.min(240, Number(options.maxCandidates || 96)));
  const bands = makeBands(candidateScore, rangePreset);
  const scoreWindow = minMaxScore(bands);
  const candidateRank = rankContextForScore(candidateScore);
  const keywordQuery = buildKeywordQuery(majorKeyword);
  const hasKeywordSearch = hasKeywordFilters(keywordQuery);
  const specialIntent = explicitSpecialProjectIntent(majorKeyword);
  const grouped = initGrouped();
  const specialProjectStats = createSpecialProjectStats();
  const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };

  let rawCandidate = 0;
  let normalized = 0;
  let bottomLineExcluded = 0;
  let bottomLineUnresolved = 0;
  let majorKeywordExcluded = 0;
  let majorHitCount = 0;
  let projectHitCount = 0;
  let industryHitCount = 0;
  let specialProjectHidden = 0;
  let specialProjectShown = 0;

  for (const source of records || []) {
    const score = Number(source?.score2026 ?? source?.score);
    if (!Number.isFinite(score) || score < scoreWindow.min || score > scoreWindow.max) continue;
    if (schoolFilter && !acceptedSchoolNames.has(normalizeSchoolName(source.school))) continue;
    rawCandidate += 1;

    const record = { ...source };
    if (!record.school || !record.major || !Number.isFinite(Number(record.score2026))) continue;
    if (!matchRegion(record, region)) continue;

    const match = hasKeywordSearch
      ? matchMajorProject(buildSearchIndex([record])[0], keywordQuery)
      : matchAllKeywordResult();
    if (!match.matched) {
      majorKeywordExcluded += 1;
      continue;
    }
    record.matchBadges = match.badges;
    record.matchLevel = match.matchLevel || '';
    record.matchLabel = match.matchLabel || '';
    record.matchReason = match.matchReason || match.reason || '';
    record.matchedKeyword = match.matchedKeyword || '';
    record.matchedTerms = match.matchedTerms || [];
    record.matchScore = match.score;

    const bottomLineEligibility = bottomLineMode === 'all'
      ? { status: 'pass', reason: 'mode_does_not_exclude', record }
      : getBottomLineEligibility(record, bottomLineMode);
    if (bottomLineEligibility.status === 'fail') {
      bottomLineExcluded += 1;
      continue;
    }
    if (bottomLineEligibility.status === 'unresolved') bottomLineUnresolved += 1;

    const specialProject = record.specialProject?.hasSpecialProject != null
      ? record.specialProject
      : detectSpecialProject(record);
    const hideSpecial = specialProject.hasSpecialProject
      && !specialIntent
      && shouldHideSpecialProject({ ...record, specialProject }, specialProjectMode);
    if (hideSpecial) {
      specialProjectHidden += 1;
      addSpecialProjectStat(specialProjectStats, specialProject, 'unknown', 'hidden');
      continue;
    }
    if (specialProject.hasSpecialProject) {
      specialProjectShown += 1;
      Object.assign(record, enrichSpecialProjectRecord({ ...record, specialProject }));
      record.specialProjectExplicitIntent = specialIntent;
    } else {
      record.specialProject = specialProject;
    }

    normalized += 1;
    if (record.matchLevel && Object.prototype.hasOwnProperty.call(matchSummary, record.matchLevel)) {
      matchSummary[record.matchLevel] += 1;
    }
    if (record.matchLevel === 'exact' || record.matchLevel === 'related') majorHitCount += 1;
    if (record.matchLevel === 'project') projectHitCount += 1;
    if (record.matchLevel === 'industry') industryHitCount += 1;

    const band = pushCandidate(grouped, record, {
      candidateScore,
      candidateRank,
      rangePreset,
      bottomLineEligibility
    });
    if (band && specialProject.hasSpecialProject) {
      addSpecialProjectStat(specialProjectStats, specialProject, band, 'shown');
    }
  }

  for (const key of ['upper', 'near', 'steady']) {
    grouped[key].candidates = rankBucketCandidates(grouped[key].candidates, maxCandidates, bottomLineMode);
    grouped[key].returnedCandidates = grouped[key].candidates.length;
    grouped[key].candidateTruncated = grouped[key].candidates.length < grouped[key].count;
  }

  return {
    scoreWindow,
    grouped,
    stats: {
      rawCandidate,
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
      matchSummary
    }
  };
}
