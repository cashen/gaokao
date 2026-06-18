import { fetchApiJson } from '../../shared/api-client.js?v=3947_8';
export async function fetchMajorBands({ candidateScore, rangePreset, filters }) {
  const params = new URLSearchParams({
    candidateScore: String(candidateScore),
    rangePreset: rangePreset || 'standard',
    region: filters.region || 'all',
    schoolKeyword: filters.schoolKeyword || '',
    majorKeyword: filters.majorKeyword || '',
    bottomLineMode: filters.bottomLineMode || 'all',
    specialProjectMode: filters.specialProjectMode || 'hide_eligibility_projects'
  });
  return fetchApiJson(`/api/major-bands?${params.toString()}`, {
    userMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
    apiUserMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。'
  });
}
