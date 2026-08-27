import{pathToFileURL}from'node:url';import{resolve}from'node:path';
const mod=await import('../../shared/resources/schools/school-identity-center.js');
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

// Import the production graph directly. The source gateway now deliberately depends on
// shared Student Voice and canonical-major contracts; copying one module to /tmp would
// create a false test-only module topology and hide dependency ownership.
const api=await import(`${pathToFileURL(resolve('functions/api/tongxue-summary.js')).href}?verify=${Date.now()}`);
let fetches=0;const native=globalThis.fetch;globalThis.fetch=async input=>{fetches++;const url=new URL(typeof input==='string'?input:input.url),path=decodeURIComponent(url.pathname);if(path.endsWith('/api/schools/哈尔滨工业大学（威海）'))return json({id:839,name:'哈尔滨工业大学（威海）',slug:'哈尔滨工业大学（威海）',province:'山东省',city:'威海市',review_count:12});if(path.endsWith('/api/schools/839/ai-summary'))return json({summary:'威海校区独立评价摘要，内容长度足够用于验证实体隔离，不应混入哈尔滨校本部。'});return json({},404)};
const good=await invoke(api.onRequest,'哈尔滨工业大学（威海）','hit-weihai');check('接口实体',good.status===200&&good.payload.entity?.entityId==='hit-weihai'&&good.payload.school==='哈尔滨工业大学（威海）'&&good.payload.scope==='school'&&good.payload.version==='v1.4.1');const before=fetches;const unavailable=await invoke(api.onRequest,'电子科技大学（沙河校区）','uestc-shahe');check('无源站不请求母体',unavailable.status===404&&unavailable.payload.error==='entity_source_not_found'&&fetches===before);const legacy=await invoke(api.onRequest,'辽东学院','admission:辽东学院');check('旧 admission handoff 降级',legacy.status!==400&&legacy.payload.error!=='invalid_entity'&&legacy.payload.legacyEntityFallback===true);const mismatch=await invoke(api.onRequest,'哈尔滨工业大学（深圳）','hit-weihai');check('实体错配',mismatch.status===400);globalThis.fetch=native;
console.log('TONGXUE_ENTITY_RESULTS '+JSON.stringify({entityCount:mod.SCHOOL_ENTITIES_V130.length,childCount:resolver.entityCount,fetches,failures,identityOwner:'shared/resources/schools/school-identity-center.js'}));if(failures.length)process.exitCode=1;
async function invoke(onRequest,school,entity){const url=new URL('https://verification.invalid/api/tongxue-summary');url.searchParams.set('school',school);url.searchParams.set('entity',entity);const response=await onRequest({request:new Request(url),env:{}});return{status:response.status,payload:JSON.parse(await response.text())}}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}})}
