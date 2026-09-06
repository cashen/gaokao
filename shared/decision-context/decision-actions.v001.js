export const DECISION_ACTIONS_VERSION = 'decision-actions-v0.01';
export const DECISION_ACTION_IDS = Object.freeze([
  'view_major_history',
  'view_major_path',
  'view_student_voice',
  'add_to_family_plan',
  'ask_family_advisor',
  'return_to_source'
]);

const ACTION_COPY = Object.freeze({
  view_major_history: Object.freeze({ label: '看专业历史', target: 'ln-rank', reason: '需要已确认的具体专业' }),
  view_major_path: Object.freeze({ label: '看专业升学地图', target: 'major-path', reason: '需要已确认的具体专业' }),
  view_student_voice: Object.freeze({ label: '看跨校同专业留言', target: 'tongxue', reason: '需要已确认的具体专业' }),
  add_to_family_plan: Object.freeze({ label: '加入家庭方案', target: 'aiplus', reason: '需要可核验的招生记录' }),
  ask_family_advisor: Object.freeze({ label: '带着这些条件问 AIPLuS', target: 'aiplus', reason: '只带只读上下文' }),
  return_to_source: Object.freeze({ label: '回到原查询', target: 'source', reason: '始终保留原查询入口' })
});

function clean(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function hasMajor(context = {}) {
  return Boolean(String(context.majorCode || '').trim() && String(context.major || '').trim());
}

function hasAdmissionRecord(context = {}) {
  return Array.isArray(context.selectionSnapshot)
    && context.selectionSnapshot.some(record => record && (record.id || record.schoolCode) && (record.score != null || record.rank != null));
}

export function buildDecisionActions(context = {}, {
  majorHistoryHref = '',
  majorPathHref = '',
  studentVoiceHref = '',
  aiplusHref = '',
  returnHref = ''
} = {}) {
  const normalized = context && typeof context === 'object' ? context : {};
  const major = hasMajor(normalized);
  const admission = hasAdmissionRecord(normalized);
  const candidates = [
    {
      id: 'view_major_history',
      label: ACTION_COPY.view_major_history.label,
      target: ACTION_COPY.view_major_history.target,
      href: clean(majorHistoryHref),
      enabled: major && Boolean(clean(majorHistoryHref)),
      reason: major ? '' : ACTION_COPY.view_major_history.reason
    },
    {
      id: 'view_major_path',
      label: ACTION_COPY.view_major_path.label,
      target: ACTION_COPY.view_major_path.target,
      href: clean(majorPathHref),
      enabled: major && Boolean(clean(majorPathHref)),
      reason: major ? '' : ACTION_COPY.view_major_path.reason
    },
    {
      id: 'view_student_voice',
      label: ACTION_COPY.view_student_voice.label,
      target: ACTION_COPY.view_student_voice.target,
      href: clean(studentVoiceHref),
      enabled: major && Boolean(clean(studentVoiceHref)),
      reason: major ? '' : ACTION_COPY.view_student_voice.reason
    },
    {
      id: 'add_to_family_plan',
      label: ACTION_COPY.add_to_family_plan.label,
      target: ACTION_COPY.add_to_family_plan.target,
      href: clean(aiplusHref),
      enabled: admission && Boolean(clean(aiplusHref)),
      reason: admission ? '' : ACTION_COPY.add_to_family_plan.reason
    },
    {
      id: 'ask_family_advisor',
      label: ACTION_COPY.ask_family_advisor.label,
      target: ACTION_COPY.ask_family_advisor.target,
      href: clean(aiplusHref),
      enabled: Boolean(clean(aiplusHref)),
      reason: ''
    },
    {
      id: 'return_to_source',
      label: ACTION_COPY.return_to_source.label,
      target: ACTION_COPY.return_to_source.target,
      href: clean(returnHref || normalized.returnTo),
      enabled: Boolean(clean(returnHref || normalized.returnTo)),
      reason: ''
    }
  ];
  return Object.freeze(candidates.filter(item => item.enabled).slice(0, 4).map(item => Object.freeze(item)));
}

export function decisionActionCopy(id = '') {
  return ACTION_COPY[id] || null;
}
