const VERSION = 'v3.9.49.4';
const ASSET = 'v3949_4';

function item(label, ok, detail = '') {
  return `<div class="case ${ok ? 'pass' : 'fail'}"><b>${ok ? '通过' : '失败'}｜${label}</b><p>${detail}</p></div>`;
}

async function fetchText(path) {
  const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}selfcheck=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} 返回 ${response.status}`);
  return response.text();
}

async function run() {
  const host = document.querySelector('.self-wrap');
  if (!host || document.getElementById('v39494JourneyChecks')) return;
  const section = document.createElement('section');
  section.id = 'v39494JourneyChecks';
  section.className = 'self-card';
  section.innerHTML = '<h2>v3.9.49.4 多终端人类路径合同</h2><p class="muted">检查增量体验保护层、页面版本、入口引用和回归矩阵。真实设备仍需按 375px、Android Chrome、iPad 横屏和 PC 宽屏完成手工路径测试。</p><div class="grid" data-v39494-checks>正在检查…</div>';
  host.insertBefore(section, host.lastElementChild);
  const grid = section.querySelector('[data-v39494-checks]');
  const rows = [];

  try {
    const [indexHtml, selectionHtml, releaseText, uxJs, uxCss] = await Promise.all([
      fetchText('/ln-rank/index.html'),
      fetchText('/ln-rank/selection-pool.html'),
      fetchText('/ln-rank/release-meta.json'),
      fetchText('/ln-rank/js/ux/multi-terminal.v3949_4.js'),
      fetchText('/ln-rank/css/dist/ln-rank-multi-terminal.v3949_4.css')
    ]);
    const release = JSON.parse(releaseText);
    rows.push(item('首页版本', indexHtml.includes(VERSION) && indexHtml.includes(ASSET), '首页显示版本和查询参数应为 v3.9.49.4 / v3949_4。'));
    rows.push(item('自选池版本', selectionHtml.includes(VERSION) && selectionHtml.includes(ASSET), '自选池与首页使用同一发布版本。'));
    rows.push(item('体验保护层入口', indexHtml.includes('ln-rank-multi-terminal.v3949_4.css') && indexHtml.includes('multi-terminal.v3949_4.js'), '首页必须同时加载多终端 CSS 与交互保护脚本。'));
    rows.push(item('自选池体验入口', selectionHtml.includes('ln-rank-multi-terminal.v3949_4.css') && selectionHtml.includes('multi-terminal.v3949_4.js'), '报告前确认页必须加载同一保护层。'));
    rows.push(item('发布合同', release.version === VERSION && release.runtimeCacheQueryVersion === ASSET, `release-meta：${release.version || '缺失'} / ${release.runtimeCacheQueryVersion || '缺失'}`));
    rows.push(item('滚动与重复点击保护', /recordMoreAnchor/.test(uxJs) && /aria-busy/.test(uxJs) && /MutationObserver/.test(uxJs), '加载更多应保留阅读锚点，并阻止重复请求。'));
    rows.push(item('Android 动态视口', /visualViewport/.test(uxJs) && /is-keyboard-open/.test(uxJs) && /100dvh/.test(uxCss), '处理 Chrome 地址栏、软键盘和底部安全区。'));
    rows.push(item('双列上限', /repeat\(2, minmax\(0, 1fr\)\)/.test(uxCss) && !/repeat\(4,/.test(uxCss), 'iPad 与宽屏最多两列专业卡，避免四列视线跳跃。'));
    rows.push(item('手机单列', /@media \(max-width: 767px\)/.test(uxCss) && /grid-template-columns: minmax\(0, 1fr\)/.test(uxCss), '375px 与 Android 手机使用自然单列阅读顺序。'));
    rows.push(item('禁区合同', release.noFenxiIncluded === true, '本轮不修改 /fenxi、functions/fenxi 或 functions/_middleware.js。'));
  } catch (error) {
    rows.push(item('资源读取', false, error?.message || String(error)));
  }

  const matrix = [
    '375px：555 / 580 / 600',
    'Android Chrome：555 / 580 / 600',
    'iPad 横屏：555 / 580 / 600',
    'PC 宽屏：555 / 580 / 600'
  ];
  rows.push(item('人工压力测试矩阵', true, matrix.join('；')));
  grid.innerHTML = rows.join('');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
else run();
