import { CURRENT_RELEASE } from '../../resources/release/current-release.js?v=3963_1';
import {
  readFamilyCandidateScore,
  readFamilySelectionItems,
  countFamilyPendingItems,
  resolveFamilyNextAction
} from '../../../ln-rank/js/domain/family-decision-contract.v3955_0.js?v=3961_0';
import { UI_LANGUAGE } from '../contracts/copy-contract.v3959_0.js?v=3961_0';
import { UI_PAGE_REGISTRY, UI_ORCHESTRATION_VERSION, getUiPage } from '../ui-registry.v3963_1.js?v=3963_1';

const ROUTE_ORDER = Object.freeze(['home', 'selection', 'selected', 'review', 'difficulty', 'structure', 'tongxue']);
const STYLE_URLS = Object.freeze([
  '/shared/ui/tokens/foundation.v3959_0.css?v=3961_0',
  '/shared/ui/tokens/semantic.v3959_0.css?v=3961_0',
  '/shared/ui/shell/family-shell.v3960_0.css?v=3961_0'
]);

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
  if (path.startsWith('/zy2026') || path === '/zy' || path === '/zy.html') return 'structure';
  if (path.startsWith('/tongxue')) return 'tongxue';
  return document.body?.dataset?.uiPage || 'home';
}

export function buildFamilyStatus({ score = null, items = [] } = {}) {
  const selectedCount = Array.isArray(items) ? items.length : 0;
  const pendingCount = countFamilyPendingItems(items);
  const next = resolveFamilyNextAction({ score, items });
  return Object.freeze({ score, selectedCount, pendingCount, next });
}

