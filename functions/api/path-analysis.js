import { buildAdvisorFacts } from '../_lib/advisor-fact-builder.js';
import { buildZoneCandidates } from '../_lib/advisor-zone-candidates.js';
import { getAdvisorZonePolicy } from '../_lib/advisor-zone-policy.js';
import { buildAdvisorAiMessages } from '../_lib/advisor-ai-prompt.js';
import { parseAdvisorAiText, validateAdvisorAiNarrative } from '../_lib/advisor-ai-validator.js';
import { buildAdvisorFallbackNarrative } from '../_lib/advisor-fallback-writer.js';
import { buildAdvisorHealthLights } from '../_lib/advisor-health-lights.js';
import { buildReportSnapshot } from '../_lib/report-snapshot-builder.js';
import { buildRuleBasedParentCoach } from '../_lib/parent-decision-coach.js';
import { resolveAiModel, buildAiModelDebug } from '../_lib/ai-model-resolver.js';
import { normalizeDiagnosisCopy, normalizeDiagnosisLines } from '../_lib/diagnosis-copy-normalizer.js';
import { FEISHU_REPORT_CONTRACT, FEISHU_YEAR_CALIBER } from '../../shared/resources/reports/feishu-report-contract.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function clean(value, max = 300) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('zh-CN') : '—';
}

function pct(part, total) { return total ? Math.round(part / total * 100) : 0; }

function addUnique(list, value) {
  const s = clean(value, 360);
  if (s && !list.includes(s)) list.push(s);
}

