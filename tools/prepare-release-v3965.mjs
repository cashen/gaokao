import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v3.9.65.0';
const ASSET = 'v3965_0';
const generatedAt = '2026-07-26T03:30:00Z';

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === normalized) return false;
  fs.writeFileSync(target, normalized);
  return true;
};
const replace = (file, pairs) => {
  let source = read(file);
  for (const [from, to] of pairs) source = source.split(from).join(to);
  write(file, source);
};

function copyOrchestrator() {
  let source = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3964_0.js');
  source = source
    .replace("../feature/feishu/index.v3964_0.js?v=3964_0", "../feature/feishu/index.v3965_0.js?v=3965_0")
    .replace("selection-workspace-orchestration-v3964_0", "selection-workspace-orchestration-v3965_0")
    .replace("[selection-workspace-v3963]", "[selection-workspace-v3965]");
  write('ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js', source);
  replace('ln-rank/js/app-runtime.v3965_0.js', [
    ["./workspace/selection-workspace-orchestrator.v3964_0.js?v=3964_0", "./workspace/selection-workspace-orchestrator.v3965_0.js?v=3965_0"]
  ]);
  replace('shared/ui/ui-registry.v3965_0.js', [
    ["workspaceJs: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3964_0.js'", "workspaceJs: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js'"] ,
    ["version: 'selection-workspace-orchestration-v3964_0'", "version: 'selection-workspace-orchestration-v3965_0'"]
  ]);
}

function updateHtml() {
  replace('ln-rank/index.html', [
    ['data-release="v3.9.64.1"', 'data-release="v3.9.65.0"'],
    ['/ln-rank/js/app.v3964_1.js?v=3964_1', '/ln-rank/js/app.v3965_0.js?v=3965_0'],
    ['v3.9.64.1', 'v3.9.65.0']
  ]);
  replace('ln-rank/selection-pool.html', [
    ['data-release="v3.9.64.1"', 'data-release="v3.9.65.0"'],
    ['/ln-rank/js/selection-pool.v3964_1.js?v=3964_1', '/ln-rank/js/selection-pool.v3965_0.js?v=3965_0'],
    ['v3.9.64.1', 'v3.9.65.0']
  ]);

  let tongxue = read('tongxue/index.html');
  tongxue = tongxue
    .replace('tongxue-v158-cache-recovery-20260725', 'tongxue-v159-single-runtime-owner-20260726')
    .replace('<div class="topbar"><span class="brand">学校体验线索</span><a class="back-home" href="/ln-rank/">返回专业初选</a></div>', '<div class="topbar"><span class="brand">学校体验线索</span><div><button class="back-home direct-change-school" type="button" data-change-school hidden>换一所学校</button> <a class="back-home" href="/ln-rank/">返回专业初选</a></div></div>')
    .replace('同学你好 v1.5.8 · 更新于 2026-07-25', '同学你好 v1.5.9 · 更新于 2026-07-26')
    .replace('./app/tongxue-performance-v158.js?v=158', './app/tongxue-runtime-v159.js?v=159');
  write('tongxue/index.html', tongxue);

  let changelog = read('tongxue/changelog.html');
  if (!changelog.includes('<h2>v1.5.9</h2>')) {
    changelog = changelog.replace(
      '<main class="timeline" aria-label="版本更新时间轴">',
      '<main class="timeline" aria-label="版本更新时间轴">\n    <article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.9</h2></div><time class="date">2026-07-26</time></div><p class="release-note">地域、学校、直达参数、结果、文案和历史记录改由同一个运行时状态机持有；旧文案观察器和结果观察器退出活动入口，避免模块观察并持续改写自己的结果节点。</p></article>'
    ).replace('<span class="badge">当前版本</span><h2>v1.5.8</h2>', '<h2>v1.5.8</h2>');
  }
  changelog = changelog.replace('/shared/ui/shell/family-shell.v3964_1.js?v=3964_1', '/shared/ui/shell/family-shell.v3965_0.js?v=3965_0');
  write('tongxue/changelog.html', changelog);
}

