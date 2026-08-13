import {resolveSchoolProfile,SCHOOL_PROFILE_SOURCE_META} from '../../../shared/resources/schools/school-profile-center.js';

export const AI_SCHOOL_PROFILE_SUPPLEMENT_VERSION='ai-school-profile-supplement-v0.02';
export const AI_BAIDU_BAIKE_ORIGIN='https://baike.baidu.com';
export const AI_BAIDU_BAIKE_READER_ORIGIN='https://r.jina.ai';
export const AI_BAIDU_BAIKE_CARD_API='https://baike.baidu.com/api/openapi/BaikeLemmaCardApi';

const MAX_BYTES=900000;
const TIMEOUT_MS=6500;
const CACHE_TTL_MS=24*60*60*1000;
const CACHE_LIMIT=32;
const CACHE=new Map(),INFLIGHT=new Map();
function clean(value,max=4000){return String(value==null?'':value).replace(/\u0000/g,'').trim().slice(0,max);}
function normalize(value){return clean(value,200).normalize('NFKC').replace(/[\s·•，,。；;：:'"“”‘’!！?？_—-]+/g,'').toLowerCase();}
function baikeUrl(school){const url=new URL('/item/'+encodeURIComponent(clean(school,120)),AI_BAIDU_BAIKE_ORIGIN);return url.toString();}
function cardApiUrl(school){const url=new URL(AI_BAIDU_BAIKE_CARD_API);url.searchParams.set('scope','103');url.searchParams.set('format','json');url.searchParams.set('appid','379020');url.searchParams.set('bk_key',clean(school,120));url.searchParams.set('bk_length','1600');return url.toString();}
function readerUrl(url){return `${AI_BAIDU_BAIKE_READER_ORIGIN}/${new URL(url).toString()}`;}
function sourceUrlFromReader(text=''){const match=String(text).match(/^URL Source:\s*(https?:\/\/[^\s]+)\s*$/mi);return match?.[1]||'';}
function titleFromReader(text=''){const match=String(text).match(/^Title:\s*(.+)$/mi);return clean(match?.[1]||'',180);}
function stripMarkdown(value=''){return clean(value,12000).replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[`*_>#|]/g,' ').replace(/\s+/g,' ').trim();}
function safeSentence(sentence=''){const value=clean(sentence,600);if(!value||value.length<18)return false;if(/(截至|现有|目前|在校生|教职工|专任教师|占地|建筑面积|图书|院士|博士点|硕士点|国家级|省级|排名|就业率|升学率|学费|收费|党委书记|校长)/.test(value))return false;if(/(百科星图|参考资料|词条图册|概述图|播报|编辑|收藏|分享)/.test(value))return false;return true;}
function safeBaikeUrl(value=''){let url;try{url=new URL(clean(value,900).replace(/^http:/,'https:'));}catch{return'';}return url.protocol==='https:'&&url.hostname==='baike.baidu.com'?url.toString():'';}
function answerFromExcerpt(excerpt=''){const sentences=stripMarkdown(excerpt).split(/(?<=[。！？；])/).map(item=>item.trim()).filter(safeSentence).slice(0,4);return sentences.length?{answer:`百度百科词条可作为非官方补充：${sentences.join('')}`,excerpt:sentences.join('')}:null;}

export function directorySchoolProfileSupplement(school=''){
  const name=clean(school,120),profile=resolveSchoolProfile(name);if(!profile)return{ok:false,code:'school_directory_not_found',school:name};
  const location=clean(profile.displayLocation,100),level=clean(profile.educationLevel,40),nature=clean(profile.natureLabel,40),department=clean(profile.competentDepartment,120),kind=[nature&&nature!=='性质待核验'?nature:'',level].filter(Boolean).join(''),identity=kind?`是一所${location?`位于${location}的`:''}${kind}高校`:'已列入全国普通高校名单',tier=profile.is985?'985、211':profile.is211?'211':'未标记为985/211',remark=clean(profile.officialRemark,140);
  return{ok:true,school:name,mode:'moe_directory_baseline',answer:`根据教育部全国普通高等学校名单，${name}${identity}${department?`，主管部门为${department}`:''}；统一学校层次名单中${tier}${remark?`。名单备注：${remark}`:''}。这先回答学校身份和基本定位，专业积累、辽宁投档分数及生活体验请看下方分开的证据。`,source:{sourceName:profile.sourceName||'教育部全国普通高等学校名单',sourceUrl:profile.sourceUrl||SCHOOL_PROFILE_SOURCE_META.source.schoolListPageUrl,scope:`只确认学校身份、所在地、办学层次、性质、主管部门及985/211硬标签；名单日期 ${profile.sourceAsOfDate||SCHOOL_PROFILE_SOURCE_META.asOfDate}`},boundary:'教育部高校名单只能确认学校身份和少量硬字段，不能据此推出专业强弱、校园环境、就业质量或录取概率；这些问题必须分别使用对应证据。',profile:{standardSchoolName:profile.standardSchoolName||name,schoolIdentifier:profile.schoolIdentifier||'',location,nature,level,department,is985:Boolean(profile.is985),is211:Boolean(profile.is211),entityTypeLabel:profile.entityTypeLabel||''},version:AI_SCHOOL_PROFILE_SUPPLEMENT_VERSION};
}

export function extractBaiduBaikeCard(payload={},school=''){
  if(!payload||typeof payload!=='object')return{ok:false,code:'baike_card_invalid'};const title=clean(payload.title||payload.lemmaTitle||payload.key,180),sourceUrl=safeBaikeUrl(payload.totalUrl||payload.url||payload.wapUrl);
  if(!title||!normalize(title).includes(normalize(school)))return{ok:false,code:'baike_school_mismatch'};if(!sourceUrl)return{ok:false,code:'baike_source_invalid'};
  const answer=answerFromExcerpt(payload.abstract||payload.desc||payload.description||'');if(!answer)return{ok:false,code:'baike_profile_empty'};
  return{ok:true,school:clean(school,120),answer:clean(answer.answer,1800),excerpt:clean(answer.excerpt,1600),source:{sourceName:'百度百科词条补充（非官方）',sourceUrl,scope:'仅补充学校概况与沿革；不用于招生分数、学费、就业率、排名或时点数据'},boundary:'百度百科不是学校官方来源。本段只在阳光高考学校简介正文不可用时补充概况，并过滤易变化的规模、师资、排名、收费和就业数字；正式招生事实仍以官方与站内确定性数据为准。',version:AI_SCHOOL_PROFILE_SUPPLEMENT_VERSION};
}

export function extractBaiduBaikeProfile(text='',school=''){
  const raw=clean(text,MAX_BYTES),sourceUrl=sourceUrlFromReader(raw),title=titleFromReader(raw);
  let parsed;try{parsed=new URL(sourceUrl);}catch{return{ok:false,code:'baike_source_invalid'};}
  if(parsed.protocol!=='https:'||parsed.hostname!=='baike.baidu.com')return{ok:false,code:'baike_source_invalid'};
  if(!normalize(title).includes(normalize(school)))return{ok:false,code:'baike_school_mismatch'};
  const body=raw.split(/^Markdown Content:\s*$/mi)[1]||'';
  const overview=(body.split(/\n#{1,4}\s*(?:历史沿革|办学历史|学术研究|办学条件|文化传统|校园环境)/)[0]||body).replace(/^.*?概述\s*/s,'');
  const answer=answerFromExcerpt(overview);if(!answer)return{ok:false,code:'baike_profile_empty'};
  return{ok:true,school:clean(school,120),answer:clean(answer.answer,1800),excerpt:clean(answer.excerpt,1600),source:{sourceName:'百度百科词条补充（非官方）',sourceUrl,scope:'仅补充学校概况与沿革；不用于招生分数、学费、就业率、排名或时点数据'},boundary:'百度百科不是学校官方来源。本段只在阳光高考学校简介正文不可用时补充概况，并过滤易变化的规模、师资、排名、收费和就业数字；正式招生事实仍以官方与站内确定性数据为准。',version:AI_SCHOOL_PROFILE_SUPPLEMENT_VERSION};
}

async function fetchSchoolProfileSupplement(name,fetchImpl){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    try{const cardResponse=await fetchImpl(cardApiUrl(name),{headers:{accept:'application/json'},redirect:'follow',signal:controller.signal});if(cardResponse.ok){const declared=Number(cardResponse.headers?.get?.('content-length')||0);if(declared<=MAX_BYTES){const raw=(await cardResponse.text()).slice(0,MAX_BYTES);let payload=null;try{payload=JSON.parse(raw);}catch{}const card=extractBaiduBaikeCard(payload,name);if(card.ok)return card;}}}catch{}
    const response=await fetchImpl(readerUrl(baikeUrl(name)),{headers:{accept:'text/plain; charset=utf-8','x-timeout':'15'},redirect:'follow',signal:controller.signal});if(!response.ok)return{ok:false,code:'baike_source_unavailable',status:response.status};
    const declared=Number(response.headers?.get?.('content-length')||0);if(declared>MAX_BYTES)return{ok:false,code:'baike_source_too_large'};const result=extractBaiduBaikeProfile((await response.text()).slice(0,MAX_BYTES),name);return result.ok?result:{...result,school:name};
  }catch(error){return{ok:false,code:'baike_source_unavailable',school:name,message:clean(error?.message||error,180)};}finally{clearTimeout(timer);}
}

export async function loadSchoolProfileSupplement({school,fetchImpl=fetch}={}){
  const name=clean(school,120);if(!name)return{ok:false,code:'school_required'};const key=normalize(name),cached=CACHE.get(key);
  if(cached&&cached.expiresAt>Date.now()){CACHE.delete(key);CACHE.set(key,cached);return cached.payload;}if(cached)CACHE.delete(key);
  const directory=directorySchoolProfileSupplement(name);if(directory.ok){CACHE.set(key,{payload:directory,expiresAt:Date.now()+CACHE_TTL_MS});while(CACHE.size>CACHE_LIMIT)CACHE.delete(CACHE.keys().next().value);return directory;}
  if(INFLIGHT.has(key))return INFLIGHT.get(key);
  const pending=fetchSchoolProfileSupplement(name,fetchImpl).then(payload=>{if(payload?.ok){CACHE.set(key,{payload,expiresAt:Date.now()+CACHE_TTL_MS});while(CACHE.size>CACHE_LIMIT)CACHE.delete(CACHE.keys().next().value);}return payload;}).finally(()=>INFLIGHT.delete(key));INFLIGHT.set(key,pending);return pending;
}
