import { skillSystemPrompt } from './ai-skills/realistic-career-skill.js';
import { buildCardRuleSnapshot } from './ai-card-rules.js';

function safe(value) {
  return value == null || value === '' ? '—' : String(value);
}

export function buildCardDiagnoseMessages({ record, candidateScore, knowledgeContext = null }) {
  const snapshot = buildCardRuleSnapshot(record, candidateScore);

  const userPayload = {
    task: '请基于这一张专业卡片做短诊断。只解释当前卡片，不重新排序，不预测录取概率，不输出Markdown。',
    outputJsonSchema: {
      summary: '一句话判断，不超过45个中文字符，只写结论，不写依据',
      basis: ['主要依据，严格3条，只写事实依据，不写建议'],
      realityReminder: '现实提醒，不超过80个中文字符，只写专业/学校现实提醒，不写核验事项',
      checks: ['需要核验的点，3-4条，只能写核验事项'],
      parentNote: '给家长的一句话，不超过60个中文字符，不得与realityReminder重复',
      riskTags: ['短标签，2-4个，每个不超过6个中文字符'],
      disclaimer: '固定免责声明'
    },
    outputRules: [
      '必须只输出JSON对象，不要使用```json代码块。',
      'summary不能超过45个中文字符，不能把basis内容塞进summary。',
      'basis严格3条，只允许分差、位次、学校平台、地域、历史数据等事实。',
      'realityReminder不能包含“核验2026招生计划/专业组/校区”等核验事项。',
      'checks只能写核验事项，不能写“持续自学/项目能力/就业风险”等专业评价。',
      'parentNote不得复制realityReminder。',
      '不要重复同一句话。'
    ],
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
      'officialProfileSummary、admissionCampusSummary、employmentSummary为空时，不得自行编造学校官网简介、校区说明或就业质量结论。'
    ]
  };

  return [
    { role: 'system', content: skillSystemPrompt() },
    { role: 'user', content: JSON.stringify(userPayload, null, 2) }
  ];
}
