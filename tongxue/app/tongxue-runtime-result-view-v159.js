import { createTongxueResultView as createBaseResultView } from './tongxue-runtime-result-view-core-v159.js?v=159';
import {
  listHigherEducationCommonNames,
  resolveHigherEducationCommonNameSchools,
  higherEducationCommonNameHandoffPayload,
  HIGHER_EDUCATION_COMMON_NAME_NOTICE
} from '../../shared/resources/higher-education/higher-education-common-names.v003.js?v=003';
import {
  getSchoolSocialLabelsForNames,
  SCHOOL_SOCIAL_LABEL_SOURCE_VERSION,
  SCHOOL_SOCIAL_LABEL_SOURCE_META
} from '../../shared/resources/schools/school-social-labels.shared-v001.js?v=001';

export const TONGXUE_COMMON_NAME_ENTRY_VERSION = 'tongxue-common-name-v004-social-labels';
const STYLE_ID = 'tongxue-common-name-style-v004';
const UI_ID = 'tongxue-common-name-ui-v004';

function esc(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .tongxue-common-name{margin:14px 0 0;padding:10px 12px;border:1px solid var(--border,#dce6e2);border-radius:14px;background:#fbfcfc;color:var(--text,#17242d)}
    .tongxue-common-name-summary{display:flex;align-items:center;gap:8px;color:var(--primary,#172d67);font-size:13px;font-weight:850;cursor:pointer;list-style:none}
    .tongxue-common-name-summary::-webkit-details-marker{display:none}
    .tongxue-common-name-summary::after{content:'›';margin-left:auto;color:var(--muted,#60717a);font-size:18px;line-height:1;transform:rotate(90deg)}
    .tongxue-common-name[open] .tongxue-common-name-summary::after{transform:rotate(-90deg)}
    .tongxue-common-name-kicker{color:var(--muted,#60717a);font-size:11px;font-weight:750;white-space:nowrap}
    .tongxue-common-name-panel{margin-top:10px;padding-top:10px;border-top:1px dashed var(--border,#dce6e2)}
    .tongxue-common-name-notice{margin:0 0 9px;color:var(--muted,#60717a);font-size:12px;line-height:1.7}
    .tongxue-common-name-members{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
    .tongxue-common-name-member{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border:1px solid var(--border,#dce6e2);border-radius:999px;background:#fff;color:var(--primary,#172d67);font-size:12px;font-weight:750;text-decoration:none}
    .tongxue-common-name-member:hover{background:var(--soft,#eaf7f3)}
    .tongxue-common-name-foot{margin:10px 0 0;color:var(--muted,#60717a);font-size:11px;line-height:1.7}
    .tongxue-social-labels{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
    .tongxue-social-label{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border:1px solid #d8e2ee;border-radius:999px;background:#f7fafc;color:#294b6c;font-size:12px;font-weight:750}
    .tongxue-social-label-source{margin:8px 0 0;color:var(--muted,#60717a);font-size:11px;line-height:1.7}
    @media (max-width:640px){.tongxue-common-name{margin-top:12px;padding:9px 10px}.tongxue-common-name-summary{align-items:flex-start}.tongxue-common-name-summary span:last-of-type{min-width:0}.tongxue-common-name-member,.tongxue-social-label{max-width:100%;white-space:normal}}
  `;
  document.head.append(style);
}

function findCommonNames(state = {}) {
  if (state.scope !== 'school') return [];
  const entityId = String(state.currentEntityId || '').trim();
  const schoolName = String(state.currentSchool || '').trim();
  return listHigherEducationCommonNames().filter(item => {
    const resolved = resolveHigherEducationCommonNameSchools(item.id);
    if (resolved.status !== 'resolved') return false;
    return resolved.members.some(entity => entityId ? entity.entityId === entityId : entity.displayName === schoolName);
  }).slice(0, 3);
}

function findSocialLabels(state = {}) {
  if (state.scope !== 'school') return [];
  const schoolName = String(state.currentSchool || '').trim();
  if (!schoolName) return [];
  return getSchoolSocialLabelsForNames([schoolName]);
}

function renderCommonNames(state = {}) {
  const names = findCommonNames(state);
  const socialLabels = findSocialLabels(state);
  if (!names.length && !socialLabels.length) return '';
  const visibleNames = names.map(item => esc(item.name)).join('、');
  const labelLead = socialLabels.length ? `来源站标签 ${socialLabels.length} 个` : '';
  const summaryLead = names.length
    ? `大家常说：${visibleNames}${labelLead ? ` · ${labelLead}` : ''}`
    : `来源站有 ${socialLabels.length} 个高校标签`;
  const commonPanels = names.map(item => {
    const resolved = resolveHigherEducationCommonNameSchools(item.id);
    const members = resolved.members.map(entity => `<a class="tongxue-common-name-member" href="/tongxue/?school=${encodeURIComponent(entity.displayName)}">${esc(entity.displayName)}</a>`).join('');
    return `<section class="tongxue-common-name-panel" data-common-name-panel="${esc(item.id)}"><p class="tongxue-common-name-notice">${esc(HIGHER_EDUCATION_COMMON_NAME_NOTICE)}</p><ul class="tongxue-common-name-members">${members}</ul><p class="tongxue-common-name-foot">这个叫法只用于理解学校之间的常见称呼；不会作为录取、排名或专业强弱的依据。</p></section>`;
  }).join('');
  const socialPanel = socialLabels.length
    ? `<section class="tongxue-common-name-panel" data-social-labels-version="${esc(SCHOOL_SOCIAL_LABEL_SOURCE_VERSION)}"><div class="tongxue-common-name-kicker">来源站高校标签</div><ul class="tongxue-social-labels">${socialLabels.map(label => `<li class="tongxue-social-label">${esc(label)}</li>`).join('')}</ul><p class="tongxue-social-label-source">来自 ${esc(SCHOOL_SOCIAL_LABEL_SOURCE_META.sourceName)} 的公开学校标签接口，共 ${Number(SCHOOL_SOCIAL_LABEL_SOURCE_META.labelCount)} 个标签、${Number(SCHOOL_SOCIAL_LABEL_SOURCE_META.relationCount ?? SCHOOL_SOCIAL_LABEL_SOURCE_META.sourceRelationCount ?? 0)} 条学校关系。本区域只用于帮助理解学校之间的常见分组或称呼，不是官方分类，也不作为录取、排名或专业强弱依据。</p></section>`
    : '';
  return `<details id="${UI_ID}" class="tongxue-common-name" data-common-name-count="${names.length}" data-social-label-count="${socialLabels.length}"><summary class="tongxue-common-name-summary"><span class="tongxue-common-name-kicker">高校民间称谓</span><span>${summaryLead}</span></summary>${commonPanels}${socialPanel}</details>`;
}

function mountCommonNames(ui, state) {
  if (!ui?.result || !state || state.scope !== 'school') return;
  const host = ui.result.querySelector('.result-shell');
  if (!host) return;
  const names = findCommonNames(state);
  const socialLabels = findSocialLabels(state);
  const signature = `names:${names.map(item => item.id).join('|')}|labels:${socialLabels.join('|')}`;
  if (host.dataset.tongxueCommonNameSignature === signature) return;
  host.dataset.tongxueCommonNameSignature = signature;
  host.querySelectorAll(`#${UI_ID}`).forEach(node => node.remove());
  if (!names.length && !socialLabels.length) return;
  const anchor = host.querySelector('.meta');
  if (!anchor) return;
  anchor.insertAdjacentHTML('afterend', renderCommonNames(state));
  const node = host.querySelector(`#${UI_ID}`);
  if (node) node.dataset.handoffPayload = JSON.stringify(higherEducationCommonNameHandoffPayload(state.currentSchool || '', state.currentEntityId || ''));
}

export function createTongxueResultView(ui, state, searchView) {
  ensureStyles();
  const base = createBaseResultView(ui, state, searchView);
  const decorate = method => (...args) => {
    const result = method(...args);
    mountCommonNames(ui, state);
    return result;
  };
  return Object.freeze({
    ...base,
    renderResult: decorate(base.renderResult),
    renderActiveReviews: decorate(base.renderActiveReviews)
  });
}

// Keep compatibility markers for the existing static Tongxue human-journey contract.
// PAGE_VERSION = 'v1.5.9-uec01-evidence02';
// 这是一次独立查询 / 回到专业升学地图 / 回到刚才的分数结果