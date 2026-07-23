import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3958_0';

const VERSION = CURRENT_RELEASE.display;
const ASSET = CURRENT_RELEASE.assetVersion;
const $ = id => document.getElementById(id);
const row = (name, ok, detail = '') => ({ name, ok, detail });

async function json(path) {
  const response = await fetch(path, { cache: 'no-store' });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text || '{}'); }
  catch { throw new Error(`${path} 返回的不是 JSON`); }
  if (!response.ok) throw new Error(data.message || `${path} HTTP ${response.status}`);
  return data;
}

function renderList(id, items) {
  const root = $(id);
  if (!root) return;
  root.innerHTML = items.map(item => `<div class="self-check-row ${item.ok ? 'is-ok' : 'is-bad'}"><b>${item.ok ? '✅' : '❌'} ${item.name}</b><p>${item.detail || ''}</p></div>`).join('') || '<div class="self-check-row">暂无结果</div>';
}

function overall(items) {
  const bad = items.filter(item => !item.ok);
  const badge = $('overallBadge');
  badge.className = `status ${bad.length ? 'bad' : 'ok'}`;
  badge.textContent = bad.length ? `未通过 ${bad.length} 项` : '自测通过';
  $('errors').textContent = bad.length ? bad.map(item => `${item.name}: ${item.detail}`).join('\n') : '暂无。';
}

async function main() {
  const checks = [];
  try {
    const [active, release, health, runtimeHealth, self] = await Promise.all([
      json(`/ln-rank/active-assets.json?${ASSET}`),
      json(`/ln-rank/release-meta.json?${ASSET}`),
      json('/api/feishu-report-health'),
      json('/api/ln-rank-runtime-health'),
      json(`/api/ln-rank-self-check?${ASSET}`)
    ]);
    checks.push(row('活动资源版本', active.version === VERSION && active.assetVersion === ASSET, `${active.version} / ${active.assetVersion}`));
    checks.push(row('发布合同版本', release.version === VERSION && release.assetVersion === ASSET, `${release.version} / ${release.assetVersion}`));
    checks.push(row('Functions版本唯一源', runtimeHealth.version === VERSION && runtimeHealth.assetVersion === ASSET, `${runtimeHealth.version} / ${runtimeHealth.assetVersion}`));
    checks.push(row('飞书版本唯一源', health.ok && health.version === VERSION && health.routes?.currentBand && health.routes?.selectionPool, `${health.version} / ${JSON.stringify(health.routes || {})}`));
    checks.push(row('三处报告构建', self.ok && Array.isArray(self.reports) && self.reports.filter(item => item.name !== '复制文字版/样式块').length === 3, (self.reports || []).map(item => `${item.name}:${item.ok ? '通过' : '失败'}`).join('｜')));
    renderList('reports', (self.reports || []).map(item => row(item.name, Boolean(item.ok), (item.errors || []).join('；') || `长度 ${item.length || 0}`)));
    renderList('cases', (self.cases || []).map(item => row(item.input || item.name, Boolean(item.ok), (item.errors || []).join('；') || '通过')));
    renderList('uiChecks', (self.uiChecks || []).map(item => row(item.name, Boolean(item.ok), item.detail || '')));
    $('versionBox').textContent = `${active.version} / ${active.assetVersion} / ${release.releaseName || release.release || ''} / ${CURRENT_RELEASE.resourceOwnershipVersion}`;
  } catch (error) {
    checks.push(row('自测执行', false, error?.message || String(error)));
  }
  overall(checks);
}

document.addEventListener('DOMContentLoaded', () => $('runSelfCheck')?.addEventListener('click', main));