// v3.9.7.7 前端按钮统一为“检查这套方案”，这里输出家长可读的方案解读事实层。
function buildRuleRisksAndActions(facts, candidateZones) {
  const stats = facts.poolStructure || {};
  const total = stats.total || 0;
  const primary = candidateZones?.[0] || { zoneKey: 'missing-rank-zone' };
  const policy = getAdvisorZonePolicy(primary.zoneKey);
  const risks = [];
  const actions = [];

  if (!total) {
    return {
      risks: ['已选专业为空，无法判断前中后段结构。'],
      actions: ['先从稍高目标、主要参考和低分侧补充三个区间各加入一些专业。'],
      level: 'empty'
    };
  }

  addUnique(actions, `当前候选主定位为“${policy.zoneName}”，本轮排序应围绕“${policy.mainGoal}”确认。`);

  if (total < 12) {
    addUnique(risks, '已选专业数量偏少，当前更像候选清单，不适合作为完整填报方案。');
    addUnique(actions, '继续补充主要参考区和低分侧补充，先扩展到至少20个以上再做正式排序。');
  }
  if (stats.rushCount > Math.ceil(total * 0.40)) {
    addUnique(risks, '稍高目标占比偏高，容易形成前段好看、中后段承接不足。');
    addUnique(actions, '保留少量高价值稍高目标，其余用更接近位次的主体专业替换。');
  }
  if (stats.highRushCount > 2) {
    addUnique(risks, '前段偏高的项目数量偏多，它们只能少量保留，不能当作主要依赖。');
    addUnique(actions, '偏高项目建议控制在1-2个左右，并确认学校、城市、专业都能接受。');
  }
  if (stats.stableCount < Math.ceil(total * 0.30)) {
    addUnique(risks, '主要参考偏薄，中段承接不够厚。');
    addUnique(actions, '优先补充接近孩子位次、孩子也愿意读的专业，作为主要参考。');
  }
  if (stats.safeCount < Math.max(3, Math.ceil(total * 0.22))) {
    addUnique(risks, '低分侧补充数量偏少，后段承接能力不足。');
    addUnique(actions, '增加若干低分侧补充专业，尤其补充需要关注较少、且家庭真实可接受的方向。');
  } else if (stats.deepSafeCount < Math.max(1, Math.ceil(total * 0.08))) {
    addUnique(risks, '后段数量不算少，但真正拉开位次的选择还不够。');
    addUnique(actions, '补充低一层位次、学校城市专业都能接受的低分侧补充项。');
  }
  if (stats.missingRankCount) {
    addUnique(risks, `${fmt(stats.missingRankCount)}个专业缺少可识别参考位次，低分侧补充深度和位次跨度需要人工补核。`);
  }

  const key = primary.zoneKey;
  if (['undergraduate-edge-zone', 'undergraduate-quality-zone'].includes(key)) {
    addUnique(actions, '本科线附近要优先核验办学性质、学费、专业接受度和家庭承受能力。');
    if (stats.privateOrFeeCount >= Math.max(2, Math.ceil(total * 0.20))) addUnique(risks, '民办/高收费/中外合作相关项目占比不低，需要先核验预算和接受度。');
  }
  if (key === 'public-sensitive-zone') {
    addUnique(actions, '公办竞争敏感区要避免后段太浅，不能只用低几分项目当低分侧补充。');
  }
  if (key === 'special-edge-zone') {
    if (stats.safeCount < Math.max(4, Math.ceil(total * 0.30))) addUnique(risks, '特控线附近低分侧补充偏薄，太接近分数的后段项目容易不够稳。');
    addUnique(actions, '特控线边缘区应让主要参考更厚、低分侧补充更扎实，不要把希望都押在稍高目标上。');
  }
  if (key === 'applied-tech-main-zone') {
    const appliedCount = (stats.byMajorFamily?.['电气电子信息'] || 0) + (stats.byMajorFamily?.['机械自动化制造'] || 0) + (stats.byMajorFamily?.['计算机/软件数据'] || 0);
    if (appliedCount < Math.ceil(total * 0.25)) addUnique(risks, '应用技术路线承接不足，当前已选专业里可形成技能积累的工科/信息类比例偏低。');
    addUnique(actions, '主体区优先围绕机械、自动化、电气、电子信息、计算机软件等能形成技能路径的专业确认。');
  }
  if (key === 'industry-entry-zone') {
    addUnique(actions, '行业入口选择区要逐条比较学校行业属性、专业课程、校招资源和是否适合回辽宁就业。');
  }
  if (key === 'industry-platform-zone') {
    addUnique(actions, '特色行业院校选择区要先明确省内就业、出省发展、考研考公和家庭容错的优先级。');
  }
  if (['platform-major-balance-zone', 'high-platform-zone', 'top-platform-fine-sort-zone'].includes(key)) {
    addUnique(actions, '平台分段要明确专业牺牲边界：能冲平台，但不能接受完全读不下去的专业。');
  }

  if (stats.topCity && total >= 8 && stats.topCityPct >= 45) {
    addUnique(risks, `地域集中度偏高：${stats.topCity}相关志愿占比约${stats.topCityPct}%。`);
    addUnique(actions, '如果家庭目标就是本地就业可以保留，但建议补充少量其他城市或院校层级，降低单点需要关注。');
  }
  if (stats.topMajorFamily && total >= 8 && stats.topMajorFamilyPct >= 55) {
    addUnique(risks, `专业方向集中度偏高：${stats.topMajorFamily}占比约${stats.topMajorFamilyPct}%。`);
    addUnique(actions, '如果孩子明确强偏好该方向可以保留；否则加入1-2个相邻专业方向做需要关注分散。');
  }
  const aiMicroCount = stats.byMajorFamily?.['AI/微电子/智能类'] || 0;
  if (aiMicroCount >= Math.max(2, Math.ceil(total * 0.20))) {
    addUnique(risks, 'AI/微电子/智能类占比较高，需要核验师资、实验室、课程体系和产业合作。');
    addUnique(actions, '把新办热门专业从名称吸引改为师资、实验室、校招、课程难度逐条核验。');
  }
  if (stats.tuitionOrCoopCount >= 1) {
    addUnique(actions, '涉及中外合作、高收费或特殊培养项目时，逐条核验学费、毕业证、校区和培养方式。');
  }
  const bottomLine = facts.bottomLineSummary || {};
  if (bottomLine.mode === 'public_regular_only' && bottomLine.publicSinoOrHighFeeCount) {
    addUnique(risks, `当前底线为“只看公办普通”，但已选专业中仍有${fmt(bottomLine.publicSinoOrHighFeeCount)}个公办中外/高收费项目，需要人工确认。`);
  }
  if (bottomLine.mode === 'public_include_sino' && bottomLine.publicSinoOrHighFeeCount) {
    addUnique(actions, '当前允许“公办含中外/高收费”，这类项目可保留，但要重点核验费用、培养模式、毕业证书和家庭承受能力。');
  }
  if (bottomLine.mode && bottomLine.mode !== 'all' && bottomLine.privateLikeCount) {
    addUnique(risks, `当前底线为“${bottomLine.modeLabel || '办学性质底线'}”，已选专业中仍有${fmt(bottomLine.privateLikeCount)}个民办/独立类项目，建议人工确认是否保留。`);
  }

  const push = facts.pushRateSummary || {};
  if (push.total) {
    if (!push.matchedCount) {
      addUnique(actions, '当前已选专业暂未匹配到学校级推免参考数据，不要把保研机会作为排序依据。');
    } else {
      if (['industry-platform-zone', 'platform-major-balance-zone', 'high-platform-zone', 'top-platform-fine-sort-zone'].includes(key) && push.mediumHighOpportunityCount >= 1) {
        addUnique(actions, '本分段可把“升学与推免参考”作为辅助排序维度，但必须区分校级推免机会和专业实际名额。');
      }
      if (push.mediumHighOpportunityCount >= Math.ceil(total * 0.25)) {
        addUnique(actions, '当前已选专业已有一定升学跳板型院校，可在报告中单独说明其保研/考研平台价值。');
      }
      if (push.needMajorCheckCount >= 1) {
        addUnique(risks, '校级推免率不等于所报专业保研率，相关学院/专业名额仍需人工核验。');
      }
    }
  }
  if (!risks.length) addUnique(risks, '暂未发现明显结构性需要关注，但仍需人工核验招生计划、选科、体检、学费和校区。');
  if (!actions.length) addUnique(actions, '保持当前前中后段结构，逐条核验专业接受度、计划变化和特殊项目标签。');
  const level = risks.length >= 5 ? 'high' : risks.length >= 3 ? 'medium' : 'low';
  return { risks: normalizeDiagnosisLines(risks), actions: normalizeDiagnosisLines(actions), level };
}

