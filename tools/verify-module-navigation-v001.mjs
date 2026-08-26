import assert from 'node:assert/strict';
import fs from 'node:fs';

const {
  ROOT_MODULES,
  VERSION,
  buildModuleRoots,
  moduleKeyForPath,
  rememberModuleVisit,
  sanitizeModulePath
} = await import('../shared/ui/navigation/module-navigation.v004.js');

assert.equal(VERSION, 'module-navigation-v0.04');
assert.deepEqual(ROOT_MODULES.map(item => [item.key, item.route]), [
  ['home', '/'],
  ['selection', '/ln-rank/'],
  ['tongxue', '/tongxue/'],
  ['major-path', '/major-path/'],
  ['aiplus', '/aiplus/'],
  ['public-company', '/Public_company/']
]);
assert.equal(moduleKeyForPath('/'), 'home');
assert.equal(moduleKeyForPath('/ln-rank/selection-pool.html'), 'selection');
assert.equal(moduleKeyForPath('/tongxue/?scope=major'), 'tongxue');
assert.equal(moduleKeyForPath('/major-path/?majorCode=080601'), 'major-path');
assert.equal(moduleKeyForPath('/aiplus/?scope=school'), 'aiplus');
assert.equal(moduleKeyForPath('/Public_company/'), 'public-company');
assert.deepEqual(buildModuleRoots('tongxue').map(item => item.current), [false, false, true, false, false, false]);
assert.equal(sanitizeModulePath('/ln-rank/?candidateScore=580#results'), '/ln-rank/?candidateScore=580#results');
assert.equal(sanitizeModulePath('https://evil.example/path'), '');
assert.equal(sanitizeModulePath('//evil.example/path'), '');

const values = new Map();
const storage = {
  getItem(key) { return values.get(key) || null; },
  setItem(key, value) { values.set(key, value); }
};
const selection = {
  origin: 'https://gaokao.powers.org.cn',
  href: 'https://gaokao.powers.org.cn/ln-rank/?candidateScore=580#results',
  pathname: '/ln-rank/'
};
const tongxue = {
  origin: 'https://gaokao.powers.org.cn',
  href: 'https://gaokao.powers.org.cn/tongxue/?scope=major&majorCode=080601',
  pathname: '/tongxue/'
};
const tongxueSubpath = {
  origin: 'https://gaokao.powers.org.cn',
  href: 'https://gaokao.powers.org.cn/tongxue/?scope=major&majorCode=080601&topic=study',
  pathname: '/tongxue/'
};
const first = rememberModuleVisit(selection, storage);
assert.equal(first.returnPath, '');
const enteredTongxue = rememberModuleVisit(tongxue, storage);
assert.equal(enteredTongxue.returnPath, '/ln-rank/?candidateScore=580#results');
assert.equal(enteredTongxue.returnLabel, '专业初选');
const sameModule = rememberModuleVisit(tongxueSubpath, storage);
assert.equal(sameModule.returnPath, '/ln-rank/?candidateScore=580#results');
const backToSelection = rememberModuleVisit(selection, storage);
assert.equal(backToSelection.returnPath, '/tongxue/?scope=major&majorCode=080601&topic=study');
assert.equal(backToSelection.returnLabel, '同学你好');

for (const path of [
  'index.html',
  'ln-rank/index.html',
  'ln-rank/selection-pool.html',
  'ln-rank/self-check.html',
  'ln-rank/local-mainline.html',
  'ln-rank/211-mainline.html',
  'tongxue/index.html',
  'tongxue/changelog.html',
  'zy2026/index.html',
  'major-path/index.html'
]) {
  const html = fs.readFileSync(path, 'utf8');
  assert.equal(html.includes('/shared/ui/navigation/module-navigation.v004.css?v=004'), true, `${path}: navigation CSS`);
}
const navigationOwners = [
  fs.readFileSync('shared/ui/shell/family-shell.v3990_2.js', 'utf8'),
  fs.readFileSync('major-path/index.html', 'utf8'),
  fs.readFileSync('zy2026/index.html', 'utf8'),
  fs.readFileSync('ln-rank/211-mainline.html', 'utf8'),
  fs.readFileSync('ln-rank/local-mainline.html', 'utf8')
].join('\n');
assert.match(navigationOwners, /module-navigation\.v004\.js\?v=004/);
for (const [path, needle] of [
  ['index.html', 'family-home.v3990_2.js?v=3990_2-nav003'],
  ['ln-rank/index.html', 'app.v3990_2.js?v=3990_2-nav003'],
  ['ln-rank/selection-pool.html', 'selection-pool.v3990_2.js?v=3990_2-nav003'],
  ['ln-rank/self-check.html', 'family-shell.v3990_2.js?v=3990_2-nav003'],
  ['tongxue/index.html', 'tongxue-runtime-v159-r3968.js?v=3968_0-nav003'],
  ['tongxue/changelog.html', 'family-shell.v3990_2.js?v=3990_2-nav003']
]) {
  const escaped = needle.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
  assert.match(fs.readFileSync(path, 'utf8'), new RegExp(escaped), `${path}: cache-busted navigation owner`);
}
const navigationCss = fs.readFileSync('shared/ui/navigation/module-navigation.v004.css', 'utf8');
assert.match(navigationCss, /ui-module-navigation--standalone\s*\{\s*display: flex;/);
const tongxueHtml = fs.readFileSync('tongxue/index.html', 'utf8');
assert.match(tongxueHtml, /data-ui-module-back/);
assert.match(tongxueHtml, /159-startup001/);
console.log('Module navigation v0.04 verified: root links, same-origin full-path return, same-module preservation, and page integration.');
