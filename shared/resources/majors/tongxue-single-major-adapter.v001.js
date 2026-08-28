import { MAJOR_CATALOG_2026 } from '../../../ln-rank/kb/major-understanding/major-catalog-2026.generated.js';
import { createMajorIntentResolver } from './major-intent-resolver.v001.js';

export const TONGXUE_SINGLE_MAJOR_ADAPTER_META = Object.freeze({
  version: 'tongxue-single-major-adapter-v001',
  policy: 'one-canonical-major-per-query',
  boundary: '模糊输入先确认一个本科专业；不合并多专业、不把方向直接当作单一专业。'
});

const RESOLVER = createMajorIntentResolver(MAJOR_CATALOG_2026, [], { sourceVersion: TONGXUE_SINGLE_MAJOR_ADAPTER_META.version });
const MULTI_MAJOR_SEPARATOR = /[\/、,，;；|+]/u;

function clean(value = '') {
  return String(value || '').trim();
}

function candidate(item, score = 0.6, matchType = 'intent_candidate') {
  return {
    item,
    score,
    matchType
  };
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function directionChoices(intent) {
  const labels = unique((intent.allCandidates || []).map(item => item.directionLabel).filter(Boolean));
  return labels.slice(0, 8).map(label => ({ label, value: label }));
}

export function resolveTongxueMajorInput(value = '', { limit = 8 } = {}) {
  const input = clean(value);
  if (!input) return Object.freeze({ status: 'missing', input, candidates: [], intent: null });
  const intent = RESOLVER.resolve(input, { limit });
  const isCanonicalDirectionLabel = intent.intentLevel === 'direction' && intent.intentKey.startsWith('direction:');
  if (MULTI_MAJOR_SEPARATOR.test(input) && !isCanonicalDirectionLabel) {
    return Object.freeze({
      status: 'multi-major',
      input,
      candidates: [],
      directionChoices: [],
      message: '这里一次查看一个专业，请先选择一个具体专业。',
      intent: null
    });
  }

  const exact = intent.status === 'ready'
    && intent.intentLevel === 'exact-major'
    && intent.coreMajorCodes.length === 1;
  if (exact) {
    const major = RESOLVER.findByCode(intent.coreMajorCodes[0]);
    return Object.freeze({
      status: 'resolved',
      input,
      major,
      candidates: [],
      directionChoices: [],
      intent,
      matchType: intent.matchType,
      confidence: intent.confidence
    });
  }

  const codes = unique([
    ...(intent.coreMajorCodes || []),
    ...(intent.relatedMajorCodes || [])
  ]);
  const candidates = codes
    .map(code => RESOLVER.findByCode(code))
    .filter(Boolean)
    .slice(0, limit)
    .map(item => candidate(item, intent.confidence === 'high' ? 0.86 : 0.62, intent.matchType || 'intent_candidate'));
  const broad = intent.intentLevel === 'broad-field' || intent.intentLevel === 'discipline';
  return Object.freeze({
    status: broad ? 'too-broad' : (intent.status === 'unresolved' ? 'unresolved' : 'ambiguous'),
    input,
    candidates,
    directionChoices: broad ? directionChoices(intent) : [],
    intent,
    message: broad
      ? '这个说法范围比较大，请先选一个方向，再确认具体专业。'
      : (intent.warnings?.[0] || '请从候选中确认一个具体专业。')
  });
}

export function searchTongxueMajorInput(value = '', options = {}) {
  const resolved = resolveTongxueMajorInput(value, options);
  return resolved.candidates;
}

export function getTongxueMajorResolver() {
  return RESOLVER;
}
