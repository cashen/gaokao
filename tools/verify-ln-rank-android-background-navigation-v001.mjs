import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildAcademicBackgroundHref, ACADEMIC_BACKGROUND_NAVIGATION_VERSION } from '../shared/resources/background/academic-background-navigation.v002.js?v=002_0&r=r028-android-links';

const read = file => fs.readFileSync(file, 'utf8');
const selection = read('ln-rank/index.html');
const local = read('ln-rank/local-mainline.html');
const all211 = read('ln-rank/211-mainline.html');
const majorPath = read('major-path/index.html');
const majorContext = read('major-path/background-context.v001.js');
const directContext = read('ln-rank/js/academic-background/background-context-direct.v001.js');
const canonicalizer = read('ln-rank/js/navigation/background-link-canonicalizer.v001.js');
const release = read('shared/resources/release/current-release.js');

assert.match(selection, /<a class="aux-background-card"[^>]+href="\/ln-rank\/local-mainline"/);
assert.match(selection, /<a class="aux-background-card"[^>]+href="\/ln-rank\/211-mainline"/);
assert.doesNotMatch(selection, /class="aux-background-card"[^>]+data-ui-navigation-target=/);
assert.match(selection, /background-link-canonicalizer\.v001\.js\?v=001_0&r=r028-android-links/);
assert.match(local, /background-context-direct\.v001\.js\?v=001_0&r=r028-android-links/);
assert.match(all211, /background-context-direct\.v001\.js\?v=001_0&r=r028-android-links/);
assert.match(all211, /href="\/ln-rank\/local-mainline"/);
assert.match(all211, /href="\/ln-rank\/211-mainline"/);
assert.match(majorPath, /app\.v005\.js\?v=005_0&r=r041-human-reading-flow-v005/);
assert.match(majorContext, /academic-background-navigation\.v002\.js\?v=002_0&r=r028-android-links/);
assert.match(directContext, /academic-background-navigation\.v002\.js\?v=002_0&r=r028-android-links/);
assert.match(canonicalizer, /\/ln-rank\/local-mainline\.html': '\/ln-rank\/local-mainline'/);
assert.match(canonicalizer, /\/ln-rank\/211-mainline\.html': '\/ln-rank\/211-mainline'/);
assert.match(canonicalizer, /addEventListener\('click'/);
assert.match(canonicalizer, /new MutationObserver/);
assert.match(release, /academicBackgroundNavigationVersion: 'academic-background-navigation-v0\.02'/);
assert.match(release, /lnRankBackgroundNavigationRevision: 'r028-android-links'/);

for (const [scope, pathname] of [['liaoning', '/ln-rank/local-mainline'], ['211', '/ln-rank/211-mainline']]) {
  const href = buildAcademicBackgroundHref({ scope, majorCode: '080601', canonicalName: '电气工程及其自动化', school: '测试大学' });
  const url = new URL(href, 'https://gaokao.powers.org.cn');
  assert.equal(url.pathname, pathname);
  assert.equal(url.searchParams.get('majorCode'), '080601');
  assert.equal(url.searchParams.get('school'), '测试大学');
}

console.log(JSON.stringify({
  ok: true,
  version: 'ln-rank-android-background-navigation-v0.01',
  navigation: ACADEMIC_BACKGROUND_NAVIGATION_VERSION,
  cacheRevision: 'r028-android-links',
  nativeEntrypoints: ['/ln-rank/local-mainline', '/ln-rank/211-mainline'],
  redirectFreeScopeLinks: true,
  dynamicLegacyLinkFallback: true
}, null, 2));
