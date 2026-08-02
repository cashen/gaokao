import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3972_5';
import {
  SHARED_RESOURCE_GRAPH_VERSION,
  DATA_RESOURCE_GRAPH_VERSION,
  RESOURCE_DECOMMISSION_POLICY_VERSION,
  SHARED_RESOURCE_REGISTRY
} from '../../shared/resources/resource-registry.js?v=3972_5';
import {
  UI_RESOURCE_REGISTRY_VERSION,
  UI_CSS_RESOURCE_GRAPH_VERSION,
  UI_ACTIVE_RESOURCE_REGISTRY,
  UI_STABLE_RESOURCE_REGISTRY,
  UI_COMPONENT_REGISTRY,
  UI_CSS_RESOURCE_GRAPH
} from '../../shared/ui/ui-resource-registry.v3972_5.js?v=3972_5';
import { ALGORITHM_CONTRACT, ALGORITHM_RESOURCE_REGISTRY } from '../../shared/algorithms/algorithm-registry.js?v=3969_0';

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function card(title, status, detail) {
  const className = status === 'pass' ? 'pass' : status === 'warn' ? 'warn' : 'fail';
  return `<article class="check-card"><div><strong>${escapeHtml(title)}</strong><span class="status ${className}">${status === 'pass' ? '通过' : status === 'warn' ? '提醒' : '失败'}</span></div><p>${escapeHtml(detail)}</p></article>`;
}

function localPath(value) {
  return String(value || '').split('?')[0].split('#')[0];
}

