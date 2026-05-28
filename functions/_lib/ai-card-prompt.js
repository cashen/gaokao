import { skillSystemPrompt } from './ai-skills/realistic-career-skill.js';
import { buildCardRuleSnapshot } from './ai-card-rules.js';

function safe(value) {
  return value == null || value === '' ? '—' : String(value);
}

export function buildCardDiagnoseMessages({ record, candidateScore, knowledgeContext = null }) {
  const snapshot = buildCardRuleSnapshot(record, candidateScore);

  const userPayload = {
    task: '请基于这一张专业卡片做现实就业导向诊断。不要重新排序，不要预测录取概率。',
    outputJsonSchema: {
      summary: '一句话判断，80字以内',
      basis: ['主要依据，3-5条'],
      realityReminder: '现实提醒，120字以内',
      checks: ['需要核验的点，3-5条'],
      parentNote: '给家长看的温和提醒，80字以内',
      riskTags: ['专业现实风险/机会标签，0-5条'],
      disclaimer: '固定免责声明'
    },
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
      'A2医学强校、A3行业特色强校若来自规则初判，必须使用“线索/需核验”口径，不要说成官方结论。'
    ]
  };

  return [
    { role: 'system', content: skillSystemPrompt() },
    { role: 'user', content: JSON.stringify(userPayload, null, 2) }
  ];
}
