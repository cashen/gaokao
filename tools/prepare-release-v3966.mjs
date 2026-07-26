#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, text) => { const target=path.join(root,rel); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,text,'utf8'); };
const VERSION='v3.9.66.0';
const ASSET='v3966_0';
const GENERATED_AT='2026-07-26T11:00:00Z';

function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`${label}: missing ${from}`);
  return text.replaceAll(from,to);
}
function derive(src,dest,mutate){write(dest,mutate(read(src)));}
function update(rel,mutate){const before=read(rel);const after=mutate(before);if(after!==before)write(rel,after);}

// New immutable presentation wrappers; unchanged UI/algorithm cores remain on their verified versions.
derive('ln-rank/js/ux/family-home.v3965_0.js','ln-rank/js/ux/family-home.v3966_0.js',source=>replaceRequired(source,'release-presenter.v3965_0.js?v=3965_0','release-presenter.v3966_0.js?v=3966_0','family home presenter'));
derive('ln-rank/js/major-difficulty-2026.v3965_0.js','ln-rank/js/major-difficulty-2026.v3966_0.js',source=>replaceRequired(source,'release-presenter.v3965_0.js?v=3965_0','release-presenter.v3966_0.js?v=3966_0','difficulty presenter'));
derive('zy2026/assets/zy2026.v3965_0.js','zy2026/assets/zy2026.v3966_0.js',source=>replaceRequired(source,'release-presenter.v3965_0.js?v=3965_0','release-presenter.v3966_0.js?v=3966_0','zy presenter'));
derive('tongxue/app/tongxue-runtime-v159.js','tongxue/app/tongxue-runtime-v159-r3966.js',source=>replaceRequired(source,'release-presenter.v3965_0.js?v=3965_0','release-presenter.v3966_0.js?v=3966_0','tongxue presenter'));

const pages=['index.html','ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/local-mainline.html','ln-rank/211-mainline.html','ln2026.html','zy2026.html','zy2026/index.html','tongxue/index.html','tongxue/changelog.html'];
for(const rel of pages){
 update(rel,source=>{
   let next=source.replaceAll('v3.9.65.0',VERSION);
   next=next.replaceAll('release-presenter.v3965_0.js?v=3965_0','release-presenter.v3966_0.js?v=3966_0');
   if(rel==='index.html') next=next.replaceAll('family-home.v3965_0.js?v=3965_0','family-home.v3966_0.js?v=3966_0');
   if(rel==='ln2026.html') next=next.replaceAll('major-difficulty-2026.v3965_0.js?v=3965_0','major-difficulty-2026.v3966_0.js?v=3966_0');
   if(rel==='zy2026/index.html'||rel==='zy2026.html') next=next.replaceAll('zy2026.v3965_0.js?v=3965_0','zy2026.v3966_0.js?v=3966_0');
   if(rel.startsWith('tongxue/')) next=next.replaceAll('tongxue-runtime-v159.js?v=159','tongxue-runtime-v159-r3966.js?v=3966_0');
   return next;
 });
}

