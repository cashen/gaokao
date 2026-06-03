import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'tools/ln-rank-release-manifest.v3984.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function addMissing(owner, rel) {
  if (!exists(rel)) errors.push(`${owner} 引用不存在：${rel}`);
}

for (const rel of [...manifest.pages, ...manifest.entryScripts, ...(manifest.data || []), ...manifest.functions]) addMissing('manifest', rel);
for (const rel of manifest.data || []) {
  try { JSON.parse(read(rel)); } catch (error) { errors.push(`${rel} 不是有效 JSON：${error.message}`); }
}

const htmlAssetRe = /(?:src|href)=["']\.\/([^"']+)["']/g;
for (const page of manifest.pages) {
  if (!exists(page)) continue;
  const html = read(page);
  let m;
  while ((m = htmlAssetRe.exec(html))) {
    const rel = path.posix.join(path.posix.dirname(page), m[1].split('?')[0]);
    addMissing(page, rel);
  }
}

const importRe = /import\s+(?:[^'"`]+?\s+from\s+)?["']([^"']+)["']/g;
const dynamicImportRe = /import\(["']([^"']+)["']\)/g;
const seen = new Set();
function walkJs(rel) {
  rel = path.posix.normalize(rel);
  if (seen.has(rel)) return;
  seen.add(rel);
  if (!exists(rel)) { errors.push(`JS 入口不存在：${rel}`); return; }
  const js = read(rel);
  const dir = path.posix.dirname(rel);
  for (const re of [importRe, dynamicImportRe]) {
    let m;
    while ((m = re.exec(js))) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const child = path.posix.normalize(path.posix.join(dir, spec));
      if (!exists(child)) errors.push(`${rel} import 不存在：${spec} => ${child}`);
      else walkJs(child);
    }
  }
}
for (const entry of manifest.entryScripts) walkJs(entry);

if (exists('fenxi')) errors.push('zip 不应包含 /fenxi 静态目录');
if (exists('functions/fenxi')) errors.push('zip 不应包含 functions/fenxi 目录');
if (exists('functions/_middleware.js')) errors.push('zip 不应包含 functions/_middleware.js');

const trendHtml = exists('ln-rank/major-trend-2025.html') ? read('ln-rank/major-trend-2025.html') : '';
if (trendHtml && !trendHtml.includes('major-trend.v3984.css')) errors.push('major-trend-2025.html 未引用统一热度 CSS');
const indexHtml = exists('ln-rank/index.html') ? read('ln-rank/index.html') : '';
if (indexHtml && !indexHtml.includes('majorTrendHint')) errors.push('index.html 未挂载专业热度轻提示容器');
const selHtml = exists('ln-rank/selection-pool.html') ? read('ln-rank/selection-pool.html') : '';
if (selHtml && !selHtml.includes('v3.9.8.4')) errors.push('selection-pool.html 版本未更新到 v3.9.8.4');
const forbiddenCopy = ['稳进','必录','保证','一定能上','闭眼报','稳赚','捡漏','冲爆','workers-ai','AI JSON'];
for (const page of ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html']) {
  if (!exists(page)) continue;
  const body = read(page);
  for (const word of forbiddenCopy) if (body.includes(word)) errors.push(`${page} 出现禁止/工程文案：${word}`);
}

if (errors.length) {
  console.error('ln-rank release check failed:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log(`ln-rank release check passed: ${manifest.version} (${manifest.code}), checked ${seen.size} JS modules.`);
