import { skillSystemPrompt } from './ai-skills/realistic-career-skill.js';
import { buildCardRuleSnapshot } from './ai-card-rules.js';
import { detectSpecialProgram } from './special-program-rules.js';
import { YEAR_CALIBER_KB } from './kb/year-caliber-kb.generated.js';
import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';

function safe(value) {
  return value == null || value === '' ? '—' : String(value);
}

export function buildCardDiagnoseMessages({ record, candidateScore, knowledgeContext = null }) {
  const snapshot = buildCardRuleSnapshot(record, candidateScore);
  const specialProgram = detectSpecialProgram(record);

  const userPayload = {
    task: '请基于这一张专业卡片做短解读。以2026专业最低投档分和位次为主事实，2025、2024只作历史对照；不重新排序，不做录取判断，不输出Markdown。',
    dataCaliber: {
      province: YEAR_CALIBER_KB.province,
      subject: YEAR_CALIBER_KB.subject,
      activeDataYear: YEAR_CALIBER_KB.activeDataYear,
      rankTableYear: YEAR_CALIBER_KB.rankTableYear,
      historyYears: [2025, 2024],
      audienceYear: YEAR_CALIBER_KB.audienceYear,
      primaryFact: '2026专业最低投档分和位次',
      boundary: YEAR_CALIBER_KB.aiCopy
    },
    outputJsonSchema: {
      summary: '一句话判断，不超过45个中文字符，只写结论，不写依据',
      basis: ['主要依据，严格3条；优先写当前分数差、2026最低投档分/位次、2025/2024历史对照或有来源的学校背景'],
      realityReminder: '现实提醒，不超过88个中文字符，只写专业学习、培养和路径现实，不写核验事项',
      checks: ['需要核验的点，3-4条，只能写2027正式资料仍需确认的事项'],
      parentNote: '给家长的一句话，不超过66个中文字符，不得与realityReminder重复',
      riskTags: ['短标签，2-4个，每个不超过6个中文字符'],
      specialProgram: '如存在中外合作/高收费/联合培养/校企合作/分校校区等特殊项目，必须单独说明',
      disclaimer: '固定免责声明'
    },
    outputRules: [
      '必须只输出JSON对象，不要使用```json代码块。',
      'summary不能超过45个中文字符，不能把basis内容塞进summary。',
      'basis严格3条。第一优先级是与家庭参考分数的差距和卡片位置；第二优先级是2026最低投档分和位次；第三优先级才是2025/2024历史对照或有来源的学校背景。',
      '不得把2026最低投档记录写成录取结果、录取分、录取概率或2027预测。',
      '没有2025或2024严格同口径记录时，不能自行编造历史趋势。',
      '历史趋势只能使用 historyEvidence 中 comparable=true 的年份；conflict、score-only、rank-table-unavailable 和 no-record 均不得参与趋势。',
      '同一分数对应位次区间，不得把 rankEnd 写成考生唯一名次；可以写“同分位置约为第X—Y位”。',
      'realityReminder不能包含“核验2027招生计划/选科/校区/学费”等核验事项。',
      'checks只能写核验事项，不能写“持续自学/项目能力/就业风险”等专业评价。',
      'checks中的年份必须面向2027正式填报，不得继续要求核验2026招生计划。',
      'parentNote不得复制realityReminder。',
      '不要重复同一句话。',
      '学校整体背景和当前专业相关性要分开；若当前专业没有明确本科专业对应证据，要说需核验学院、培养方案和招生章程，不要暗示该专业就是学校结论。',
      '如果specialProgram.hasSpecial为true，现实提醒必须先说明特殊项目风险，不得只写“核验招生章程”。',
      '中外合作办学必须提示收费、培养模式、外方合作院校、是否出国、英语授课比例、毕业证/学位证口径。',
      'specialProgram.reminder 放在特殊项目提醒里，realityReminder 不要重复同一句特殊项目提醒；现实提醒应写专业/培养现实。',
      'checks 中保留核验清单，不要和特殊项目提醒逐字重复。'
    ],
    specialProgram,
    card: {
      candidateScore,
      dataYear: safe(record.dataYear ?? 2026),
      school: safe(record.school),
      major: safe(record.major),
      statusLabel: safe(record.statusLabel),
      position: safe(record.position),
      scoreDelta: safe(record.scoreDelta),
      score2026: safe(record.score2026 ?? record.score),
      rank2026: safe(record.rank2026 ?? record.rank),
      historyEvidence: getHistoryScoreRankEvidence(record),
      displayLocation: safe(record.displayLocation),
      geoEntity: safe(record.geoEntity),
      locationWarning: safe(record.locationWarning),
      natureLabel: safe(record.natureLabel),
      schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags : [],
      flags: Array.isArray(record.flags) ? record.flags : [],
      bottomLineTags: Array.isArray(record.bottomLineTags) ? record.bottomLineTags : [],
      tuition: safe(record.tuition)
    },
    ruleSnapshot: snapshot,
    knowledgeBaseContext: knowledgeContext,
    knowledgeBaseRules: [
      '涉及学校层次、双一流学科、相关学科线索、地域和专业现实风险时，优先依据 knowledgeBaseContext。',
      'knowledgeBaseContext 没有给出的事实，不要假装知道，只能说需要核验。',
      'A2医学强校、A3行业特色强校若来自规则初判，必须使用“线索/需核验”口径，不要说成官方结论。',
      '第四轮学科评估可作为公开学科基础线索，但学科评估不等同本科专业强弱。',
      '第五轮学科评估没有官方公开全量结果，除非knowledgeBaseContext提供学校官方来源，否则不得引用第五轮。',
      'officialProfileSummary、admissionCampusSummary、employmentSummary为空时，不得自行编造学校官网简介、校区说明或就业质量结论。',
      '年度口径、辽宁专业+学校志愿规则、招生章程核验项、医学/法学/师范路径、体检限制、历史难度参考，优先使用 knowledgeBaseContext.governance。',
      '2026与2025、2025与2024的位次变化只属于历史参考，只能说最低投档位置更靠前、更靠后或基本稳定，不得说成官方结论或录取预测。',
      '招生章程核验项只作为复核清单，不得替代学校2027年章程下结论。',
      '不要使用院校组、自选专业、稳进、必录、保证、一定能上、捡漏、优势、王牌等表达。'
    ]
  };

  return [
    { role: 'system', content: skillSystemPrompt() },
    { role: 'user', content: JSON.stringify(userPayload, null, 2) }
  ];
}
