import { readFile, readdir } from 'node:fs/promises';

const failures = [];
const requireText = (content, value, label) => {
  if (!content.includes(value)) failures.push(label);
};
const forbidText = (content, value, label) => {
  if (content.includes(value)) failures.push(label);
};

const [
  page,
  changelog,
  legacy,
  home,
  share,
  resolver,
  entry,
  controller,
  searchView,
  resultView,
  rootFiles
] = await Promise.all([
  readFile('tongxue/index.html', 'utf8'),
  readFile('tongxue/changelog.html', 'utf8'),
  readFile('tongxue.html', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('tongxue/share/tongxue-share-v130.js', 'utf8'),
  readFile('tongxue/data/school-name-resolver-v150.js', 'utf8'),
  readFile('tongxue/app/tongxue-runtime-v159-r3968.js', 'utf8'),
  readFile('tongxue/app/tongxue-runtime-controller-v159.js', 'utf8'),
  readFile('tongxue/app/tongxue-runtime-search-view-v159.js', 'utf8'),
  readFile('tongxue/app/tongxue-runtime-result-view-v159.js', 'utf8'),
  readdir('.')
]);

requireText(page, '<title>同学你好 - 学生谈学校，也谈跨校专业</title>', '页面标题');
requireText(page, './app/tongxue-runtime-v159-r3968.js?v=3968_0', '页面入口');
forbidText(page, './app/tongxue-runtime-v159.js?v=159', '页面仍加载旧入口');
requireText(page, '同学你好 · 能力版本 v1.5.9 · 全站发布 v3.9.90.3 · UI 修订 r051 · 查看同学你好更新记录', '页面版本');
requireText(page, 'tongxue-v159-single-runtime-owner-20260726', '页面构建标识');
requireText(page, 'tongxue-logo-primary-v1.webp', '品牌 Logo');
requireText(page, '<h1 class="sr-only">同学你好</h1>', '隐藏主标题');
requireText(page, '/tongxue/data/school-name-resolver-v150.js?v=150', 'resolver 导入映射');
requireText(page, '/tongxue/data/school-entities-v150.js?v=150', '实体导入映射');
requireText(page, 'href="./changelog.html"', '更新记录链接');
requireText(page, 'placeholder="输入学校、简称或地区"', '精简输入提示');
requireText(page, '>查看学校留言</button>', '查询按钮文案');
requireText(page, 'data-example="哈尔滨工业大学"', '真实学校快捷示例');
requireText(page, 'data-example="深圳"', '深圳快捷示例');
requireText(page, 'https://gaokao.powers.org.cn/tongxue/', 'canonical');
requireText(page, 'data-ui-global-header-mount', '静态全站导航挂载点');
requireText(page, 'data-change-school', '直达页换学校入口');
forbidText(page, 'data-example="hgw"', '活动页面仍使用内部缩写快捷示例');
for (const legacyModule of [
  'tongxue-performance-v158.js',
  'tongxue-copy-v152.js',
  'tongxue-region-ui-v152.js',
  'tongxue-school-entity-ui-v152.js',
  'tongxue-direct-handoff-v155.js',
  'tongxue-direct-result-v156.js',
  'tongxue-school-portrait-v121.js',
  'tongxue-share-stabilizer-v113.js'
]) forbidText(page, legacyModule, `活动页面仍加载旧模块：${legacyModule}`);

requireText(changelog, '<h2>v1.5.9</h2>', '更新记录 v1.5.9');
requireText(changelog, '<h2>v1.5.4</h2>', '更新记录 v1.5.4');
requireText(changelog, '为了美好修改了若干bug', '本次更新文案');
requireText(changelog, '版本更新会在这里简单记一笔。', '简短更新说明');
requireText(changelog, '<main class="timeline" aria-label="版本更新时间轴">', '纵向时间轴语义');
requireText(changelog, '.timeline::before', '纵向时间轴连线');
requireText(changelog, '.release::before', '纵向时间轴节点');
requireText(changelog, '.release:first-child::before', '当前版本节点');
requireText(changelog, '@media(max-width:640px)', '时间轴手机适配');
if (!(changelog.indexOf('v1.5.9') < changelog.indexOf('v1.5.8')
  && changelog.indexOf('v1.5.8') < changelog.indexOf('v1.5.7')
  && changelog.indexOf('v1.5.7') < changelog.indexOf('v1.5.6')
  && changelog.indexOf('v1.5.6') < changelog.indexOf('v1.5.4')
  && changelog.indexOf('v1.5.4') < changelog.indexOf('v1.5.3')
  && changelog.indexOf('v1.5.3') < changelog.indexOf('v1.5.2')
  && changelog.indexOf('v1.5.2') < changelog.indexOf('v1.5.1'))) {
  failures.push('更新记录未按倒序排列');
}
for (const detailed of ['文案精简与语义校准', '品牌 Logo 与多终端首页', '省份与城市筛选', '输入流畅性与代码语义修复']) {
  if (changelog.includes(detailed)) failures.push(`更新记录仍过度详细：${detailed}`);
}

requireText(entry, "release-presenter.v3968_0.js?v=3968_0", 'v3968发布展示器');
requireText(entry, "family-shell.v3965_0.js?v=3965_0", '共享家庭壳层');
requireText(entry, "tongxue-runtime-controller-v159.js?v=159", '唯一控制器入口');
requireText(entry, 'tongxue-v159-single-runtime-owner-20260726', '运行时构建校验');
requireText(entry, 'await startTongxueRuntime();', '运行时启动');
forbidText(entry, 'MutationObserver', '活动入口含观察器');
forbidText(entry, 'setInterval(', '活动入口含轮询');

const runtimeOwnerMatches = controller.match(/owner\s*:\s*['"]tongxue-runtime-controller-v159['"]/g) || [];
if (runtimeOwnerMatches.length !== 1) failures.push('运行时唯一所有者');
requireText(controller, 'observerCount: 0', '观察器数量合同');
requireText(controller, "on(window, 'popstate'", '浏览器历史恢复');
requireText(controller, 'activeQueryController', '请求中止所有权');
requireText(controller, 'loadMoreController', '加载更多中止所有权');
requireText(controller, "resolution.status === 'region'", '地域状态路径');
requireText(controller, "ui.button.textContent = state.requestInFlight ? '正在查找' : (state.scope === 'major' ? '查看跨校专业留言' : '查看学校留言')", '按钮动态文案');
if ((controller.match(/function bindEvents/g) || []).length !== 1) failures.push('事件绑定所有者不唯一');
if ((controller.match(/ui\.button, 'click'/g) || []).length !== 1) failures.push('查询按钮重复绑定');
if ((controller.match(/ui\.result, 'click'/g) || []).length !== 1) failures.push('结果节点重复绑定');
for (const source of [controller, searchView, resultView]) {
  forbidText(source, 'MutationObserver', 'v1.5.9 活动图含 MutationObserver');
  forbidText(source, 'setInterval(', 'v1.5.9 活动图含轮询');
  forbidText(source, 'setTimeout(', 'v1.5.9 活动图含延迟止血');
}
forbidText(searchView, 'addEventListener', '查询渲染器注册事件');
forbidText(resultView, 'addEventListener', '结果渲染器注册事件');
forbidText(searchView, 'fetch(', '查询渲染器持有网络请求');
forbidText(resultView, 'fetch(', '结果渲染器持有网络请求');

requireText(home, 'href="/tongxue/"', '首页导航');
requireText(legacy, "new URL('/tongxue/',location.origin)", '旧入口目标');
if (home.includes('./tongxue.html')) failures.push('首页仍引用旧入口');
if (share.includes('/tongxue.html') || !share.includes("url.pathname='/tongxue/'")) failures.push('分享链接未迁移');
if (!resolver.includes('school-search-index.20260617-v150.json')) failures.push('地域索引路径未版本化');
if (resolver.includes('Intl.Collator') || resolver.includes('createSchoolInitialCodes')) failures.push('浏览器运行时仍在计算拼音首字母');
if (!resolver.includes('initialBucketIndex') || resolver.includes('initialPrefixIndex')) failures.push('首字母索引不是有限两字母桶');

const scattered = rootFiles.filter(name => /^tongxue-.*\.js$/.test(name)
  || /^school-search-index.*\.json$/.test(name)
  || name === 'school-name-resolver.js'
  || name === 'school-name-index.generated.json');
if (scattered.length) failures.push(`根目录残留：${scattered.join(',')}`);
for (const forbidden of ['v1.6.0', '高频讨论信号', '报考前核验清单', '共识与分歧', '简称、轻微错别字', '学校名称、拼音首字母、城市或省份都可以搜索', '看看学长学姐怎么说']) {
  if (page.includes(forbidden)) failures.push(`活动页面含不应出现的文案：${forbidden}`);
}

console.log(`TONGXUE_DIRECTORY_RESULTS ${JSON.stringify({ failures })}`);
if (failures.length) process.exitCode = 1;
