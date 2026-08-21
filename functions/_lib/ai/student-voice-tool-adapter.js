import {
  STUDENT_VOICE_BOUNDARY,
  STUDENT_VOICE_TOPIC_LABELS,
  normalizeStudentVoiceScope,
  normalizeStudentVoiceTopic,
  studentVoiceSampleLevel,
  studentVoiceTextMatchesTopic,
  studentVoiceTopicFromText
} from '../../../shared/resources/experience/student-voice-contract.v001.js';

export const AI_STUDENT_VOICE_ADAPTER_VERSION='ai-student-voice-browser-bridge-v0.01';
const BRIDGE_KIND='school_experience';
const BRIDGE_VERSION='ai-deterministic-browser-tool-bridge-v0.02';
const LEGACY_SCHOOL_EXPERIENCE_COMPATIBILITY='legacy_school_experience';

function clean(value,max=1200){return String(value==null?'':value).trim().slice(0,max);}
function requestKey(request){const url=new URL(request.url);return `${url.pathname}${url.search}`;}
function canonicalScope(value){return normalizeStudentVoiceScope(value,'school');}
function topicFor({scope,topic,question}){
  const normalizedScope=canonicalScope(scope),topicScope=normalizedScope==='school'?'school':'major';
  const explicit=clean(topic,40);
  return normalizeStudentVoiceTopic(explicit||studentVoiceTopicFromText(question||'',{scope:topicScope}),{scope:topicScope,fallback:'general'});
}
function requestForStudentVoice(context,{scope,school='',major='',majorCode='',topic='general'}={}){
  const sourceUrl=new URL(context.request.url),url=new URL('/api/tongxue-summary',sourceUrl.origin);
  url.searchParams.set('scope',canonicalScope(scope));
  url.searchParams.set('page','1');
  if(topic&&topic!=='general')url.searchParams.set('topic',topic);
  if(school)url.searchParams.set('school',clean(school,120));
  if(major)url.searchParams.set('major',clean(major,160));
  if(majorCode)url.searchParams.set('majorCode',clean(majorCode,40).toUpperCase());
  return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});
}
function clientToolRequest(request){const key=requestKey(request);return{kind:BRIDGE_KIND,key,url:key,method:'GET',headers:{accept:'application/json'},bridgeVersion:BRIDGE_VERSION};}
function legacySchoolKey(request){
  const url=new URL(request.url);
  if(url.searchParams.get('scope')!=='school')return'';
  const school=clean(url.searchParams.get('school'),120);
  if(!school)return'';
  const params=new URLSearchParams();
  params.set('school',school);
  params.set('page','1');
  params.set('topic',clean(url.searchParams.get('topic'),40)||'general');
  return `/api/tongxue-summary?${params.toString()}`;
}
function delegatedEntry(context,request){
  const unifiedKey=requestKey(request),results=context?.aiDeterministicToolResults||{};
  let key=unifiedKey,entry=results[unifiedKey],legacyKeyUsed=false;
  if(!entry){const legacyKey=legacySchoolKey(request);if(legacyKey&&results[legacyKey]){key=legacyKey;entry=results[legacyKey];legacyKeyUsed=true;}}
  if(!entry)return{ok:false,code:'client_tool_required',toolRequest:clientToolRequest(request)};
  if(entry.kind!==BRIDGE_KIND||entry.key!==key||entry.url!==key)return{ok:false,code:'client_tool_invalid',message:'大学生声音回传与本轮请求不匹配。'};
  const status=Number(entry.status),payload=entry.payload;
  if(!Number.isFinite(status)||!payload||typeof payload!=='object')return{ok:false,code:'client_tool_invalid',message:'大学生声音回传格式不完整。'};
  return{ok:true,status,payload,legacyKeyUsed};
}
function normalizedReviews(payload={}){
  return (Array.isArray(payload.reviews)?payload.reviews:[]).slice(0,12).map(item=>({
    id:clean(item?.id,100),
    content:clean(item?.content||item?.text,1200),
    createdAt:clean(item?.createdAt||item?.created_at||item?.time,80),
    author:clean(item?.author||item?.nickname||item?.authorLabel||'匿名同学',80)
  })).filter(item=>item.content);
}
function noContentMessage({scope,school,major,topic,mode}){
  const subject=scope==='school'?school:(scope==='school_major'?`${school} · ${major}`:major),label=STUDENT_VOICE_TOPIC_LABELS[topic]||'大学生声音';
  if(mode==='topic_not_found_within_budget')return`本轮已按有界页数查找${subject||'当前对象'}的“${label}”，暂未命中；这不等于来源中不存在，未读取部分不会被算作没有。`;
  return`当前取得的大学生声音没有直接回答${subject||'当前对象'}的“${label}”；本轮不拿其他学校、其他专业或无关留言替代。`;
}
function legacyTopicMatch(text,topic){return topic==='general'||studentVoiceTextMatchesTopic(text,topic,{scope:'school'});}

