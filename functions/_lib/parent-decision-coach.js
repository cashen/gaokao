import { bottomLineModeSummary } from './bottomline-policy.js';
import { getAdvisorZonePolicy } from './advisor-zone-policy.js';

function clean(value, max = 240) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('zh-CN') : '—';
}
function addUnique(list, value) {
  const s = clean(value, 360).replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, '');
  if (s && !list.includes(s)) list.push(s);
}
function lightLevel(lights = {}, key) {
  return lights?.[key]?.level || '';
}
function modeLabel(mode) {
  return bottomLineModeSummary(mode || 'all').label || '全部院校';
}
function buildBottomLineReview(facts = {}) {
  const b = facts.bottomLineSummary || {};
  const label = b.modeLabel || modeLabel(b.mode);
  if (!b.mode || b.mode === 'all') {
    return '当前未设置特殊公办底线，适合先看全貌；后续进入已选专业体检时，仍需逐条核验民办、高收费、中外合作和费用承受能力。';
  }
  if (b.mode === 'public_first') {
    return `当前底线为“${label}”：公办普通项目会优先考虑，但民办/高收费/中外合作不会被自动删除，适合先扩展候选、再人工收口。`;
  }
  if (b.mode === 'public_regular_only') {
    const issues = (b.publicSinoOrHighFeeCount || 0) + (b.privateLikeCount || 0) + (b.unknownCount || 0);
    return issues
      ? `当前底线为“${label}”，已选专业中仍有 ${fmt(issues)} 个项目需要确认，重点看公办中外/高收费、民办/独立或性质费用未知项目是否应替换。`
      : `当前底线为“${label}”，已选专业暂未发现明显违反底线的项目，仍建议核验学费、校区和招生章程。`;
  }
  if (b.mode === 'public_include_sino') {
    return `当前底线为“${label}”：公办中外/高收费项目可以保留，但不等同于普通公办，需重点核验学费、培养模式、毕业证书、是否必须出国、校区和家庭承受能力。`;
  }
  return `当前底线为“${label}”，请结合家庭费用承受能力和专业接受度人工确认。`;
}
function buildFamilyQuestions(facts = {}, healthLights = {}, zoneKey = '') {
  const b = facts.bottomLineSummary || {};
  const stats = facts.poolStructure || {};
  const questions = [];
  addUnique(questions, '孩子是否明确接受当前已选专业里的主专业方向？');
  addUnique(questions, '低分侧补充里的学校、城市、专业和学费，是否真的愿意读？');
  if (b.mode === 'public_regular_only') addUnique(questions, '家庭是否明确不接受公办中外/高收费和民办本科？');
  if (b.mode === 'public_include_sino') addUnique(questions, '如果保留公办中外/高收费，家庭是否能持续承担费用，并接受培养模式差异？');
  if (lightLevel(healthLights, 'majorDiversity') === 'warn' || stats.topMajorFamilyPct >= 55) addUnique(questions, '当前专业方向较集中，这是孩子真实偏好，还是因为就业想象而集中选择？');
  if (lightLevel(healthLights, 'locationDiversity') === 'warn' || stats.topCityPct >= 45) addUnique(questions, '地域集中是否是家庭主动选择，还是因为不了解其他城市学校造成的单点需要关注？');
  if (['industry-platform-zone', 'platform-major-balance-zone', 'high-platform-zone'].includes(zoneKey)) addUnique(questions, '平台、专业、城市三者之间，家庭最不能牺牲的是哪一个？');
  return questions.slice(0, 6);
}
function buildManualCheckList(facts = {}) {
  const checks = [
    '核验 2027 正式招生计划、专业代码和计划人数。',
    '核验选科、体检、单科、语种、校区、学费和培养模式。',
    '核验低分侧补充是否真能接受，不要只因分数较低就当作安全项。'
  ];
  const b = facts.bottomLineSummary || {};
  if (b.mode === 'public_regular_only') checks.push('若当前为“只看公办普通”，逐条排除公办中外/高收费和民办/独立项目。');
  if (b.mode === 'public_include_sino') checks.push('若保留公办中外/高收费，重点核验毕业证书、是否必须出国、保研资格和家庭预算。');
  if (facts.pushRateSummary?.matchedCount) checks.push('推免参考只看校级平台价值，专业/学院名额仍需查学院推免办法。');
  return checks.slice(0, 8);
}
function buildHeadline(facts = {}, healthLights = {}, zonePolicy = {}) {
  const score = facts.candidate?.score;
  const overall = healthLights.overall?.level || 'info';
  const zoneName = zonePolicy.zoneName || '当前位次功能区';
  if (!score) return '请先填写考生成绩，再进行已选专业体检和报告生成。';
  if (overall === 'risk') return `当前方案在“${zoneName}”下需要关注偏高，建议先补齐主要参考和低分侧补充，再生成正式报告。`;
  if (overall === 'warn') return `当前方案已有基础，但在“${zoneName}”下仍需先确认底线、低分侧补充和集中度需要关注。`;
  return `当前方案在“${zoneName}”下可以进入人工确认和排序微调，重点确认后段是否真能接受。`;
}
export function buildRuleBasedParentCoach({ facts = {}, healthLights = {}, rule = {}, candidateZones = [], narrative = null } = {}) {
  const finalZoneKey = narrative?.finalZone?.zoneKey || candidateZones?.[0]?.zoneKey || 'missing-rank-zone';
  const zonePolicy = getAdvisorZonePolicy(finalZoneKey);
  const stats = facts.poolStructure || {};
  const bottom = facts.bottomLineSummary || {};
  const actions = [];
  if (!stats.total) {
    addUnique(actions, '先回查询页加入候选专业，至少形成上探、主体、主要参考和低分侧补充几个层次后再诊断。');
  }
  if (bottom.mode && bottom.mode !== 'all') {
    const issueCount = Number(bottom.filteredOutCount || 0);
    if (issueCount > 0) addUnique(actions, `当前底线为“${bottom.modeLabel || modeLabel(bottom.mode)}”，已选专业中有 ${fmt(issueCount)} 个项目不完全符合，请先人工确认是否保留。`);
    else addUnique(actions, `当前底线为“${bottom.modeLabel || modeLabel(bottom.mode)}”，下一步重点核验费用、校区和招生章程是否一致。`);
  }
  if (lightLevel(healthLights, 'bottomDepth') === 'warn') addUnique(actions, '先补低分侧补充：增加低一层位次、学校城市专业都能接受的低分侧补充项。');
  else addUnique(actions, '确认低分侧补充：确认后段不是“分低但不想读”的假低分侧补充。');
  if (lightLevel(healthLights, 'majorDiversity') === 'warn') addUnique(actions, '专业方向较集中；若孩子不是强偏好，补充自动化、机械、电子信息、计算机软件等相邻方向。');
  if (lightLevel(healthLights, 'locationDiversity') === 'warn') addUnique(actions, '地域较集中；若不是家庭主动选择，补充 2—3 个其他可接受城市或院校层级。');
  if (stats.rushCount > Math.ceil((stats.total || 0) * 0.4)) addUnique(actions, '稍高目标数量偏多，保留高价值目标即可，不要让稍高目标替代中后段承接。');
  if (facts.pushRateSummary?.matchedCount) addUnique(actions, '有读研目标时，可把学校级推免参考作为辅助，但仍需核验具体学院/专业名额。');
  if (['industry-platform-zone', 'platform-major-balance-zone', 'high-platform-zone'].includes(finalZoneKey)) {
    addUnique(actions, '若考虑公办中外合作上探平台，不作为前端底线按钮处理，只在人工确认中核验费用、培养模式和平台收益。');
  }
  const familyQuestions = buildFamilyQuestions(facts, healthLights, finalZoneKey);
  const manualCheckList = buildManualCheckList(facts);
  const bottomLineReview = buildBottomLineReview(facts);
  return {
    version: 'v3.9.6.3',
    headline: buildHeadline(facts, healthLights, zonePolicy),
    nextActions: actions.slice(0, 6),
    bottomLineReview,
    familyQuestions,
    manualCheckList,
    reportMarkdown: [
      '## 家长下一步确认清单',
      '',
      buildHeadline(facts, healthLights, zonePolicy),
      '',
      '### 下一步动作',
      ...actions.slice(0, 6).map((x, i) => `${i + 1}. ${x}`),
      '',
      '### 底线确认',
      bottomLineReview,
      '',
      '### 家庭需要确认的问题',
      ...familyQuestions.map((x, i) => `${i + 1}. ${x}`),
      '',
      '### 人工核验清单',
      ...manualCheckList.map((x, i) => `${i + 1}. ${x}`)
    ].join('\n')
  };
}
