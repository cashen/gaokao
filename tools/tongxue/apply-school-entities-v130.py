#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT=Path('.')
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text):
    target=ROOT/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text,encoding='utf-8')
def replace(path,old,new):
    text=read(path)
    if new in text:return
    if old not in text:raise RuntimeError(f'missing pattern in {path}: {old[:80]}')
    write(path,text.replace(old,new))

# Preserve proven source adapters behind entity-aware route wrappers.
shutil.copyfile('functions/api/tongxue-summary.js','functions/_lib/tongxue-summary-base-v112.js')
portrait_base=read('functions/api/tongxue-school-portrait.js').replace("'../_lib/tongxue-school-portrait-core.js'","'./tongxue-school-portrait-core.js'")
write('functions/_lib/tongxue-school-portrait-base-v120.js',portrait_base)

summary_wrapper="""import{onRequest as baseOnRequest}from'../_lib/tongxue-summary-base-v112.js';
import{resolveEntityRequest,publicSchoolEntity,isEntitySourceAvailable,entitySourceQuery,entitySourceId}from'../../tongxue/data/school-entities-v130.js';
const VERSION='v1.3.0';
export async function onRequest(context){
 const url=new URL(context.request.url),school=String(url.searchParams.get('school')||'').trim(),entityId=String(url.searchParams.get('entity')||'').trim();
 const resolved=resolveEntityRequest(entityId,school);
 if(resolved.error)return out({ok:false,error:resolved.error,message:resolved.error==='entity_school_mismatch'?'学校名称与实体标识不一致。':'学校实体标识无效。',version:VERSION},400);
 const entity=resolved.entity;
 if(entity&&!isEntitySourceAvailable(entity))return out({ok:false,error:'entity_source_not_found',message:'来源站暂时没有该分校或校区的独立记录；本站不会自动使用母体学校评价替代。',school:entity.displayName,entity:publicSchoolEntity(entity),version:VERSION},404);
 const inner=new URL(url);inner.searchParams.set('school',entitySourceQuery(entity,school));inner.searchParams.delete('entity');
 const response=await baseOnRequest({...context,request:new Request(inner.toString(),context.request)}),raw=await response.text();let payload={};try{payload=JSON.parse(raw||'{}')}catch{return new Response(raw,{status:response.status,headers:response.headers})}
 const expected=entitySourceId(entity),actual=payload?.schoolMeta?.id;
 if(expected!==null&&payload.ok&&String(actual)!==String(expected))return out({ok:false,error:'entity_source_conflict',message:'来源站返回了另一个学校实体，已停止展示以避免混入错误评价。',school:entity?.displayName||school,entity:publicSchoolEntity(entity),version:VERSION},502);
 payload.version=VERSION;payload.requestedSchool=school;if(entity){payload.school=entity.displayName;payload.entity=publicSchoolEntity(entity);if(response.status===404){payload.error='entity_source_not_found';payload.message='来源站暂时没有该分校或校区的独立记录；本站不会自动使用母体学校评价替代。';}}
 const headers=new Headers(response.headers);headers.set('x-tongxue-version',VERSION);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});
}
function out(payload,status){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tongxue-version':VERSION}})}
"""
write('functions/api/tongxue-summary.js',summary_wrapper)

portrait_wrapper="""import{onRequest as baseOnRequest}from'../_lib/tongxue-school-portrait-base-v120.js';
import{resolveEntityRequest,publicSchoolEntity,isEntitySourceAvailable,entitySourceQuery,entitySourceId}from'../../tongxue/data/school-entities-v130.js';
const VERSION='v1.3.0';
export async function onRequest(context){
 const url=new URL(context.request.url),school=String(url.searchParams.get('school')||'').trim(),entityId=String(url.searchParams.get('entity')||'').trim();
 const resolved=resolveEntityRequest(entityId,school);
 if(resolved.error)return out({ok:false,error:resolved.error,message:'学校名称与实体标识不一致。',version:VERSION},400);
 const entity=resolved.entity;
 if(entity&&!isEntitySourceAvailable(entity))return out({ok:false,error:'entity_source_not_found',message:'来源站暂时没有该校区的独立画像；本站不会使用母体学校画像替代。',school:entity.displayName,entity:publicSchoolEntity(entity),version:VERSION},404);
 const inner=new URL(url);inner.searchParams.set('school',entitySourceQuery(entity,school));inner.searchParams.delete('entity');
 const response=await baseOnRequest({...context,request:new Request(inner.toString(),context.request)}),raw=await response.text();let payload={};try{payload=JSON.parse(raw||'{}')}catch{return new Response(raw,{status:response.status,headers:response.headers})}
 const expected=entitySourceId(entity),actual=payload?.identity?.sourceSchoolId??payload?.schoolMeta?.id;
 if(expected!==null&&payload.ok&&actual!==undefined&&actual!==null&&String(actual)!==String(expected))return out({ok:false,error:'entity_source_conflict',message:'来源站画像对应另一个学校实体，已停止展示。',school:entity?.displayName||school,entity:publicSchoolEntity(entity),version:VERSION},502);
 payload.version=VERSION;payload.requestedSchool=school;if(entity){payload.school=entity.displayName;payload.entity=publicSchoolEntity(entity);}
 const headers=new Headers(response.headers);headers.set('x-tongxue-portrait-version',VERSION);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});
}
function out(payload,status){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tongxue-portrait-version':VERSION}})}
"""
write('functions/api/tongxue-school-portrait.js',portrait_wrapper)

