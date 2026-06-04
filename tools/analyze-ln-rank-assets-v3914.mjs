import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const entries = ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html','ln-rank/self-check.html'];
const jsRe = /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/g;
const cssRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g;
const importRe = /import\s+(?:[^'";]+?\s+from\s+)?["'](.+?)["']|export\s+\*\s+from\s+["'](.+?)["']/g;
function cleanUrl(u){ return u.split('?')[0].replace(/^\.\//,''); }
function file(p){ return path.join(root,p); }
function exists(p){ return fs.existsSync(file(p)); }
const activeJs = new Set(), activeCss = new Set(), missing=[];
function addJs(rel){ if(!rel.startsWith('ln-rank/')) rel='ln-rank/'+rel; if(activeJs.has(rel)) return; if(!exists(rel)){ missing.push(rel); return;} activeJs.add(rel); const text=fs.readFileSync(file(rel),'utf8'); let m; const dir=path.dirname(rel); importRe.lastIndex=0; while((m=importRe.exec(text))){ const spec=m[1]||m[2]; if(!spec||!spec.startsWith('.')) continue; const next=path.normalize(path.join(dir,spec)).replaceAll('\\','/'); addJs(next); }}
for(const e of entries){ const html=fs.readFileSync(file(e),'utf8'); let m; while((m=jsRe.exec(html))) addJs(path.normalize(path.join(path.dirname(e),cleanUrl(m[1]))).replaceAll('\\','/')); while((m=cssRe.exec(html))){ let rel=path.normalize(path.join(path.dirname(e),cleanUrl(m[1]))).replaceAll('\\','/'); if(!exists(rel)) missing.push(rel); else activeCss.add(rel); }}
function walk(dir,ext,out=[]){ if(!fs.existsSync(file(dir))) return out; for(const name of fs.readdirSync(file(dir))){ const rel=dir+'/'+name; const st=fs.statSync(file(rel)); if(st.isDirectory()) walk(rel,ext,out); else if(rel.endsWith(ext)) out.push(rel);} return out;}
const allJs=walk('ln-rank/js','.js').sort(); const allCss=walk('ln-rank/css','.css').sort();
const orphanJs=allJs.filter(x=>!activeJs.has(x)); const orphanCss=allCss.filter(x=>!activeCss.has(x));
const versionedInternal=[...activeJs].filter(x=>/\/feature\/.*\.v\d+/.test(x) || /\/core\/.*\.v\d+/.test(x) || /\/config\/.*\.v\d+/.test(x));
const report={generatedAt:new Date().toISOString(),entries,totals:{allJs:allJs.length,activeJs:activeJs.size,orphanJs:orphanJs.length,allCss:allCss.length,activeCss:activeCss.size,orphanCss:orphanCss.length,missing:missing.length,versionedInternal:versionedInternal.length},activeJs:[...activeJs].sort(),activeCss:[...activeCss].sort(),orphanJs,orphanCss,missing,versionedInternal};
fs.mkdirSync(file('reports'),{recursive:true});
fs.writeFileSync(file('reports/ln-rank-asset-analysis-v3914.json'),JSON.stringify(report,null,2));
fs.writeFileSync(file('reports/ln-rank-dependency-graph-v3914.json'),JSON.stringify({entries,activeJs:report.activeJs,activeCss:report.activeCss},null,2));
fs.writeFileSync(file('reports/ln-rank-asset-analysis-v3914.md'),`# ln-rank asset analysis v3914\n\n- active JS: ${activeJs.size}/${allJs.length}\n- orphan JS: ${orphanJs.length}\n- active CSS: ${activeCss.size}/${allCss.length}\n- orphan CSS: ${orphanCss.length}\n- missing: ${missing.length}\n- versioned internal active: ${versionedInternal.length}\n`);
console.log(JSON.stringify(report.totals,null,2));
if(process.argv.includes('--fail-on-warn') && (missing.length||orphanJs.length||orphanCss.length||versionedInternal.length)) process.exit(1);
