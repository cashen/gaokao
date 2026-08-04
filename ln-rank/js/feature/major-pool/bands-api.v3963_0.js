import { fetchApiJson } from '../../shared/api-client.js?v=3963_0';
import { state } from '../../state/app-state.v3963_1.js?v=3963_1';

function expectedBandSnapshot(page) {
  const band = String(page?.band || '').trim();
  if (!band) return '';
  return String(state?.bands?.data?.bands?.[band]?.pagination?.snapshot || '').trim();
}

function assertBandSnapshot(payload, band, expectedSnapshot) {
  if (!expectedSnapshot) return;
  const actualSnapshot = String(payload?.bands?.[band]?.pagination?.snapshot || '').trim();
  if (actualSnapshot === expectedSnapshot) return;
  const error = new Error('分页结果已更新，请重新查询后继续查看。');
  error.code = 'pagination_snapshot_mismatch';
  error.retryable = true;
  error.expectedSnapshot = expectedSnapshot;
  error.actualSnapshot = actualSnapshot;
  throw error;
}

export async function fetchMajorBands({ candidateScore, rangePreset, filters, page = null, signal = null }) {
  const params = new URLSearchParams({
    candidateScore: String(candidateScore),
    rangePreset: rangePreset || 'standard',
    region: filters.region || 'all',
    schoolKeyword: filters.schoolKeyword || '',
    schoolEntityId: filters.schoolEntityId || '',
    majorKeyword: filters.majorKeyword || '',
    bottomLineMode: filters.bottomLineMode || 'all',
    specialProjectMode: filters.specialProjectMode || 'hide_eligibility_projects'
  });
  const band = String(page?.band || '').trim();
  const expectedSnapshot = expectedBandSnapshot(page);
  if (band) params.set('band', band);
  if (expectedSnapshot) params.set('snapshot', expectedSnapshot);
  if (Number.isFinite(Number(page?.offset))) params.set('offset', String(Math.max(0, Math.floor(Number(page.offset)))));
  if (Number.isFinite(Number(page?.limit))) params.set('limit', String(Math.max(16, Math.floor(Number(page.limit)))));
  const payload = await fetchApiJson(`/api/major-bands?${params.toString()}`, {
    userMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
    apiUserMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
    fetchOptions: signal ? { signal } : undefined
  });
  assertBandSnapshot(payload, band, expectedSnapshot);
  return payload;
}
