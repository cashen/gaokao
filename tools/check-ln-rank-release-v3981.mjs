import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'tools/ln-rank-release-manifest.v3981.json');
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

for (const rel of [...manifest.pages, ...manifest.entryScripts, ...manifest.functions]) addMissing('manifest', rel);

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

if (errors.length) {
  console.error('ln-rank release check failed:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log(`ln-rank release check passed: ${manifest.version} (${manifest.code}), checked ${seen.size} JS modules.`);
