import { installPortraitStyles } from './tongxue-school-portrait-style-v160.js?v=160';
import { addIdentityTags, renderPortrait, renderPortraitFailure, renderPortraitLoading } from './tongxue-school-portrait-view-v160.js?v=160';

const VERSION='v1.6.0';
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
  stabilizeButtonCopy();
  const result=document.getElementById('result');
  if(!result)return;
  const enhance=()=>queueMicrotask(()=>enhanceResult(result,options.pageVersion||VERSION));
  new MutationObserver(enhance).observe(result,{childList:true});
  enhance();
}

async function enhanceResult(result,pageVersion){
  if(result.dataset.regionOwned==='1')return;
  const shell=result.querySelector('.result-shell');
  if(!shell)return;
  const badge=shell.querySelector('.badge');
  if(!(badge?.classList.contains('review')||badge?.textContent.includes('AI 摘要')))return;
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
  const cacheKey=VERSION+'|'+school;
  const cached=cache.get(cacheKey);
  if(!refresh&&cached&&cached.expiresAt>Date.now())return clone(cached.data);
  if(!refresh&&inflight.has(cacheKey))return clone(await inflight.get(cacheKey));
  const request=(async()=>{
    const params=new URLSearchParams({school,schema:'160'});
    if(refresh)params.set('refresh','1');
    const response=await fetch('/api/tongxue-school-portrait?'+params.toString(),{cache:'default',headers:{accept:'application/json'},signal});
    const raw=await response.text();
    let data={};
    try{data=JSON.parse(raw||'{}');}catch{throw new Error('学校体验证据返回了无法识别的内容。');}
    if(!response.ok||data.ok===false)throw new Error(data.message||'学校体验证据暂时没有加载完成。');
    if(data.version!==VERSION||data.evidence?.version!==VERSION)throw new Error('学校体验证据版本不一致，请刷新后重试。');
    if(!Array.isArray(data.dimensions)||!data.sample||!Array.isArray(data.evidence?.checklist))throw new Error('学校体验证据数据暂时不完整。');
    cache.set(cacheKey,{data:clone(data),expiresAt:Date.now()+TTL});
    return data;
  })();
  inflight.set(cacheKey,request);
  try{return clone(await request);}finally{if(inflight.get(cacheKey)===request)inflight.delete(cacheKey);}
}

function stabilizeButtonCopy(){
  const button=document.getElementById('queryButton');
  if(!button)return;
  const apply=()=>{if(button.textContent.trim()==='查看学校体验')button.textContent='看看同学怎么说';};
  new MutationObserver(apply).observe(button,{childList:true,subtree:true,characterData:true});
  apply();
}

function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