export async function runStudentVoice(context,{scope='school',school='',major='',majorCode='',topic='',question='',compatibility=''}={}){
  const normalizedScope=canonicalScope(scope),normalizedTopic=topicFor({scope:normalizedScope,topic,question}),schoolName=clean(school,120),majorName=clean(major,160),code=clean(majorCode,40).toUpperCase();
  if((normalizedScope==='school'||normalizedScope==='school_major')&&!schoolName)return{ok:false,code:'school_required',scope:normalizedScope,topic:normalizedTopic,message:'需要先明确一所学校。'};
  if((normalizedScope==='major'||normalizedScope==='school_major')&&!majorName&&!code)return{ok:false,code:'major_required',scope:normalizedScope,topic:normalizedTopic,message:'需要先明确一个具体本科专业。'};
  const request=requestForStudentVoice(context,{scope:normalizedScope,school:schoolName,major:majorName,majorCode:code,topic:normalizedTopic}),delegated=delegatedEntry(context,request);
  if(!delegated.ok)return delegated;
  const{status,payload}=delegated;
  if(status<200||status>=300||payload?.ok!==true){
    return{ok:false,status,scope:normalizedScope,topic:normalizedTopic,topicLabel:STUDENT_VOICE_TOPIC_LABELS[normalizedTopic]||'大学生声音',school:schoolName,major:majorName?{name:majorName,code}:null,code:clean(payload?.error||payload?.code,100)||'student_voice_unavailable',message:clean(payload?.message,360)||'大学生声音来源本轮没有形成可验证内容。',source:payload?.source||{},fetchedAt:clean(payload?.fetchedAt,80),adapterVersion:AI_STUDENT_VOICE_ADAPTER_VERSION,boundary:'大学生声音属于用户生成内容（UGC），只表示来源中的学生表达，不是学校官方事实，也不能代表所有学生；当前范围无法验证时不会自动改用别的学校、别的专业或更宽范围。'};
  }
  const rawReviews=normalizedReviews(payload),rawSummary=clean(payload.summary,4000),rawMode=clean(payload.mode,60),compatibilityMode=normalizedScope==='school'&&(compatibility===LEGACY_SCHOOL_EXPERIENCE_COMPATIBILITY||delegated.legacyKeyUsed===true);
  let mode=rawMode,summary=rawSummary,reviews=rawReviews;
  if(compatibilityMode){
    summary=rawMode==='ai_summary'&&legacyTopicMatch(rawSummary,normalizedTopic)?rawSummary:'';
    reviews=summary?[]:(normalizedTopic==='general'?rawReviews:rawReviews.filter(item=>legacyTopicMatch(item.content,normalizedTopic))).slice(0,4);
    mode=summary?'summary':(reviews.length?'recent_reviews':'no_content');
  }
  const hasContent=Boolean(summary||reviews.length),evidenceMatched=payload?.evidence?.matchCount??payload?.evidence?.matched,matched=Number.isFinite(Number(evidenceMatched))?Number(evidenceMatched):(summary?null:reviews.length),sampleCount=matched===null?reviews.length:Math.max(0,matched),resolvedMajor=payload?.major&&typeof payload.major==='object'?{code:clean(payload.major.code,40)||code,name:clean(payload.major.name,160)||majorName}:{code,name:majorName},topicLabel=STUDENT_VOICE_TOPIC_LABELS[normalizedTopic]||'大学生声音';
  const source=compatibilityMode?{sourceName:'同学体验 · srgaoxiao.com',sourceUrl:clean(payload?.source?.url||payload?.source?.sourceUrl,900),scope:hasContent?`${topicLabel}相关的来源站摘要或留言`:'来源站内容未命中当前话题'}:(payload.source||{});
  return{
    ok:hasContent,
    code:hasContent?'':(rawMode||'student_voice_no_content'),
    message:hasContent?'':noContentMessage({scope:normalizedScope,school:schoolName,major:resolvedMajor.name||majorName,topic:normalizedTopic,mode:rawMode}),
    scope:normalizedScope,
    topic:normalizedTopic,
    topicLabel,
    school:clean(payload.school,120)||schoolName,
    major:(normalizedScope==='major'||normalizedScope==='school_major')?resolvedMajor:null,
    mode,
    summary,
    reviews,
    sampleCount,
    sampleLevel:studentVoiceSampleLevel(sampleCount),
    evidence:payload.evidence||null,
    source,
    fetchedAt:clean(payload.fetchedAt,80),
    transport:clean(payload.transport,120),
    adapterVersion:AI_STUDENT_VOICE_ADAPTER_VERSION,
    boundary:compatibilityMode?'同学体验属于用户生成内容，不等于学校官方事实，也不能代表所有学生。只展示与本轮话题直接相关的摘要或留言；未命中时不拿无关内容代替回答，也不由模型扩写。':`大学生声音属于用户生成内容（UGC），不是学校官方事实、专业客观结论、就业率或录取依据，也不能代表所有学生；认证/点赞只作来源说明，不参与排序或推荐。范围=${normalizedScope}，不允许静默扩大或缩小。`,
    evidenceBoundary:STUDENT_VOICE_BOUNDARY
  };
}