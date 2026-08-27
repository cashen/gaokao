import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3990_2&r=r035-major-history-1102-bounded-api';
import {
  SHARED_RESOURCE_GRAPH_VERSION,
  DATA_RESOURCE_GRAPH_VERSION,
  RESOURCE_DECOMMISSION_POLICY_VERSION,
  SHARED_RESOURCE_REGISTRY
} from '../../shared/resources/resource-registry.js?v=3990_2';
import {
  UI_RESOURCE_REGISTRY_VERSION,
  UI_CSS_RESOURCE_GRAPH_VERSION,
  UI_ACTIVE_RESOURCE_REGISTRY,
  UI_ACTIVE_RESOURCE_CLASSIFICATIONS,
  UI_STABLE_RESOURCE_REGISTRY,
  UI_COMPONENT_REGISTRY,
  UI_CSS_RESOURCE_GRAPH
} from '../../shared/ui/ui-resource-registry.v3990_2.js?v=3990_2';
import { ALGORITHM_CONTRACT, ALGORITHM_RESOURCE_REGISTRY } from '../../shared/algorithms/algorithm-registry.js?v=3969_0';
import {
  MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
  createMajorBandsPaginationSnapshotGuard
} from './feature/major-pool/pagination-snapshot-guard.v3990_2.js?v=3990_2';

const PAGINATION_SNAPSHOT_GUARD_PATH = '/ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_2.js';
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

