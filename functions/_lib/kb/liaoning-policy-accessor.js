import { LIAONING_POLICY_KB } from './liaoning-policy-kb.generated.js';

export function getLiaoningOrdinaryUndergraduatePolicy(kb = LIAONING_POLICY_KB) {
  const legacy = kb?.ordinary本科批;
  const modern = kb?.batches?.ordinary本科批;
  const p = modern || legacy || {};
  return {
    mode: p.mode || '专业+学校',
    admissionMode: p.admissionMode || '平行志愿',
    maxChoices: Number(p.maxChoices) || 112,
    unit: p.unit || '1个“专业+学校”为1个志愿',
    aiImplications: Array.isArray(p.aiImplications) ? p.aiImplications : [
      '自选专业诊断应按“专业+学校”条目理解，不按院校组理解。',
      '报告中不得写“院校组”。'
    ],
    sourceName: kb?.sourceName || '辽宁省教育厅',
    sourceLevel: kb?.sourceLevel || 'A'
  };
}

export function formatLiaoningOrdinaryUndergraduatePolicyLine() {
  const p = getLiaoningOrdinaryUndergraduatePolicy();
  return `辽宁普通类本科批按“${p.mode}”理解，最多 ${p.maxChoices} 个志愿；本报告按专业条目复核。`;
}

export function getLiaoningPolicyDiagnostics() {
  const p = getLiaoningOrdinaryUndergraduatePolicy();
  return { ok: Boolean(p.mode && p.maxChoices), policy: p };
}
