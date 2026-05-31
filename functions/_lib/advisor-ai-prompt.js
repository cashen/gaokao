import { compactItemsForAi } from './advisor-fact-builder.js';
import { getAdvisorZonePolicies } from './advisor-zone-policy.js';

function safeFacts(facts = {}) {
  return {
    version: facts.version,
    candidate: facts.candidate,
    controls: facts.controls,
    offsets: facts.offsets,
    density: facts.density,
    note: facts.note,
    poolStructure: {
      total: facts.poolStructure?.total || 0,
      rushCount: facts.poolStructure?.rushCount || 0,
      stableCount: facts.poolStructure?.stableCount || 0,
      safeCount: facts.poolStructure?.safeCount || 0,
      highRushCount: facts.poolStructure?.highRushCount || 0,
      deepSafeCount: facts.poolStructure?.deepSafeCount || 0,
      missingRankCount: facts.poolStructure?.missingRankCount || 0,
      topCity: facts.poolStructure?.topCity || '',
      topCityPct: facts.poolStructure?.topCityPct || 0,
      topMajorFamily: facts.poolStructure?.topMajorFamily || '',
      topMajorFamilyPct: facts.poolStructure?.topMajorFamilyPct || 0,
      tuitionOrCoopCount: facts.poolStructure?.tuitionOrCoopCount || 0,
      privateOrFeeCount: facts.poolStructure?.privateOrFeeCount || 0
    },
    pushRateSummary: facts.pushRateSummary || null
  };
}

export function buildAdvisorAiMessages({ facts, candidateZones, ruleRisks, ruleActions, fallbackNarrative }) {
  const zoneKeys = (candidateZones || []).map(z => z.zoneKey);
  const payload = {
    task: '请基于事实和候选功能区，判断辽宁物理类自选池方案的位次功能区和主要矛盾，并用高报师人类口气输出。',
    hardRules: [
      'finalZone.zoneKey 必须来自 candidateZones，不得创造新 zoneKey。',
      '分数只作展示，判断以位次、控制线锚点、一分一段密度和自选池结构为主。',
      '你可以判断哪个候选功能区更贴近，但不得脱离 facts。',
      '不得预测录取概率，不得说必录、稳进、闭眼报、一定上岸。',
      '不得编造院校实力、招生计划、就业承诺、2026新数据。',
      '升学与推免参考只能使用 facts.pushRateSummary 和 orderedItemsLite.pushRate 中提供的数据；没有数据必须说待核验。',
      '校级推免率不等于学院/专业保研率，不得把学校级数据说成某专业保研率。',
      '推免参考是升学路径参考，不是录取风险、硬排序或录取概率。',
      '不要把用户举例的450/495/515/545/565/585/605写成固定分数规则。',
      'actions 数组只返回纯文本，不要带编号、项目符号或 Markdown。',
      '输出一个合法 JSON 对象，不要 Markdown 代码块。'
    ],
    facts: safeFacts(facts),
    candidateZones,
    zonePolicies: getAdvisorZonePolicies(zoneKeys),
    ruleRisks: (ruleRisks || []).slice(0, 10),
    ruleActions: (ruleActions || []).slice(0, 10),
    orderedItemsLite: compactItemsForAi(facts.orderedItems, 40),
    fallbackNarrative,
    outputSchema: {
      overall: '整体判断，120字内，人话，不要口号',
      finalZone: {
        zoneKey: '必须来自 candidateZones',
        zoneName: '中文名',
        secondaryZoneKey: '可选，必须来自 candidateZones',
        confidenceText: '例如：更接近/介于两者之间/明显接近，不要写百分比'
      },
      zoneJudgement: '位次功能区判断，180字内',
      reasoning: '为什么这样判断，220字内',
      structureDiagnosis: '冲稳保结构诊断，180字内',
      majorPathDiagnosis: '专业和地域路径诊断，220字内',
      pushRateDiagnosis: '升学与推免参考，220字内；只能基于已提供的学校级数据和待核验状态，不得编专业级保研率',
      bottomLineDiagnosis: '保底类型诊断，160字内，要区分数量/深度/接受度/学费风险',
      riskDiagnosis: ['2到5条主要风险，纯文本'],
      actions: ['3到6条可执行建议，纯文本，不带编号'],
      parentVersion: '给家长看的短说明，180字内',
      reportMarkdown: '可放入飞书报告的 Markdown 段落，700字内',
      disclaimer: '边界说明'
    }
  };
  return [
    { role: 'system', content: '你是辽宁物理类高考志愿方案诊断助手。你不是自由聊天模型；必须基于 facts 和 candidateZones 做判断，用高报师口气解释，不预测录取概率。只输出 JSON。' },
    { role: 'user', content: JSON.stringify(payload) }
  ];
}
