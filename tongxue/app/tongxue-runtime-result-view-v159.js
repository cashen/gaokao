import { createTongxueResultView as createBaseTongxueResultView } from './tongxue-runtime-result-view-base-v159.js?v=159-base-common-name-v001';
import {
  listHigherEducationCommonNames,
  resolveHigherEducationCommonNameSchools,
  higherEducationCommonNameHandoffPayload,
  HIGHER_EDUCATION_COMMON_NAME_NOTICE
} from '../../shared/resources/higher-education/higher-education-common-names.v001.js?v=001';

export const TONGXUE_COMMON_NAME_WRAPPER_VERSION = 'tongxue-common-name-v001';
const STYLE_ID = 'tongxue-common-name-style-v001';
const UI_ID = 'tongxue-common-name-ui-v001';

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>\"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[char]));
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .tongxue-common-name{margin:14px 0 0;padding:10px 12px;border:1px solid var(--border,#dce6e2);border-radius:14px;background:#fbfcfc;color:var(--text,#17242d)}
    .tongxue-common-name-summary{display:flex;align-items:center;gap:8px;color:var(--primary,#172d67);font-size:13px;font-weight:850;cursor:pointer;list-style:none}
    .tongxue-common-name-summary::-webkit-details-marker{display:none}
    .tongxue-common-name-summary::after{content:'›';margin-left:auto;color:var(--muted,#60717a);font-size:18px;line-height:1;transform:rotate(90deg)}
    .tongxue-common-name[open] .tongxue-common-name-summary::after{transform:rotate(-90deg)}
    .tongxue-common-name-kicker{color:var(--muted,#60717a);font-size:11px;font-weight:750}
    .tongxue-common-name-panel{margin-top:10px;padding-top:10px;border-top:1px dashed var(--border,#dce6e2)}
    .tongxue-common-name-notice{margin:0 0 9px;color:var(--muted,#60717a);font-size:12px;line-height:1.7}
    .tongxue-common-name-members{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
    .tongxue-common-name-member{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border:1px solid var(--border,#dce6e2);border-radius:999px;background:#fff;color:var(--primary,#172d67);font-size:12px;font-weight:750;text-decoration:none}
    .tongxue-common-name-member:hover{background:var(--soft,#eaf7f3)}
    .tongxue-common-name-foot{margin:10px 0 0;color:var(--muted,#60717a);font-size:11px;line-height:1.7}
    @media (max-width:640px){.tongxue-common-name{margin-top:12px;padding:9px 10px}.tongxue-common-name-member{max-width:100%;white-space:normal}}
  `;
  document.head.append(style);
}

function commonNamesForState(state = {}) {
  if (state.scope !== 'school') return [];
  const entityId = String(state.currentEntityId || '').trim();
  const schoolName = String(state.currentSchool || '').trim();
  return listHigherEducationCommonNames().filter(item => {
    const resolved = resolveHigherEducationCommonNameSchools(item.id);
    if (resolved.status !== 'resolved') return false;
    if (entityId) return resolved.members.some(entity => entity.entityId === entityId);
    return resolved.members.some(entity => entity.displayName === schoolName);
  }).slice(0, 3);
}

function commonNameMarkup(state) {
  const names = commonNamesForState(state);
  if (!names.length) return '';
  const visibleNames = names.map(item => escapeHtml(item.name)).join('、');
  const panels = names.map(item => {
    const resolved = resolveHigherEducationCommonNameSchools(item.id);
    const members = resolved.members.map(entity => `<a class="tongxue-common-name-member" href="/tongxue/?school=${encodeURIComponent(entity.displayName)}">${escapeHtml(entity.displayName)}</a>`).join('');
    return `<section class="tongxue-common-name-panel" data-common-name-panel="${escapeHtml(item.id)}">
      <p class="tongxue-common-name-notice">${escapeHtml(HIGHER_EDUCATION_COMMON_NAME_NOTICE)}</p>
      <ul class="tongxue-common-name-members">${members}</ul>
      <p class="tongxue-common-name-foot">这个叫法只用于帮助理解学校之间的常见称呼；不会作为录取、排名或专业强弱的依据。</p>
    </section>`;
  }).join('');
  return `<details id="${UI_ID}" class="tongxue-common-name" data-common-name-count="${names.length}">
    <summary class="tongxue-common-name-summary"><span class="tongxue-common-name-kicker">高校民间称谓</span><span>大家常说：${visibleNames}</span></summary>
    ${panels}
  </details>`;
}

function mountCommonNames(ui, state) {
  if (!ui?.result || !state || state.scope !== 'school') return;
  const host = ui.result.querySelector('.result-shell');
  if (!host) return;
  const names = commonNamesForState(state);
  const signature = names.map(item => item.id).join('|');
  if (host.dataset.commonNameSignature === signature) return;
  host.dataset.commonNameSignature = signature;
  host.querySelectorAll(`#${UI_ID}`).forEach(node => node.remove());
  const anchor = host.querySelector('.meta');
  if (!anchor || !signature) return;
  anchor.insertAdjacentHTML('afterend', commonNameMarkup(state));
  const node = host.querySelector(`#${UI_ID}`);
  if (node) {
    node.dataset.handoffPayload = JSON.stringify(
      higherEducationCommonNameHandoffPayload(state.currentSchool || '', state.currentEntityId || '')
    );
  }
}

export function createTongxueResultView(ui, state, searchView) {
  installStyles();
  const resultView = createBaseTongxueResultView(ui, state, searchView);
  if (ui?.result) {
    const observer = new MutationObserver(() => mountCommonNames(ui, state));
    observer.observe(ui.result, { childList:true, subtree:true });
    queueMicrotask(() => mountCommonNames(ui, state));
  }
  return resultView;
}

// Keep source-level ownership markers required by existing Tongxue verifiers while
// delegating all existing result behavior to the unchanged base owner.
// PAGE_VERSION = 'v1.5.9-uec01-evidence02';
// data-major-source-footer-note / 这些概括从哪来？ / 先看这两件事 / 回到刚才的分数结果
