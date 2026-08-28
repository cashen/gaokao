import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
function fail(msg){ console.error('FAIL:',msg); process.exit(1); }
function has(p){ return fs.existsSync(path.join(root,p)); }
for(const p of ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html','ln-rank/self-check.html','ln-rank/module-health.html','ln-rank/module-manifest.json','functions/_lib/fenxi-session.js']) if(!has(p)) fail(`missing ${p}`);
const meta=JSON.parse(fs.readFileSync(path.join(root,'ln-rank/release-meta.json'),'utf8'));
if(meta.version!=='v3.9.16'||meta.assetVersion!=='v3916') fail('release-meta version mismatch');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'ln-rank/module-manifest.json'),'utf8'));
if(manifest.version!=='v3.9.16'||manifest.assetVersion!=='v3916') fail('module-manifest version mismatch');
for(const p of ['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/major-trend-2025.html','ln-rank/self-check.html','ln-rank/module-health.html']){
  const t=fs.readFileSync(path.join(root,p),'utf8');
  if(!t.includes('3916')) fail(`${p} does not reference 3916`);
  if(/v3913|v3990|v3987|v3982/.test(t)) fail(`${p} still references old visible asset versions`);
}
const sel=fs.readFileSync(path.join(root,'ln-rank/selection-pool.html'),'utf8');
if(!sel.includes('生成清单版报告')||!sel.includes('生成解读版报告')) fail('selection-pool report button copy not updated');
const preset=fs.readFileSync(path.join(root,'ln-rank/js/feature/major-pool/preset-policy.js'),'utf8');
if(/label\": \"定向\"|label\": \"公费师范\"/.test(preset)) fail('frontend preset still displays targeted/public teacher entries');
const backendPreset=fs.readFileSync(path.join(root,'functions/_lib/keyword-preset-policy.js'),'utf8');
if(/公费师范|定向/.test(backendPreset)) fail('backend display keyword preset still includes targeted/public teacher entries');
const kcb=fs.readFileSync(path.join(root,'functions/_lib/kb/knowledge-context-builder.js'),'utf8');
if(/colorWeakness\.aiCopy|colorBlindness\.aiCopy|PHYSICAL_EXAM_KB\.colorWeakness/.test(kcb)) fail('knowledge-context-builder still reads old physical exam schema');
for(const p of ['functions/_lib/feishu-report-builder.js','functions/_lib/feishu-selection-pool-report-builder.js','functions/_lib/feishu-selection-pool-styled-builder.js']){
  const t=fs.readFileSync(path.join(root,p),'utf8');
  if(/\.aiCopy|PHYSICAL_EXAM_KB\.colorWeakness|CAREER_PATH_.*\.aiCopy/.test(t)) fail(`${p} still reads KB aiCopy directly`);
}
const moduleHealth=fs.readFileSync(path.join(root,'ln-rank/module-health.html'),'utf8');
if(/css\/tokens\.css|css\/base\.css|layout-shell\.v/.test(moduleHealth)) fail('module-health still references retired css paths');
const r=spawnSync('node',['tools/analyze-ln-rank-assets-v3916.mjs','--fail-on-warn'],{cwd:root,stdio:'inherit'}); if(r.status!==0) fail('asset analysis failed');
for(const p of ['ln-rank/js/app.v3916.js','ln-rank/js/selection-pool.v3916.js','ln-rank/js/major-trend-render.v3916.js','ln-rank/js/self-check.v3916.js']){ const r2=spawnSync('node',['--check',p],{cwd:root,stdio:'inherit'}); if(r2.status!==0) fail(`syntax ${p}`); }
const api=await import(path.join(root,'functions/api/ln-rank-self-check.js'));
const resp=await api.onRequest();
const data=await resp.json();
if(!data.ok) fail(`self-check api failed: ${(data.errors||[]).join('; ') || data.message || 'unknown'}`);
if(data.version!=='v3.9.16') fail('self-check api version mismatch');
console.log('OK v3916 release check passed');