async function probe(path) {
  const response = await fetch(`${localPath(path)}?selfCheck=${Date.now()}-${Math.random()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response;
}

function renderStaticState() {
  byId('versionBox').textContent = JSON.stringify({
    release: CURRENT_RELEASE.display,
    generation: CURRENT_RELEASE.siteRuntimeGeneration,
    query: CURRENT_RELEASE.asset,
    resourceGraph: SHARED_RESOURCE_GRAPH_VERSION,
    uiRegistry: UI_RESOURCE_REGISTRY_VERSION,
    cssGraph: UI_CSS_RESOURCE_GRAPH_VERSION,
    dataGraph: DATA_RESOURCE_GRAPH_VERSION,
    decommissionPolicy: RESOURCE_DECOMMISSION_POLICY_VERSION,
    algorithm: ALGORITHM_CONTRACT.version,
    stableBusinessResources: {
      tongxue: CURRENT_RELEASE.tongxueRuntimeVersion,
      localStrength: CURRENT_RELEASE.localStrengthDataVersion,
      all211: CURRENT_RELEASE.all211DataVersion,
      majorBands: CURRENT_RELEASE.majorBandsVersion
    }
  }, null, 2);

  const dataChecks = [
    ['发布中心', CURRENT_RELEASE.resourceOwners.release],
    ['统一资源注册表', CURRENT_RELEASE.resourceOwners.resourceRegistry],
    ['统一 UI 注册表', CURRENT_RELEASE.resourceOwners.uiResourceRegistry],
    ['学校目录', CURRENT_RELEASE.resourceOwners.schoolAdmissionDirectory],
    ['专业目录', CURRENT_RELEASE.resourceOwners.majors],
    ['LocalStrength 静态数据', CURRENT_RELEASE.resourceOwners.localStrengthData],
    ['211 静态数据', CURRENT_RELEASE.resourceOwners.all211Data],
    ['major-bands 静态提供者', CURRENT_RELEASE.resourceOwners.majorBandsStaticProvider],
    ['报告合同', CURRENT_RELEASE.resourceOwners.reports]
  ];
  byId('cases').innerHTML = dataChecks.map(([title, detail]) => card(title, 'pass', detail)).join('');

  const reportChecks = [
    ['报告资源所有者', SHARED_RESOURCE_REGISTRY.reports.module],
    ['报告前端所有者', SHARED_RESOURCE_REGISTRY.reports.frontend],
    ['历史证据所有者', SHARED_RESOURCE_REGISTRY.reports.historyEvidenceOwner]
  ];
  byId('reports').innerHTML = reportChecks.map(([title, detail]) => card(title, 'pass', detail)).join('');

  const uiChecks = [
    ['当前 UI 注册表', UI_RESOURCE_REGISTRY_VERSION],
    ['当前 CSS 资源图', `${UI_CSS_RESOURCE_GRAPH.length} 个明确资源`],
    ['活动 UI 资源', `${Object.keys(UI_ACTIVE_RESOURCE_REGISTRY).length} 个当前代际资源`],
    ['稳定 UI 资源', `${Object.keys(UI_STABLE_RESOURCE_REGISTRY).length} 个明确保留依赖`],
    ['组件所有者', `${Object.keys(UI_COMPONENT_REGISTRY).length} 个组件均声明 DOM/CSS 所有者`]
  ];
  byId('uiChecks').innerHTML = uiChecks.map(([title, detail]) => card(title, 'pass', detail)).join('');
}

async function runSelfCheck() {
  const button = byId('runSelfCheck');
  const badge = byId('overallBadge');
  const errors = [];
  button.disabled = true;
  badge.className = 'status warn';
  badge.textContent = '正在检查';

  try {
    const identities = [
      [CURRENT_RELEASE.display, 'v3.9.72.5', '公开版本'],
      [CURRENT_RELEASE.siteRuntimeGeneration, 'v3972_5', '运行时代际'],
      [CURRENT_RELEASE.asset, '3972_5', '查询版本'],
      [CURRENT_RELEASE.sharedResourceGraphVersion, SHARED_RESOURCE_GRAPH_VERSION, '资源图版本'],
      [CURRENT_RELEASE.uiResourceRegistryVersion, UI_RESOURCE_REGISTRY_VERSION, 'UI 注册版本'],
      [CURRENT_RELEASE.cssResourceGraphVersion, UI_CSS_RESOURCE_GRAPH_VERSION, 'CSS 图版本'],
      [CURRENT_RELEASE.dataResourceGraphVersion, DATA_RESOURCE_GRAPH_VERSION, '数据图版本']
    ];
    for (const [actual, expected, label] of identities) {
      if (actual !== expected) errors.push(`${label}不一致：${actual} / ${expected}`);
    }

    const uniqueCss = new Set(UI_CSS_RESOURCE_GRAPH.map(item => item.path));
    if (uniqueCss.size !== UI_CSS_RESOURCE_GRAPH.length) errors.push('CSS 资源图存在重复路径');
    for (const item of UI_CSS_RESOURCE_GRAPH) {
      if (!item.classification || !item.owner || !item.role) errors.push(`CSS 资源缺少治理字段：${item.path}`);
    }
    for (const component of Object.values(UI_COMPONENT_REGISTRY)) {
      if (!component.domOwner || !component.cssOwner) errors.push(`组件缺少明确所有者：${component.id}`);
      if (!uniqueCss.has(component.cssOwner)) errors.push(`组件 CSS 未归集：${component.id} -> ${component.cssOwner}`);
    }
    for (const [name, algorithmPath] of Object.entries(ALGORITHM_RESOURCE_REGISTRY)) {
      if (!algorithmPath) errors.push(`算法所有者缺失：${name}`);
    }

    const probes = [
      CURRENT_RELEASE.resourceOwners.release,
      CURRENT_RELEASE.resourceOwners.resourceRegistry,
      CURRENT_RELEASE.resourceOwners.uiResourceRegistry,
      CURRENT_RELEASE.resourceOwners.siteActiveManifest,
      CURRENT_RELEASE.resourceOwners.schoolAdmissionDirectory,
      CURRENT_RELEASE.resourceOwners.localStrengthData,
      CURRENT_RELEASE.resourceOwners.all211Data
    ];
    await Promise.all(probes.map(probe));

    const retired = await fetch(`/ln-rank/active-assets.json?selfCheck=${Date.now()}`, { cache: 'no-store' });
    if (retired.status !== 404) errors.push(`旧 active-assets.json 未移除，HTTP ${retired.status}`);
  } catch (error) {
    errors.push(error?.stack || error?.message || String(error));
  } finally {
    button.disabled = false;
  }

  if (errors.length) {
    badge.className = 'status fail';
    badge.textContent = `失败 ${errors.length}`;
    byId('errors').textContent = errors.join('\n\n');
  } else {
    badge.className = 'status pass';
    badge.textContent = '全部通过';
    byId('errors').textContent = '当前发布身份、统一资源图、UI/CSS 图、数据所有者、算法所有者及旧活动清单移除均通过。';
  }
}

renderStaticState();
byId('runSelfCheck')?.addEventListener('click', runSelfCheck);
byId('versionBox')?.closest('.self-card')?.setAttribute('data-resource-graph', SHARED_RESOURCE_GRAPH_VERSION);
document.body.dataset.release = CURRENT_RELEASE.display;
document.body.dataset.siteRuntimeGeneration = CURRENT_RELEASE.siteRuntimeGeneration;
document.body.dataset.resourceGraph = SHARED_RESOURCE_GRAPH_VERSION;
