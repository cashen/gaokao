import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENTRY_HTMLS = [
  'ln-rank/index.html',
  'ln-rank/selection-pool.html',
  'ln-rank/major-trend-2025.html',
  'ln-rank/self-check.html'
];
const OUT_DIR = path.join(ROOT, 'reports');
const PRUNE = process.argv.includes('--prune');
const WRITE = process.argv.includes('--write') || PRUNE;

function posix(p){ return p.split(path.sep).join('/'); }
function read(file){ return fs.readFileSync(path.join(ROOT,file),'utf8'); }
function exists(file){ return fs.existsSync(path.join(ROOT,file)); }
function norm(base, ref){
  if (!ref || ref.startsWith('http') || ref.startsWith('/') || ref.startsWith('#')) return null;
  const cleaned = ref.split('?')[0].split('#')[0];
  return posix(path.normalize(path.join(path.dirname(base), cleaned)));
}
function walk(dir, out=[]){
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const item of fs.readdirSync(abs)){
    const p = path.join(abs,item);
    const rel = posix(path.relative(ROOT,p));
    if (fs.statSync(p).isDirectory()) walk(rel,out); else out.push(rel);
  }
  return out;
}
const htmlRefRe = /(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g;
const importRe = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|import\s*\()\s*["']([^"']+\.js)["']/g;

const active = new Set();
const missing = [];
const queue = [];
for (const html of ENTRY_HTMLS){
  if (!exists(html)) { missing.push(html); continue; }
  const text = read(html);
  for (const m of text.matchAll(htmlRefRe)){
    const rel = norm(html, m[1]);
    if (!rel) continue;
    active.add(rel);
    if (!exists(rel)) missing.push(rel);
    if (rel.endsWith('.js')) queue.push(rel);
  }
}
while(queue.length){
  const js = queue.pop();
  if (!exists(js)) continue;
  const text = read(js);
  for (const m of text.matchAll(importRe)){
    const rel = norm(js, m[1]);
    if (!rel) continue;
    if (!active.has(rel)){
      active.add(rel);
      if (!exists(rel)) missing.push(rel);
      if (rel.endsWith('.js')) queue.push(rel);
    }
  }
}
const allJs = walk('ln-rank/js').filter(x=>x.endsWith('.js')).sort();
const allCss = walk('ln-rank/css').filter(x=>x.endsWith('.css')).sort();
const activeJs = [...active].filter(x=>x.endsWith('.js')).sort();
const activeCss = [...active].filter(x=>x.endsWith('.css')).sort();
const orphanJs = allJs.filter(x=>!active.has(x));
const orphanCss = allCss.filter(x=>!active.has(x));
const legacyActive = [...active].filter(x=>/\.v(39|398|397|396|395|394)\d|v3987|v3982|v3959|v3963/.test(x) && !/v3913/.test(x)).sort();
const report = {
  generatedAt: new Date().toISOString(),
  entries: ENTRY_HTMLS,
  totals: {
    allJs: allJs.length,
    activeJs: activeJs.length,
    orphanJs: orphanJs.length,
    allCss: allCss.length,
    activeCss: activeCss.length,
    orphanCss: orphanCss.length,
    legacyActive: legacyActive.length,
    missing: [...new Set(missing)].length
  },
  activeJs,
  activeCss,
  legacyActive,
  orphanJs,
  orphanCss,
  missing: [...new Set(missing)].sort()
};
if (WRITE) fs.mkdirSync(OUT_DIR,{recursive:true});
if (WRITE) fs.writeFileSync(path.join(OUT_DIR,'ln-rank-asset-analysis-v3913.json'), JSON.stringify(report,null,2));
const md = `# ln-rank 资产依赖分析 v3.9.13\n\n`+
`入口：${ENTRY_HTMLS.join('、')}\n\n`+
`## 统计\n\n`+
`- JS：${report.totals.activeJs}/${report.totals.allJs} active，${report.totals.orphanJs} orphan\n`+
`- CSS：${report.totals.activeCss}/${report.totals.allCss} active，${report.totals.orphanCss} orphan\n`+
`- 旧版本号但仍在使用：${report.totals.legacyActive}\n`+
`- 缺失文件：${report.totals.missing}\n\n`+
`## 旧版本号但仍在使用，不能按版本号删除\n\n`+
legacyActive.map(x=>`- ${x}`).join('\n')+
`\n\n## 当前 orphan JS/CSS\n\n`+
(report.orphanJs.concat(report.orphanCss).slice(0,300).map(x=>`- ${x}`).join('\n') || '无')+
`\n`;
if (WRITE) fs.writeFileSync(path.join(OUT_DIR,'ln-rank-asset-analysis-v3913.md'), md);
if (PRUNE){
  for (const rel of orphanJs.concat(orphanCss)){
    const abs = path.join(ROOT,rel);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
}
console.log(JSON.stringify(report.totals,null,2));
if (report.missing.length){
  console.error('Missing active assets:', report.missing.join('\n'));
  process.exitCode = 2;
}
