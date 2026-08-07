import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const OLD_TOKEN='3990_0';
const NEW_TOKEN='3990_1';
const OLD_GEN='v3990_0';
const NEW_GEN='v3990_1';
const OLD_RELEASE='v3.9.90.0';
const NEW_RELEASE='v3.9.90.1';
const SELF='tools/prepare-ai-semantic-release-v3990_1.mjs';
const SELF_WORKFLOW='.github/workflows/prepare-ai-semantic-release-v3990_1.yml';

function exists(rel){return fs.existsSync(path.join(ROOT,rel));}
function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function write(rel,content){const full=path.join(ROOT,rel);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,content);}
function replaceCurrent(text){return String(text).replaceAll(OLD_RELEASE,NEW_RELEASE).replaceAll(OLD_GEN,NEW_GEN).replaceAll(OLD_TOKEN,NEW_TOKEN);}
function stripRef(value){return String(value||'').split('?')[0].replace(/^\//,'');}
function resolveRef(from,ref){
  const cleaned=stripRef(ref);if(!cleaned)return'';
  if(ref.startsWith('/'))return cleaned;
  if(ref.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(from),cleaned));
  return'';
}
function versionedRefs(rel,content){
  const refs=[];const regex=/['"`]([^'"`\s]+v3990_0[^'"`\s]*)['"`]/g;let match;
  while((match=regex.exec(content))){const resolved=resolveRef(rel,match[1]);if(resolved&&exists(resolved))refs.push(resolved);}
  return refs;
}

const seeds=new Set();
for(const rel of ['shared/resources/release/site-runtime-contract.v3990_0.js','shared/resources/release/current-release.js','ln-rank/site-active-generation.v3990_0.json']){
  for(const ref of versionedRefs(rel,read(rel)))seeds.add(ref);
}
const grepFiles=execFileSync('git',['grep','-l','v3990_0'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
for(const rel of grepFiles){
  if(rel.includes('v3990_0'))continue;
  let content='';try{content=read(rel);}catch{continue;}
  for(const ref of versionedRefs(rel,content))seeds.add(ref);
}
// Explicit current generation owners that may not be expressed as import strings.
for(const rel of [
  'shared/resources/release/site-runtime-contract.v3990_0.js',
  'ln-rank/site-active-generation.v3990_0.json',
  'shared/ui/ui-resource-registry.v3990_0.js',
  'shared/governance/production-resource-verification-contract.v3990_0.js'
])if(exists(rel))seeds.add(rel);

const cloned=new Set();
function cloneVersioned(rel){
  if(!rel.includes('v3990_0')||cloned.has(rel)||!exists(rel))return;
  cloned.add(rel);
  const dest=rel.replaceAll('v3990_0','v3990_1');
  const source=read(rel);
  let next=replaceCurrent(source);
  if(dest.endsWith('major-bands-rank-query-kernel.v3990_1.js')) next=next.replace("from './major-filter.js'","from './major-filter.v3990_1.js'");
  if(!exists(dest))write(dest,next);
  for(const ref of versionedRefs(rel,source))cloneVersioned(ref);
}
for(const seed of seeds)cloneVersioned(seed);

// Update unversioned owners/HTML/workflows/audits that point at the active generation.
for(const rel of grepFiles){
  if(rel.includes('v3990_0'))continue;
  if(!exists(rel))continue;
  const before=read(rel);const after=replaceCurrent(before);if(after!==before)write(rel,after);
}

// Canonical release identity gets a product-specific name instead of retaining the old kernel label.
{
  const rel='shared/resources/release/current-release.js';let text=read(rel);
  text=text.replace("release: 'v3.9.90.1-rank-query-kernel'","release: 'v3.9.90.1-ai-semantic-active-view'")
    .replace("releaseName: 'v3.9.90.1-rank-query-kernel'","releaseName: 'v3.9.90.1-ai-semantic-active-view'")
    .replace("label: 'rank-query-kernel'","label: 'ai-semantic-active-view'");
  if(!text.includes("aiWorkspaceVersion:")) text=text.replace("familyActionVersion: 'family-action-v3990_1',", "familyActionVersion: 'family-action-v3990_1',\n  aiWorkspaceVersion: 'ai-workspace-v3990_1',\n  aiSemanticVersion: 'ai-semantic-command-v3990_1',\n  aiInterruptionVersion: 'ai-client-latest-write-wins-v3990_1',");
  if(!text.includes("aiPage: '/ai/'")) text=text.replace("industryMap: '/Public_company/',", "industryMap: '/Public_company/',\n    aiPage: '/ai/',\n    aiRuntime: '/ai/app.v3990_1.js',\n    aiStyles: '/ai/workspace.v3990_1.css',\n    aiWorkspaceContract: '/shared/ai/ai-workspace-contract.v3990_1.js',\n    aiRegionCatalog: '/shared/resources/geo/china-region-catalog.v3990_1.js',\n    aiTurnApi: '/functions/api/ai/turn.js',\n    aiHealthApi: '/functions/api/ai/health.js',\n    aiModelProbeApi: '/functions/api/ai/model-probe.js',\n    aiCommandInterpreter: '/functions/_lib/ai/command-interpreter.js',\n    majorBandsFilter: '/functions/_lib/major-filter.v3990_1.js',");
  write(rel,text);
}

// Extend the new site runtime contract with the AI workbench and the province-aware major-band filter as current-generation resources.
{
  const rel='shared/resources/release/site-runtime-contract.v3990_1.js';let text=read(rel);
  if(!text.includes("aiPage: '/ai/'")){
    text=text.replace("familyPlanRuntime: '/ln-rank/js/selection-pool-runtime.v3990_1.js?v=3990_1'", "familyPlanRuntime: '/ln-rank/js/selection-pool-runtime.v3990_1.js?v=3990_1',\n    aiPage: '/ai/',\n    aiRuntime: '/ai/app.v3990_1.js?v=3990_1',\n    aiStyles: '/ai/workspace.v3990_1.css?v=3990_1',\n    aiWorkspaceContract: '/shared/ai/ai-workspace-contract.v3990_1.js?v=3990_1',\n    majorBandsFilter: '/functions/_lib/major-filter.v3990_1.js',\n    majorBandsRegionCatalog: '/shared/resources/geo/china-region-catalog.v3990_1.js'");
    text=text.replace("familyPlanRuntime: CURRENT", "familyPlanRuntime: CURRENT,\n    aiPage: CURRENT,\n    aiRuntime: CURRENT,\n    aiStyles: CURRENT,\n    aiWorkspaceContract: CURRENT,\n    majorBandsFilter: CURRENT,\n    majorBandsRegionCatalog: CURRENT");
    text=text.replace("familyPlanRuntime: '/ln-rank/js/selection-pool-runtime.v3990_1.js',", "familyPlanRuntime: '/ln-rank/js/selection-pool-runtime.v3990_1.js',\n    ai: '/ai/app.v3990_1.js',\n    aiWorkspace: '/shared/ai/ai-workspace-contract.v3990_1.js',\n    majorBandsFilter: '/functions/_lib/major-filter.v3990_1.js',\n    majorBandsRegionCatalog: '/shared/resources/geo/china-region-catalog.v3990_1.js',");
    text=text.replace("majorBandsPublicHttpSelfFanoutForbidden: true", "majorBandsPublicHttpSelfFanoutForbidden: true,\n    aiModelCannotOwnBusinessFacts: true,\n    aiTemporaryViewCannotBecomeFamilyConstraint: true,\n    aiLatestRequestOnlyCanCommit: true");
  }
  write(rel,text);
}

// Extend the machine-readable manifest.
{
  const rel='ln-rank/site-active-generation.v3990_1.json';const data=JSON.parse(read(rel));
  data.currentGenerationEntrypoints.aiPage='/ai/';data.currentGenerationEntrypoints.aiRuntime='/ai/app.v3990_1.js?v=3990_1';data.currentGenerationEntrypoints.aiStyles='/ai/workspace.v3990_1.css?v=3990_1';data.currentGenerationEntrypoints.aiWorkspaceContract='/shared/ai/ai-workspace-contract.v3990_1.js?v=3990_1';data.currentGenerationEntrypoints.majorBandsFilter='/functions/_lib/major-filter.v3990_1.js';data.currentGenerationEntrypoints.majorBandsRegionCatalog='/shared/resources/geo/china-region-catalog.v3990_1.js';
  data.policies.aiModelCannotOwnBusinessFacts=true;data.policies.aiTemporaryViewCannotBecomeFamilyConstraint=true;data.policies.aiLatestRequestOnlyCanCommit=true;
  write(rel,JSON.stringify(data,null,2)+'\n');
}

// Ensure active major-band API imports the new query generation.
{
  const rel='functions/api/major-bands.js';let text=read(rel);text=replaceCurrent(text);write(rel,text);
}

// Old AI workflow is retired so it cannot assert the previous release on the same PR.
if(exists('.github/workflows/verify-ai-workspace-v3990_0.yml'))fs.rmSync(path.join(ROOT,'.github/workflows/verify-ai-workspace-v3990_0.yml'));

// The one-shot preparation files must not survive into the release candidate.
for(const rel of [SELF,SELF_WORKFLOW])if(exists(rel))fs.rmSync(path.join(ROOT,rel));

// Hard release assertions before the workflow commits anything.
const current=read('shared/resources/release/current-release.js');
if(!current.includes("display: 'v3.9.90.1'")||!current.includes("siteRuntimeGeneration: 'v3990_1'"))throw new Error('release bump incomplete');
if(!exists('shared/resources/release/site-runtime-contract.v3990_1.js'))throw new Error('site runtime contract missing');
if(!exists('ln-rank/site-active-generation.v3990_1.json'))throw new Error('active generation manifest missing');
if(!exists('functions/_lib/major-bands-rank-query-kernel.v3990_1.js'))throw new Error('major bands query kernel missing');
if(!read('functions/_lib/major-bands-rank-query-kernel.v3990_1.js').includes("from './major-filter.v3990_1.js'"))throw new Error('province-aware filter not wired');
if(read('ai/index.html').includes('v3990_0'))throw new Error('AI page still references old generation');
console.log(JSON.stringify({ok:true,release:NEW_RELEASE,generation:NEW_GEN,cloned:[...cloned].length},null,2));
