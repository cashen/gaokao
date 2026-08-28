import {BROAD_MAJOR_TERMS,MAJOR_LANGUAGE_TERMS,normalizeMajorLanguage} from './major-language-resolver.js';

export const AI_KNOWLEDGE_LANGUAGE_VERSION='ai-education-knowledge-language-v0.05';

const POLITE_PREFIX='(?:(?:你好|请问|请|麻烦|帮我|给我|我想知道|想知道|想问|问下|问一下)[，,：:\\s]*)?';
const DEFINITION_RE=/(是什么(?:意思)?|什么意思|啥意思|指什么|怎么理解|怎么回事|解释(?:下|一下)?|介绍(?:下|一下)?.{0,12}(?:意思|概念|是什么)|讲讲.{0,18}(?:是什么|概念|区别)?|说说.{0,18}(?:是什么|概念|区别)?|属于什么|算什么|是干什么的?|是干嘛的?|有什么(?:区别|差别)|区别是什么|差别是什么|怎么区分)/;
const WHAT_IS_PREFIX_RE=new RegExp(`^${POLITE_PREFIX}(?:什么是|啥是|何为)[，,：:\\s]*`);
const INTRODUCTION_ACTION='(?:介绍(?:下|一下)?|讲讲|讲(?:下|一下)|说说|说(?:下|一下)|聊聊|聊(?:下|一下)|了解(?:下|一下)?)';
const INTRODUCTION_RE=new RegExp(`^${POLITE_PREFIX}${INTRODUCTION_ACTION}[，,：:\\s]*`);
const INTRODUCTION_SUFFIX_RE=new RegExp(`${INTRODUCTION_ACTION}(?:呢|吧)?[？?。！!\\s]*$`);
const RULE_QUESTION_RE=/(有什么要求|有哪些要求|需要什么(?:条件|资格|材料)|有什么(?:条件|资格)|什么(?:条件|资格)|(?:谁|哪些人|什么人)(?:能|可以)报|怎么(?:报|报名|申请)|如何(?:报|报名|申请)|怎么规定|如何规定|(?:报名)?截止(?:到)?什么时候|什么时候(?:报名|截止)|(?:今年|当年|现在|目前)还有吗)/;
const KNOWLEDGE_HINT_RE=/(高校专项|专项计划|国家专项|地方专项|辽宁省高校专项|强基计划|综合评价|公费师范|优师计划|定向医学生|农村订单|高水平运动队|民族班|预科|特殊类型招生|特控线|本科线|省控线|投档线|录取线|专业线|位次|投档|录取|退档|滑档|调剂|征集志愿|平行志愿|招生计划|专业\+学校|专业类|本科专业|一级学科|二级学科|学科门类|专业学位|学术学位|学硕|专硕|职业本科|高职专科|职业教育|985|211|双一流|一流本科专业|工程教育认证|学科评估|国家重点学科|硕士点|博士点|博士后|推免|保研|大类招生|专业分流|培养方案|转专业|中外合作|国际班|联合学院|选科要求|物化|物化生|首选科目|再选科目|色弱|色盲|单色识别|体检限报|助学贷款|国家奖学金|助学金|工业控制|智能制造|材料加工|储能|集成电路|半导体|低空经济|低空技术|机器人|职业分类|职业资格|行业|就业方向|新工科)/;
const SCHOOL_IDENTITY_RE=/(什么学校|学校是什么|学校定位|办学定位|什么来头|公办还是民办|几本)/;
const CURRENT_PREFIX_RE=/^(?:今年|当年|本年度|现在|目前|最新|202\d年?)[，,：:\s]*/;
const RULE_SUFFIX_RE=/(?:今年|当年|本年度|现在|目前|最新|202\d年?)?[，,：:\s]*(?:有什么要求|有哪些要求|需要什么(?:条件|资格|材料)|有什么(?:条件|资格)|什么(?:条件|资格)|(?:谁|哪些人|什么人)(?:能|可以)报|怎么(?:报|报名|申请)|如何(?:报|报名|申请)|怎么规定|如何规定|(?:报名)?截止(?:到)?什么时候|什么时候(?:报名|截止)|(?:今年|当年|现在|目前)还有吗)$/;
const SCORE_OR_REACHABILITY_RE=/(多少分|投档分|录取分|最低分|位次|能不能上|能不能报|够不够)/;
const MAJOR_SUBJECT_TERMS=new Set([...MAJOR_LANGUAGE_TERMS,...BROAD_MAJOR_TERMS]);

