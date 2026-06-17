// v3.9.7.3 兼容导出：旧调用仍可用；新主流程使用 keyword-match-scorer.js。
export const SEARCH_SCORE_WEIGHTS = {
  exact: 100,
  related: 72,
  project: 70,
  industry: 50,
  weak: 25,
  majorExact: 100,
  majorAlias: 75,
  industrySchool: 65,
  industryTag: 55,
  remark: 45
};

export function scoreKeywordMatch({ majorHit, projectHit, industrySchoolHit, industryTagHit } = {}) {
  let score = 0;
  const badges = [];
  if (majorHit) { score += SEARCH_SCORE_WEIGHTS.majorAlias; badges.push('专业命中'); }
  if (projectHit) { score += SEARCH_SCORE_WEIGHTS.project; badges.push('项目属性'); }
  if (industrySchoolHit) { score += SEARCH_SCORE_WEIGHTS.industrySchool; badges.push('行业院校'); }
  if (industryTagHit) { score += SEARCH_SCORE_WEIGHTS.industryTag; badges.push('行业路径'); }
  return { score, badges };
}
