import { getAdvisorZonePolicy } from './advisor-zone-policy.js';
import { applyHumanCopyGate } from './diagnosis-human-copy-gate.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('zh-CN') : '—';
}

function cleanAction(value) {
  return String(value || '').replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, '').trim();
}

function buildZoneSentence(facts, zone, policy) {
  const note = facts.note || '分数只作展示，诊断以位次、控制线和已选专业结构为主。';
  return `${note} 当前更接近“${policy.zoneName}”。${policy.mainConflict}`;
}

function structureText(facts) {
  const s = facts.poolStructure || {};
  if (!s.total) return '已选专业暂无专业志愿，暂时无法判断前中后段结构。';
  const balance = s.safeCount >= Math.max(3, Math.ceil(s.total * 0.22)) && s.stableCount >= Math.ceil(s.total * 0.30) && s.rushCount <= Math.ceil(s.total * 0.40);
  return balance
    ? `当前共有 ${s.total} 个志愿，稍高目标 ${s.rushCount} 个、主要参考 ${s.stableCount} 个、低分侧补充 ${s.safeCount} 个，数量结构基本有框架。后续重点是确认主要参考和低分侧补充是否真能接受。`
    : `当前共有 ${s.total} 个志愿，稍高目标 ${s.rushCount} 个、主要参考 ${s.stableCount} 个、低分侧补充 ${s.safeCount} 个，结构还需要调整，重点检查中段承接和低分侧补充是否足够。`;
}

function majorText(facts) {
  const s = facts.poolStructure || {};
  if (!s.total) return '专业路径待补充。';
  const parts = [];
  if (s.topMajorFamily && s.topMajorFamilyPct >= 50) parts.push(`${s.topMajorFamily}方向占比较高，如果孩子明确接受可以作为主线；如果只是因为就业想象而集中选择，建议补充相邻方向分散需要关注。`);
  if (s.topCity && s.topCityPct >= 45) parts.push(`地域集中在${s.topCity}，如果家庭目标就是本地就业和成本控制可以理解，但仍建议补充少量其他城市或院校层级。`);
  if (s.tuitionOrCoopCount) parts.push(`已选专业中存在中外合作/高收费相关项目，需要逐条核验预算、毕业证、校区和培养方式。`);
  return parts.join(' ') || '专业和城市过于集中暂未形成明显单点需要关注，仍需逐条核验专业接受度、校区、学费和计划变化。';
}


function pushRateText(facts) {
  const p = facts.pushRateSummary || {};
  if (!facts.poolStructure?.total) return '已选专业暂无专业志愿，暂无法判断升学与推免参考。';
  if (!p.matchedCount) return '当前已选专业暂未匹配到可用的学校级推免参考数据，不能据此判断升学跳板价值。';
  const parts = [];
  parts.push(p.advisorText || `当前有 ${p.matchedCount} 个志愿匹配到学校级推免参考数据。`);
  if (p.pathHint === 'study-platform-visible') parts.push('如果孩子有明确读研/保研规划，这些院校可作为升学跳板参考；如果本科就业优先，则仍应把行业就业、专业能力和地域放在前面。');
  else parts.push('该指标在本方案中只作辅助参考，不能替代专业实力、就业路径和录取位次判断。');
  parts.push('校级推免率不等于学院/专业保研率，具体专业名额必须核验学院推免办法和近年公示。');
  return parts.join('');
}

function bottomText(facts) {
  const s = facts.poolStructure || {};
  const b = facts.bottomLineSummary || {};
  const modeText = b.mode && b.mode !== 'all' ? `当前办学性质底线为“${b.modeLabel || '已设置'}”。` : '';
  let tail = '';
  if (b.mode === 'public_regular_only') tail = `该模式要求只保留公办普通收费项目，若已选专业里仍有公办中外/高收费或民办项目，需要人工确认。`;
  if (b.mode === 'public_include_sino') tail = `该模式允许公办中外/高收费，但排除民办；相关项目要核验学费、培养模式、毕业证书、校区和家庭承受能力。`;
  if (b.mode === 'public_first') tail = `该模式优先展示公办，但不自动删除其他候选；最终是否接受仍需家庭确认。`;
  if (!s.total) return `${modeText}低分侧补充待补充。${tail}`.trim();
  if (s.safeCount < Math.max(3, Math.ceil(s.total * 0.22))) return `${modeText}低分侧补充数量偏少，后段承接不足，需要补充低一层位次且真实可接受的低分侧补充项。${tail}`.trim();
  if (s.deepSafeCount < Math.max(1, Math.ceil(s.total * 0.08))) return `${modeText}低分侧补充数量不算少，但深层低分侧补充不足，需要检查是否真正拉开位次。${tail}`.trim();
  return `${modeText}低分侧补充数量不算少，但仍要核验学校、城市、专业、学费是否都能接受；低分侧补充不是低分凑数。${tail}`.trim();
}

