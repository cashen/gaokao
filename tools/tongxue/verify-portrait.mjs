import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const artifactDir='/tmp/tongxue-live-artifact';
await mkdir(artifactDir,{recursive:true});
const coreSource=await readFile('functions/_lib/tongxue-school-portrait-core.js','utf8');
const entitySource=await readFile('shared/resources/schools/school-identity-center.js','utf8');
const baseSource=(await readFile('functions/_lib/tongxue-school-portrait-base-v120.js','utf8')).replace("'./tongxue-school-portrait-core.js'","'./tongxue-school-portrait-core.mjs'");
const functionSource=(await readFile('functions/api/tongxue-school-portrait.js','utf8')).replace("'../_lib/tongxue-school-portrait-base-v120.js'","'./tongxue-school-portrait-base-v120.mjs'").replace("'../../tongxue/data/school-entities-v130.js'","'./school-entities-v130.mjs'");
await writeFile('/tmp/school-entities-v130.mjs',entitySource);
await writeFile('/tmp/tongxue-school-portrait-core.mjs',coreSource);
await writeFile('/tmp/tongxue-school-portrait-base-v120.mjs',baseSource);
await writeFile('/tmp/tongxue-school-portrait.mjs',functionSource);
const core=await import(pathToFileURL('/tmp/tongxue-school-portrait-core.mjs'));
const portraitFunction=await import(pathToFileURL('/tmp/tongxue-school-portrait.mjs'));
const failures=[];

const reviews=Array.from({length:12},(_,index)=>({
  id:index+1,content:index<2?`转专业和校区安排问题 ${index+1}`:`学校体验 ${index+1}`,
  isQuestion:index<2,isVerified:index%3===0,campus:index%2?'浑南校区':'南湖校区',
  createdAt:new Date(Date.now()-index*86400000).toISOString(),replies:index<2?4-index:0,likes:index,
  rating:{dimensions:{employment:4.3,culture:3.9,faculty:3.8,environment:4.1,dormitory:3.2,cafeteria:3.7,...(index<2?{safety:4.5}:{})}},
  sourceUrl:`https://srgaoxiao.com/school/test?review=${index+1}`
}));
const portrait=core.buildSchoolPortrait({schoolMeta:{name:'测试大学',province:'辽宁省',city:'沈阳市',type:'本科',reviewCount:20,tags:'985 211 双一流'},reviews,fetchedAt:new Date().toISOString()});
const employment=portrait.dimensions.find(item=>item.key==='employment');
const safety=portrait.dimensions.find(item=>item.key==='safety');
const coreChecks={
  sevenDimensions:portrait.dimensions.length===7,
  normalThreshold:employment?.confidence==='enough'&&employment.score===4.3&&employment.sampleSize===12,
  insufficientHidden:safety?.confidence==='insufficient'&&safety.score===null&&safety.rawScore===4.5,
  evidence:portrait.sample.evidenceLevel==='medium'&&portrait.sample.questionCount===2,
  campuses:portrait.campuses.length===2,
  questions:portrait.questions.length===2&&portrait.questions[0].replies>=portrait.questions[1].replies,
  tags:portrait.identity.tags.join('|')==='985|211|双一流',
  attention:portrait.attentionPoints.some(item=>item.text.includes('宿舍体验'))
};
for(const [name,passed] of Object.entries(coreChecks))if(!passed)failures.push('core:'+name);

const nativeFetch=globalThis.fetch;
const nativeCaches=globalThis.caches;
let fetchCount=0;
globalThis.fetch=async(input)=>{
  fetchCount+=1;
  const url=new URL(typeof input==='string'?input:input.url);
  const path=decodeURIComponent(url.pathname);
  if(path.endsWith('/api/schools/测试大学'))return json({id:801,name:'测试大学',slug:'测试大学',province:'辽宁省',city:'沈阳市',type:'本科',review_count:8,full_tags:'985,211,双一流'});
  if(path.endsWith('/api/reviews/school/801')){
    const page=Number(url.searchParams.get('page')||1);
    const rows=page===1?reviews.slice(0,6):reviews.slice(6,8);
    return json({data:rows,page,pageSize:6,total:8,totalPages:2});
  }
  return json({},404);
};
const memory=createMemoryCache();
globalThis.caches={default:memory};
const first=await invoke(portraitFunction.onRequest,'测试大学');
const second=await invoke(portraitFunction.onRequest,'测试大学');
const functionChecks={
  response:first.status===200&&first.payload.ok&&first.payload.version==='v1.3.0',
  shape:first.payload.dimensions?.length===7&&Array.isArray(first.payload.questions)&&Array.isArray(first.payload.campuses),
  sanitization:!JSON.stringify(first.payload).includes('<script'),
  requestBudget:fetchCount===3,
  cache:first.cache==='MISS'&&second.cache==='HIT'&&memory.size()===1,
  identityOwner:entitySource.includes("E('dlut-panjin'")
};
for(const [name,passed] of Object.entries(functionChecks))if(!passed)failures.push('function:'+name);

globalThis.fetch=nativeFetch;
if(nativeCaches===undefined)delete globalThis.caches;else globalThis.caches=nativeCaches;
const liveSchools=String(process.env.PORTRAIT_LIVE_SCHOOLS||'东北大学,辽宁大学').split(',').map(value=>value.trim()).filter(Boolean);
const live=[];
for(const school of liveSchools){
  const result=await invoke(portraitFunction.onRequest,school,{refresh:true});
  live.push({school,status:result.status,ok:Boolean(result.payload.ok),dimensions:result.payload.dimensions?.length||0,fetchedReviews:result.payload.sample?.fetchedReviews??null,cache:result.cache});
  if(!(result.status===200&&result.payload.ok&&result.payload.dimensions?.length===7))failures.push('live:'+school);
}

const report={generatedAt:new Date().toISOString(),identityOwner:'shared/resources/schools/school-identity-center.js',coreChecks,functionChecks,live,fetchCount,failures};
await writeFile(`${artifactDir}/tongxue-portrait-results.json`,JSON.stringify(report,null,2));
console.log('TONGXUE_PORTRAIT_RESULTS '+JSON.stringify(report));
if(failures.length)process.exitCode=1;

async function invoke(onRequest,school,{refresh=false}={}){
  const url=new URL('https://verification.invalid/api/tongxue-school-portrait');
  url.searchParams.set('school',school);if(refresh)url.searchParams.set('refresh','1');
  const response=await onRequest({request:new Request(url),env:{}});
  const payload=JSON.parse(await response.text());
  return{status:response.status,payload,cache:response.headers.get('x-tongxue-portrait-cache')};
}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}});}
function createMemoryCache(){const store=new Map();return{async match(req){return store.get(req.url)?.clone();},async put(req,res){store.set(req.url,res.clone());},size(){return store.size;}};}
