export const AIPLUS_TURN_RUNTIME_VERSION='aiplus-turn-runtime-v0.02';

export async function runBoundedBatch(items,worker,{concurrency=3}={}){
  const source=Array.isArray(items)?items:[],limit=Math.max(1,Math.min(4,Math.round(Number(concurrency)||3))),results=new Array(source.length);let cursor=0;
  async function run(){while(cursor<source.length){const index=cursor++;try{results[index]={status:'fulfilled',value:await worker(source[index],index)};}catch(reason){results[index]={status:'rejected',reason};}}}
  await Promise.all(Array.from({length:Math.min(limit,source.length)},()=>run()));
  return results;
}

export function deterministicToolBatchConcurrency(items=[],fallback=3){
  const source=Array.isArray(items)?items:[],safeFallback=Math.max(1,Math.min(4,Math.round(Number(fallback)||3)));
  return source.some(item=>item?.kind==='major_bands')?1:safeFallback;
}

export function uniqueToolRequests(items=[],max=24){
  const out=[],seen=new Set();
  for(const item of items||[]){const key=String(item?.key||'');if(!key||seen.has(key))continue;seen.add(key);out.push(item);if(out.length>=max)break;}
  return out;
}
