import fs from 'node:fs';

const VERSION='v3.9.62.2';
const ASSET='v3962_2';
const RELEASE='v3.9.62.2-unified-school-mode-no-fenxi';
const now='2026-07-24T16:40:00+08:00';

function write(path,content){fs.writeFileSync(path,content.endsWith('\n')?content:`${content}\n`);}
function replaceText(path){
  let source=fs.readFileSync(path,'utf8');
  source=source
    .replaceAll('v3.9.62.1','v3.9.62.2')
    .replaceAll('v3962_1','v3962_2')
    .replaceAll('3962_1','3962_2')
    .replaceAll('school-all-mode.v3962_1.js','school-all-mode.v3962_2.js')
    .replaceAll('school-all-mode.v3962_1.css','school-all-mode.v3962_2.css')
    .replace(/school-all-mode-v3962_2(?:_1)+/g,'school-all-mode-v3962_2')
    .replace(/school-ui-governance-v3962_2(?:_1)+/g,'school-ui-governance-v3962_2')
    .replaceAll('tools/audit-school-ui-governance-v3962_2.mjs','tools/audit-school-mode-static-v3962_2.mjs')
    .replaceAll('audit-school-ui-governance-v3962_2.mjs','audit-school-mode-static-v3962_2.mjs')
    .replaceAll('browser-school-ui-v3962_2.mjs','browser-school-mode-journey-v3962_2.mjs');
  write(path,source);
}

for(const path of ['ln-rank/release-meta.json','ln-rank/active-assets.json']){
  const meta=JSON.parse(fs.readFileSync(path,'utf8'));
  meta.version=VERSION;
  meta.assetVersion=ASSET;
  meta.releaseName=RELEASE;
  meta.generatedAt=now;
  meta.releaseGate='resource-ownership-v3958-preserved, shared-ui-v3961, selection-workspace-v3961, school-all-v3962_2, static-shared-mode-mount-v3962_2, algorithm-orchestration-v3960, protected-fenxi-runtime-unchanged';
  meta.sharedResourceCenterVersion=ASSET;
  meta.runtimeCacheQueryVersion=ASSET;
  meta.schoolAllModeVersion='school-all-mode-v3962_2';
  meta.schoolUiGovernanceVersion='school-ui-governance-v3962_2';
  meta.schoolModeMountVersion='school-mode-static-mount-v3962_2';
  meta.sharedUiModeSwitchCss='../shared/ui/components/mode-switch.v3962_2.css';
  meta.jsEntry=(meta.jsEntry||[]).map(item=>item.replace('school-all-mode.v3962_1.js','school-all-mode.v3962_2.js'));
  meta.cssEntry=(meta.cssEntry||[]).map(item=>item.replace('school-all-mode.v3962_1.css','school-all-mode.v3962_2.css'));
  if(!meta.cssEntry.includes('../shared/ui/components/mode-switch.v3962_2.css')){
    const semanticIndex=meta.cssEntry.indexOf('../shared/ui/tokens/semantic.v3959_0.css');
    meta.cssEntry.splice(semanticIndex>=0?semanticIndex+1:0,0,'../shared/ui/components/mode-switch.v3962_2.css');
  }
  meta.schoolModeStaticMountContract=true;
  meta.schoolModeSharedSwitchContract=true;
  meta.schoolModeNoRuntimeLayoutInjectionContract=true;
  meta.schoolModeRealFilterJourneyContract=true;
  write(path,JSON.stringify(meta,null,2));
}

const textFiles=[
  'index.html','ln-rank/selection-pool.html','ln2026.html','zy2026.html','zy2026/index.html',
  'tools/ln-2026/verify-final-release-v5.py','tools/audit-ui-orchestration-v3959.mjs',
  'tools/audit-selection-workspace-v3961.mjs','tools/audit-algorithm-orchestration-v3960.mjs',
  'tools/verify-family-decision-v3955.mjs','tools/audit-shared-resource-center-v3957.mjs',
  'tools/check-ln-2026-release.mjs','.github/workflows/verify-ln-2026-final.yml'
];
for(const path of textFiles)replaceText(path);

console.log(JSON.stringify({ok:true,version:VERSION,asset:ASSET,files:textFiles.length+2}));
