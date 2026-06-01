import { normalizeSearchText } from './search-index-builder.js';

function hitAny(text, keywords = []) {
  if (!Array.isArray(keywords) || !keywords.length) return false;
  const t = String(text || '');
  return keywords.some(k => {
    const kk = normalizeSearchText(k);
    return kk && t.includes(kk);
  });
}

export function matchMajorProject(recordOrIndexed, keywordQuery = {}) {
  if (!keywordQuery?.hasMajorKeyword && !keywordQuery?.hasProjectKeyword && !keywordQuery?.hasIndustryKeyword) return { matched: true, score: 0, badges: [], reason: '' };

  const indexed = recordOrIndexed?.record ? recordOrIndexed : null;
  const record = indexed ? indexed.record : recordOrIndexed;
  const majorText = indexed?.majorText ?? normalizeSearchText([record.majorName, record.major, record.majorFamily, record.majorTags].flat().filter(Boolean).join(' '));
  const projectText = indexed?.projectText ?? normalizeSearchText([record.majorName, record.major, record.remark, record.majorRemark, record.tuition, record.tuitionText, record.feeType, record.cooperationType, record.projectType, record.flags, record.tags].flat().filter(Boolean).join(' '));
  const schoolText = indexed?.schoolText ?? normalizeSearchText([record.schoolName, record.school, record.schoolAlias, record.schoolTags, record.flags].flat().filter(Boolean).join(' '));
  const industryText = indexed?.industryText ?? normalizeSearchText([record.industryTag, record.schoolIndustry, record.majorIndustry, record.industryTags, record.schoolTags, record.flags].flat().filter(Boolean).join(' '));

  const majorHit = hitAny(majorText, keywordQuery.majorKeywords);
  const projectHit = hitAny(projectText, keywordQuery.projectKeywords);
  const industrySchoolHit = hitAny(schoolText, keywordQuery.industrySchoolHints);
  const industryTagHit = hitAny(industryText, keywordQuery.industryTags);

  const badges = [];
  let score = 0;
  if (majorHit) { badges.push('专业命中'); score += 80; }
  if (projectHit) { badges.push('项目属性'); score += 60; }
  if (industrySchoolHit) { badges.push('行业院校'); score += 55; }
  if (industryTagHit) { badges.push('行业路径'); score += 45; }

  const matched = majorHit || projectHit || industrySchoolHit || industryTagHit;
  return {
    matched,
    score,
    badges,
    reason: badges.length ? `命中：${badges.join('、')}` : ''
  };
}
