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
    pushRateSummary: facts.pushRateSummary || null,
    bottomLine: facts.bottomLine || null,
    bottomLineSummary: facts.bottomLineSummary || null
  };
}

export function buildAdvisorAiMessages({ facts, candidateZones, ruleRisks, ruleActions, fallbackNarrative }) {
  const zoneKeys = (candidateZones || []).map(z => z.zoneKey);
  const payload = {
    task: '请基于事实和候选功能区，判断辽宁物理类已选专业方案的位次功能区和主要矛盾，并用高报师人类口气输出。',
    hardRules: [
      'finalZone.zoneKey 必须来自 candidateZones，不得创造新 zoneKey。',
      '分数只作展示，判断以位次、控制线锚点、一分一段密度和已选专业结构为主。',
      '你可以判断哪个候选功能区更贴近，但不得脱离 facts。',
      '不得做录取承诺，不得说必录、稳进、闭眼报、一定上岸。',
      '2026最低投档分、最低投档位次和一分一段是当前主事实；2025、2024只能作同口径历史对照。',
      '不得编造院校实力、招生计划、就业承诺或尚未公布的2027新数据。',
      '升学与推免参考只能使用 facts.pushRateSummary 和 orderedItemsLite.pushRate 中提供的数据；没有数据必须说待核验。',
      '校级推免率不等于学院/专业保研率，不得把学校级数据说成某专业保研率。',
      '推免参考是升学路径参考，不是排序硬依据，也不代表录取判断。',
      '办学性质底线只能使用 facts.bottomLine 和 facts.bottomLineSummary；只看公办普通、公办含中外/高收费、公办优先三者要区分。',
      '600分左右的公办中外合作上探可以作为策略提醒，但不要把它写成前端筛选按钮；低分段高收费低分侧补充和高分段公办中外上探不能混为一谈。',
      '不要把用户举例的450/495/515/545/565/585/605写成固定分数规则。',
      'actions 数组只返回纯文本，不要带编号、项目符号或 Markdown。',
      '请用家长第一次使用也能读懂的短句：先说结论，再说原因，再给下一步动作。',
      '可以保留“位次、特控线、后段是否够稳”等必要术语，但每个需要关注必须配一条人话解释或下一步动作。',
      '优先使用“稍高目标、主要参考、低分侧补充、低分侧补充、城市集中、专业方向集中”等表达，少用“主要参考区、后段是否够稳、城市过于集中”等生硬词。',
      '不要输出原始接口内容、代码、接口字段、调试语言；不要写 AI、fallback、rules-only 等工程状态。',
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
      overall: '一句话结论，120字内，家长能懂，不要口号',
      finalZone: {
        zoneKey: '必须来自 candidateZones',
        zoneName: '中文名',
        secondaryZoneKey: '可选，必须来自 candidateZones',
        confidenceText: '例如：更接近/介于两者之间/明显接近，不要写百分比'
      },
      zoneJudgement: '位次功能区判断，180字内',
      reasoning: '为什么这样判断，220字内',
      structureDiagnosis: '这套方案的前段、中段、后段结构，180字内，用家长能懂的表达',
      majorPathDiagnosis: '专业方向和城市是否集中，220字内，必须给下一步确认动作',
      pushRateDiagnosis: '升学与推免参考，220字内；只能基于已提供的学校级数据和待核验状态，不得编专业级保研率',
      bottomLineDiagnosis: '后段是否够稳与办学费用底线，200字内，要区分数量、接受度、公办普通、公办中外/高收费、民办需要关注',
      riskDiagnosis: ['2到5条主要需要关注，纯文本'],
      actions: ['3到6条可执行建议，纯文本，不带编号'],
      parentVersion: '给家长看的短说明，180字内',
      reportMarkdown: '可放入家庭讨论报告的文字段落，700字内；不要生成一级/二级标题，标题由系统渲染',
      disclaimer: '边界说明'
    }
  };
  return [
    { role: 'system', content: '你是辽宁物理类高考志愿生成前提醒助手。你不是自由聊天模型；必须基于 facts 和 candidateZones 做判断，用家长能读懂的温和口气解释，不做录取判断。只输出 JSON。' },
    { role: 'user', content: JSON.stringify(payload) }
  ];
}


// v3.9.6.4 keyword note: 专业/项目/行业关键词包括中外、合作办学、高收费、石油、交通、航天等；AI/报告不得把中外绕过办学费用底线，须提示学费、培养模式、毕业证书、校区、是否必须出国、保研资格与转专业政策。
