import { fetchApiJson } from '../../shared/api-client.js?v=3949_3';

export async function fetchMajorBands({ candidateScore, rangePreset, filters, page = null }) {
  const params = new URLSearchParams({
    candidateScore: String(candidateScore),
    rangePreset: rangePreset || 'standard',
    region: filters.region || 'all',
    schoolKeyword: filters.schoolKeyword || '',
    majorKeyword: filters.majorKeyword || '',
    bottomLineMode: filters.bottomLineMode || 'all',
    specialProjectMode: filters.specialProjectMode || 'hide_eligibility_projects'
  });
  if (page?.band) params.set('band', page.band);
  if (Number.isFinite(Number(page?.offset))) params.set('offset', String(Math.max(0, Math.floor(Number(page.offset)))));
  if (Number.isFinite(Number(page?.limit))) params.set('limit', String(Math.max(16, Math.floor(Number(page.limit)))));
  return fetchApiJson(`/api/major-bands?${params.toString()}`, {
    userMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
    apiUserMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。'
  });
}