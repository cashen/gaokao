import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3990_2.js';

const activePages = Object.freeze([
  'index.html',
  'changelog.html',
  'aiplus/index.html',
  'ln-rank/index.html',
  'ln-rank/selection-pool.html',
  'ln-rank/self-check.html',
  'ln-rank/score-converter/index.html',
  'ln-rank/local-mainline.html',
  'ln-rank/211-mainline.html',
  'ln-rank/major-trend-2025.html',
  'ln2026.html',
  'zy2026.html',
  'zy2026/index.html',
  'major-path/index.html',
  'Public_company/index.html',
  'Public_company/source/index.html',
  'tongxue/index.html',
  'tongxue/changelog.html'
]);

const read = file => fs.readFileSync(file, 'utf8');
const bodyTag = html => html.match(/<body\b[^>]*>/i)?.[0] || '';
const footer = html => html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] || '';
const staleRelease = /v3\.9\.(?:50\.0|67\.0|68\.0|71\.2|90\.0)\b/;
const stablePageReleases = Object.freeze({
  'ln-rank/local-mainline.html': 'v3.9.71.2',
  'ln-rank/211-mainline.html': 'v3.9.90.0'
});

assert.equal(CURRENT_RELEASE.display, 'v3.9.90.2');
assert.equal(CURRENT_RELEASE.version, 'v3.9.90.2');
assert.equal(CURRENT_RELEASE.asset, '3990_2');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3990_2');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, 'v3990_2');
assert.equal(CURRENT_RELEASE.releaseLogHref, '/changelog.html');
assert.equal(CURRENT_RELEASE.releaseFooterContractVersion, 'release-footer-contract-v3990_2');
assert.equal(CURRENT_RELEASE.resourceOwners.releaseFooter, '/shared/resources/release/release-footer.v3990_2.js');
assert.equal(CURRENT_RELEASE.resourceOwners.releaseFooterStyles, '/shared/resources/release/release-footer.v3990_2.css');

assert.equal(SITE_RUNTIME_CONTRACT.activeEntrypoints.releasePresenter, '/shared/resources/release/release-presenter.v3990_2.js?v=3990_2');
assert.equal(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications.releasePresenter, 'current-generation');

for (const file of activePages) {
  const html = read(file);
  const body = bodyTag(html);
  const foot = footer(html);
  const expectedPageRelease = stablePageReleases[file] || 'v3.9.90.2';
  assert.ok(body.includes(`data-release="${expectedPageRelease}"`), `${file}: page release lineage`);
  assert.ok(body.includes('data-site-runtime-generation="v3990_2"'), `${file}: runtime generation marker`);
  assert.ok(body.includes('data-release-surface='), `${file}: release surface marker`);
  if (file === 'aiplus/index.html') {
    const aiApp = read('aiplus/app.v3990_2.js');
    assert.ok(aiApp.includes("import('/shared/resources/release/release-footer.v3990_2.js?v=3990_2')"), `${file}: unified release footer consumer`);
  } else if (file === 'Public_company/index.html' || file === 'Public_company/source/index.html') {
    assert.ok(foot.includes('data-current-release>v3.9.90.2'), `${file}: Vite static release fallback`);
  } else {
    assert.ok(html.includes('/shared/resources/release/release-footer.v3990_2.js?v=3990_2'), `${file}: unified release footer consumer`);
  }
  assert.ok(foot.includes('data-release-footer'), `${file}: footer contract`);
  assert.ok(foot.includes('data-current-release'), `${file}: current release binding`);
  assert.ok(foot.includes('data-release-log-link'), `${file}: release log binding`);
  assert.ok(foot.includes('href="/changelog.html"'), `${file}: canonical log href`);
  if (!stablePageReleases[file]) assert.ok(!staleRelease.test(body), `${file}: stale body release marker`);
  assert.ok(!staleRelease.test(foot), `${file}: stale footer release marker`);
}

const releaseFooter = read('shared/resources/release/release-footer.v3990_2.js');
assert.match(releaseFooter, /from '\.\/current-release\.js\?v=3990_2(?:&r=r036-major-history-rank-lazy)?'/);
assert.match(releaseFooter, /from '\.\/release-presenter\.v3990_2\.js\?v=3990_2(?:&r=r036-major-history-rank-lazy)?'/);
assert.ok(!releaseFooter.includes('MutationObserver'));
assert.ok(!releaseFooter.includes('setInterval('));
assert.ok(!releaseFooter.includes('setTimeout('));

const globalLog = read('changelog.html');
assert.ok(globalLog.includes('<h2>v3.9.90.2</h2>'));
assert.ok(globalLog.includes('Tongxue · 同学你好'));
assert.ok(globalLog.includes('AIPLuS 产品版'));
assert.ok(globalLog.includes('/shared/resources/release/release-footer.v3990_2.js?v=3990_2'));

console.log(JSON.stringify({
  ok: true,
  activePages: activePages.length,
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  logHref: CURRENT_RELEASE.releaseLogHref,
  footerContract: CURRENT_RELEASE.releaseFooterContractVersion
}, null, 2));
