from pathlib import Path
import re

registry_path=Path('functions/_lib/ai/tool-registry.js')
verify_path=Path('tools/verify-ai-workspace-v3990_1.mjs')
registry=registry_path.read_text(encoding='utf-8')

anchor="function requestForMajorBands(context,params={}){"
if registry.count(anchor)!=1: raise SystemExit(f'requestForMajorBands anchor count {registry.count(anchor)}')
registry=registry.replace(anchor,"const AI_MAJOR_BAND_KEYS=Object.freeze(['upper','near','steady']);\nfunction requestForMajorBands(context,params={},band=''){",1)
old="url.searchParams.set('bottomLineMode',params.bottomLineMode||'all');url.searchParams.set('specialProjectMode','hide_eligibility_projects');url.searchParams.set('limit',String(Math.max(16,Math.min(24,Number(params.limit||16)))));"
new="url.searchParams.set('bottomLineMode',params.bottomLineMode||'all');url.searchParams.set('specialProjectMode','hide_eligibility_projects');url.searchParams.set('limit',String(Math.max(16,Math.min(24,Number(params.limit||16)))));if(band)url.searchParams.set('band',band);"
if registry.count(old)!=1: raise SystemExit(f'major-bands URL anchor count {registry.count(old)}')
registry=registry.replace(old,new,1)

pattern=r"async function executeMajorBandsOnce\(context,params\)\{.*?\n\}\nfunction mergeCandidateExecutions"
replacement="""async function executeMajorBandsOnce(context,params,band=''){
  const request=requestForMajorBands(context,params,band),delegated=delegatedMajorBandsEntry(context,request);
  if(!delegated.ok)return{...delegated,region:params.region||'all',band};
  const {status,payload}=delegated;
  if(status<200||status>=300||!payload?.ok)return{ok:false,status,message:clean(payload?.message||'专业候选查询失败。',260),payload,region:params.region||'all',band};
  const records=[],counts={upper:0,near:0,steady:0,total:0},bands=band?[band]:AI_MAJOR_BAND_KEYS;
  for(const key of bands){const item=payload?.bands?.[key]||{};counts[key]=Number(item.count||0);for(const record of item.records||[])records.push({...record,bandKey:record.bandKey||key});}
  counts.total=AI_MAJOR_BAND_KEYS.reduce((sum,key)=>sum+Number(counts[key]||0),0);
  return{ok:true,meta:payload.meta,counts,records,searchAdvices:payload.searchAdvices||[],filterConflicts:payload.filterConflicts||[],keywordWarnings:payload.keywordWarnings||[],source:payload.source||{},region:params.region||'all',band};
}
function mergeCandidateExecutions"""
registry2,count=re.subn(pattern,replacement,registry,count=1,flags=re.S)
if count!=1: raise SystemExit(f'executeMajorBandsOnce block count {count}')
registry=registry2

old="regionsQueried:successful.map(x=>x.region)"
if registry.count(old)!=1: raise SystemExit(f'regionsQueried anchor count {registry.count(old)}')
registry=registry.replace(old,"regionsQueried:[...new Set(successful.map(x=>x.region))]",1)

pattern=r"export async function runMajorBandSearch\(context,\{score,majorKeywords=\[\],regionKeys=\['all'\],bottomLineMode='all',schoolKeyword='',platformTarget=''\}=\{\}\)\{.*?\n\}\n\nexport function normalizeOptionalCandidateScore"
replacement="""export async function runMajorBandSearch(context,{score,majorKeywords=[],regionKeys=['all'],bottomLineMode='all',schoolKeyword='',platformTarget=''}={}){
  const numeric=Math.round(Number(score));if(!Number.isFinite(numeric))return{ok:false,code:'score_required',message:'需要参考分数后才能执行候选查询。'};
  const regions=normalizeRegionKeys(regionKeys).slice(0,4),keyword=unique(majorKeywords,8).join('/'),executionRegion=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all');
  const params={score:numeric,rangePreset:'standard',region:executionRegion,majorKeyword:keyword,schoolKeyword,bottomLineMode,limit:16},executions=[];
  for(const band of AI_MAJOR_BAND_KEYS){const execution=await executeMajorBandsOnce(context,params,band);if(execution?.code==='client_tool_required'||execution?.code==='client_tool_invalid')return execution;executions.push(execution);}
  const merged=mergeCandidateExecutions(executions);merged.regionsRequested=regions;if(platformTarget)merged.platformUpgrade=platformUpgradePreview(merged.records,platformTarget);return merged;
}

export function normalizeOptionalCandidateScore"""
registry2,count=re.subn(pattern,replacement,registry,count=1,flags=re.S)
if count!=1: raise SystemExit(f'runMajorBandSearch block count {count}')
registry=registry2
registry_path.write_text(registry,encoding='utf-8')

