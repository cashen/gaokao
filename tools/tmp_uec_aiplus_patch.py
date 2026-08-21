from pathlib import Path


def patch(path, changes):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    original = text
    for label, old, new in changes:
        count = text.count(old)
        if count != 1:
            raise SystemExit(f'{path} / {label}: expected 1 occurrence, got {count}')
        text = text.replace(old, new, 1)
    if text == original:
        raise SystemExit(f'no change for {path}')
    p.write_text(text, encoding='utf-8')
    print('patched', path)


patch('functions/_lib/ai/agent-task-kernel.js', [
    (
        'remembered school firewall',
        "  if(explicitStudentVoice&&explicitMajors.length&&(schools.length||!school))return'student_voice';",
        "  if(explicitStudentVoice&&explicitMajors.length)return'student_voice';"
    )
])

patch('functions/_lib/ai/turn-orchestrator.js', [
    (
        'registry-owned adapter import',
        "  runSchoolMajorHistory,runMajorRegionHistory,runRegionSchoolDirectory,runSchoolOfficialInfo,runFitAssessment,runSchoolBackground,runMajorBackground,runBackgroundDiscovery,runBackgroundFitDiscovery,\n  AI_TOOL_REGISTRY_VERSION\n} from './tool-registry.js';\nimport {runStudentVoice} from './student-voice-tool-adapter.js';",
        "  runSchoolMajorHistory,runMajorRegionHistory,runRegionSchoolDirectory,runSchoolOfficialInfo,runStudentVoice,runFitAssessment,runSchoolBackground,runMajorBackground,runBackgroundDiscovery,runBackgroundFitDiscovery,\n  AI_TOOL_REGISTRY_VERSION\n} from './tool-registry.js';"
    ),
    (
        'explicit student voice focus',
        "function focusForTurn(command={},workspace={}){const prior=workspace?.agentContext?.focus||{},seed=command.focus||{},task=command.agentTask;if(task==='knowledge_explain'){const school=(command.schoolNames||[])[0]||'',major=(command.majorKeywords||[])[0]||'';return agentFocusSeed({school,major,schools:command.schoolNames||[],majors:command.majorKeywords||[],sourceText:command.rawText},{});}const school=seed.school||((['school_major_history','school_history','school_research','school_official_qa','school_experience','student_voice','fit_assessment','school_background'].includes(task))?prior.school:'');const major=seed.major||((['school_major_history','major_region_history','student_voice','fit_assessment','major_background'].includes(task))?prior.major:'');",
        "function focusForTurn(command={},workspace={}){const prior=workspace?.agentContext?.focus||{},seed=command.focus||{},task=command.agentTask;if(task==='knowledge_explain'){const school=(command.schoolNames||[])[0]||'',major=(command.majorKeywords||[])[0]||'';return agentFocusSeed({school,major,schools:command.schoolNames||[],majors:command.majorKeywords||[],sourceText:command.rawText},{});}if(task==='student_voice'){const school=(command.schoolNames||[])[0]||'',major=(command.majorKeywords||[])[0]||'';return agentFocusSeed({school,major,schools:command.schoolNames||[],majors:command.majorKeywords||[],sourceText:command.rawText},{});}const school=seed.school||((['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(task))?prior.school:'');const major=seed.major||((['school_major_history','major_region_history','fit_assessment','major_background'].includes(task))?prior.major:'');"
    ),
    (
        'explicit scope change summary',
        "  else if(command.agentTask==='student_voice'){const scope=focus.school&&focus.major?'school_major':'major';changeText=scope==='school_major'?`这轮只核验${focus.school} · ${focus.major}是否存在明确绑定到学校和专业的大学生声音；来源没有双重身份字段时会直接说明不支持，不会退回全校或跨学校专业评论。`:`这轮只看“${focus.major||focus.majors?.[0]||'这个专业'}”的跨学校大学生声音；它不是专业强弱、就业率或录取依据。`;}",
        "  else if(command.agentTask==='student_voice'){const voiceSchool=(command.schoolNames||[])[0]||'',voiceMajor=(command.majorKeywords||[])[0]||focus.major||'',scope=voiceSchool&&voiceMajor?'school_major':'major';changeText=scope==='school_major'?`这轮只核验${voiceSchool} · ${voiceMajor}是否存在明确绑定到学校和专业的大学生声音；来源没有双重身份字段时会直接说明不支持，不会退回全校或跨学校专业评论。`:`这轮只看“${voiceMajor||'这个专业'}”的跨学校大学生声音；上一轮记住的学校不会自动变成本轮范围，它也不是专业强弱、就业率或录取依据。`;}",
    ),
    (
        'explicit scope execution',
        "      case'student_voice':{\n        const voiceMajor=focus.major||(focus.majors||[])[0]||(command.majorKeywords||[])[0]||'',voiceScope=focus.school&&voiceMajor?'school_major':'major';\n        result.experience=await runStudentVoice(executionContext,{scope:voiceScope,school:voiceScope==='school_major'?focus.school:'',major:voiceMajor,question:command.question||command.rawText||input});result.partial=!result.experience?.ok;break;}",
        "      case'student_voice':{\n        const voiceSchool=(command.schoolNames||[])[0]||'',voiceMajor=(command.majorKeywords||[])[0]||focus.major||'',voiceScope=voiceSchool&&voiceMajor?'school_major':'major';\n        result.experience=await runStudentVoice(executionContext,{scope:voiceScope,school:voiceScope==='school_major'?voiceSchool:'',major:voiceMajor,question:command.question||command.rawText||input});result.partial=!result.experience?.ok;break;}"
    )
])

