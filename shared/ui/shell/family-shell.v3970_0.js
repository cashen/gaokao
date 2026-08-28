import { CURRENT_RELEASE } from '../../resources/release/current-release.js?v=3970_0';
import {
  buildFamilyStatus,
  readFamilyCandidateScore,
  readFamilySelectionItems
} from '../../../ln-rank/js/domain/family-decision-contract.v3970_0.js?v=3970_0';
import { UI_LANGUAGE } from '../contracts/copy-contract.v3970_0.js?v=3970_0';
import { UI_PAGE_REGISTRY, UI_ORCHESTRATION_VERSION, getUiPage } from '../ui-registry.v3970_0.js?v=3970_0';
import { mountFamilyPlanEntry, refreshFamilyPlanEntry } from '../components/family-plan-entry.v3970_0.js?v=3970_0';

const ROUTE_ORDER = Object.freeze(['home', 'selection', 'selected', 'difficulty']);
const STYLE_URLS = Object.freeze([
  '/shared/ui/tokens/foundation.v3959_0.css?v=3961_0',
  '/shared/ui/tokens/semantic.v3959_0.css?v=3962_2',
  '/shared/ui/shell/family-shell.v3970_0.css?v=3970_0',
  '/shared/ui/components/family-plan-entry.v3970_0.css?v=3970_0'
]);
const NEXT_COPY = Object.freeze({
  'confirm-score': '先确认孩子目前的参考分数',
  'build-family-plan': '圈出一批愿意继续讨论的专业',
  'review-family-plan': '检查家庭方案里需要确认的地方',
  'create-family-plan-report': '生成家庭方案报告'
});