function updateRegistries() {
  replace('shared/resources/resource-registry.js', [
    ["current-release.js?v=3964_1", "current-release.js?v=3965_0"],
    ["runtime-cache-contract.v3964_1.js", "runtime-cache-contract.v3965_0.js"],
    ["index.v3964_0.js", "index.v3965_0.js"],
    ["ui-registry.v3964_1.js", "ui-registry.v3965_0.js"],
    ["family-shell.v3964_1.js", "family-shell.v3965_0.js"],
    ["single-source-contract-client-and-year-caliber", "single-source-contract-client-year-caliber-and-operation-state"],
    ["single-ui-language-shell-state-and-responsive-contract", "single-ui-language-shell-state-responsive-and-tongxue-runtime-contract"]
  ]);

  let contract = read('functions/_lib/release-contract.js');
  const flags = [
    'feishuOperationSingleOwnerContract',
    'feishuCopyStateRecoveryContract',
    'feishuRepeatedActionLockContract',
    'tongxueSingleRuntimeOwnerContract',
    'tongxueNoSelfMutationObserverContract',
    'tongxueRegionSchoolDirectUnifiedStateContract',
    'tongxueHistoryRefreshContract',
    'tongxueDuplicateBindingGuardContract',
    'tongxueLongTaskRegressionContract'
  ];
  const insertion = flags.filter(flag => !contract.includes(`${flag}: true`)).map(flag => `  ${flag}: true,`).join('\n');
  if (insertion) contract = contract.replace('  activeDataYear: 2026,', `${insertion}\n  activeDataYear: 2026,`);
  write('functions/_lib/release-contract.js', contract);
}

function replaceEntries(items, replacements, additions = []) {
  const next = (Array.isArray(items) ? items : []).map(item => replacements.get(item) || item);
  for (const addition of additions) if (!next.includes(addition)) next.push(addition);
  return [...new Set(next)];
}

function updateManifest(file) {
  const data = JSON.parse(read(file));
  Object.assign(data, {
    version: VERSION,
    assetVersion: ASSET,
    releaseName: 'v3.9.65.0-runtime-ownership-no-fenxi',
    generatedAt,
    releaseGate: 'resource-ownership-v3965_0, feishu-operation-owner-v3965_0, tongxue-single-runtime-v159, cached-runtime-recovery-v3965_0, protected-fenxi-runtime-unchanged',
    sharedResourceCenterVersion: ASSET,
    resourceOwnershipVersion: 'resource-ownership-v3965_0',
    uiOrchestrationVersion: 'ui-orchestration-v3965_0',
    selectionWorkspaceVersion: 'selection-workspace-orchestration-v3965_0',
    runtimeCacheQueryVersion: ASSET,
    runtimeCacheContractVersion: 'runtime-cache-coherence-v3965_0',
    mainJs: 'js/app.v3965_0.js',
    mainRuntimeJs: 'js/app-runtime.v3965_0.js',
    selectionPoolJs: 'js/selection-pool.v3965_0.js',
    selectionPoolRuntimeJs: 'js/selection-pool-runtime.v3965_0.js',
    sharedUiRegistry: '../shared/ui/ui-registry.v3965_0.js',
    sharedUiShellJs: '../shared/ui/shell/family-shell.v3965_0.js',
    runtimeCacheResource: '../shared/resources/release/runtime-cache-contract.v3965_0.js',
    tongxueDirectHandoffVersion: 'v1.5.9',
    tongxueDirectResultVersion: 'v1.5.9',
    tongxueRuntimeVersion: 'tongxue-runtime-v159',
    feishuFrontendRuntimeVersion: 'feishu-browser-v3965_0',
    feishuOperationOwnerVersion: 'feishu-operation-owner-v3965_0'
  });
  for (const flag of [
    'feishuOperationSingleOwnerContract',
    'feishuCopyStateRecoveryContract',
    'feishuRepeatedActionLockContract',
    'tongxueSingleRuntimeOwnerContract',
    'tongxueNoSelfMutationObserverContract',
    'tongxueRegionSchoolDirectUnifiedStateContract',
    'tongxueHistoryRefreshContract',
    'tongxueDuplicateBindingGuardContract',
    'tongxueLongTaskRegressionContract'
  ]) data[flag] = true;

  const replacements = new Map([
    ['js/app.v3964_1.js', 'js/app.v3965_0.js'],
    ['js/app-runtime.v3964_1.js', 'js/app-runtime.v3965_0.js'],
    ['js/selection-pool.v3964_1.js', 'js/selection-pool.v3965_0.js'],
    ['js/selection-pool-runtime.v3964_1.js', 'js/selection-pool-runtime.v3965_0.js'],
    ['../shared/resources/release/runtime-cache-contract.v3964_1.js', '../shared/resources/release/runtime-cache-contract.v3965_0.js'],
    ['../shared/resources/release/release-presenter.v3964_1.js', '../shared/resources/release/release-presenter.v3965_0.js'],
    ['../shared/ui/shell/family-shell.v3964_1.js', '../shared/ui/shell/family-shell.v3965_0.js'],
    ['../shared/ui/ui-registry.v3964_1.js', '../shared/ui/ui-registry.v3965_0.js'],
    ['js/workspace/selection-workspace-orchestrator.v3964_0.js', 'js/workspace/selection-workspace-orchestrator.v3965_0.js'],
    ['../tongxue/app/tongxue-performance-v158.js', '../tongxue/app/tongxue-runtime-v159.js'],
    ['js/feature/feishu/index.v3964_0.js', 'js/feature/feishu/index.v3965_0.js'],
    ['js/feature/feishu/report-controller.v3964_0.js', 'js/feature/feishu/report-controller.v3965_0.js'],
    ['js/feature/feishu/report-render.v3964_0.js', 'js/feature/feishu/report-render.v3965_0.js']
  ]);
  data.jsEntry = replaceEntries(data.jsEntry, replacements, [
    'js/feature/feishu/report-state.v3965_0.js',
    '../tongxue/app/tongxue-runtime-controller-v159.js',
    '../tongxue/app/tongxue-runtime-search-view-v159.js',
    '../tongxue/app/tongxue-runtime-result-view-v159.js',
    '../tongxue/app/tongxue-runtime-utils-v159.js'
  ]);
  write(file, `${JSON.stringify(data, null, 2)}\n`);
}