function routeLink(key, current) {
  const page = getUiPage(key);
  const currentAttr = key === current ? ' aria-current="page"' : '';
  return `<a href="${page.route}" data-ui-route="${key}"${currentAttr}>${page.label}</a>`;
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

function ensureHeader(pageKey) {
  let header = document.querySelector('[data-ui-global-header]');
  if (header) return header;
  const page = getUiPage(pageKey);
  header = document.createElement('header');
  header.className = 'ui-global-header';
  header.dataset.uiGlobalHeader = UI_ORCHESTRATION_VERSION;
  header.innerHTML = `
    <div class="ui-global-header__inner">
      <a class="ui-global-brand" href="/" aria-label="返回辽宁高考家庭决策工作台首页">
        <span class="ui-global-brand__mark" aria-hidden="true">家</span>
        <span class="ui-global-brand__copy"><span>${UI_LANGUAGE.workspace}</span><small>孩子意愿 · 家庭条件 · 历史证据 · 待确认事项</small></span>
      </a>
      <span class="ui-global-context">当前：${page.label}${page.role === 'evidence' ? ' · 辅助核验页面' : ''}</span>
      <nav class="ui-global-nav" aria-label="全站主要导航">${ROUTE_ORDER.map(key => routeLink(key, pageKey)).join('')}</nav>
    </div>`;
  const skip = document.querySelector('.ui-skip-link,.skip');
  if (skip) skip.insertAdjacentElement('afterend', header);
  else document.body.prepend(header);
  return header;
}

function ensureStatus() {
  let root = document.querySelector('[data-ui-family-status]');
  if (root) return root;
  root = document.createElement('section');
  root.className = 'ui-family-status';
  root.dataset.uiFamilyStatus = UI_ORCHESTRATION_VERSION;
  root.setAttribute('aria-label', '当前家庭方案');
  root.innerHTML = `
    <div class="ui-family-status__main">
      <span class="ui-family-status__label">当前家庭方案</span>
      <a href="/ln-rank/" data-ui-score>${UI_LANGUAGE.referenceScore} <b>未填写</b></a>
      <a href="/ln-rank/selection-pool.html#selected-list" data-ui-selected>${UI_LANGUAGE.selectedMajors} <b>0</b></a>
      <a href="/ln-rank/selection-pool.html#family-review" data-ui-pending>${UI_LANGUAGE.pendingReview} <b>0</b></a>
      <a href="/ln-rank/" class="ui-family-status__next" data-ui-next>${UI_LANGUAGE.nextStep}：先确认孩子目前的参考分数</a>
    </div>
    <div class="ui-family-status__boundary"><strong>使用边界：</strong>${UI_LANGUAGE.historicalBoundary} ${UI_LANGUAGE.officialUnknown2027}</div>`;
  const header = document.querySelector('[data-ui-global-header]');
  header?.insertAdjacentElement('afterend', root);
  return root;
}

function ensureMobileNav(pageKey) {
  let nav = document.querySelector('[data-ui-mobile-nav]');
  if (nav) return nav;
  nav = document.createElement('nav');
  nav.className = 'ui-mobile-nav';
  nav.dataset.uiMobileNav = UI_ORCHESTRATION_VERSION;
  nav.setAttribute('aria-label', '家庭方案主导航');
  nav.innerHTML = `
    <a href="/ln-rank/" data-ui-mobile-primary><span>筛专业</span></a>
    <a href="/ln-rank/selection-pool.html#selected-list" data-ui-mobile-route="selected"><span>已选</span><b data-ui-mobile-selected>0</b></a>
    <a href="/ln-rank/selection-pool.html#family-review" data-ui-mobile-route="review"><span>复核</span><b data-ui-mobile-pending>0</b></a>`;
  document.body.append(nav);
  syncMobileRoute(pageKey);
  return nav;
}

function syncMobileRoute(pageKey = resolveUiPage()) {
  const current = pageKey === 'review' ? 'review' : pageKey === 'selected' ? 'selected' : pageKey === 'selection' ? 'selection' : '';
  document.querySelectorAll('[data-ui-mobile-nav] a').forEach(node => node.removeAttribute('aria-current'));
  if (current === 'selection') document.querySelector('[data-ui-mobile-primary]')?.setAttribute('aria-current', 'page');
  if (current === 'selected') document.querySelector('[data-ui-mobile-route="selected"]')?.setAttribute('aria-current', 'page');
  if (current === 'review') document.querySelector('[data-ui-mobile-route="review"]')?.setAttribute('aria-current', 'page');
}

function syncMobilePrimary() {
  const link = document.querySelector('[data-ui-mobile-primary]');
  if (!link) return;
  const pageKey = resolveUiPage();
  const dirty = pageKey === 'selection' && document.body.classList.contains('is-filter-dirty');
  const loading = document.body.classList.contains('is-workspace-updating');
  document.body.classList.toggle('ui-mobile-update-required', dirty);
  link.dataset.uiAction = dirty ? 'update-results' : 'navigate-selection';
  link.href = dirty ? '#queryButton' : '/ln-rank/';
  const label = link.querySelector('span');
  if (label) label.textContent = loading ? '正在更新' : dirty ? '更新结果' : '筛专业';
}

function updateStatus() {
  scheduled = false;
  const root = ensureStatus();
  const score = readFamilyCandidateScore();
  const items = readFamilySelectionItems();
  const status = buildFamilyStatus({ score, items });
  const scoreNode = root.querySelector('[data-ui-score] b');
  const selectedNode = root.querySelector('[data-ui-selected] b');
  const pendingNode = root.querySelector('[data-ui-pending] b');
  const nextNode = root.querySelector('[data-ui-next]');
  if (scoreNode) scoreNode.textContent = status.score ? `${number(status.score)}分` : '未填写';
  if (selectedNode) selectedNode.textContent = number(status.selectedCount);
  if (pendingNode) pendingNode.textContent = number(status.pendingCount);
  if (nextNode) {
    nextNode.href = status.next.href;
    nextNode.textContent = `${UI_LANGUAGE.nextStep}：${status.next.label}`;
  }
  document.querySelectorAll('[data-ui-mobile-selected]').forEach(node => { node.textContent = number(status.selectedCount); });
  document.querySelectorAll('[data-ui-mobile-pending]').forEach(node => { node.textContent = number(status.pendingCount); });
  root.dataset.nextAction = status.next.key;
  syncMobilePrimary();
  syncMobileRoute();
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
  window.addEventListener('hashchange', scheduleUpdate);
  document.addEventListener('click', event => {
    const mobilePrimary = event.target?.closest?.('[data-ui-mobile-primary]');
    if (mobilePrimary && document.body.classList.contains('ui-mobile-update-required')) {
      const query = document.getElementById('queryButton');
      if (query && !query.disabled) {
        event.preventDefault();
        query.click();
      }
    }
  });
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
  ensureMobileNav(pageKey);
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
