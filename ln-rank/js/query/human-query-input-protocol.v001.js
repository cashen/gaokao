import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js?v=3990_2&r=r034-worker-1102-bounded-api';

export const HUMAN_QUERY_INPUT_PROTOCOL_VERSION = CURRENT_RELEASE.lnRankHumanQueryInputVersion;
export const HUMAN_QUERY_INPUT_PROTOCOL_REVISION = CURRENT_RELEASE.lnRankHumanQueryInputRevision;

const SCORE_MIN = 150;
const SCORE_MAX = 750;

const EMPTY = Object.freeze({
  kind: 'empty',
  value: null,
  min: null,
  max: null,
  canSubmit: false,
  needsConfirmation: false,
  normalized: '',
  message: '还没有填分数。可以直接输入一个分数，例如 580。'
});

function text(value) {
  return String(value == null ? '' : value).replace(/[　\t\n\r]+/g, ' ').trim();
}

function normalize(value) {
  return text(value)
    .replace(/[，,]/g, ',')
    .replace(/[～~]/g, '—')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, ' ');
}

function number(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function validScore(value) {
  return Number.isInteger(value) && value >= SCORE_MIN && value <= SCORE_MAX;
}

function outOfRangeMessage(value) {
  return `分数应在${SCORE_MIN}到${SCORE_MAX}之间，请检查后再查。`;
}

function point(value, normalized) {
  if (!validScore(value)) {
    return Object.freeze({
      kind: 'out_of_range',
      value: null,
      min: null,
      max: null,
      canSubmit: false,
      needsConfirmation: true,
      normalized,
      message: outOfRangeMessage(value)
    });
  }
  return Object.freeze({
    kind: 'point',
    value,
    min: value,
    max: value,
    canSubmit: true,
    needsConfirmation: false,
    normalized,
    message: `按${value}分作为这次查询的参考分数。`
  });
}

function bounded(kind, lower, upper, normalized) {
  const rangeText = lower != null && upper != null
    ? `${lower}—${upper}分`
    : lower != null
      ? `${lower}分及以上`
      : `${upper}分及以下`;
  return Object.freeze({
    kind,
    value: null,
    min: lower,
    max: upper,
    canSubmit: false,
    needsConfirmation: true,
    normalized,
    message: `你输入的是${rangeText}。当前查询需要一个单点参考分数，请改填一个分数。`
  });
}

function invalid(normalized, message = '请直接填一个分数，例如 580；如果想填位次，请使用位次入口。') {
  return Object.freeze({
    kind: 'invalid',
    value: null,
    min: null,
    max: null,
    canSubmit: false,
    needsConfirmation: true,
    normalized,
    message
  });
}

export function normalizeScoreInput(value) {
  return normalize(value);
}

export function parseScoreInput(value) {
  const normalized = normalize(value);
  if (!normalized) return EMPTY;

  if (/(?:位次|名次|排名|省排|全省第)/.test(normalized)) {
    return invalid(normalized, '这看起来是位次，不是分数；请把位次填到位次入口，或改填高考分数。');
  }

  const range = normalized.match(/(\d{1,3})\s*(?:-|—|至|到)\s*(\d{1,3})\s*(?:分)?/);
  if (range) {
    const lower = number(range[1]);
    const upper = number(range[2]);
    if (lower == null || upper == null || lower > upper) {
      return invalid(normalized, '分数范围前后顺序不对，请重新输入，例如 570-590。');
    }
    if (!validScore(lower) || !validScore(upper)) {
      return Object.freeze({
        kind: 'out_of_range',
        value: null,
        min: lower,
        max: upper,
        canSubmit: false,
        needsConfirmation: true,
        normalized,
        message: outOfRangeMessage(lower < SCORE_MIN ? lower : upper)
      });
    }
    return bounded('range', lower, upper, normalized);
  }

  const lower = normalized.match(/(?:(?:不低于|不少于|至少|大于等于|(?<!不)高于|(?<!不)超过)\s*(\d{1,3})\s*(?:分)?|(\d{1,3})\s*(?:分)?(?:及以上|以上))/);
  if (lower) {
    const valueNumber = number(lower[1] || lower[2]);
    if (!validScore(valueNumber)) return Object.freeze({
      kind: 'out_of_range',
      value: null,
      min: valueNumber,
      max: null,
      canSubmit: false,
      needsConfirmation: true,
      normalized,
      message: outOfRangeMessage(valueNumber)
    });
    return bounded('min', valueNumber, null, normalized);
  }

  const upper = normalized.match(/(?:(?:不高于|不超过|至多|最多|低于|少于)\s*(\d{1,3})\s*(?:分)?|(\d{1,3})\s*(?:分)?(?:及以下|以下))/);
  if (upper) {
    const valueNumber = number(upper[1] || upper[2]);
    if (!validScore(valueNumber)) return Object.freeze({
      kind: 'out_of_range',
      value: null,
      min: null,
      max: valueNumber,
      canSubmit: false,
      needsConfirmation: true,
      normalized,
      message: outOfRangeMessage(valueNumber)
    });
    return bounded('max', null, valueNumber, normalized);
  }

  const pointMatch = normalized.match(/^(?:(?:我|孩子)?(?:目前)?(?:的)?(?:分数|成绩)?(?:是|为|考了)?\s*)(\d{1,3})\s*(?:分)?$/);
  if (pointMatch) return point(number(pointMatch[1]), normalized);

  return invalid(normalized);
}

export function isSubmittableScore(value) {
  return parseScoreInput(value).canSubmit;
}

export function scoreQueryValue(value) {
  const interpretation = parseScoreInput(value);
  return interpretation.canSubmit ? interpretation.value : null;
}

export function createHumanInputProposal({ field, raw, interpretation }) {
  const parsed = interpretation || parseScoreInput(raw);
  return Object.freeze({
    protocolVersion: HUMAN_QUERY_INPUT_PROTOCOL_VERSION,
    protocolRevision: HUMAN_QUERY_INPUT_PROTOCOL_REVISION,
    field: text(field) || 'unknown',
    raw: text(raw),
    normalized: parsed.normalized,
    status: parsed.kind,
    needsConfirmation: parsed.needsConfirmation,
    canCommit: parsed.canSubmit,
    value: parsed.value,
    min: parsed.min,
    max: parsed.max,
    message: parsed.message
  });
}
