from pathlib import Path

p=Path('functions/_lib/ai/tool-registry.js')
text=p.read_text(encoding='utf-8')

def once(old,new,label):
    global text
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 occurrence, got {count}')
    text=text.replace(old,new,1)

once(
    "import {isScoreWindow,scoreWithinConstraint} from './human-query-frame.js';",
    "import {isScoreWindow,scoreWithinConstraint} from './human-query-frame.js';\nimport {runStudentVoice as runUnifiedStudentVoice} from './student-voice-tool-adapter.js';",
    'adapter import'
)
old="""function topicMatches(text,topic){const normalized=normalizeExperienceTopic(topic),keywords=EXPERIENCE_TOPIC_KEYWORDS[normalized]||[];return normalized==='general'||keywords.some(word=>String(text||'').includes(word));}
function topicNoContentMessage(school,topic){const label=EXPERIENCE_TOPIC_LABELS[normalizeExperienceTopic(topic)]||'对应体验';return `当前取得的同学留言没有直接提到${school||'这所学校'}的${label}，因此不拿无关留言代替回答。你可以继续核验官方页面公开的硬信息。`;}
export async function runSchoolExperience(context,{school,topic='general'}={}){
  if(!school)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const normalizedTopic=normalizeExperienceTopic(topic),request=requestForSchoolExperience(context,{school,topic:normalizedTopic}),delegated=delegatedSchoolExperienceEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,topic:normalizedTopic,code:payload?.error||'school_experience_unavailable',message:clean(payload?.message||'同学体验信息暂不可用。',260)};
  const sourceMode=payload.mode==='ai_summary'?'summary':payload.mode==='recent_reviews'?'recent_reviews':'no_content',rawSummary=clean(payload.summary,4000),allReviews=(payload.reviews||[]).slice(0,12).map(item=>({id:clean(item?.id,100),content:clean(item?.content||item?.text,1200),createdAt:clean(item?.createdAt||item?.created_at||item?.time,80),author:clean(item?.author||item?.nickname||'匿名同学',80)})).filter(item=>item.content),summary=sourceMode==='summary'&&topicMatches(rawSummary,normalizedTopic)?rawSummary:'',reviews=summary?[]:(normalizedTopic==='general'?allReviews:allReviews.filter(item=>topicMatches(item.content,normalizedTopic))).slice(0,4),mode=summary?'summary':reviews.length?'recent_reviews':'no_content',ok=Boolean(summary||reviews.length),schoolName=clean(payload.school||school,120);
  return{ok,code:ok?'':'topic_no_content',message:ok?'':topicNoContentMessage(schoolName,normalizedTopic),school:schoolName,topic:normalizedTopic,topicLabel:EXPERIENCE_TOPIC_LABELS[normalizedTopic],mode,summary,reviews,source:{sourceName:'同学体验 · srgaoxiao.com',sourceUrl:clean(payload?.source?.url,900),scope:ok?`${EXPERIENCE_TOPIC_LABELS[normalizedTopic]}相关的来源站摘要或留言`:'来源站内容未命中当前话题'},fetchedAt:clean(payload.fetchedAt,80),adapterVersion:AI_SCHOOL_EXPERIENCE_ADAPTER_VERSION,boundary:'同学体验属于用户生成内容，不等于学校官方事实，也不能代表所有学生。只展示与本轮话题直接相关的摘要或留言；未命中时不拿无关内容代替回答，也不由模型扩写。'};
}"""
new="""export async function runSchoolExperience(context,{school,topic='general'}={}){return runUnifiedStudentVoice(context,{scope:'school',school,topic});}
export async function runStudentVoice(context,options={}){return runUnifiedStudentVoice(context,options);}"""
once(old,new,'legacy school experience delegation')
p.write_text(text,encoding='utf-8')
print('patched tool-registry.js')