function updateHeaders() {
  let headers = read('_headers');
  const marker = '# v3965 runtime ownership';
  if (!headers.includes(marker)) {
    headers += `\n\n${marker}\n`;
    for (const asset of [
      '/shared/ui/shell/family-shell.v3965_0.js',
      '/shared/ui/ui-registry.v3965_0.js',
      '/shared/resources/release/release-presenter.v3965_0.js',
      '/shared/resources/release/runtime-cache-contract.v3965_0.js',
      '/ln-rank/js/app.v3965_0.js',
      '/ln-rank/js/app-runtime.v3965_0.js',
      '/ln-rank/js/selection-pool.v3965_0.js',
      '/ln-rank/js/selection-pool-runtime.v3965_0.js',
      '/ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js',
      '/ln-rank/js/feature/feishu/index.v3965_0.js',
      '/ln-rank/js/feature/feishu/report-state.v3965_0.js',
      '/ln-rank/js/feature/feishu/report-render.v3965_0.js',
      '/ln-rank/js/feature/feishu/report-controller.v3965_0.js',
      '/tongxue/app/tongxue-runtime-v159.js',
      '/tongxue/app/tongxue-runtime-controller-v159.js',
      '/tongxue/app/tongxue-runtime-search-view-v159.js',
      '/tongxue/app/tongxue-runtime-result-view-v159.js',
      '/tongxue/app/tongxue-runtime-utils-v159.js'
    ]) headers += `${asset}\n  Cache-Control: public, max-age=31536000, immutable\n`;
  }
  write('_headers', headers);
}

copyOrchestrator();
updateHtml();
updateRegistries();
updateManifest('ln-rank/active-assets.json');
updateManifest('ln-rank/release-meta.json');
updateHeaders();
write('VERSION.txt', VERSION);
write('ln-rank/VERSION.txt', VERSION);
await import('./fix-home-version-ownership-v3965.mjs');
console.log(JSON.stringify({ ok: true, version: VERSION, asset: ASSET }, null, 2));
