import { detectProjectAttributes } from './project-attribute-accessor.js';

const DIRECTION_PATTERNS = [
  ['mechanical_vehicle', /机械设计制造及其自动化|机械|车辆|智能制造|新能源汽车/],
  ['electrical_energy', /电气工程及其自动化|电气|电力|电网|自动化|能源与动力|新能源|储能/],
  ['computer_ai_software', /计算机|软件|人工智能|数据科学|网络工程|物联网|区块链|工业软件/],
  ['electronics_ic', /电子信息|通信|集成电路|微电子|半导体|光电信息/],
  ['civil_arch_transport', /土木|建筑|交通|铁道|航空|航天|飞行器|风景园林/],
  ['agri_food_env', /园艺|园林|动物医学|食品|农学|水产|生物|生态|林学|植物|动物科学/],
  ['medical_core', /临床医学|口腔医学|中医学|中西医临床医学/],
  ['medical_applied', /护理|药学|检验|影像|康复|预防医学|医学技术|卫生检验/],
  ['teacher_law_public', /师范|教育|法学|公安|马克思|政治/],
  ['finance_management', /会计|财务|审计|金融|经济|管理|数字金融|数字贸易/],
  ['petro_material_safety', /石油|油气|采矿|资源勘查|材料|化工|安全工程|环境/],
  ['humanities_media_tourism', /中文|新闻|外语|英语|俄语|旅游|文旅|传播/],
  ['basic_science_math', /数学|物理|化学|统计|地理|天文/]
];
const CROSS = /低空|具身智能|脑机|智能医学工程|未来机器人|交叉工程|碳中和|深地|医工学|集成电路科学与工程|智能影像工程/;
function crossDirection(token='') {
  if (/智能医学工程|智能影像工程|医工学|医疗器械|脑机/.test(token)) return 'medical_applied';
  if (/低空技术|交通能源|航空|航天/.test(token)) return 'civil_arch_transport';
  if (/低空经济|数字金融|数字贸易/.test(token)) return 'finance_management';
  if (/具身智能|未来机器人|工程互联网|集成电路科学与工程/.test(token)) return 'computer_ai_software';
  return 'other';
}

function split(input='') { return String(input || '').split(/[,\s，、/；;|]+/).map(x => x.trim()).filter(Boolean); }

export function classifyKeywordTokens(input = '') {
  const tokens = split(input);
  const result = { rawTokens: tokens, majorDirectionTokens: [], projectAttributeTokens: [], industryTokens: [], broadTokens: [], catalogChangeTokens: [], warnings: [] };
  for (const token of tokens) {
    const projects = detectProjectAttributes(token);
    if (projects.length) {
      result.projectAttributeTokens.push(...projects.map(p => ({ token, id: p.id, label: p.label, mustCheck: p.mustCheck })));
      continue;
    }
    let direction = DIRECTION_PATTERNS.find(([, re]) => re.test(token));
    const isCross = CROSS.test(token);
    if (isCross && !direction) direction = [crossDirection(token), null];
    if (direction) result.majorDirectionTokens.push({ token, directionId: direction[0] });
    else result.broadTokens.push(token);
    if (isCross) result.catalogChangeTokens.push({ token, type: 'new_or_cross_discipline' });
  }
  if (result.projectAttributeTokens.length) result.warnings.push('中外、高收费、公费师范、定向等属于项目或招生属性，不是标准专业名，需要按招生章程人工核验。');
  if (result.catalogChangeTokens.length) result.warnings.push('低空、具身智能、脑机、智能医学工程等涉及2026新目录或交叉学科，缺少辽宁长期历史录取数据。');
  return result;
}
