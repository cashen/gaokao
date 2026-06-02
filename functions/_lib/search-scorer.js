// v3.9.7.1 搜索命中打分策略。
// 外部只依赖 scoreKeywordMatch，后续可调整权重而不改 major-bands 主流程。
export const SEARCH_SCORE_WEIGHTS = {
  majorExact: 100,
  majorAlias: 75,
  project: 70,
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
