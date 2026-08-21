from pathlib import Path
import re


def patch(path, transform):
    p = Path(path)
    old = p.read_text(encoding='utf-8')
    new = transform(old)
    if new == old:
        raise SystemExit(f'no change for {path}')
    p.write_text(new, encoding='utf-8')
    print('patched', path)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old, new, 1)


def patch_kernel(text):
    text = replace_once(
        text,
        "'school_major_history','school_history','major_region_history','region_school_directory','school_research','school_official_qa','school_experience','fit_assessment',",
        "'school_major_history','school_history','major_region_history','region_school_directory','school_research','school_official_qa','school_experience','student_voice','fit_assessment',",
        'kernel task list')
    anchor = "function looksSchoolExperience(source){return /(学校环境|校园环境|校园氛围|学习氛围|人文关怀|管理人性|管理严格|老师负责|辅导员|同学评价|学生评价|学生口碑|真实体验|同学体验|在校体验|宿舍|住宿|食堂|食宿|寝室|公寓)/.test(String(source||''));}\n"
    addition = anchor + "function looksStudentVoice(source){return /(?:(?:学生|同学|学长|学姐).{0,10}(?:怎么说|评价|口碑|反馈|觉得|认为|体验|感受|后悔|劝退|就业怎么样)|(?:专业|这个专业|该专业).{0,10}(?:学生体验|同学体验|真实体验))/.test(String(source||''));}\nfunction looksOfficialOutcomeMetric(source){return /(?:就业率|毕业去向落实率|去向落实率|升学率|保研率|平均薪资|平均工资|薪资中位数|就业人数|就业数据)/.test(String(source||''));}\n"
    text = replace_once(text, anchor, addition, 'kernel voice helpers')
    old = "  if(looksEducationKnowledgeQuestion(source,{schools,majors:explicitMajors})||looksKnowledgeFollowup(source,priorTask))return'knowledge_explain';\n  const entityKind=clean(entityTurn?.kind,30);"
    new = "  if(looksEducationKnowledgeQuestion(source,{schools,majors:explicitMajors})||looksKnowledgeFollowup(source,priorTask))return'knowledge_explain';\n  const explicitStudentVoice=looksStudentVoice(source)&&!looksOfficialOutcomeMetric(source);\n  if(explicitStudentVoice&&explicitMajors.length&&(schools.length||!school))return'student_voice';\n  const entityKind=clean(entityTurn?.kind,30);"
    text = replace_once(text, old, new, 'kernel voice routing')
    text = replace_once(
        text,
        "case'school_major_history':case'school_history':case'school_research':case'school_official_qa':case'school_experience':case'school_background':case'major_background':case'background_discovery':",
        "case'school_major_history':case'school_history':case'school_research':case'school_official_qa':case'school_experience':case'student_voice':case'school_background':case'major_background':case'background_discovery':",
        'kernel execution policy')
    text = replace_once(
        text,
        "school_experience:'查看学校环境与同学体验',fit_assessment:",
        "school_experience:'查看学校环境与同学体验',student_voice:'查看大学生声音',fit_assessment:",
        'kernel task label')
    return text


def patch_specs(text):
    text = replace_once(
        text,
        "school_research:['officialSchool','profileSupplement','history','background'],school_official_qa:['officialSchool'],school_experience:['experience'],knowledge_explain:['knowledge'],",
        "school_research:['officialSchool','profileSupplement','history','background'],school_official_qa:['officialSchool'],school_experience:['experience'],student_voice:['experience'],knowledge_explain:['knowledge'],",
        'task facts')
    text = replace_once(
        text,
        "'school_research','school_official_qa','school_experience','knowledge_explain','fit_assessment'",
        "'school_research','school_official_qa','school_experience','student_voice','knowledge_explain','fit_assessment'",
        'task list')
    return text


