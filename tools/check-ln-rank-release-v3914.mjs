import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
function fail(msg){ console.error('FAIL:',msg); process.exit(1); }
function has(p){ return fs.existsSync(path.join(root,p)); }
for(const p of ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html','ln-rank/self-check.html','ln-rank/module-manifest.json','functions/_lib/fenxi-session.js']) if(!has(p)) fail(`missing ${p}`);
const meta=JSON.parse(fs.readFileSync(path.join(root,'ln-rank/release-meta.json'),'utf8'));
if(meta.version!=='v3.9.14'||meta.assetVersion!=='v3914') fail('release-meta version mismatch');
for(const p of ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html','ln-rank/self-check.html']){ const t=fs.readFileSync(path.join(root,p),'utf8'); if(!t.includes('3914')) fail(`${p} does not reference 3914`); if(/v3913|v3990|v3987|v3982/.test(t)) fail(`${p} still references old visible asset versions`); }
const sel=fs.readFileSync(path.join(root,'ln-rank/selection-pool.html'),'utf8');
if(!sel.includes('生成清单版报告')||!sel.includes('生成解读版报告')) fail('selection-pool report button copy not updated');
const r=spawnSync('node',['tools/analyze-ln-rank-assets-v3914.mjs','--fail-on-warn'],{cwd:root,stdio:'inherit'}); if(r.status!==0) fail('asset analysis failed');
for(const p of ['ln-rank/js/app.v3914.js','ln-rank/js/selection-pool.v3914.js','ln-rank/js/major-trend-render.v3914.js','ln-rank/js/self-check.v3914.js']){ const r2=spawnSync('node',['--check',p],{cwd:root,stdio:'inherit'}); if(r2.status!==0) fail(`syntax ${p}`); }
console.log('OK v3914 release check passed');
