from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 occurrence, got {count}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')
    print('patched',path,label)

old="export async function runSchoolExperience(context,{school,topic='general'}={}){return runUnifiedStudentVoice(context,{scope:'school',school,topic});}"
new="""export async function runSchoolExperience(context,{school,topic='general'}={}){
  const normalizedTopic=normalizeExperienceTopic(topic),legacyRequest=requestForSchoolExperience(context,{school,topic:normalizedTopic}),delegated=delegatedSchoolExperienceEntry(context,legacyRequest);
  if(!delegated.ok)return delegated;
  const sourceUrl=new URL(context.request.url),unifiedUrl=new URL('/api/tongxue-summary',sourceUrl.origin);unifiedUrl.searchParams.set('scope','school');unifiedUrl.searchParams.set('page','1');if(normalizedTopic!=='general')unifiedUrl.searchParams.set('topic',normalizedTopic);unifiedUrl.searchParams.set('school',clean(school,120));
  const unifiedKey=`${unifiedUrl.pathname}${unifiedUrl.search}`,bridgedContext={...context,aiDeterministicToolResults:{...(context.aiDeterministicToolResults||{}),[unifiedKey]:{kind:'school_experience',key:unifiedKey,url:unifiedKey,status:delegated.status,payload:delegated.payload}}},voice=await runUnifiedStudentVoice(bridgedContext,{scope:'school',school,topic:normalizedTopic}),legacyMode=voice.mode==='ai_summary'?'summary':(['recent_reviews','topic_reviews'].includes(voice.mode)?'recent_reviews':voice.mode),reviews=legacyMode==='summary'?[]:(voice.reviews||[]).slice(0,4),topicLabel=voice.topicLabel||EXPERIENCE_TOPIC_LABELS[normalizedTopic]||'学校与同学体验';
  return{...voice,mode:legacyMode,reviews,source:{sourceName:'同学体验 · srgaoxiao.com',sourceUrl:clean(voice?.source?.url||voice?.source?.sourceUrl,900),scope:voice.ok?`${topicLabel}相关的来源站摘要或留言`:'来源站内容未命中当前话题'},adapterVersion:AI_SCHOOL_EXPERIENCE_ADAPTER_VERSION,boundary:'同学体验属于用户生成内容，不等于学校官方事实，也不能代表所有学生。只展示与本轮话题直接相关的摘要或留言；未命中时不拿无关内容代替回答，也不由模型扩写。'};
}"""
replace_once('functions/_lib/ai/tool-registry.js',old,new,'legacy school experience compatibility')

old2="""  const dorm=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=school&school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&topic=dormitory&page=1')});
  assert.equal(dorm.status,200);const dormPayload=await dorm.json();"""
new2="""  const dorm=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=school&school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&topic=dormitory&page=1')});
  const dormPayload=await dorm.json();
  assert.equal(dorm.status,200,`unexpected dorm response: ${JSON.stringify(dormPayload)}; calls=${calls.map(url=>url.toString()).join(' | ')}`);"""
replace_once('tools/verify-student-voice-source-health-v001.mjs',old2,new2,'source health diagnostics')
replace_once('tools/verify-student-voice-source-health-v001.mjs',"return json({summary:'宿舍四人间，食堂选择也不少。'});","return json({summary:'宿舍四人间，空调和暖气情况都有同学提到，食堂早餐和晚饭选择也比较丰富。'});",'source health valid summary fixture')