function getAiText(result) {
  if (!result) return '';
  if (typeof result.response === 'string') return result.response;
  if (typeof result.result === 'string') return result.result;
  if (typeof result.text === 'string') return result.text;
  if (Array.isArray(result.choices) && result.choices[0]?.message?.content) return result.choices[0].message.content;
  return JSON.stringify(result);
}

function errorText(error) {
  const parts = [error?.message, error?.name, error?.code, error?.status, error?.cause?.message].filter(Boolean);
  return parts.join(' | ');
}

function isAiQuotaLimit(error) {
  const s = errorText(error).toLowerCase();
  return s.includes('3036') || s.includes('account limited') || s.includes('daily free allocation') || s.includes('10,000 neurons') || s.includes('10000 neurons') || s.includes('free allocation') || (s.includes('429') && s.includes('neuron'));
}

async function buildNarrative(context, { facts, candidateZones, risks, actions, fallbackNarrative }) {
  const resolvedModel = resolveAiModel(context.env || {}, { specificKey: 'AI_PATH_MODEL' });
  const model = resolvedModel.model;
  if (!context.env?.AI || typeof context.env.AI.run !== 'function') {
    return { source: 'fallback', model: '', modelDebug: buildAiModelDebug(resolvedModel), message: '已根据当前方案结构生成基础说明。', narrative: fallbackNarrative, aiDecision: null, validator: { ok: false, reason: 'AI binding missing' } };
  }
  try {
    const messages = buildAdvisorAiMessages({ facts, candidateZones, ruleRisks: risks, ruleActions: actions, fallbackNarrative });
    const aiResult = await context.env.AI.run(model, { messages, temperature: 0.15, max_tokens: 1100 });
    const raw = getAiText(aiResult);
    const parsed = parseAdvisorAiText(raw);
    const validation = validateAdvisorAiNarrative(parsed, { candidateZones, fallbackNarrative });
    if (!validation.ok) {
      return { source: 'fallback-ai-invalid', model, modelDebug: buildAiModelDebug(resolvedModel), message: '已根据当前方案结构生成基础说明。', narrative: fallbackNarrative, aiDecision: parsed, validator: validation };
    }
    return { source: 'workers-ai', model, modelDebug: buildAiModelDebug(resolvedModel), message: '方案解读已生成。', narrative: validation.narrative, aiDecision: parsed, validator: validation };
  } catch (error) {
    const source = isAiQuotaLimit(error) ? 'fallback-ai-quota' : 'fallback-ai-error';
    const message = source === 'fallback-ai-quota' ? '方案解读暂时使用基础规则生成。' : '方案解读暂时使用基础规则生成。';
    return { source, model, modelDebug: buildAiModelDebug(resolvedModel), message, aiError: errorText(error).slice(0, 240), narrative: fallbackNarrative, aiDecision: null, validator: { ok: false, reason: errorText(error).slice(0, 180) } };
  }
}

