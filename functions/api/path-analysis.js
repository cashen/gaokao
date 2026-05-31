import { buildAdvisorFacts } from '../_lib/advisor-fact-builder.js';
import { buildZoneCandidates } from '../_lib/advisor-zone-candidates.js';
import { getAdvisorZonePolicy } from '../_lib/advisor-zone-policy.js';
import { buildAdvisorAiMessages } from '../_lib/advisor-ai-prompt.js';
import { parseAdvisorAiText, validateAdvisorAiNarrative } from '../_lib/advisor-ai-validator.js';
import { buildAdvisorFallbackNarrative } from '../_lib/advisor-fallback-writer.js';

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

function buildRuleRisksAndActions(facts, candidateZones) {
  const stats = facts.poolStructure || {};
  const total = stats.total || 0;
  const primary = candidateZones?.[0] || { zoneKey: 'missing-rank-zone' };
  const policy = getAdvisorZonePolicy(primary.zoneKey);
  const risks = [];
  const actions = [];

  if (!total) {
    return {
      risks: ['自选池为空，无法判断冲稳保结构。'],
      actions: ['先加入上探、主体、稳妥和保底区间的专业。'],
      level: 'empty'
    };
  }

  addUnique(actions, `当前候选主定位为“${policy.zoneName}”，本轮排序应围绕“${policy.mainGoal}”复核。`);

  if (total < 12) {
    addUnique(risks, '自选池数量偏少，当前更像候选清单，不适合作为完整填报方案。');
    addUnique(actions, '继续补充主体承接区和后段保底区，先扩展到至少20个以上再做正式排序。');
  }
  if (stats.rushCount > Math.ceil(total * 0.40)) {
    addUnique(risks, '冲刺区占比偏高，容易形成前段好看、中后段承接不足。');
    addUnique(actions, '保留少量高价值冲刺，其余用更接近位次的主体专业替换。');
  }
  if (stats.highRushCount > 2) {
    addUnique(risks, '高冲数量偏多，高冲只能承担梦想位，不应作为主要录取依赖。');
    addUnique(actions, '高冲建议控制在1-2个左右，并确认学校、城市、专业都能接受。');
  }
  if (stats.stableCount < Math.ceil(total * 0.30)) {
    addUnique(risks, '稳妥区偏薄，中段承接不够厚。');
    addUnique(actions, '优先补充边稳/稳妥专业，作为真实录取承接区。');
  }
  if (stats.safeCount < Math.max(3, Math.ceil(total * 0.22))) {
    addUnique(risks, '保底数量偏少，后段承接能力不足。');
    addUnique(actions, '增加若干小保/强保/兜底专业，尤其补充低风险、可接受专业方向。');
  } else if (stats.deepSafeCount < Math.max(1, Math.ceil(total * 0.08))) {
    addUnique(risks, '保底数量不算少，但深层保底不足，后段可能没有真正拉开位次。');
    addUnique(actions, '补充低一层位次、学校城市专业都能接受的深层保底项。');
  }
  if (stats.missingRankCount) {
    addUnique(risks, `${fmt(stats.missingRankCount)}个专业缺少可识别参考位次，保底深度和位次跨度需要人工补核。`);
  }

  const key = primary.zoneKey;
  if (['undergraduate-edge-zone', 'undergraduate-quality-zone'].includes(key)) {
    addUnique(actions, '本科线附近要优先核验办学性质、学费、专业接受度和家庭承受能力。');
    if (stats.privateOrFeeCount >= Math.max(2, Math.ceil(total * 0.20))) addUnique(risks, '民办/高收费/中外合作相关项目占比不低，需要先核验预算和接受度。');
  }
  if (key === 'public-sensitive-zone') {
    addUnique(actions, '公办竞争敏感区要防浅保底，不能只用低几分项目当兜底。');
  }
  if (key === 'special-edge-zone') {
    if (stats.safeCount < Math.max(4, Math.ceil(total * 0.30))) addUnique(risks, '特控线附近保底区偏薄，浅保底容易在密集竞争中失效。');
    addUnique(actions, '特控线边缘区应让稳妥区更厚、保底区更深，不要把希望押在冲刺上。');
  }
  if (key === 'applied-tech-main-zone') {
    const appliedCount = (stats.byMajorFamily?.['电气电子信息'] || 0) + (stats.byMajorFamily?.['机械自动化制造'] || 0) + (stats.byMajorFamily?.['计算机/软件数据'] || 0);
    if (appliedCount < Math.ceil(total * 0.25)) addUnique(risks, '应用技术路线承接不足，当前自选池里可形成技能积累的工科/信息类比例偏低。');
    addUnique(actions, '主体区优先围绕机械、自动化、电气、电子信息、计算机软件等能形成技能路径的专业复核。');
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
    addUnique(actions, '如果家庭目标就是本地就业可以保留，但建议补充少量其他城市或院校层级，降低单点风险。');
  }
  if (stats.topMajorFamily && total >= 8 && stats.topMajorFamilyPct >= 55) {
    addUnique(risks, `专业方向集中度偏高：${stats.topMajorFamily}占比约${stats.topMajorFamilyPct}%。`);
    addUnique(actions, '如果孩子明确强偏好该方向可以保留；否则加入1-2个相邻专业方向做风险分散。');
  }
  const aiMicroCount = stats.byMajorFamily?.['AI/微电子/智能类'] || 0;
  if (aiMicroCount >= Math.max(2, Math.ceil(total * 0.20))) {
    addUnique(risks, 'AI/微电子/智能类占比较高，需要核验师资、实验室、课程体系和产业合作。');
    addUnique(actions, '把新办热门专业从名称吸引改为师资、实验室、校招、课程难度逐条核验。');
  }
  if (stats.tuitionOrCoopCount >= 1) {
    addUnique(actions, '涉及中外合作、高收费或特殊培养项目时，逐条核验学费、毕业证、校区和培养方式。');
  }

  const push = facts.pushRateSummary || {};
  if (push.total) {
    if (!push.matchedCount) {
      addUnique(actions, '当前自选池暂未匹配到学校级推免参考数据，不要把保研机会作为排序依据。');
    } else {
      if (['industry-platform-zone', 'platform-major-balance-zone', 'high-platform-zone', 'top-platform-fine-sort-zone'].includes(key) && push.mediumHighOpportunityCount >= 1) {
        addUnique(actions, '本分段可把“升学与推免参考”作为辅助排序维度，但必须区分校级推免机会和专业实际名额。');
      }
      if (push.mediumHighOpportunityCount >= Math.ceil(total * 0.25)) {
        addUnique(actions, '当前自选池已有一定升学跳板型院校，可在报告中单独说明其保研/考研平台价值。');
      }
      if (push.needMajorCheckCount >= 1) {
        addUnique(risks, '校级推免率不等于所报专业保研率，相关学院/专业名额仍需人工核验。');
      }
    }
  }
  if (!risks.length) addUnique(risks, '暂未发现明显结构性风险，但仍需人工核验招生计划、选科、体检、学费和校区。');
  if (!actions.length) addUnique(actions, '保持当前冲稳保结构，逐条核验专业接受度、计划变化和特殊项目标签。');
  const level = risks.length >= 5 ? 'high' : risks.length >= 3 ? 'medium' : 'low';
  return { risks, actions, level };
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
  const model = String(context.env?.AI_PATH_MODEL || '@cf/meta/llama-3.1-8b-instruct').trim();
  if (!context.env?.AI || typeof context.env.AI.run !== 'function') {
    return { source: 'fallback', model: '', message: '未检测到 Cloudflare Workers AI 绑定，已返回规则兜底人话解读。', narrative: fallbackNarrative, aiDecision: null, validator: { ok: false, reason: 'AI binding missing' } };
  }
  try {
    const messages = buildAdvisorAiMessages({ facts, candidateZones, ruleRisks: risks, ruleActions: actions, fallbackNarrative });
    const aiResult = await context.env.AI.run(model, { messages, temperature: 0.15, max_tokens: 1100 });
    const raw = getAiText(aiResult);
    const parsed = parseAdvisorAiText(raw);
    const validation = validateAdvisorAiNarrative(parsed, { candidateZones, fallbackNarrative });
    if (!validation.ok) {
      return { source: 'fallback-ai-invalid', model, message: `AI输出未通过安全校验，已使用规则兜底：${validation.reason}`, narrative: fallbackNarrative, aiDecision: parsed, validator: validation };
    }
    return { source: 'workers-ai', model, message: 'AI高报师解读已生成。', narrative: validation.narrative, aiDecision: parsed, validator: validation };
  } catch (error) {
    const source = isAiQuotaLimit(error) ? 'fallback-ai-quota' : 'fallback-ai-error';
    const message = source === 'fallback-ai-quota' ? 'Cloudflare AI 免费额度已用完，已自动切换为规则兜底解读。' : 'AI调用暂时失败，已自动切换为规则兜底解读。';
    return { source, model, message, aiError: errorText(error).slice(0, 240), narrative: fallbackNarrative, aiDecision: null, validator: { ok: false, reason: errorText(error).slice(0, 180) } };
  }
}