# Add entity overlay to the official 2,952-school resolver while preserving the official count.
resolver='tongxue/data/school-name-resolver.js'
replace(resolver,"export const SCHOOL_NAME_DATA_URL", "import { createEntityAwareResolver } from './school-entities-v130.js';\n\nexport const SCHOOL_NAME_DATA_URL")
replace(resolver,"  const resolver = createSchoolNameResolver(records);\n  return Object.freeze({ resolver, metadata: resolver.metadata, count: resolver.count, asOfDate: String(payload?.asOfDate || '') });", "  const baseResolver = createSchoolNameResolver(records);\n  const resolver = createEntityAwareResolver(baseResolver, baseResolver.metadata);\n  return Object.freeze({ resolver, metadata: resolver.metadata, count: baseResolver.count, entityCount: resolver.entityCount, asOfDate: String(payload?.asOfDate || '') });")

wrapper="""import{installSchoolEntityUi}from'./tongxue-school-entity-ui-v130.js';
import{installShareMetadataStabilizer}from'../share/tongxue-share-stabilizer-v113.js';
import{installTongxueShare}from'../share/tongxue-share-v130.js?v=130';
import{installSchoolPortrait}from'../portrait/tongxue-school-portrait-v120.js';
installSchoolEntityUi();
await import('./tongxue-performance-v112.js?v=130');
installShareMetadataStabilizer('v1.3.0');
installTongxueShare({pageVersion:'v1.3.0'});
installSchoolPortrait({pageVersion:'v1.3.0'});
"""
write('tongxue/app/tongxue-performance-v130.js',wrapper)

page='tongxue/index.html'
replace(page,'简称和轻微错别字也能识别。','简称、轻微错别字、分校和招生校区也能识别。')
replace(page,'placeholder="输入学校名称，如：东北大学"','placeholder="输入学校或校区，如：哈工威"')
replace(page,'data-example="辽科大">辽科大</button><button class="quick-example" type="button" data-example="大工">大工','data-example="哈工威">哈工威</button><button class="quick-example" type="button" data-example="大工盘锦">大工盘锦')
replace(page,'同学你好 v1.2.1 · 更新于 2026-07-20','同学你好 v1.3.0 · 更新于 2026-07-20')
replace(page,'./app/tongxue-performance-v120.js?v=121','./app/tongxue-performance-v130.js?v=130')

# Update portrait runtime copy and version text.
portrait_ui='tongxue/portrait/tongxue-school-portrait-v120.js'
replace(portrait_ui,"const VERSION='v1.2.0';","const VERSION='v1.3.0';")
replace(portrait_ui,"简称和轻微错别字也能识别。","简称、轻微错别字、分校和招生校区也能识别。")
replace(portrait_ui,"输入学校名称，如：东北大学","输入学校或校区，如：哈工威")

# Test runner adaptations for wrapper imports and v1.3.0 contracts.
verify_live='tools/tongxue/verify-live.mjs'
text=read(verify_live)
text=text.replace("await cp('functions/api/tongxue-summary.js', '/tmp/tongxue-summary.mjs');\nconst { onRequest } = await import(`${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`);", "const entitySource=await readFile('tongxue/data/school-entities-v130.js','utf8');\nconst summaryBase=await readFile('functions/_lib/tongxue-summary-base-v112.js','utf8');\nconst summaryWrapper=(await readFile('functions/api/tongxue-summary.js','utf8')).replace(\"'../_lib/tongxue-summary-base-v112.js'\",\"'./tongxue-summary-base-v112.mjs'\").replace(\"'../../tongxue/data/school-entities-v130.js'\",\"'./school-entities-v130.mjs'\");\nawait writeFile('/tmp/school-entities-v130.mjs',entitySource);\nawait writeFile('/tmp/tongxue-summary-base-v112.mjs',summaryBase);\nawait writeFile('/tmp/tongxue-summary.mjs',summaryWrapper);\nconst { onRequest } = await import(`${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`);")
text=text.replace("row.version === 'v1.1.2'","row.version === 'v1.3.0'").replace("firstPage.version === 'v1.1.2'","firstPage.version === 'v1.3.0'")
write(verify_live,text)