function buildRankZoneCompat(facts, candidateZones, narrative) {
  const zoneKey = narrative?.finalZone?.zoneKey || candidateZones?.[0]?.zoneKey || 'missing-rank-zone';
  const policy = getAdvisorZonePolicy(zoneKey);
  return {
    version: 'v3.9.7.0',
    candidateScore: facts.candidate?.score,
    candidateRank: facts.candidate?.rank,
    candidateRankStart: facts.candidate?.rankStart,
    candidateRankEnd: facts.candidate?.rankEnd,
    candidateSameCount: facts.candidate?.sameCount,
    candidateRankLabel: facts.candidate?.rankLabel,
    undergraduateControlScore: facts.controls?.undergraduateControlScore,
    undergraduateControlRank: facts.controls?.undergraduateControlRank,
    undergraduateControlRankLabel: facts.controls?.undergraduateControlRankLabel,
    specialControlScore: facts.controls?.specialControlScore,
    specialControlRank: facts.controls?.specialControlRank,
    specialControlRankLabel: facts.controls?.specialControlRankLabel,
    scoreOffsetFromSpecial: facts.offsets?.scoreOffsetFromSpecial,
    rankOffsetFromSpecial: facts.offsets?.rankOffsetFromSpecial,
    scoreOffsetFromUndergraduate: facts.offsets?.scoreOffsetFromUndergraduate,
    rankOffsetFromUndergraduate: facts.offsets?.rankOffsetFromUndergraduate,
    density: facts.density,
    zoneKey,
    zoneName: policy.zoneName,
    zoneRole: policy.mainConflict,
    note: facts.note,
    policySnapshot: policy
  };
}

function buildSummary(facts, zonePolicy, level) {
  const total = facts.poolStructure?.total || 0;
  if (!total) return '已选专业暂无专业志愿。';
  if (level === 'high') return `当前已选专业整体需要关注偏高。结合${zonePolicy.zoneName}定位，需要先补齐中段承接和低分侧补充，再做最终排序。`;
  if (level === 'medium') return `当前已选专业已有基本框架。结合${zonePolicy.zoneName}定位，仍需确认前中后段比例、低分侧补充深度和集中度需要关注。`;
  return `当前已选专业结构相对均衡。结合${zonePolicy.zoneName}定位，可以进入人工确认、排序微调和报告整理。`;
}

