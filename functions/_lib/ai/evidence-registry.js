import { KB_SOURCE_REGISTRY } from '../kb/kb-source-registry.js';

export const AI_EVIDENCE_REGISTRY_VERSION = 'ai-official-evidence-registry-v3990_3';

const OFFICIAL = Object.freeze([
  Object.freeze({ id:'liaoning-2026-score-rank', level:'A', sourceName:'辽宁省2026年普通高校招生考试成绩统计表（辽宁省教育厅）', sourceUrl:'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2026063014014729932/index.shtml', year:2026, scope:'辽宁普通高考物理学科类成绩统计与历史位次参考', decisionSafe:true, topics:['rank','candidate_search','comparison'] }),
  Object.freeze({ id:'liaoning-2026-score-rank-chsi', level:'A', sourceName:'阳光高考：辽宁2026年普通高校招生考试成绩统计表', sourceUrl:'https://gaokao.chsi.com.cn/gkxx/zc/ss/202606/20260625/2293847495.html', year:2026, scope:'辽宁2026成绩统计表官方转载与附件入口', decisionSafe:true, topics:['rank'] }),
  Object.freeze({ id:'liaoning-2026-admission-rules', level:'A', sourceName:'辽宁省2026年普通高等学校招生简章（阳光高考转载辽宁招生考试之窗）', sourceUrl:'https://gaokao.chsi.com.cn/gkxx/zc/ss/202603/20260304/2293449167.html', year:2026, scope:'辽宁2026普通高校招生政策与录取规则', decisionSafe:true, topics:['verification','candidate_search','comparison'] }),
  Object.freeze({ id:'moe-major-catalog-2026', level:'A', sourceName:'教育部《普通高等学校本科专业目录（2026年）》', sourceUrl:'https://www.moe.gov.cn/srcsite/A08/moe_1034/s3882/202604/t20260427_1434931.html', year:2026, scope:'本科专业名称、代码、专业类和门类', decisionSafe:true, topics:['candidate_search','verification','major','comparison'] }),
  Object.freeze({ id:'china-administrative-divisions', level:'A', sourceName:'中华人民共和国行政区划（中国政府网来源）', sourceUrl:'https://www.locpg.gov.cn/2022-06/07/c_1211652713.htm', year:2022, scope:'省级行政区实体识别与地区筛选语义，不作为招生资格事实', decisionSafe:true, topics:['candidate_search','region','comparison'] }),
  Object.freeze({ id:'sunshine-admission-charters', level:'A', sourceName:'阳光高考招生章程平台', sourceUrl:'https://gaokao.chsi.com.cn/zsgs/zhangcheng/', year:null, scope:'学校招生章程、录取规则、特殊要求核验入口', decisionSafe:true, topics:['verification','comparison'] }),
  Object.freeze({ id:'physical-exam-guidance', level:'A', sourceName:'阳光高考：普通高等学校招生体检工作指导意见', sourceUrl:'https://gaokao.chsi.com.cn/gkxx/zcdh/200702/20070228/754576.html', year:2003, scope:'专业体检限制的基础政策入口，仍需结合当年学校章程', decisionSafe:true, topics:['verification','medical'] }),
  Object.freeze({ id:'medical-residency-path', level:'A', sourceName:'国家卫生健康委住院医师规范化培训制度信息', sourceUrl:'https://www.nhc.gov.cn/qjjys/c100015/201502/7466984c6d29417e8fb46f4f336a8947.shtml', year:2015, scope:'医学培养与住院医师规范化培训制度背景', decisionSafe:false, topics:['medical','career'] }),
  Object.freeze({ id:'legal-qualification-path', level:'A', sourceName:'司法部国家统一法律职业资格考试公告入口', sourceUrl:'https://www.moj.gov.cn/pub/sfbgw/zwxxgk/fdzdgknr/fdzdgknrtzwj/202506/t20250605_520493.html', year:2025, scope:'法学相关职业资格路径辅助核验', decisionSafe:false, topics:['law','career'] }),
  Object.freeze({ id:'teacher-qualification-path', level:'A', sourceName:'中国教育考试网中小学教师资格考试', sourceUrl:'https://ntce.neea.edu.cn/xhtml1/report/1508/309-1.htm', year:null, scope:'教师资格考试制度与入口', decisionSafe:false, topics:['teacher','career'] })
]);

const ALLOWED_HOST_SUFFIXES = Object.freeze(['moe.gov.cn','ln.gov.cn','chsi.com.cn','nhc.gov.cn','moj.gov.cn','neea.edu.cn','gov.cn','locpg.gov.cn']);
function officialHost(urlValue) { try { const host=new URL(urlValue).hostname.toLowerCase(); return ALLOWED_HOST_SUFFIXES.some(suffix=>host===suffix || host.endsWith(`.${suffix}`)); } catch { return false; } }
function clean(value,max=200){ return String(value==null?'':value).trim().slice(0,max); }
function inferredTopics(intent={}) {
  const topics=new Set([clean(intent.topic,80)]);
  const text=`${intent.question || intent.rawText || ''} ${(intent.majorKeywords || []).join(' ')}`;
  if (/医|临床|口腔|护理|药学/.test(text)) topics.add('medical');
  if (/法学|法律/.test(text)) topics.add('law');
  if (/师范|教师/.test(text)) topics.add('teacher');
  if (/就业|职业|工作|发展/.test(text)) topics.add('career');
  if (/专业/.test(text)) topics.add('major');
  if (/安徽|江苏|浙江|辽宁|吉林|黑龙江|山东|河北|广东|北京|天津|上海|省内|省外|地区/.test(text)) topics.add('region');
  if (/比较|对比|怎么选|哪个好/.test(text)) topics.add('comparison');
  if (/章程|学费|校区|体检|选科|计划|资格|官方|来源/.test(text)) topics.add('verification');
  return topics;
}
export function listOfficialAiEvidence(){ return OFFICIAL.filter(item=>officialHost(item.sourceUrl)).map(item=>({...item})); }
export function evidenceForIntent(intent={}) {
  const topics=inferredTopics(intent);
  const selected=OFFICIAL.filter(item=>officialHost(item.sourceUrl) && item.topics.some(topic=>topics.has(topic)));
  if (!selected.some(item=>item.id==='liaoning-2026-admission-rules') && topics.has('candidate_search')) selected.push(OFFICIAL.find(item=>item.id==='liaoning-2026-admission-rules'));
  return selected.filter(Boolean).slice(0,8).map(item=>({...item,registryVersion:AI_EVIDENCE_REGISTRY_VERSION}));
}
export function auditExistingKbOfficialSources(){
  const accepted=[]; const rejected=[];
  for (const [file,source] of Object.entries(KB_SOURCE_REGISTRY?.files || {})) {
    const url=clean(source?.sourceUrl,800); if (!url || source?.level!=='A') continue;
    const item={file,sourceName:clean(source.sourceName,200),sourceUrl:url}; if (officialHost(url)) accepted.push(item); else rejected.push(item);
  }
  return { registryVersion:KB_SOURCE_REGISTRY?.version || '', accepted,rejected, rule:'AI正式证据只暴露政府、阳光高考/学信网和国家考试机构官方域名；现有KB中的非官方承载地址不自动升级为正式证据。' };
}
