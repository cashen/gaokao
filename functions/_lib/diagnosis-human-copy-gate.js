const BLOCKING_PATTERNS = [
  /录取判断/g, /稳了/g, /必录/g, /一定上/g, /一定能上/g, /捡漏/g, /王牌/g, /优势专业/g, /强校/g, /保底/g, /推荐报考/g
];

const SOFT_REPLACEMENTS = [
  [/方案解读解读/g, '方案解读'],
  [/主要参考参考/g, '主要参考范围'],
  [/匹配\s*\/\s*主要参考/g, '主要参考'],
  [/主体参考/g, '主要参考'],
  [/规则低分侧补充版/g, ''],
  [/AI不可用时按规则低分侧补充判断[:：]?/g, '系统根据当前已选专业、考生位置和核验规则生成说明：'],
  [/AI不可用时/g, '系统根据当前规则'],
  [/AI不可用/g, '系统已切换为基础说明'],
  [/fallback/gi, '基础说明'],
  [/rules-only/gi, '基础说明'],
  [/命中已收录学科/g, '有相关学科线索'],
  [/未命中已收录优势\/相关学科/g, '暂未形成明确专业对应证据'],
  [/已收录优势\/相关学科/g, '相关学科线索'],
  [/行业特色相关[:：]/g, '学校行业方向线索：'],
  [/知识库依据/g, '背景线索'],
  [/高确定性方向/g, '路径相对清晰的方向'],
  [/高风险专业/g, '需要重点核验的专业方向'],
  [/低需要关注/g, '需要关注较少'],
  [/分数位置较舒服/g, '从历史位置看不属于明显上探'],
  [/可以重点讨论/g, '可以放进家庭讨论'],
  [/可以保留；/g, '可以放进讨论区；'],
  [/可以保留讨论/g, '可以放进家庭讨论'],
  [/不要当作稳妥项/g, '不能只按低风险理解']
];

function cleanseText(value) {
  let s = String(value == null ? '' : value);
  for (const [pattern, replacement] of SOFT_REPLACEMENTS) s = s.replace(pattern, replacement);
  s = s.replace(/[ \t\r\f]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/\s+([，。；：])/g, '$1').trim();
  return s;
}

export function findHumanCopyViolations(value, { strict = false } = {}) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {});
  const found = [];
  for (const pattern of BLOCKING_PATTERNS) {
    if (pattern.test(text)) found.push(String(pattern).replace(/^\//,'').replace(/\/g.*/,''));
    pattern.lastIndex = 0;
  }
  if (strict) {
    for (const w of ['方案解读解读','主要参考参考','命中已收录学科','行业特色相关：','AI不可用','fallback','rules-only']) {
      if (text.includes(w)) found.push(w);
    }
  }
  return [...new Set(found)];
}

export function applyHumanCopyGate(value) {
  if (typeof value === 'string') return cleanseText(value);
  if (Array.isArray(value)) return value.map(applyHumanCopyGate).filter(v => !(typeof v === 'string' && !v.trim()));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k,v] of Object.entries(value)) out[k] = applyHumanCopyGate(v);
    return out;
  }
  return value;
}

export function assertHumanCopy(value, options = {}) {
  const cleaned = applyHumanCopyGate(value);
  const violations = findHumanCopyViolations(cleaned, options);
  return { ok: violations.length === 0, violations, cleaned };
}