patch('functions/_lib/ai/tool-registry.js', [
    (
        'registry adapter import',
        "import {isScoreWindow,scoreWithinConstraint} from './human-query-frame.js';",
        "import {isScoreWindow,scoreWithinConstraint} from './human-query-frame.js';\nimport {runStudentVoice as runUnifiedStudentVoice} from './student-voice-tool-adapter.js';"
    ),
    (
        'legacy school experience delegation',
        "export async function runSchoolExperience(context,{school,topic='general'}={}){\n  if(!school)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};\n  const normalizedTopic=normalizeExperienceTopic(topic),request=requestForSchoolExperience(context,{school,topic:normalizedTopic}),delegated=delegatedSchoolExperienceEntry(context,request);if(!delegated.ok)return delegated;const{status,payload}=delegated;if(status<200||status>=300||!payload?.ok)return{ok:false,status,topic:normalizedTopic,code:payload?.error||'school_experience_unavailable',message:clean(payload?.message||'同学体验信息暂不可用。',260)};\n  const sourceMode=payload.mode==='ai_summary'?'summary':payload.mode==='recent_reviews'?'recent_reviews':'no_content',rawSummary=clean(payload.summary,4000),allReviews=(payload.reviews||[]).slice(0,12).map(item=>({id:clean(item?.id,100),content:clean(item?.content||item?.text,1200),createdAt:clean(item?.createdAt||item?.created_at||item?.time,80),author:clean(item?.author||item?.nickname||'匿名同学',80)})).filter(item=>item.content),summary=sourceMode==='summary'&&topicMatches(rawSummary,normalizedTopic)?rawSummary:'',reviews=summary?[]:(normalizedTopic==='general'?allReviews:allReviews.filter(item=>topicMatches(item.content,normalizedTopic))).slice(0,4),mode=summary?'summary':reviews.length?'recent_reviews':'no_content',ok=Boolean(summary||reviews.length),schoolName=clean(payload.school||school,120);\n  return{ok,code:ok?'':'topic_no_content',message:ok?'':topicNoContentMessage(schoolName,normalizedTopic),school:schoolName,topic:normalizedTopic,topicLabel:EXPERIENCE_TOPIC_LABELS[normalizedTopic],mode,summary,reviews,source:{sourceName:'同学体验 · srgaoxiao.com',sourceUrl:clean(payload?.source?.url,900),scope:ok?`${EXPERIENCE_TOPIC_LABELS[normalizedTopic]}相关的来源站摘要或留言`:'来源站内容未命中当前话题'},fetchedAt:clean(payload.fetchedAt,80),adapterVersion:AI_SCHOOL_EXPERIENCE_ADAPTER_VERSION,boundary:'同学体验属于用户生成内容，不等于学校官方事实，也不能代表所有学生。只展示与本轮话题直接相关的摘要或留言；未命中时不拿无关内容代替回答，也不由模型扩写。'};\n}",
        "export async function runSchoolExperience(context,{school,topic='general'}={}){return runUnifiedStudentVoice(context,{scope:'school',school,topic});}\nexport async function runStudentVoice(context,options={}){return runUnifiedStudentVoice(context,options);}"
    )
])

patch('aiplus/app.v3990_1.js', [
    (
        'nullable student voice evidence counts',
        "evidence:{matched:Number.isFinite(Number(evidence.matched))?Number(evidence.matched):null,scanned:Number.isFinite(Number(evidence.scanned))?Number(evidence.scanned):null,pages:Number.isFinite(Number(evidence.pages))?Number(evidence.pages):null,exhaustive:evidence.exhaustive===true,sourceSummary:evidence.sourceSummary===true}",
        "evidence:{matched:evidence.matched===null||evidence.matched===undefined||evidence.matched===''?null:(Number.isFinite(Number(evidence.matched))?Number(evidence.matched):null),scanned:evidence.scanned===null||evidence.scanned===undefined||evidence.scanned===''?null:(Number.isFinite(Number(evidence.scanned))?Number(evidence.scanned):null),pages:evidence.pages===null||evidence.pages===undefined||evidence.pages===''?null:(Number.isFinite(Number(evidence.pages))?Number(evidence.pages):null),exhaustive:evidence.exhaustive===true,sourceSummary:evidence.sourceSummary===true}"
    ),
    (
        'preserve non-transient Student Voice failure payload',
        "if(!retryable||attempt===DETERMINISTIC_RETRY_DELAYS.length){if(tool.kind==='school_history')return deterministicFailureEntry(tool,spec,response.status,payload,error.message);throw error;}",
        "if(!retryable||attempt===DETERMINISTIC_RETRY_DELAYS.length){if(tool.kind==='school_history'||tool.kind==='school_experience')return deterministicFailureEntry(tool,spec,response.status,payload,error.message);throw error;}"
    )
])
