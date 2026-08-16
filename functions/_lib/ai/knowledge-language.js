export const AI_KNOWLEDGE_LANGUAGE_VERSION='ai-education-knowledge-language-v0.01';

const DEFINITION_RE=/(是什么(?:意思)?|什么意思|啥意思|指什么|怎么理解|怎么回事|解释(?:下|一下)?|介绍(?:下|一下)?.{0,12}(?:意思|概念|是什么)|讲讲.{0,18}(?:是什么|概念|区别)?|说说.{0,18}(?:是什么|概念|区别)?|属于什么|算什么|是干什么的?|是干嘛的?|有什么(?:区别|差别)|区别是什么|差别是什么|怎么区分)/;
const KNOWLEDGE_HINT_RE=/(高校专项|专项计划|国家专项|地方专项|辽宁省高校专项|强基计划|综合评价|公费师范|优师计划|定向医学生|农村订单|高水平运动队|民族班|预科|特殊类型招生|特控线|本科线|省控线|投档线|录取线|专业线|位次|投档|录取|退档|滑档|调剂|征集志愿|平行志愿|招生计划|专业\+学校|专业类|本科专业|一级学科|二级学科|学科门类|专业学位|学术学位|学硕|专硕|职业本科|高职专科|职业教育|985|211|双一流|一流本科专业|工程教育认证|学科评估|国家重点学科|硕士点|博士点|博士后|推免|保研|大类招生|专业分流|培养方案|转专业|中外合作|国际班|联合学院|选科要求|物化|物化生|首选科目|再选科目|色弱|色盲|单色识别|体检限报|助学贷款|国家奖学金|助学金|工业控制|智能制造|材料加工|储能|集成电路|半导体|低空经济|低空技术|机器人|职业分类|职业资格|行业|就业方向|新工科)/;
const SCHOOL_IDENTITY_RE=/(什么学校|学校是什么|学校定位|办学定位|什么来头|公办还是民办|几本)/;

function text(value){return String(value==null?'':value).normalize('NFKC').trim();}

export function looksEducationKnowledgeQuestion(value='',{schools=[],majors=[]}={}){
  const source=text(value);
  if(!source||!DEFINITION_RE.test(source))return false;
  const explicitSchools=Array.isArray(schools)?schools.filter(Boolean):[];
  const explicitMajors=Array.isArray(majors)?majors.filter(Boolean):[];
  if(explicitSchools.length&&SCHOOL_IDENTITY_RE.test(source)&&!KNOWLEDGE_HINT_RE.test(source))return false;
  if(KNOWLEDGE_HINT_RE.test(source))return true;
  if(explicitMajors.length&&!/(多少分|投档分|录取分|最低分|位次|能不能上|能不能报|够不够)/.test(source))return true;
  return /(?:专业|学科|职业|招生|志愿|录取|培养|学位|学历|高校|教育).{0,18}(?:是什么|什么意思|区别|怎么理解)|(?:是什么|什么意思).{0,12}(?:专业|学科|职业|政策|计划|志愿)/.test(source);
}

export function knowledgeQuestionKind(value=''){
  const source=text(value);
  if(/(有什么(?:区别|差别)|区别是什么|差别是什么|怎么区分)/.test(source))return'compare_concepts';
  if(/(谁能报|谁可以报|什么条件|资格|符合|能报吗|可以报吗)/.test(source))return'eligibility';
  if(/(今年|202\d|当年|现在|目前|最新)/.test(source))return'current_rule';
  return'definition';
}

export function stripKnowledgeQuestionFrame(value=''){
  return text(value)
    .replace(/^(?:你好|请问|请|麻烦|帮我|给我|我想知道|想知道|想问|问下|问一下)[，,：:\s]*/,'')
    .replace(/^(?:介绍(?:下|一下)?|解释(?:下|一下)?|讲讲|说说|聊聊|了解(?:下|一下)?)[，,：:\s]*/,'')
    .replace(/[？?。！!]+$/,'')
    .replace(/(?:给我)?(?:介绍|解释|讲|说)(?:下|一下)?(?:它|这个)?(?:是)?(?:什么)?意思.*$/,'')
    .replace(/(?:到底)?(?:是)?什么意思.*$/,'')
    .replace(/(?:到底)?是什么(?:意思)?(?:呢|啊|呀)?$/,'')
    .replace(/怎么理解(?:呢|啊|呀)?$/,'')
    .trim();
}

export const KNOWLEDGE_LANGUAGE_TESTING=Object.freeze({DEFINITION_RE,KNOWLEDGE_HINT_RE,SCHOOL_IDENTITY_RE});