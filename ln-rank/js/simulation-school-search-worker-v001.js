import { loadSchoolNameResolver } from '../../tongxue/data/school-name-resolver-v150.js';

let resolverPromise=null;
const resolver=()=>resolverPromise||(resolverPromise=loadSchoolNameResolver());
const text=value=>String(value??'').normalize('NFKC').replace(/\u00a0/g,' ').trim();

// Warm the heavy school directory off the main thread as soon as the worker starts.
void resolver().catch(()=>{});

function candidateView(r,item){
  const name=text(item?.officialName||item?.name);
  const meta=typeof r.getMetadata==='function'?r.getMetadata(name):null;
  return {officialName:name,province:text(meta?.province),city:text(meta?.city),level:text(meta?.level),location:text(meta?.location),score:Number.isFinite(item?.score)?item.score:null,matchType:text(item?.matchType)};
}

self.onmessage=async event=>{
  const {type,id,seq,query}=event.data||{};
  const q=text(query);
  try{
    const r=await resolver();
    if(type==='search'){
      const rows=typeof r.search==='function'?r.search(q,{limit:6}):((await r.resolve(q,{limit:6}))?.candidates||[]);
      self.postMessage({type:'school-candidates',id,seq,candidates:(rows||[]).map(item=>candidateView(r,item)).filter(item=>item.officialName)});
      return;
    }
    if(type==='resolve'){
      const result=await r.resolve(q,{limit:6});
      self.postMessage({type:'school-resolved',id,seq,result});
    }
  }catch(error){
    self.postMessage({type:'school-error',id,seq,message:text(error?.message||error).slice(0,240)});
  }
};
