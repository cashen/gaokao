import { MAIN_FLOW_STEPS, PLAN_FLOW_STEPS, stateClassFor } from '../../domain/flow-step-contract.v3963_1.js?v=3963_1';
function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function renderSteps(steps, resolved) {
  return steps.map((step, index) => `<li class="${stateClassFor(step.key, resolved)}" data-flow-step="${escapeHtml(step.key)}"><span class="ln-stepper-index">${stateClassFor(step.key, resolved) === 'is-complete' ? '✓' : index + 1}</span><span><b>${escapeHtml(step.label)}</b>${step.short ? `<small>${escapeHtml(step.short)}</small>` : ''}</span></li>`).join('');
}
export function renderMainFlowStepper(root, resolved = {}, steps = MAIN_FLOW_STEPS) {
  if (!root) return;
  const list = root.querySelector('.ln-stepper-list');
  const note = root.querySelector('[data-flow-note]') || root.querySelector('.ln-stepper-flow-note');
  root.dataset.currentStep = resolved.current || 'input';
  root.classList.toggle('is-report-failed', resolved.status === 'failed');
  if (list) list.innerHTML = renderSteps(steps, resolved);
  if (note) note.textContent = resolved.note || '';
}
export function renderPlanFlowStepper(root, resolved = {}) {
  if (!root) return;
  const list = root.querySelector('.ln-plan-status-steps');
  const note = root.querySelector('[data-plan-flow-note]') || root.querySelector('.ln-plan-status-note');
  root.dataset.currentStep = resolved.current || 'selected';
  root.classList.toggle('is-report-failed', resolved.status === 'failed');
  if (list) list.innerHTML = PLAN_FLOW_STEPS.map((step, index) => `<li class="${stateClassFor(step.key, resolved)}" data-plan-step="${escapeHtml(step.key)}"><span>${stateClassFor(step.key, resolved) === 'is-complete' ? '✓' : index + 1}</span><b>${escapeHtml(step.label)}</b></li>`).join('');
  if (note) note.textContent = resolved.note || '';
}
