import { installPortraitStyles } from './tongxue-school-portrait-style-v120.js';
import { addIdentityTags, renderPortrait, renderPortraitFailure, renderPortraitLoading } from './tongxue-school-portrait-view-v120.js';

const VERSION='v1.5.2';
const TTL=600000;
const cache=new Map();
const inflight=new Map();
let installed=false;
let activeController=null;
let activeSchool='';

export function installSchoolPortrait(options={}){
  if(installed||typeof document==='undefined')return;
  installed=true;
  installPortraitStyles();
  const result=document.getElementById('result');
  if(!result)return;
  const enhance=()=>queueMicrotask(()=>enhanceResult(result,options.pageVersion||VERSION));
  new MutationObserver(enhance).observe(result,{childList:true,subtree:true});
  enhance();
}

async function enhanceResult(result,pageVersion){
  const shell=result.querySelector('.result-shell');
  if(!shell)return;
  const badge=shell.querySelector('.badge');
  if(!(badge?.classList.contains('review')||badge?.textContent.includes('AI 摘要')||badge?.textContent.includes('公开评论摘要')))return;
  const school=shell.querySelector('#resultTitle')?.textContent.trim();
  if(!school||shell.dataset.portraitSchool===school)return;
  shell.dataset.portraitSchool=school;
  activeController?.abort();
  activeController=new AbortController();
  activeSchool=school;
  const mount=document.createElement('section');
  renderPortraitLoading(mount);
  const divider=shell.querySelector('.divider');
  if(divider)divider.before(mount);else shell.append(mount);
  await loadInto({shell,mount,school,pageVersion,signal:activeController.signal});
}

async function loadInto({shell,mount,school,pageVersion,signal,refresh=false}){
  try{
    const data=await fetchPortrait(school,{signal,refresh});
    if(activeSchool!==school||!mount.isConnected)return;
    addIdentityTags(shell,data.identity?.tags||[]);
    renderPortrait(mount,data,pageVersion);
  }catch(error){
    if(error?.name==='AbortError'||activeSchool!==school||!mount.isConnected)return;
    renderPortraitFailure(mount,async()=>{
      renderPortraitLoading(mount,true);
      const controller=new AbortController();
      activeController=controller;
      await loadInto({shell,mount,school,pageVersion,signal:controller.signal,refresh:true});
    });
  }
}

async function fetchPortrait(school,{signal,refresh=false}={}){
  const cached=cache.get(school);
  if(!refresh&&cached&&cached.expiresAt>Date.now())return clone(cached.data);
  if(!refresh&&inflight.has(school))return clone(await inflight.get(school));
  const request=(async()=>{
    const params=new URLSearchParams({school});
    if(refresh)params.set('refresh','1');
    const response=await fetch('/api/tongxue-school-portrait?'+params.toString(),{cache:'default',headers:{accept:'application/json'},signal});
    const raw=await response.text();
    let data={};
    try{data=JSON.parse(raw||'{}');}catch{throw new Error('学校体验画像返回了无法识别的内容。');}
    if(!response.ok||data.ok===false)throw new Error(data.message||'学校体验画像暂时没有加载完成。');
    if(!Array.isArray(data.dimensions)||!data.sample)throw new Error('学校体验画像数据暂时不完整。');
    cache.set(school,{data:clone(data),expiresAt:Date.now()+TTL});
    return data;
  })();
  inflight.set(school,request);
  try{return clone(await request);}finally{if(inflight.get(school)===request)inflight.delete(school);}
}

function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
