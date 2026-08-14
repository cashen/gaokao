import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.cwd();
function localResponse(input){
  const raw=input instanceof Request?input.url:String(input);
  const url=new URL(raw,'http://local.test');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file=path.join(root,rel);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()) return new Response('not found',{status:404});
  const body=fs.readFileSync(file);
  const type=file.endsWith('.json')?'application/json; charset=utf-8':'text/plain; charset=utf-8';
  return new Response(body,{status:200,headers:{'content-type':type}});
}
const originalFetch=globalThis.fetch;
globalThis.fetch=async input=>localResponse(input);
const env={ASSETS:{fetch:async input=>localResponse(input)}};
const {onRequest}=await import(`${pathToFileURL(path.join(root,'functions/api/school-majors.js')).href}?vnext=${Date.now()}`);
async function call(params){
  const request=new Request(`http://local.test/api/school-majors?${params.toString()}`);
  const response=await onRequest({request,env});
  const payload=await response.json();
  assert.equal(response.status,200,JSON.stringify(payload));
  assert.equal(payload.ok,true,JSON.stringify(payload));
  assert.equal(payload.source?.mode,'school-runtime-projection-vnext');
  assert.equal(payload.source?.projectionVersion,'ln-rank-school-runtime-projection-vnext-100-shard-v1');
  assert.ok(Number(payload.source?.shardCount)>=1&&Number(payload.source?.shardCount)<=2,JSON.stringify(payload.source));
  assert.equal(Number(payload.source?.rawScanned),Number(payload.source?.exactSchoolRecords));
  assert.equal(Number(payload.meta?.schoolRecordTotal),Number(payload.source?.exactSchoolRecords));
  assert.ok((payload.source?.chunkFiles2026||[]).every(file=>/^school-\d{2}\.json$/.test(file)),JSON.stringify(payload.source));
  return payload;
}
try{
  const main=await call(new URLSearchParams({schoolEntityId:'neu-main',school:'东北大学',limit:'100'}));
  const main580=await call(new URLSearchParams({schoolEntityId:'neu-main',school:'东北大学',candidateScore:'580',limit:'100'}));
  const qhd=await call(new URLSearchParams({schoolEntityId:'neu-qhd',school:'东北大学秦皇岛分校',candidateScore:'580',limit:'100'}));
  assert.ok(main.meta.schoolRecordTotal>0,'东北大学 should have records');
  assert.ok(qhd.meta.schoolRecordTotal>0,'东北大学秦皇岛分校 should have records');
  assert.equal(main.meta.schoolRecordTotal,main580.meta.schoolRecordTotal,'candidate score must not change school truth set');
  assert.equal(main.meta.filteredTotal,main580.meta.filteredTotal,'candidate score must not change unfiltered total');
  const page1=await call(new URLSearchParams({schoolEntityId:'neu-main',school:'东北大学',limit:'20',offset:'0'}));
  if(page1.meta.pagination.hasMore){
    const next=Number(page1.meta.pagination.nextOffset);assert.ok(next>0);
    const page2=await call(new URLSearchParams({schoolEntityId:'neu-main',school:'东北大学',limit:'20',offset:String(next)}));
    const a=new Set(page1.records.map(r=>r.id));for(const r of page2.records)assert.ok(!a.has(r.id),'pagination duplicate id');
  }
  const concurrent=await Promise.all(Array.from({length:50},(_,i)=>call(new URLSearchParams({schoolEntityId:i%2?'neu-main':'neu-qhd',school:i%2?'东北大学':'东北大学秦皇岛分校',candidateScore:String(560+(i%7)),limit:'20'}))));
  assert.equal(concurrent.length,50);
  console.log(JSON.stringify({ok:true,endpoint:'school-majors',mainRecords:main.meta.schoolRecordTotal,qhdRecords:qhd.meta.schoolRecordTotal,concurrent:50,sourceMode:main.source.mode,maxShardCount:Math.max(...concurrent.map(x=>Number(x.source.shardCount||0)))},null,2));
}finally{globalThis.fetch=originalFetch;}
