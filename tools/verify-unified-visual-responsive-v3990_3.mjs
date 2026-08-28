import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const cssPath = 'shared/ui/shell/unified-visual-responsive.v3990_3.css';
const css = read(cssPath);
const pages = [
  'index.html',
  'ln-rank/index.html',
  'ln-rank/selection-pool.html',
  'aiplus/index.html',
  'tongxue/index.html',
  'major-path/index.html'
];

assert.match(css, /--ui-v001-content-reading: 1040px/);
assert.match(css, /--ui-v001-control-min: 44px/);
assert.match(css, /min-height: 100dvh/);
assert.match(css, /@media \(min-width: 761px\) and \(max-width: 1100px\)/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /@media \(max-width: 380px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(css, /h-screen/);

for (const page of pages) {
  const html = read(page);
  assert.match(html, /data-site-runtime-generation="v3990_2"/, `${page}: active generation`);
  assert.match(html, /data-ui-visual-responsive="unified-v001"/, `${page}: visual marker`);
  const expectedAsset = page === 'aiplus/index.html'
    ? 'unified-visual-responsive.v3990_3.css?v=002_4&scroll=002_1&fdw=003_0'
    : 'unified-visual-responsive.v3990_3.css?v=3990_3&r=r038-unified-visual-responsive-production-contract';
  assert.match(html, new RegExp(expectedAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${page}: shared responsive stylesheet`);
}

const release = read('shared/resources/release/current-release.js');
assert.match(release, /uiVisualResponsiveVersion: 'unified-visual-responsive-v001'/);
assert.match(release, /uiVisualResponsiveRevision: 'r038-unified-visual-responsive-production-contract'/);
assert.match(release, /unifiedVisualResponsiveStyles: '\/shared\/ui\/shell\/unified-visual-responsive\.v3990_3\.css'/);

const registry = read('shared/ui/ui-resource-registry.v3990_2.js');
assert.match(registry, /unifiedVisualResponsiveCss: stable\('\/shared\/ui\/shell\/unified-visual-responsive\.v3990_3\.css'\)/);
assert.match(registry, /'unified-visual-responsive'/);

const runtime = read('shared/resources/release/site-runtime-contract.v3990_2.js');
assert.match(runtime, /unified-visual-responsive\.v3990_3\.css/);
const cache = read('shared/resources/release/runtime-cache-contract.v3990_2.js');
assert.match(cache, /unified-visual-responsive\.v3990_3\.css/);
const manifest = read('shared/resources/release/active-resource-manifest.v3990_2.js');
assert.match(manifest, /uiVisualResponsive/);
const headers = read('_headers');
assert.match(headers, /\/shared\/ui\/shell\/unified-visual-responsive\.v3990_3\.css\n\s+Content-Type: text\/css; charset=utf-8\n\s+Cache-Control: public, max-age=31536000, immutable/);

console.log(JSON.stringify({
  ok: true,
  version: 'unified-visual-responsive-v001',
  revision: 'r038-unified-visual-responsive-production-contract',
  pages: pages.length,
  breakpoints: ['>1100', '761-1100', '0-760', '0-380'],
  touchTarget: '44px',
  reducedMotion: true,
  businessLogicChanged: false
}, null, 2));