for(const rel of ['ln-rank/active-assets.json','ln-rank/release-meta.json']){
 const data=JSON.parse(read(rel));
 Object.assign(data,{
   version:VERSION,
   assetVersion:ASSET,
   releaseName:'v3.9.66.0-three-year-rank-evidence-no-fenxi',
   generatedAt:GENERATED_AT,
   releaseGate:'three-year-rank-resource-v3966_0, history-evidence-v3966_0, runtime-cache-v3966_0, protected-fenxi-runtime-unchanged',
   sharedResourceCenterVersion:ASSET,
   resourceOwnershipVersion:'resource-ownership-v3966_0',
   uiOrchestrationVersion:'ui-orchestration-v3966_0',
   selectionWorkspaceVersion:'selection-workspace-orchestration-v3966_0',
   searchIntentVersion:'score-school-search-v3966_0',
   runtimeCacheQueryVersion:ASSET,
   runtimeCacheContractVersion:'runtime-cache-coherence-v3966_0',
   mainJs:'js/app.v3966_0.js',
   mainRuntimeJs:'js/app-runtime.v3966_0.js',
   selectionPoolJs:'js/selection-pool.v3966_0.js',
   selectionPoolRuntimeJs:'js/selection-pool-runtime.v3966_0.js',
   familyHomeJs:'js/ux/family-home.v3966_0.js',
   majorDifficultyJs:'js/major-difficulty-2026.v3966_0.js',
   sharedReportResource:'../shared/resources/reports/feishu-report-contract.v3966_0.js',
   runtimeCacheResource:'../shared/resources/release/runtime-cache-contract.v3966_0.js',
   threeYearRankProviderContract:true,
   historicalEvidenceContract:true,
   rankRangeDisplayContract:true,
   conflictBlocksTrendContract:true,
   undergraduatePopulationPolicyContract:true,
   feishuTransportContract:true
 });
 if(data.structure2026) data.structure2026.js='../zy2026/assets/zy2026.v3966_0.js';
 const replacements=new Map([
  ['js/app.v3965_0.js','js/app.v3966_0.js'],['js/app-runtime.v3965_0.js','js/app-runtime.v3966_0.js'],
  ['js/selection-pool.v3965_0.js','js/selection-pool.v3966_0.js'],['js/selection-pool-runtime.v3965_0.js','js/selection-pool-runtime.v3966_0.js'],
  ['../shared/resources/release/runtime-cache-contract.v3965_0.js','../shared/resources/release/runtime-cache-contract.v3966_0.js'],
  ['../shared/resources/release/release-presenter.v3965_0.js','../shared/resources/release/release-presenter.v3966_0.js'],
  ['js/workspace/selection-workspace-orchestrator.v3965_0.js','js/workspace/selection-workspace-orchestrator.v3966_0.js'],
  ['js/feature/major-pool/index.v3964_0.js','js/feature/major-pool/index.v3966_0.js'],
  ['js/feature/major-pool/render.v3964_0.js','js/feature/major-pool/render.v3966_0.js'],
  ['js/feature/school-majors/school-all-mode.v3964_0.js','js/feature/school-majors/school-all-mode.v3966_0.js'],
  ['js/ux/family-home.v3965_0.js','js/ux/family-home.v3966_0.js'],
  ['js/major-difficulty-2026.v3965_0.js','js/major-difficulty-2026.v3966_0.js'],
  ['../zy2026/assets/zy2026.v3965_0.js','../zy2026/assets/zy2026.v3966_0.js'],
  ['../tongxue/app/tongxue-runtime-v159.js','../tongxue/app/tongxue-runtime-v159-r3966.js'],
  ['../shared/resources/reports/feishu-report-contract.v3964_0.js','../shared/resources/reports/feishu-report-contract.v3966_0.js'],
  ['js/feature/major-pool/history-score-render.v3964_0.js','js/feature/major-pool/history-score-render.v3966_0.js'],
  ['js/feature/feishu/index.v3965_0.js','js/feature/feishu/index.v3966_0.js'],
  ['js/feature/feishu/report-controller.v3965_0.js','js/feature/feishu/report-controller.v3966_0.js'],
  ['js/feature/report/payload-builder.v3964_0.js','js/feature/report/payload-builder.v3966_0.js'],
  ['js/feature/feishu/report-api.v3964_0.js','js/feature/feishu/report-api.v3966_0.js'],
  ['js/feature/selection-pool/index.v3964_0.js','js/feature/selection-pool/index.v3966_0.js'],
  ['js/feature/selection-pool/feishu-report-api.v3964_0.js','js/feature/selection-pool/feishu-report-api.v3966_0.js'],
  ['js/shared/feishu-api-client.v3964_0.js','js/shared/feishu-api-client.v3966_0.js']
 ]);
 data.jsEntry=(data.jsEntry||[]).map(x=>replacements.get(x)||x);
 for(const required of ['../shared/resources/exam/historical-score-rank-contract.js','js/feature/major-pool/history-score-render.v3966_0.js']) if(!data.jsEntry.includes(required)) data.jsEntry.push(required);
 if(!data.cssEntry.includes('css/history-evidence.v3966_0.css')) data.cssEntry.push('css/history-evidence.v3966_0.css');
 write(rel,JSON.stringify(data,null,2)+'\n');
}

update('_headers',source=>{
 if(source.includes('# v3966 three-year rank evidence')) return source;
 return source+`\n\n# v3966 three-year rank evidence\n/shared/resources/release/release-presenter.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/shared/resources/release/runtime-cache-contract.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/shared/resources/reports/feishu-report-contract.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/shared/resources/exam/historical-score-rank-contract.js\n  Cache-Control: no-cache, max-age=0, must-revalidate\n/ln-rank/css/history-evidence.v3966_0.css\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/app.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/app-runtime.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/selection-pool.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/selection-pool-runtime.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/workspace/selection-workspace-orchestrator.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/feature/major-pool/history-score-render.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/feature/school-majors/school-all-mode.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/feature/feishu/index.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/feature/feishu/report-controller.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/feature/report/payload-builder.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/ux/family-home.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/ln-rank/js/major-difficulty-2026.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/zy2026/assets/zy2026.v3966_0.js\n  Cache-Control: public, max-age=31536000, immutable\n/tongxue/app/tongxue-runtime-v159-r3966.js\n  Cache-Control: public, max-age=31536000, immutable\n`;
});

console.log(JSON.stringify({ok:true,version:VERSION,assetVersion:ASSET,pages:pages.length},null,2));
