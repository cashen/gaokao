import { buildKnowledgeReviewForRecord } from '../../knowledge/index.js?v=3949_0';
function clean(x, max=180) { return String(x == null ? '' : x).replace(/\s+/g,' ').trim().slice(0,max); }
function projectPoints(text='') {
  const out=[]; const s=String(text||'');
  if (/中外|合作办学/.test(s)) out.push('中外合作属于项目属性，需要核验学费、外方院校、是否必须出国、授课语言、毕业证/学位证、校区和转专业政策。');
  if (/高收费|较高收费/.test(s)) out.push('高收费项目需要核验学费、培养模式、校区和家庭承受能力。');
  if (/公费师范|优师专项/.test(s)) out.push('公费师范/优师专项需要核验履约地区、服务年限、违约责任和教师资格。');
  if (/定向/.test(s)) out.push('定向项目需要核验定向地区、服务年限、违约责任以及户籍/体检/政审条件。');
  if (/试验班|实验班|拔尖班|本博|本研/.test(s)) out.push('试验班/本博类条目需要核验专业分流规则、可选专业范围、退出机制和是否承诺具体专业。');
  return out;
}
function careerPoints(text='') {
  const out=[]; const s=String(text||'');
  if (/临床|口腔|中医|中西医/.test(s) && !/护理|药学|检验|影像技术|康复/.test(s)) out.push('医学核心方向培养周期较长，需要考虑规培、执业资格和家庭承受能力。');
  if (/法学/.test(s)) out.push('法学要关注法考、学校法学平台、城市实习资源、考公竞争和是否接受读研。');
  if (/师范|教育/.test(s)) out.push('师范方向需要结合教师资格、当地编制机会、学科需求和是否接受跨地区就业判断。');
  if (/医学|药学|生物|食品|农学|园艺|动物医学|交通运输|油气储运/.test(s)) out.push('如孩子存在色弱、色盲等体检限制，相关方向必须查体检指导意见和招生章程。');
  return out;
}
function catalogPoint(record={}) {
  const sm = record.standardMajor || {}; const name = `${sm.name || ''} ${record.major || ''}`;
  if (/具身智能|脑机科学与技术|智能医学工程|低空技术与工程|未来机器人|交叉工程|深地科学与工程|医工学/.test(name) || sm.disciplineCode === '14' || sm.disciplineName === '交叉学科') return '该方向涉及2026本科专业目录中的新目录或交叉学科，建议核验当年招生计划、培养学院、课程设置和就业路径。';
  if (sm.categoryName) return `按2026本科专业目录，该专业属于${sm.categoryName}。`;
  return '';
}
export function buildReviewPointsForRecord(record={}, options={}) {
  const text = [record.major, record.school, record.matchReason, ...(Array.isArray(record.flags)?record.flags:[])].filter(Boolean).join(' ');
  const knowledgePoints = buildKnowledgeReviewForRecord(record, { limit: 5 });
  const points=[catalogPoint(record), ...projectPoints(text), ...careerPoints(text), ...knowledgePoints];
  return [...new Set(points.map(x=>clean(x)).filter(Boolean))].slice(0, options.limit || 6);
}