export function buildAdvisorFallbackNarrative({ facts, candidateZones, risks = [], actions = [] }) {
  const zone = candidateZones?.[0] || { zoneKey: 'missing-rank-zone', zoneName: '位次待核验区' };
  const policy = getAdvisorZonePolicy(zone.zoneKey);
  const cleanedActions = (actions || []).map(cleanAction).filter(Boolean).slice(0, 6);
  const finalActions = cleanedActions.length ? cleanedActions : [
    '先确认主要参考是否都是孩子能接受的专业方向',
    '低分侧补充逐条确认学校、城市、专业、学费和校区',
    '排序前确认家庭更重视省内就业、平台层级还是专业技能路径'
  ];
  const riskDiagnosis = risks.length ? risks.slice(0, 6) : ['暂未发现明显结构性需要关注，但仍需人工核验招生计划、选科、体检、学费和校区。'];
  const overall = facts.poolStructure?.total
    ? `当前方案已有基本框架。本轮重点是围绕“${policy.mainGoal}”，把前中后段结构和专业接受度确认清楚。`
    : '已选专业暂无专业志愿，建议先补充上探、主体、主要参考和低分侧补充候选。';
  const zoneJudgement = buildZoneSentence(facts, zone, policy);
  const structureDiagnosis = structureText(facts);
  const majorPathDiagnosis = majorText(facts);
  const pushRateDiagnosis = pushRateText(facts);
  const bottomLineDiagnosis = bottomText(facts);
  const parentVersion = `${policy.zoneName}：${policy.mainGoal} 这不是固定分数段套话，而是基于当前位次、控制线和已选专业结构的判断。`;
  const reportMarkdown = [
    '## 方案解读',
    '',
    `**整体判断：** ${overall}`,
    '',
    `**位次功能区判断：** ${zoneJudgement}`,
    '',
    `**结构诊断：** ${structureDiagnosis}`,
    '',
    `**专业路径：** ${majorPathDiagnosis}`,
    '',
    `**升学与推免参考：** ${pushRateDiagnosis}`,
    '',
    `**后段底线：** ${bottomLineDiagnosis}`,
    '',
    '**调整建议：**',
    ...finalActions.map((a, i) => `${i + 1}. ${a}`)
  ].join('\n');
  const narrative = applyHumanCopyGate({
    overall,
    finalZone: { zoneKey: zone.zoneKey, zoneName: policy.zoneName, secondaryZoneKey: candidateZones?.[1]?.zoneKey || '', confidenceText: '基础规则说明' },
    zoneJudgement,
    reasoning: `${policy.mainConflict} 当前已选专业需要按这个主矛盾检查，而不是只按固定分数段套话。`,
    structureDiagnosis,
    majorPathDiagnosis,
    pushRateDiagnosis,
    bottomLineDiagnosis,
    riskDiagnosis,
    actions: finalActions,
    parentVersion,
    reportMarkdown,
    disclaimer: '本说明只解释位次功能区和方案结构，不做录取判断；最终以当年一分一段、招生计划、专业备注、选科、体检、学费和校区核验为准。'
  });
  return narrative;
}


// v3.9.6.4 keyword note: 专业/项目/行业关键词包括中外、合作办学、高收费、石油、交通、航天等；AI/报告不得把中外绕过办学费用底线，须提示学费、培养模式、毕业证书、校区、是否必须出国、保研资格与转专业政策。