verify=verify_path.read_text(encoding='utf-8')
old="import { runRankLookup,normalizeOptionalCandidateScore,AI_TOOL_REGISTRY_VERSION } from '../functions/_lib/ai/tool-registry.js';"
new="import { runRankLookup,runMajorBandSearch,normalizeOptionalCandidateScore,AI_TOOL_REGISTRY_VERSION } from '../functions/_lib/ai/tool-registry.js';"
if verify.count(old)!=1: raise SystemExit(f'verifier import count {verify.count(old)}')
verify=verify.replace(old,new,1)

anchor="function testDeterministicComparisonRouting()"
test=r'''async function testAiRequestedBandBridge(){
  const context={request:new Request('https://preview.example/api/ai/turn'),aiDeterministicToolResults:{}};
  const params={score:580,majorKeywords:['电气'],regionKeys:['ln'],bottomLineMode:'all'};
  const seen=[];
  function payloadFor(band){const empty={count:0,records:[]},item={count:1,records:[{id:`${band}-1`,school:`${band}大学`,major:'电气工程及其自动化',bandKey:band}]};return{ok:true,meta:{},counts:{upper:band==='upper'?1:0,near:band==='near'?1:0,steady:band==='steady'?1:0,total:1},bands:{upper:band==='upper'?item:empty,near:band==='near'?item:empty,steady:band==='steady'?item:empty},source:{version:'test'}};}
  for(const expectedBand of ['upper','near','steady']){
    const pending=await runMajorBandSearch(context,params);assert.equal(pending.code,'client_tool_required');assert.equal(pending.toolRequest.kind,'major_bands');const url=new URL(pending.toolRequest.url,'https://preview.example');assert.equal(url.searchParams.get('band'),expectedBand);assert.equal(url.searchParams.get('candidateScore'),'580');assert.equal(url.searchParams.get('majorKeyword'),'电气');assert.equal(url.searchParams.get('region'),'province:辽宁');seen.push(expectedBand);context.aiDeterministicToolResults[pending.toolRequest.key]={kind:'major_bands',key:pending.toolRequest.key,url:pending.toolRequest.url,status:200,payload:payloadFor(expectedBand)};
  }
  const result=await runMajorBandSearch(context,params);assert.equal(result.ok,true);assert.deepEqual(seen,['upper','near','steady']);assert.equal(result.counts.upper,1);assert.equal(result.counts.near,1);assert.equal(result.counts.steady,1);assert.equal(result.counts.total,3);assert.equal(result.records.length,3);assert.deepEqual(result.regionsQueried,['province:辽宁']);assert.deepEqual(result.regionsRequested,['province:辽宁']);
}

'''
if verify.count(anchor)!=1: raise SystemExit(f'test insertion anchor count {verify.count(anchor)}')
verify=verify.replace(anchor,test+anchor,1)

old="function testAiMajorBandsResourceBoundary(){const source=read('functions/_lib/ai/tool-registry.js'),orchestrator=read('functions/_lib/ai/turn-orchestrator.js'),app=read('ai/app.v3990_1.js'),majorBands=read('functions/api/major-bands.js');"
new="function testAiMajorBandsResourceBoundary(){const source=read('functions/_lib/ai/tool-registry.js'),orchestrator=read('functions/_lib/ai/turn-orchestrator.js'),app=read('ai/app.v3990_1.js'),majorBands=read('functions/api/major-bands.js');assert.ok(source.includes(\"AI_MAJOR_BAND_KEYS=Object.freeze(['upper','near','steady'])\"));assert.ok(source.includes(\"if(band)url.searchParams.set('band',band)\"));assert.ok(source.includes('for(const band of AI_MAJOR_BAND_KEYS)'));"
if verify.count(old)!=1: raise SystemExit(f'resource boundary function anchor count {verify.count(old)}')
verify=verify.replace(old,new,1)

old="testPrivacyBudget();await testParentHumanJourneysV3992_1();"
new="testPrivacyBudget();await testAiRequestedBandBridge();await testParentHumanJourneysV3992_1();"
if verify.count(old)!=1: raise SystemExit(f'invocation anchor count {verify.count(old)}')
verify=verify.replace(old,new,1)

old="'ai-major-bands-browser-tool-boundary'"
new="'ai-major-bands-browser-tool-boundary','ai-major-bands-requested-band-sequence'"
if verify.count(old)!=1: raise SystemExit(f'check list anchor count {verify.count(old)}')
verify=verify.replace(old,new,1)
verify_path.write_text(verify,encoding='utf-8')
print('patched tool-registry requested-band deterministic bridge + verifier')