function buildReportText({ facts, rankZone, stats, narrative }) {
  const lines = [];
  lines.push(`辽宁 ${FEISHU_REPORT_CONTRACT.dataYear} 物理类专业初选参考报告`);
  lines.push(FEISHU_YEAR_CALIBER.reportCopy);
  lines.push('');
  lines.push(`考生分数：${facts.candidate?.score || '未填写'}`);
  lines.push(`考生位次：${facts.candidate?.rankLabel || '位次待核验'}`);
  lines.push(`当前定位：${rankZone.zoneName || '待判断'}`);
  lines.push(`数据口径：${FEISHU_YEAR_CALIBER.primaryFact}；${FEISHU_YEAR_CALIBER.historicalBoundary}`);
  lines.push('');
  lines.push(`稍高目标：${stats.rushCount}个（${pct(stats.rushCount, stats.total)}%）｜主要参考：${stats.stableCount}个（${pct(stats.stableCount, stats.total)}%）｜低分侧补充：${stats.safeCount}个（${pct(stats.safeCount, stats.total)}%）`);
  lines.push('');
  lines.push(narrative.reportMarkdown || narrative.parentVersion || narrative.overall || '');
  return lines.join('\n');
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ ok: false, message: '只支持 POST 请求。' }, 405);
  try {
    const body = await context.request.json();
    const facts = buildAdvisorFacts({
      items: body.items || body.orderedItems || [],
      candidateScore: body.candidateScore || null,
      year: FEISHU_REPORT_CONTRACT.dataYear,
      dataYear: FEISHU_REPORT_CONTRACT.dataYear,
      rankYear: FEISHU_REPORT_CONTRACT.rankYear,
      audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
      region: FEISHU_REPORT_CONTRACT.region,
      subject: FEISHU_REPORT_CONTRACT.subject,
      bottomLineMode: body.bottomLineMode || body.filterState?.bottomLineMode || body.candidateContext?.bottomLineMode || 'all'
    });
    const candidateZones = buildZoneCandidates(facts);
    const rule = buildRuleRisksAndActions(facts, candidateZones);
    const fallbackNarrative = buildAdvisorFallbackNarrative({ facts, candidateZones, risks: rule.risks, actions: rule.actions });
    const healthLights = buildAdvisorHealthLights(facts, rule);
    const narrativeResult = await buildNarrative(context, { facts, candidateZones, risks: rule.risks, actions: rule.actions, fallbackNarrative });
    const narrative = normalizeDiagnosisCopy(narrativeResult.narrative);
    const rankZone = buildRankZoneCompat(facts, candidateZones, narrative);
    const policy = getAdvisorZonePolicy(rankZone.zoneKey);
    const summary = buildSummary(facts, policy, rule.level);
    const parentCoach = buildRuleBasedParentCoach({ facts, healthLights, rule, candidateZones, narrative });
    const reportSnapshot = buildReportSnapshot({ facts, rankZone, stats: facts.poolStructure, narrative, healthLights, parentCoach, source: narrativeResult.source });
    const result = {
      ok: true,
      version: 'v3.9.7.0',
      level: rule.level,
      source: narrativeResult.source,
      parentCoach,
      model: narrativeResult.model || '',
      modelDebug: narrativeResult.modelDebug || {},
      message: narrativeResult.message || '',
      aiError: narrativeResult.aiError || '',
      summary,
      facts: { ...facts, orderedItems: undefined },
      candidateZones,
      aiDecision: narrativeResult.aiDecision || null,
      narrative,
      aiNarrative: narrative,
      rankZone,
      candidateContext: rankZone,
      policySnapshot: policy,
      stats: facts.poolStructure,
      pushRateSummary: facts.pushRateSummary,
      bottomLine: facts.bottomLine,
      bottomLineSummary: facts.bottomLineSummary,
      healthLights,
      reportSnapshot,
      recomputeVerified: true,
      risks: rule.risks,
      actions: rule.actions,
      sections: [],
      orderedItems: facts.orderedItems,
      orderSignature: clean(body.orderSignature || '', 600),
      contextSignature: clean(body.contextSignature || body.candidateContext?.signature || '', 240),
      computedSignature: clean(body.computedSignature || '', 720),
      generatedAt: new Date().toISOString(),
      dataYear: FEISHU_REPORT_CONTRACT.dataYear,
      rankYear: FEISHU_REPORT_CONTRACT.rankYear,
      audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
      yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion,
      debug: {
        factsBuilt: true,
        candidateZonesCount: candidateZones.length,
        aiCalled: narrativeResult.source === 'workers-ai',
        aiValidated: Boolean(narrativeResult.validator?.ok),
        fallbackUsed: narrativeResult.source !== 'workers-ai',
        validatorReason: narrativeResult.validator?.reason || ''
      }
    };
    result.reportText = buildReportText({ facts, rankZone, stats: facts.poolStructure, narrative });
    return json(result);
  } catch (error) {
    return json({ ok: false, message: error && error.message ? error.message : String(error), hint: '方案说明暂时没有生成成功，请稍后重试；这不影响主页面专业初选。' }, 500);
  }
}