verify_portrait='tools/tongxue/verify-portrait.mjs'
text=read(verify_portrait)
text=text.replace("const functionSource=(await readFile('functions/api/tongxue-school-portrait.js','utf8')).replace(\"'../_lib/tongxue-school-portrait-core.js'\",\"'./tongxue-school-portrait-core.mjs'\");\nawait writeFile('/tmp/tongxue-school-portrait-core.mjs',coreSource);\nawait writeFile('/tmp/tongxue-school-portrait.mjs',functionSource);", "const entitySource=await readFile('tongxue/data/school-entities-v130.js','utf8');\nconst baseSource=(await readFile('functions/_lib/tongxue-school-portrait-base-v120.js','utf8')).replace(\"'./tongxue-school-portrait-core.js'\",\"'./tongxue-school-portrait-core.mjs'\");\nconst functionSource=(await readFile('functions/api/tongxue-school-portrait.js','utf8')).replace(\"'../_lib/tongxue-school-portrait-base-v120.js'\",\"'./tongxue-school-portrait-base-v120.mjs'\").replace(\"'../../tongxue/data/school-entities-v130.js'\",\"'./school-entities-v130.mjs'\");\nawait writeFile('/tmp/school-entities-v130.mjs',entitySource);\nawait writeFile('/tmp/tongxue-school-portrait-core.mjs',coreSource);\nawait writeFile('/tmp/tongxue-school-portrait-base-v120.mjs',baseSource);\nawait writeFile('/tmp/tongxue-school-portrait.mjs',functionSource);")
text=text.replace("first.payload.version==='v1.2.0'","first.payload.version==='v1.3.0'")
write(verify_portrait,text)

verify_share='tools/tongxue/verify-share.mjs'
text=read(verify_share)
text=text.replace("readFile('tongxue/app/tongxue-performance-v120.js','utf8')","readFile('tongxue/app/tongxue-performance-v130.js','utf8')")
text=text.replace("readFile('tongxue/share/tongxue-share-v113.js','utf8')","readFile('tongxue/share/tongxue-share-v130.js','utf8')")
text=text.replace("await writeFile('/tmp/tongxue-share-v113.mjs',share.replace(\"from './tongxue-share-canvas-v113.js?v=114'\",\"from './tongxue-share-canvas-v113.mjs'\"));", "const entities=await readFile('tongxue/data/school-entities-v130.js','utf8');\nawait writeFile('/tmp/school-entities-v130.mjs',entities);\nawait writeFile('/tmp/tongxue-share-v113.mjs',share.replace(\"from'./tongxue-share-canvas-v113.js?v=130'\",\"from'./tongxue-share-canvas-v113.mjs'\").replace(\"from'../data/school-entities-v130.js'\",\"from'./school-entities-v130.mjs'\"));")
text=text.replace("buildShareUrl('https://gaokao.powers.org.cn/tongxue.html?old=1#x','辽宁科技大学')","buildShareUrl('https://gaokao.powers.org.cn/tongxue.html?old=1#x','哈尔滨工业大学（威海）','hit-weihai')")
text=text.replace("canonical==='https://gaokao.powers.org.cn/tongxue/?school=%E8%BE%BD%E5%AE%81%E7%A7%91%E6%8A%80%E5%A4%A7%E5%AD%A6'","canonical.includes('/tongxue/?school=')&&canonical.includes('entity=hit-weihai')")
text=text.replace("html.includes('同学你好 v1.2.0')&&html.includes('/tongxue-performance-v120.js?v=120')","html.includes('同学你好 v1.3.0')&&html.includes('tongxue-performance-v130.js?v=130')")
text=text.replace("wrapper.includes('tongxue-performance-v112.js?v=120')","wrapper.includes('tongxue-performance-v112.js?v=130')")
write(verify_share,text)

directory='tools/tongxue/verify-directory.mjs'
text=read(directory).replace("readFile('tongxue/share/tongxue-share-v113.js','utf8')","readFile('tongxue/share/tongxue-share-v130.js','utf8')")
text=text.replace("./app/tongxue-performance-v120.js?v=121","./app/tongxue-performance-v130.js?v=130").replace("同学你好 v1.2.1 · 更新于 2026-07-20","同学你好 v1.3.0 · 更新于 2026-07-20")
write(directory,text)