function text(value){return String(value==null?'':value).normalize('NFKC').trim();}
function normalizeKnownMajorSubject(value=''){
  const source=text(value),normalized=normalizeMajorLanguage(source);
  return normalized&&MAJOR_SUBJECT_TERMS.has(normalized)?normalized:source;
}

export function looksEducationKnowledgeQuestion(value='',{schools=[],majors=[]}={}){
  const source=text(value),definitionQuestion=DEFINITION_RE.test(source)||WHAT_IS_PREFIX_RE.test(source),ruleQuestion=RULE_QUESTION_RE.test(source),introductionQuestion=INTRODUCTION_RE.test(source)||INTRODUCTION_SUFFIX_RE.test(source);
  if(!source||(!definitionQuestion&&!ruleQuestion&&!introductionQuestion))return false;
  const explicitSchools=Array.isArray(schools)?schools.filter(Boolean):[];
  const explicitMajors=Array.isArray(majors)?majors.filter(Boolean):[];
  const hasKnowledgeHint=KNOWLEDGE_HINT_RE.test(source);

  // Explicit school identity/introduction remains owned by school_research.
  // A knowledge hint in the same turn (e.g. "沈工大的高校专项是什么") explicitly reconnects school + knowledge and is allowed through AEK.
  if(explicitSchools.length&&!hasKnowledgeHint&&(SCHOOL_IDENTITY_RE.test(source)||introductionQuestion))return false;
  if(hasKnowledgeHint)return true;

  // Explicitly recognized majors are first-class AEK objects for definition/introduction language,
  // but score/reachability execution keeps its existing admissions owner.
  if(explicitMajors.length&&(definitionQuestion||introductionQuestion)&&!SCORE_OR_REACHABILITY_RE.test(source))return true;

  // Definition/introduction syntax itself is sufficient to enter AEK when the current turn does not explicitly name a school.
  // Canonical/ambiguous/unknown is decided by the AEK resolver, not by a second keyword whitelist here.
  if(!explicitSchools.length&&(definitionQuestion||introductionQuestion))return true;

  if(ruleQuestion)return/(?:专业|学科|职业|招生|志愿|录取|培养|学位|学历|高校|教育|政策|计划).{0,24}(?:要求|条件|资格|报名|申请|规定|截止|谁能报|谁可以报)|(?:要求|条件|资格).{0,12}(?:专业|学科|职业|政策|计划|志愿)/.test(source);
  return false;
}

export function knowledgeQuestionKind(value=''){
  const source=text(value);
  if(/(有什么(?:区别|差别)|区别是什么|差别是什么|怎么区分)/.test(source))return'compare_concepts';
  if(/(谁能报|谁可以报|哪些人(?:能|可以)报|什么人(?:能|可以)报|什么条件|资格|符合|能报吗|可以报吗)/.test(source))return'eligibility';
  if(/(今年|202\d|当年|本年度|现在|目前|最新)/.test(source))return'current_rule';
  if(RULE_QUESTION_RE.test(source))return'eligibility';
  return'definition';
}

export function stripKnowledgeQuestionFrame(value=''){
  const subject=text(value)
    .replace(/^(?:你好|请问|请|麻烦|帮我|给我|我想知道|想知道|想问|问下|问一下)[，,：:\s]*/,'')
    .replace(WHAT_IS_PREFIX_RE,'')
    .replace(INTRODUCTION_RE,'')
    .replace(/[？?。！!]+$/,'')
    .replace(INTRODUCTION_SUFFIX_RE,'')
    .replace(CURRENT_PREFIX_RE,'')
    .replace(RULE_SUFFIX_RE,'')
    .replace(/(?:给我)?(?:介绍|解释|讲|说)(?:下|一下)?(?:它|这个)?(?:是)?(?:什么)?意思.*$/,'')
    .replace(/(?:到底)?(?:是)?什么意思.*$/,'')
    .replace(/(?:到底)?是什么(?:意思)?(?:呢|啊|呀)?$/,'')
    .replace(/怎么理解(?:呢|啊|呀)?$/,'')
    .trim();
  return normalizeKnownMajorSubject(subject);
}

export const KNOWLEDGE_LANGUAGE_TESTING=Object.freeze({DEFINITION_RE,WHAT_IS_PREFIX_RE,INTRODUCTION_RE,INTRODUCTION_SUFFIX_RE,RULE_QUESTION_RE,KNOWLEDGE_HINT_RE,SCHOOL_IDENTITY_RE,CURRENT_PREFIX_RE,RULE_SUFFIX_RE});