function buildRankZoneCompat(facts, candidateZones, narrative) {
  const zoneKey = narrative?.finalZone?.zoneKey || candidateZones?.[0]?.zoneKey || 'missing-rank-zone';
  const policy = getAdvisorZonePolicy(zoneKey);
  return {
    version: 'v3.9.5.7',
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
  if (!total) return '自选池暂无专业志愿。';
  if (level === 'high') return `当前自选池整体风险偏高。结合${zonePolicy.zoneName}定位，需要先补齐中段承接和后段保底，再做最终排序。`;
  if (level === 'medium') return `当前自选池已有基本框架。结合${zonePolicy.zoneName}定位，仍需复核冲稳保比例、保底深度和集中度风险。`;
  return `当前自选池结构相对均衡。结合${zonePolicy.zoneName}定位，可以进入人工复核、排序微调和报告整理。`;
}

function buildReportText({ facts, rankZone, stats, narrative, source }) {
  const lines = [];
  lines.push('辽宁物理类志愿自选池排序诊断报告');
  lines.push('');
  lines.push(`考生分数：${facts.candidate?.score || '未填写'}`);
  lines.push(`考生位次：${facts.candidate?.rankLabel || '位次待核验'}`);
  lines.push(`功能区：${rankZone.zoneName || '待判断'}`);
  lines.push(`解读来源：${source === 'workers-ai' ? 'Cloudflare Workers AI' : '规则兜底'}`);
  lines.push('数据口径：辽宁2025物理类一分一段与现有专业池；本报告用于志愿讨论，不等同录取预测。');
  lines.push('');
  lines.push(`冲刺：${stats.rushCount}个（${pct(stats.rushCount, stats.total)}%）｜稳妥：${stats.stableCount}个（${pct(stats.stableCount, stats.total)}%）｜保底：${stats.safeCount}个（${pct(stats.safeCount, stats.total)}%）`);
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
      year: body.year || 2025,
      region: body.region || 'ln',
      subject: body.subject || 'physics'
    });
    const candidateZones = buildZoneCandidates(facts);
    const rule = buildRuleRisksAndActions(facts, candidateZones);
    const fallbackNarrative = buildAdvisorFallbackNarrative({ facts, candidateZones, risks: rule.risks, actions: rule.actions });
    const narrativeResult = await buildNarrative(context, { facts, candidateZones, risks: rule.risks, actions: rule.actions, fallbackNarrative });
    const narrative = narrativeResult.narrative;
    const rankZone = buildRankZoneCompat(facts, candidateZones, narrative);
    const policy = getAdvisorZonePolicy(rankZone.zoneKey);
    const summary = buildSummary(facts, policy, rule.level);
    const result = {
      ok: true,
      version: 'v3.9.5.7',
      level: rule.level,
      source: narrativeResult.source,
      model: narrativeResult.model || '',
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
      risks: rule.risks,
      actions: rule.actions,
      sections: [],
      orderedItems: facts.orderedItems,
      orderSignature: clean(body.orderSignature || '', 600),
      generatedAt: new Date().toISOString(),
      debug: {
        factsBuilt: true,
        candidateZonesCount: candidateZones.length,
        aiCalled: narrativeResult.source === 'workers-ai' || narrativeResult.source.startsWith('fallback-ai'),
        aiValidated: Boolean(narrativeResult.validator?.ok),
        fallbackUsed: narrativeResult.source !== 'workers-ai',
        validatorReason: narrativeResult.validator?.reason || ''
      }
    };
    result.reportText = buildReportText({ facts, rankZone, stats: facts.poolStructure, narrative, source: result.source });
    return json(result);
  } catch (error) {
    return json({ ok: false, message: error && error.message ? error.message : String(error), hint: '请检查 path-analysis v3.9.5.6 的 advisor 事实层、候选功能区和 AI 绑定。' }, 500);
  }
}