entity_test="""import{readFile,writeFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
const mod=await import('../../tongxue/data/school-entities-v130.js');
const base={count:2952,names:['哈尔滨工业大学','华北电力大学'],metadata:new Map([['哈尔滨工业大学',{name:'哈尔滨工业大学',location:'黑龙江 · 哈尔滨',level:'本科'}],['华北电力大学',{name:'华北电力大学',location:'北京',level:'本科'}]]),getMetadata(name){return this.metadata.get(name)||null},resolve(query){return this.names.includes(query)?{status:'resolved',input:query,resolvedName:query,candidates:[],matchType:'official_exact',confidence:1}:{status:'not_found',input:query,resolvedName:null,candidates:[],matchType:'none',confidence:0}},search(){return[]}};
const resolver=mod.createEntityAwareResolver(base,base.metadata),failures=[];
const check=(name,value)=>{if(!value)failures.push(name)};
check('哈工威',resolver.resolve('哈工威').resolvedName==='哈尔滨工业大学（威海）');
check('哈工大歧义',resolver.resolve('哈工大').status==='ambiguous'&&resolver.resolve('哈工大').candidates.length===3);
check('华电歧义',resolver.resolve('华电').candidates.length===2);
check('石油大学歧义',resolver.resolve('中国石油大学').candidates.length===2);
check('克拉玛依',resolver.resolve('中石大克拉玛依').resolvedName.includes('克拉玛依'));
check('地大歧义',resolver.resolve('中国地质大学').candidates.length===2);
check('矿大歧义',resolver.resolve('矿大').candidates.length===2);
check('分校数',resolver.entityCount===12);
check('沙河不回退',mod.isEntitySourceAvailable(mod.getSchoolEntity('uestc-shahe'))===false);
const wrapper=(await readFile('functions/api/tongxue-summary.js','utf8')).replace("'../_lib/tongxue-summary-base-v112.js'","'./tongxue-summary-base-v112.mjs'").replace("'../../tongxue/data/school-entities-v130.js'","'./school-entities-v130.mjs'");
await writeFile('/tmp/school-entities-v130.mjs',await readFile('tongxue/data/school-entities-v130.js','utf8'));await writeFile('/tmp/tongxue-summary-base-v112.mjs',await readFile('functions/_lib/tongxue-summary-base-v112.js','utf8'));await writeFile('/tmp/tongxue-summary-v130.mjs',wrapper);
const api=await import(pathToFileURL('/tmp/tongxue-summary-v130.mjs'));let fetches=0;const native=globalThis.fetch;globalThis.fetch=async input=>{fetches++;const url=new URL(typeof input==='string'?input:input.url),path=decodeURIComponent(url.pathname);if(path.endsWith('/api/schools/哈尔滨工业大学（威海）'))return json({id:839,name:'哈尔滨工业大学（威海）',slug:'哈尔滨工业大学（威海）',province:'山东省',city:'威海市',review_count:12});if(path.endsWith('/api/schools/839/ai-summary'))return json({summary:'威海校区独立评价摘要，内容长度足够用于验证实体隔离，不应混入哈尔滨校本部。'});return json({},404)};
const good=await invoke(api.onRequest,'哈尔滨工业大学（威海）','hit-weihai');check('接口实体',good.status===200&&good.payload.entity?.entityId==='hit-weihai'&&good.payload.school==='哈尔滨工业大学（威海）'&&good.payload.version==='v1.3.0');const before=fetches;const unavailable=await invoke(api.onRequest,'电子科技大学（沙河校区）','uestc-shahe');check('无源站不请求母体',unavailable.status===404&&unavailable.payload.error==='entity_source_not_found'&&fetches===before);const mismatch=await invoke(api.onRequest,'哈尔滨工业大学（深圳）','hit-weihai');check('实体错配',mismatch.status===400);globalThis.fetch=native;
console.log('TONGXUE_ENTITY_RESULTS '+JSON.stringify({entityCount:mod.SCHOOL_ENTITIES_V130.length,childCount:resolver.entityCount,fetches,failures}));if(failures.length)process.exitCode=1;
async function invoke(onRequest,school,entity){const url=new URL('https://verification.invalid/api/tongxue-summary');url.searchParams.set('school',school);url.searchParams.set('entity',entity);const response=await onRequest({request:new Request(url),env:{}});return{status:response.status,payload:JSON.parse(await response.text())}}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}})}
"""
write('tools/tongxue/verify-school-entities-v130.mjs',entity_test)

print('APPLIED_TONGXUE_SCHOOL_ENTITIES_V130')