def patch_orchestrator(text):
    text = replace_once(
        text,
        "  runSchoolMajorHistory,runMajorRegionHistory,runRegionSchoolDirectory,runSchoolOfficialInfo,runSchoolExperience,runFitAssessment,runSchoolBackground,runMajorBackground,runBackgroundDiscovery,runBackgroundFitDiscovery,\n  AI_TOOL_REGISTRY_VERSION\n} from './tool-registry.js';",
        "  runSchoolMajorHistory,runMajorRegionHistory,runRegionSchoolDirectory,runSchoolOfficialInfo,runFitAssessment,runSchoolBackground,runMajorBackground,runBackgroundDiscovery,runBackgroundFitDiscovery,\n  AI_TOOL_REGISTRY_VERSION\n} from './tool-registry.js';\nimport {runStudentVoice} from './student-voice-tool-adapter.js';",
        'orchestrator imports')
    text = text.replace("'school_experience','fit_assessment','school_background'", "'school_experience','student_voice','fit_assessment','school_background'")
    text = text.replace("'school_major_history','major_region_history','fit_assessment','major_background'", "'school_major_history','major_region_history','student_voice','fit_assessment','major_background'")
    old_change = "  else if(command.agentTask==='school_experience'){const topic=intentTopic(command),label=EXPERIENCE_TOPIC_LABELS[topic]||'学校与同学体验';changeText=`这轮从“同学”已有学校体验内容里只看${focus.school}与“${label}”直接相关的内容；它是同学体验，不会冒充学校官方结论，也不会拿无关留言代替回答。`;}"
    new_change = "  else if(command.agentTask==='student_voice'){const scope=focus.school&&focus.major?'school_major':'major';changeText=scope==='school_major'?`这轮只核验${focus.school} · ${focus.major}是否存在明确绑定到学校和专业的大学生声音；来源没有双重身份字段时会直接说明不支持，不会退回全校或跨学校专业评论。`:`这轮只看“${focus.major||focus.majors?.[0]||'这个专业'}”的跨学校大学生声音；它不是专业强弱、就业率或录取依据。`;}\n" + old_change
    text = replace_once(text, old_change, new_change, 'orchestrator change summary')
    old_case = "      case'school_experience':\n        result.experience=await runSchoolExperience(executionContext,{school:focus.school,topic:intentTopic(command)});result.partial=!result.experience?.ok;break;"
    new_case = "      case'school_experience':\n        result.experience=await runStudentVoice(executionContext,{scope:'school',school:focus.school,topic:intentTopic(command),question:command.question||command.rawText||input});result.partial=!result.experience?.ok;break;\n      case'student_voice':{\n        const voiceMajor=focus.major||(focus.majors||[])[0]||(command.majorKeywords||[])[0]||'',voiceScope=focus.school&&voiceMajor?'school_major':'major';\n        result.experience=await runStudentVoice(executionContext,{scope:voiceScope,school:voiceScope==='school_major'?focus.school:'',major:voiceMajor,question:command.question||command.rawText||input});result.partial=!result.experience?.ok;break;}"
    text = replace_once(text, old_case, new_case, 'orchestrator cases')
    return text


def patch_advisor(text):
    old = "case'school_research':case'school_official_qa':return'school_official';case'school_experience':return'school_experience';case'fit_assessment':"
    new = "case'school_research':case'school_official_qa':return'school_official';case'school_experience':case'student_voice':return'school_experience';case'fit_assessment':"
    return replace_once(text, old, new, 'advisor stage')


def patch_browser(text):
    pattern = r"function compactSchoolExperienceToolPayload\(data=\{\}\)\{.*?\}\nfunction compactSchoolHistoryToolPayload"
    match = re.search(pattern, text, flags=re.S)
    if not match:
        raise SystemExit('browser compact payload function not found')
    replacement = """function compactSchoolExperienceToolPayload(data={}){const source=data?.source||{},evidence=data?.evidence||{},major=data?.major&&typeof data.major==='object'?data.major:{};return{ok:Boolean(data.ok),mode:String(data.mode||'').slice(0,60),scope:String(data.scope||'').slice(0,30),topic:String(data.topic||'').slice(0,40),error:String(data.error||'').slice(0,100),code:String(data.code||'').slice(0,100),message:String(data.message||'').slice(0,360),school:String(data.school||'').slice(0,120),major:{code:String(major.code||'').slice(0,40),name:String(major.name||'').slice(0,160)},summary:String(data.summary||'').slice(0,4000),reviews:Array.isArray(data.reviews)?data.reviews.slice(0,12).map(item=>({id:String(item?.id||'').slice(0,100),content:String(item?.content||item?.text||'').slice(0,1200),createdAt:String(item?.createdAt||item?.created_at||item?.time||'').slice(0,80),author:String(item?.author||item?.nickname||item?.authorLabel||'匿名同学').slice(0,80)})):[],evidence:{matched:Number.isFinite(Number(evidence.matched))?Number(evidence.matched):null,scanned:Number.isFinite(Number(evidence.scanned))?Number(evidence.scanned):null,pages:Number.isFinite(Number(evidence.pages))?Number(evidence.pages):null,exhaustive:evidence.exhaustive===true,sourceSummary:evidence.sourceSummary===true},source:{name:String(source.name||source.sourceName||'srgaoxiao.com').slice(0,120),url:String(source.url||source.sourceUrl||'').slice(0,900)},fetchedAt:String(data.fetchedAt||'').slice(0,80),transport:String(data.transport||'').slice(0,120),boundary:String(data.boundary||'').slice(0,420),contractVersion:String(data.contractVersion||'').slice(0,100),sourceRegistryVersion:String(data.sourceRegistryVersion||'').slice(0,100),sourceGatewayVersion:String(data.sourceGatewayVersion||'').slice(0,100),bridgeVersion:AI_FACT_BRIDGE_CONTRACT_VERSION};}
function compactSchoolHistoryToolPayload"""
    text = text[:match.start()] + replacement + text[match.end():]
    text = text.replace("label:'学校体验信息'", "label:'大学生声音'")
    return text


patch('functions/_lib/ai/agent-task-kernel.js', patch_kernel)
patch('functions/_lib/ai/task-spec-registry.js', patch_specs)
patch('functions/_lib/ai/turn-orchestrator.js', patch_orchestrator)
patch('functions/_lib/ai/advisor-presentation.js', patch_advisor)
patch('aiplus/app.v3990_1.js', patch_browser)