function verifyPaginationSnapshotGuard() {
  const guard = createMajorBandsPaginationSnapshotGuard({ maxEntries: 12 });
  const initial = guard.rewrite(new URL('/api/major-bands?candidateScore=579&rangePreset=standard&region=all&limit=40', location.origin));
  if (initial.url.searchParams.has('snapshot')) throw new Error('首屏请求携带了陈旧 snapshot');
  const first = guard.inspect(initial.url, {
    ok: true,
    bands: {
      upper: { pagination: { snapshot: 'self-upper-a' } },
      near: { pagination: { snapshot: 'self-near-a' } },
      steady: { pagination: { snapshot: 'self-steady-a' } }
    }
  });
  if (!first.ok || guard.getState().size !== 3) throw new Error('首屏三组 snapshot 未被记录');
  const next = guard.rewrite(new URL('/api/major-bands?candidateScore=579&rangePreset=standard&region=all&band=near&offset=40&limit=40', location.origin));
  if (next.url.searchParams.get('snapshot') !== 'self-near-a') throw new Error('下一页未携带预期 snapshot');
  const mismatch = guard.inspect(next.url, {
    ok: true,
    bands: { near: { pagination: { snapshot: 'self-near-b' } } }
  });
  if (mismatch.ok || mismatch.code !== 'pagination_snapshot_mismatch') throw new Error('不同 snapshot 未被拒绝');
  for (let index = 0; index < 20; index += 1) {
    guard.inspect(new URL(`/api/major-bands?candidateScore=${400 + index}&rangePreset=standard`, location.origin), {
      ok: true,
      bands: {
        upper: { pagination: { snapshot: `self-u-${index}` } },
        near: { pagination: { snapshot: `self-n-${index}` } },
        steady: { pagination: { snapshot: `self-s-${index}` } }
      }
    });
  }
  const state = guard.getState();
  if (!state.bounded || state.size > 12) throw new Error(`snapshot 保留超预算：${state.size}`);
  return state;
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
    interaction: CURRENT_RELEASE.interactionVersion,
    nativeChooserActivation: CURRENT_RELEASE.nativeChooserActivationVersion,
    majorBandsPaginationSnapshotGuard: MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
    algorithm: ALGORITHM_CONTRACT.version,
    stableBusinessResources: {
      tongxue: CURRENT_RELEASE.tongxueRuntimeVersion,
      localStrength: CURRENT_RELEASE.localStrengthDataVersion,
      all211: CURRENT_RELEASE.all211DataVersion,
      majorBands: CURRENT_RELEASE.majorBandsVersion,
      majorBandsQueryKernel: CURRENT_RELEASE.majorBandsQueryKernelVersion,
      majorBandsPagination: CURRENT_RELEASE.majorBandsPaginationVersion,
      majorBandsStableWorker: CURRENT_RELEASE.majorBandsStableWorkerVersion
    }
  }, null, 2);

  const dataChecks = [
    ['发布中心', CURRENT_RELEASE.resourceOwners.release],
    ['统一资源注册表', CURRENT_RELEASE.resourceOwners.resourceRegistry],
    ['统一 UI 注册表', CURRENT_RELEASE.resourceOwners.uiResourceRegistry],
    ['地区数据所有者', SHARED_RESOURCE_REGISTRY.regions.module],
    ['地区交互所有者', SHARED_RESOURCE_REGISTRY.regions.interactionOwner],
    ['学校目录', CURRENT_RELEASE.resourceOwners.schoolAdmissionDirectory],
    ['专业目录', CURRENT_RELEASE.resourceOwners.majors],
    ['LocalStrength 静态数据', CURRENT_RELEASE.resourceOwners.localStrengthData],
    ['211 静态数据', CURRENT_RELEASE.resourceOwners.all211Data],
    ['major-bands 静态提供者', CURRENT_RELEASE.resourceOwners.majorBandsStaticProvider],
    ['major-bands 位次索引', CURRENT_RELEASE.resourceOwners.majorBandsRankIndex],
    ['major-bands 查询内核', CURRENT_RELEASE.resourceOwners.majorBandsOrchestrator],
    ['major-bands 分页顺序', CURRENT_RELEASE.resourceOwners.majorBandsResultOrder],
    ['major-bands 浏览器快照守卫', PAGINATION_SNAPSHOT_GUARD_PATH]
  ];
  byId('cases').innerHTML = dataChecks.map(([title, detail]) => card(title, 'pass', detail)).join('');

  const reportChecks = [
    ['报告资源所有者', SHARED_RESOURCE_REGISTRY.reports.module],
    ['报告前端所有者', SHARED_RESOURCE_REGISTRY.reports.frontend],
    ['历史证据所有者', SHARED_RESOURCE_REGISTRY.reports.historyEvidenceOwner]
  ];
  byId('reports').innerHTML = reportChecks.map(([title, detail]) => card(title, 'pass', detail)).join('');

  const interaction = UI_COMPONENT_REGISTRY.interactionTransaction;
  const uiChecks = [
    ['当前 UI 注册表', UI_RESOURCE_REGISTRY_VERSION],
    ['当前 CSS 资源图', `${UI_CSS_RESOURCE_GRAPH.length} 个明确资源`],
    ['当前代际 UI 资源', `${Object.values(UI_ACTIVE_RESOURCE_CLASSIFICATIONS).filter(value => value === 'current-generation').length} 个`],
    ['稳定活动依赖', `${Object.values(UI_ACTIVE_RESOURCE_CLASSIFICATIONS).filter(value => value === 'declared-stable-dependency').length} 个`],
    ['组件所有者', `${Object.keys(UI_COMPONENT_REGISTRY).length} 个组件均声明 DOM/CSS 所有者`],
    ['原生地区选择器所有者', interaction.nativeChooserActivationOwner],
    ['选择器打开前策略', interaction.policies.preActivationDomMutationForbidden ? '纯内存记录，禁止同步 DOM 变更' : '未登记'],
    ['物理事件族策略', interaction.policies.singlePhysicalEventFamily ? '单事件族所有权' : '未登记'],
    ['尾触摸策略', interaction.policies.tailGuardAfterOutcomeOnly ? '仅在选择结果或焦点返回后启动' : '未登记'],
    ['分页快照守卫', `${MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION}，最多 12 项`]
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
      [CURRENT_RELEASE.display, 'v3.9.90.2', '公开版本'],
      [CURRENT_RELEASE.siteRuntimeGeneration, 'v3990_2', '运行时代际'],
      [CURRENT_RELEASE.asset, '3990_2', '查询版本'],
      [CURRENT_RELEASE.sharedResourceGraphVersion, SHARED_RESOURCE_GRAPH_VERSION, '资源图版本'],
      [CURRENT_RELEASE.uiResourceRegistryVersion, UI_RESOURCE_REGISTRY_VERSION, 'UI 注册版本'],
      [CURRENT_RELEASE.cssResourceGraphVersion, UI_CSS_RESOURCE_GRAPH_VERSION, 'CSS 图版本'],
      [CURRENT_RELEASE.dataResourceGraphVersion, DATA_RESOURCE_GRAPH_VERSION, '数据图版本'],
      [CURRENT_RELEASE.interactionVersion, 'interaction-transaction-v3990_2', '交互版本'],
      [CURRENT_RELEASE.nativeChooserActivationVersion, 'native-chooser-activation-integrity-v3990_2', '原生选择器激活版本'],
      [MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION, 'major-bands-pagination-snapshot-guard-v3990_2', '分页快照守卫版本']
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
    const interaction = UI_COMPONENT_REGISTRY.interactionTransaction;
    if (!interaction?.policies?.preActivationDomMutationForbidden) errors.push('原生选择器打开前零 DOM 变更合同缺失');
    if (!interaction?.policies?.singlePhysicalEventFamily) errors.push('原生选择器单物理事件族合同缺失');
    if (!interaction?.policies?.tailGuardAfterOutcomeOnly) errors.push('原生选择器尾触摸时序合同缺失');
    if (!interaction?.policies?.userAgentBranchForbidden) errors.push('禁止浏览器名称业务分支合同缺失');
    for (const [name, algorithmPath] of Object.entries(ALGORITHM_RESOURCE_REGISTRY)) {
      if (!algorithmPath) errors.push(`算法所有者缺失：${name}`);
    }

    verifyPaginationSnapshotGuard();

    const probes = [
      CURRENT_RELEASE.resourceOwners.release,
      CURRENT_RELEASE.resourceOwners.resourceRegistry,
      CURRENT_RELEASE.resourceOwners.uiResourceRegistry,
      CURRENT_RELEASE.resourceOwners.siteRuntimeContract,
      CURRENT_RELEASE.resourceOwners.siteActiveManifest,
      CURRENT_RELEASE.resourceOwners.interactionRuntime,
      CURRENT_RELEASE.resourceOwners.interactionStyles,
      CURRENT_RELEASE.resourceOwners.schoolAdmissionDirectory,
      CURRENT_RELEASE.resourceOwners.localStrengthData,
      CURRENT_RELEASE.resourceOwners.all211Data,
      PAGINATION_SNAPSHOT_GUARD_PATH
    ];
    await Promise.all(probes.map(probe));

    for (const retiredPath of ['/ln-rank/active-assets.json', '/ln-rank/release-meta.json']) {
      const retired = await fetch(`${retiredPath}?selfCheck=${Date.now()}`, { cache: 'no-store' });
      if (retired.status !== 404) errors.push(`旧资源未移除：${retiredPath} HTTP ${retired.status}`);
    }
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
    byId('errors').textContent = '当前发布、统一资源图、UI/CSS、数据、算法、原生地区选择器激活和专业分页快照连续性合同均通过。';
  }
}

renderStaticState();
byId('runSelfCheck')?.addEventListener('click', runSelfCheck);
byId('versionBox')?.closest('.self-card')?.setAttribute('data-resource-graph', SHARED_RESOURCE_GRAPH_VERSION);
document.body.dataset.release = CURRENT_RELEASE.display;
document.body.dataset.siteRuntimeGeneration = CURRENT_RELEASE.siteRuntimeGeneration;
document.body.dataset.resourceGraph = SHARED_RESOURCE_GRAPH_VERSION;
