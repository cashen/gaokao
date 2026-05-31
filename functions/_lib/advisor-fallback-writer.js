import { getAdvisorZonePolicy } from './advisor-zone-policy.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('zh-CN') : '—';
}

function cleanAction(value) {
  return String(value || '').replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, '').trim();
}

function buildZoneSentence(facts, zone, policy) {
  const note = facts.note || '分数只作展示，诊断以位次、控制线和自选池结构为主。';
  return `${note} 当前更接近“${policy.zoneName}”。${policy.mainConflict}`;
}

function structureText(facts) {
  const s = facts.poolStructure || {};
  if (!s.total) return '自选池暂无专业志愿，暂时无法判断冲稳保结构。';
  const balance = s.safeCount >= Math.max(3, Math.ceil(s.total * 0.22)) && s.stableCount >= Math.ceil(s.total * 0.30) && s.rushCount <= Math.ceil(s.total * 0.40);
  return balance
    ? `当前共有 ${s.total} 个志愿，冲刺 ${s.rushCount} 个、稳妥 ${s.stableCount} 个、保底 ${s.safeCount} 个，数量结构基本有框架。后续重点是复核稳妥区和保底区是否真能接受。`
    : `当前共有 ${s.total} 个志愿，冲刺 ${s.rushCount} 个、稳妥 ${s.stableCount} 个、保底 ${s.safeCount} 个，结构还需要调整，重点检查中段承接和后段保底是否足够。`;
}

function majorText(facts) {
  const s = facts.poolStructure || {};
  if (!s.total) return '专业路径待补充。';
  const parts = [];
  if (s.topMajorFamily && s.topMajorFamilyPct >= 50) parts.push(`${s.topMajorFamily}方向占比较高，如果孩子明确接受可以作为主线；如果只是因为就业想象而集中选择，建议补充相邻方向分散风险。`);
  if (s.topCity && s.topCityPct >= 45) parts.push(`地域集中在${s.topCity}，如果家庭目标就是本地就业和成本控制可以理解，但仍建议补充少量其他城市或院校层级。`);
  if (s.tuitionOrCoopCount) parts.push(`自选池中存在中外合作/高收费相关项目，需要逐条核验预算、毕业证、校区和培养方式。`);
  return parts.join(' ') || '专业和地域集中度暂未形成明显单点风险，仍需逐条核验专业接受度、校区、学费和计划变化。';
}

function bottomText(facts) {
  const s = facts.poolStructure || {};
  if (!s.total) return '保底待补充。';
  if (s.safeCount < Math.max(3, Math.ceil(s.total * 0.22))) return '保底数量偏少，后段承接不足，需要补充低一层位次且真实可接受的保底项。';
  if (s.deepSafeCount < Math.max(1, Math.ceil(s.total * 0.08))) return '保底数量不算少，但深层保底不足，需要检查是否真正拉开位次。';
  return '保底数量不算少，但仍要核验学校、城市、专业、学费是否都能接受；保底不是低分凑数。';
}

export function buildAdvisorFallbackNarrative({ facts, candidateZones, risks = [], actions = [] }) {
  const zone = candidateZones?.[0] || { zoneKey: 'missing-rank-zone', zoneName: '位次待核验区' };
  const policy = getAdvisorZonePolicy(zone.zoneKey);
  const cleanedActions = (actions || []).map(cleanAction).filter(Boolean).slice(0, 6);
  const finalActions = cleanedActions.length ? cleanedActions : [
    '先复核稳妥区是否都是孩子能接受的专业方向',
    '保底区逐条确认学校、城市、专业、学费和校区',
    '排序前确认家庭更重视省内就业、平台层级还是专业技能路径'
  ];
  const riskDiagnosis = risks.length ? risks.slice(0, 6) : ['暂未发现明显结构性风险，但仍需人工核验招生计划、选科、体检、学费和校区。'];
  const overall = facts.poolStructure?.total
    ? `当前方案已形成基本自选池，AI不可用时按规则兜底判断：本轮重点是围绕“${policy.mainGoal}”复核冲稳保结构和专业接受度。`
    : '自选池暂无专业志愿，建议先补充上探、主体、稳妥和保底候选。';
  const zoneJudgement = buildZoneSentence(facts, zone, policy);
  const structureDiagnosis = structureText(facts);
  const majorPathDiagnosis = majorText(facts);
  const bottomLineDiagnosis = bottomText(facts);
  const parentVersion = `${policy.zoneName}：${policy.mainGoal} 这不是固定分数段套话，而是基于当前位次、控制线和自选池结构的判断。`;
  const reportMarkdown = [
    '## AI高报师解读（规则兜底版）',
    '',
    `**整体判断：** ${overall}`,
    '',
    `**位次功能区判断：** ${zoneJudgement}`,
    '',
    `**结构诊断：** ${structureDiagnosis}`,
    '',
    `**专业路径：** ${majorPathDiagnosis}`,
    '',
    `**保底底线：** ${bottomLineDiagnosis}`,
    '',
    '**调整建议：**',
    ...finalActions.map((a, i) => `${i + 1}. ${a}`)
  ].join('\n');
  return {
    overall,
    finalZone: { zoneKey: zone.zoneKey, zoneName: policy.zoneName, secondaryZoneKey: candidateZones?.[1]?.zoneKey || '', confidenceText: '规则兜底判断' },
    zoneJudgement,
    reasoning: `${policy.mainConflict} 当前自选池需要按这个主矛盾检查，而不是只按固定分数段套话。`,
    structureDiagnosis,
    majorPathDiagnosis,
    bottomLineDiagnosis,
    riskDiagnosis,
    actions: finalActions,
    parentVersion,
    reportMarkdown,
    disclaimer: 'AI/规则解读只负责解释位次功能区和方案结构，不预测录取概率；最终以当年一分一段、招生计划、专业备注、选科、体检、学费和校区核验为准。'
  };
}
