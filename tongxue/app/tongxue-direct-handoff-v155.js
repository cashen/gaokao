import { findSchoolEntityByName, getSchoolEntity } from '../data/school-entities-v150.js?v=150';

const HANDOFF_TIMEOUT_MS = 12000;

export function readTongxueDirectHandoff(search = globalThis.location?.search || '') {
  const params = new URLSearchParams(String(search || ''));
  const requestedSchool = String(params.get('school') || '').trim();
  const requestedEntityId = String(params.get('entity') || '').trim();
  const entity = (requestedEntityId ? getSchoolEntity(requestedEntityId) : null)
    || (requestedSchool ? findSchoolEntityByName(requestedSchool) : null);
  const school = String(entity?.displayName || requestedSchool || '').trim();

  return Object.freeze({
    school,
    entityId: entity?.entityId || '',
    requestedSchool,
    shouldAutoQuery: Boolean(school),
    source: school ? 'url-school-handoff' : 'none'
  });
}

export function prepareTongxueDirectHandoff(options = {}) {
  const state = readTongxueDirectHandoff(options.search);
  if (typeof document === 'undefined') {
    return Object.freeze({ state, start: async () => false });
  }

  const input = document.getElementById('school');
  if (input && state.school) {
    input.value = state.school;
    input.dataset.tongxueHandoff = 'prefilled';
    if (state.entityId) input.dataset.tongxueEntity = state.entityId;
    input.removeAttribute('autofocus');
    if (document.activeElement === input) input.blur();
  }

  return Object.freeze({
    state,
    start: () => startTongxueDirectQuery(state, options)
  });
}

export async function startTongxueDirectQuery(state, options = {}) {
  if (typeof document === 'undefined' || !state?.shouldAutoQuery) return false;

  const input = document.getElementById('school');
  const button = document.getElementById('queryButton');
  if (!input || !button) return false;

  input.value = state.school;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(500, options.timeoutMs) : HANDOFF_TIMEOUT_MS;

  const trigger = () => {
    if (button.dataset.tongxueAutoStarted === '1') return true;
    if (button.disabled || input.value.trim() !== state.school) return false;
    button.dataset.tongxueAutoStarted = '1';
    button.dataset.tongxueHandoff = state.source;
    button.click();
    return true;
  };

  if (trigger()) return true;

  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      observer?.disconnect();
      clearInterval(interval);
      clearTimeout(timeout);
      resolve(value);
    };
    const attempt = () => {
      if (trigger()) finish(true);
    };
    const observer = typeof MutationObserver === 'function'
      ? new MutationObserver(attempt)
      : null;
    observer?.observe(button, { attributes: true, attributeFilter: ['disabled'] });
    const interval = setInterval(attempt, 80);
    const timeout = setTimeout(() => finish(false), timeoutMs);
    attempt();
  });
}
