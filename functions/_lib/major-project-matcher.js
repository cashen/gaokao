import { normalizeSearchText } from './search-index-builder.js';
import { evaluateKeywordMatch } from './keyword-match-scorer.js';

export function matchMajorProject(recordOrIndexed, keywordQuery = {}) {
  if (!keywordQuery?.hasMajorKeyword && !keywordQuery?.hasProjectKeyword && !keywordQuery?.hasIndustryKeyword) {
    return { matched: true, score: 0, badges: [], reason: '', matchLevel: '', matchLabel: '', matchReason: '' };
  }

  const indexed = recordOrIndexed?.record ? recordOrIndexed : null;
  const record = indexed ? indexed.record : recordOrIndexed;
  const normalized = indexed || {
    record,
    majorText: normalizeSearchText([record.majorName, record.major, record.majorCategory, record.majorFamily, record.majorGroup, record.majorTags].flat().filter(Boolean).join(' ')),
    projectText: normalizeSearchText([record.majorName, record.major, record.remark, record.majorRemark, record.enrollRemark, record.tuition, record.tuitionText, record.feeType, record.cooperationType, record.projectType, record.flags, record.tags, record.rawText].flat().filter(Boolean).join(' ')),
    schoolText: normalizeSearchText([record.schoolName, record.school, record.schoolAlias, record.schoolCanonical, record.nature, record.schoolTags, record.flags].flat().filter(Boolean).join(' ')),
    industryText: normalizeSearchText([record.industryTag, record.schoolIndustry, record.majorIndustry, record.industryTags, record.schoolTags, record.flags].flat().filter(Boolean).join(' '))
  };

  const evaluated = evaluateKeywordMatch({ indexed: normalized, keywordQuery });
  return {
    matched: Boolean(evaluated.matched),
    score: Number(evaluated.matchScore || 0),
    badges: evaluated.matchBadges || [],
    reason: evaluated.matchReason || '',
    matchLevel: evaluated.matchLevel || '',
    matchLabel: evaluated.matchLabel || '',
    matchReason: evaluated.matchReason || '',
    matchedKeyword: evaluated.matchedKeyword || '',
    matchedTerms: evaluated.matchedTerms || []
  };
}
