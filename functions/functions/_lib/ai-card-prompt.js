import { skillSystemPrompt } from './ai-skills/realistic-career-skill.js';
import { buildCardRuleSnapshot } from './ai-card-rules.js';
import { detectSpecialProgram } from './special-program-rules.js';

function safe(value) {
  return value == null || value === '' ? '—' : String(value);
}

export function buildCardDiagnoseMessages({ record, candidateScore, knowledgeContext = null }) {
  const snapshot = buildCardRuleSnapshot(record, candidateScore);
  const specialProgram = detectSpecialProgram(record);

  const userPayload = {
    task: '请基于这一张专业卡片做短诊断。只解释当前卡片，不重新排序，不做录取判断，不输出Markdown。',
    outputJsonSchema: {
      summary: '一句话判断，不超过45个中文字符，只写结论，不写依据',
      basis: ['主要依据，严格3条，只写事实依据，不写建议'],
      realityReminder: '现实提醒，不超过80个中文字符，只写专业/学校现实提醒，不写核验事项',
      checks: ['需要核验的点，3-4条，只能写核验事项'],
      parentNote: '给家长的一句话，不超过60个中文字符，不得与realityReminder重复',
      riskTags: ['短标签，2-4个，每个不超过6个中文字符'],
      specialProgram: '如存在中外合作/高收费/联合培养/校企合作/分校校区等特殊项目，必须单独说明',
      disclaimer: '固定免责声明'
    },
    outputRules: [
      '必须只输出JSON对象，不要使用```json代码块。',
      'summary不能超过45个中文字符，不能把basis内容塞进summary。',
      'basis严格3条，只允许分差、位次、学校平台、地域、历史数据等事实。',
      'realityReminder不能包含“核验2026招生计划/专业组/校区”等核验事项。',
      'checks只能写核验事项，不能写“持续自学/项目能力/就业风险”等专业评价。',
      'parentNote不得复制realityReminder。',
      '不要重复同一句话。',
      '学校整体优势和当前专业相关性要分开；若当前专业没有明确本科专业对应证据，要说需核验学院、培养方案和招生章程，不要暗示该专业就是学校结论。',
      '如果specialProgram.hasSpecial为true，现实提醒必须先说明特殊项目风险，不得只写“核验招生章程”。',
      '中外合作办学必须提示收费、培养模式、外方合作院校、是否出国、英语授课比例、毕业证/学位证口径。',
      'specialProgram.reminder 放在特殊项目提醒里，realityReminder 不要重复同一句特殊项目提醒；现实提醒应写专业/培养现实。',
      'checks 中保留核验清单，不要和特殊项目提醒逐字重复。'
    ],
    specialProgram,
    card: {
      candidateScore,
      school: safe(record.school),
      major: safe(record.major),
      statusLabel: safe(record.statusLabel),
      position: safe(record.position),
      scoreDelta: safe(record.scoreDelta),
      score2025: safe(record.score2025 ?? record.score),
      rank2025: safe(record.rank2025 ?? record.rank),
      score2024: safe(record.score2024),
      rank2024: safe(record.rank2024),
      historyCompare: record.historyCompare || null,
      displayLocation: safe(record.displayLocation),
      geoEntity: safe(record.geoEntity),
      locationWarning: safe(record.locationWarning),
      natureLabel: safe(record.natureLabel),
      schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags : []
    },
    ruleSnapshot: snapshot,
    knowledgeBaseContext: knowledgeContext,
    knowledgeBaseRules: [
      '涉及学校层次、双一流学科、优势方向、地域和专业现实风险时，优先依据 knowledgeBaseContext。',
      'knowledgeBaseContext 没有给出的事实，不要假装知道，只能说需要核验。',
      'A2医学强校、A3行业特色强校若来自规则初判，必须使用“线索/需核验”口径，不要说成官方结论。',
      '第四轮学科评估可作为公开学科基础线索，但学科评估不等同本科专业强弱。',
      '第五轮学科评估没有官方公开全量结果，除非knowledgeBaseContext提供学校官方来源，否则不得引用第五轮。',
      'officialProfileSummary、admissionCampusSummary、employmentSummary为空时，不得自行编造学校官网简介、校区说明或就业质量结论。',
      '年度口径、辽宁专业+学校志愿规则、招生章程核验项、医学/法学/师范路径、体检限制、热度参考，优先使用 knowledgeBaseContext.governance。',
      '两年位次变化只属于内部参考，只能说“2025相比2024位次更靠前/更靠后”，不得说成官方结论或录取预测。',
      '招生章程核验项只作为复核清单，不得替代学校当年章程下结论。',
      '不要使用院校组、自选专业、稳进、必录、保证、一定能上、捡漏、优势、王牌等表达。'
    ]
  };

  return [
    { role: 'system', content: skillSystemPrompt() },
    { role: 'user', content: JSON.stringify(userPayload, null, 2) }
  ];
}