let mounted = false;
let scheduled = false;

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function ensureUiStyles() {
  for (const href of STYLE_URLS) {
    const path = href.split('?')[0];
    if (document.querySelector(`link[href^="${path}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.uiResource = UI_ORCHESTRATION_VERSION;
    document.head.append(link);
  }
}

export function resolveUiPage(pathname = globalThis.location?.pathname || '/') {
  const path = String(pathname || '/').replace(/\/+/g, '/');
  const hash = String(globalThis.location?.hash || '');
  if (path === '/') return 'home';
  if (path.startsWith('/ln-rank/selection-pool')) return hash === '#family-review' ? 'review' : 'selected';
  if (path === '/ln-rank' || path.startsWith('/ln-rank/index') || path === '/ln-rank/') return 'selection';
  if (path.startsWith('/ln2026') || path.startsWith('/lngk2026')) return 'difficulty';
  if (path.startsWith('/ln-rank/local-mainline') || path.startsWith('/ln-rank/211-mainline')) return 'background';
  if (path.startsWith('/zy2026') || path === '/zy' || path === '/zy.html') return 'structure';
  if (path.startsWith('/tongxue')) return 'tongxue';
  return document.body?.dataset?.uiPage || 'home';
}

function routeLink(key, current) {
  const page = getUiPage(key);
  const active = current === 'review' ? 'selected' : current;
  const currentAttr = key === active ? ' aria-current="page"' : '';
  const label = key === 'difficulty' ? '补充核验' : page.label;
  return `<a href="${page.route}" data-ui-route="${key}"${currentAttr}>${label}</a>`;
}

function mainTarget() {
  return document.querySelector('#mainContent,main,.wrap') || document.body;
}

function ensureSkipLink() {
  if (document.querySelector('.ui-skip-link,.skip')) return;
  const target = mainTarget();
  if (!target.id) target.id = 'uiMainContent';
  const link = document.createElement('a');
  link.className = 'ui-skip-link';
  link.href = `#${target.id}`;
  link.textContent = '跳到主要内容';
  document.body.prepend(link);
}

function mountTarget(name) {
  return document.querySelector(`[data-ui-${name}-mount]`);
}

function ensureHeader(pageKey) {
  let header = document.querySelector('[data-ui-global-header]');
  if (header) return header;
  const page = getUiPage(pageKey);
  header = document.createElement('header');
  header.className = 'ui-global-header';
  header.dataset.uiGlobalHeader = UI_ORCHESTRATION_VERSION;
  header.innerHTML = `<div class="ui-global-header__inner">
    <a class="ui-global-brand" href="/" aria-label="返回辽宁高考家庭决策工作台首页">
      <span class="ui-global-brand__mark" aria-hidden="true">家</span>
      <span class="ui-global-brand__copy"><span>${UI_LANGUAGE.workspace}</span><small>孩子意愿 · 家庭条件 · 历史证据 · 待确认事项</small></span>
    </a>
    <span class="ui-global-context">当前：${page.label}${page.role === 'evidence' ? ' · 辅助核验' : ''}</span>
    <nav class="ui-global-nav" aria-label="全站主要导航">${ROUTE_ORDER.map(key => routeLink(key, pageKey)).join('')}</nav>
  </div>`;
  const target = mountTarget('global-header');
  if (target) target.replaceChildren(header);
  else document.body.prepend(header);
  return header;
}

function ensureStatus() {
  let root = document.querySelector('[data-ui-family-status]');
  if (root) return root;
  root = document.createElement('section');
  root.className = 'ui-family-status';
  root.dataset.uiFamilyStatus = UI_ORCHESTRATION_VERSION;
  root.setAttribute('aria-label', '当前家庭进度');
  root.innerHTML = `<div class="ui-family-status__main">
    <span class="ui-family-status__label">当前家庭进度</span>
    <a href="/ln-rank/" data-ui-score>${UI_LANGUAGE.referenceScore} <b>未填写</b></a>
    <span data-ui-family-plan-header-mount hidden></span>
    <a href="/ln-rank/selection-pool.html#family-review" data-ui-pending>${UI_LANGUAGE.pendingReview} <b>0</b></a>
    <a href="/ln-rank/" class="ui-family-status__next" data-ui-next>${UI_LANGUAGE.nextStep}：先确认孩子目前的参考分数</a>
  </div>
  <div class="ui-family-status__boundary"><strong>使用边界：</strong>${UI_LANGUAGE.historicalBoundary} ${UI_LANGUAGE.officialUnknown2027}</div>`;
  const target = mountTarget('family-status');
  if (target) target.replaceChildren(root);
  else document.querySelector('[data-ui-global-header]')?.insertAdjacentElement('afterend', root);
  return root;
}

function updateStatus() {
  scheduled = false;
  const root = ensureStatus();
  const status = buildFamilyStatus({
    score: readFamilyCandidateScore(),
    items: readFamilySelectionItems()
  });
  const scoreNode = root.querySelector('[data-ui-score] b');
  const pendingNode = root.querySelector('[data-ui-pending] b');
  const nextNode = root.querySelector('[data-ui-next]');
  if (scoreNode) scoreNode.textContent = status.score ? `${number(status.score)}分` : '未填写';
  if (pendingNode) pendingNode.textContent = number(status.pendingCount);
  if (nextNode) {
    nextNode.href = status.nextActionHref;
    nextNode.textContent = `${UI_LANGUAGE.nextStep}：${NEXT_COPY[status.nextActionKey] || '继续完成家庭方案'}`;
  }
  root.dataset.nextAction = status.nextActionKey;
  refreshFamilyPlanEntry();
}

function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(updateStatus);
}

function bind() {
  window.addEventListener('storage', scheduleUpdate);
  window.addEventListener('gaokao:selection-change', scheduleUpdate);
  document.addEventListener('gaokao:workspace-state', scheduleUpdate);
  document.addEventListener('lnrank-query-completed', scheduleUpdate);
  document.addEventListener('gaokao:runtime-state', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
}

export function mountFamilyShell() {
  if (mounted || typeof document === 'undefined') return;
  mounted = true;
  ensureUiStyles();
  const pageKey = resolveUiPage();
  const page = getUiPage(pageKey);
  document.body.dataset.uiPage = pageKey === 'review' ? 'selected' : pageKey;
  document.body.dataset.uiStatePage = pageKey;
  document.body.dataset.uiDensity = document.body.dataset.uiDensity || page.density;
  document.body.dataset.uiBrand = document.body.dataset.uiBrand || page.brand || 'family';
  document.body.dataset.uiRelease = CURRENT_RELEASE.display;
  document.body.classList.add('ui-orchestrated');
  ensureSkipLink();
  ensureHeader(pageKey);
  ensureStatus();
  mountFamilyPlanEntry();
  bind();
  updateStatus();
  globalThis.__GAOKAO_UI__ = Object.freeze({
    version: UI_ORCHESTRATION_VERSION,
    release: CURRENT_RELEASE.display,
    page: pageKey,
    registry: UI_PAGE_REGISTRY
  });
}

if (typeof document !== 'undefined') {
  ensureUiStyles();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFamilyShell, { once: true });
  else mountFamilyShell();
}
