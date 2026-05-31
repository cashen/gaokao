import { buildRankZoneContext } from '../_lib/rank-zone-engine.js';
import { getRankZonePolicy } from '../_lib/rank-zone-policy.js';
import { getRankGap, rankGapText } from '../_lib/selection-pool-rank-utils.js';
import { buildPathAiMessages } from '../_lib/path-ai-prompt.js';
import { normalizePathAiOutput, parsePathAiOutput } from '../_lib/path-ai-output-schema.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function num(value, fallback = null) {
  const n = Number(String(value == null ? '' : value).replace(/[,，\s名位分]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function fmt(value) {
  const n = num(value, null);
  return n == null ? '—' : Math.round(n).toLocaleString('zh-CN');
}

function clean(value, max = 200) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function classify(item = {}) {
  const key = item.statusKey || '';
  const delta = num(item.scoreDelta, 0);
  if (['superRush', 'bigRush'].includes(key) || delta >= 16) return { group: 'rush', detail: '高冲', className: 'high-rush', position: '前段少量梦想位' };
  if (['midRush', 'smallRush'].includes(key) || delta >= 4) return { group: 'rush', detail: '小冲', className: 'light-rush', position: '前段冲刺区' };
  if (key === 'match' || (delta >= -5 && delta <= 3)) return { group: 'stable', detail: '边稳', className: 'edge-stable', position: '主体承接区' };
  if (key === 'steady' || (delta >= -15 && delta <= -6)) return { group: 'stable', detail: '稳妥', className: 'stable', position: '主体偏稳区' };
  if (key === 'guard' || (delta >= -25 && delta <= -16)) return { group: 'safe', detail: '小保', className: 'light-safe', position: '后段保底区' };
  if (key === 'low' || (delta >= -40 && delta <= -26)) return { group: 'safe', detail: '强保', className: 'safe', position: '后段强保区' };
  return { group: 'safe', detail: '兜底', className: 'floor', position: '兜底确认区' };
}

function majorFamily(major = '') {
  const s = String(major || '');
  if (/人工智能|智能科学|机器人工程|集成电路|微电子/.test(s)) return 'AI/微电子/智能类';
  if (/计算机|软件|数据|网络|信息安全|物联网/.test(s)) return '计算机/软件数据';
  if (/电气|自动化|电子|通信|光电|测控/.test(s)) return '电气电子信息';
  if (/机械|车辆|能源|智能制造|机器人工程|工业工程/.test(s)) return '机械自动化制造';
  if (/临床|口腔|医学|药学|护理|中医|麻醉|影像|康复/.test(s)) return '医药卫生';
  if (/会计|财务|金融|经济|工商|管理|审计|财政/.test(s)) return '经管财经';
  if (/法学|汉语|新闻|外语|英语|师范|教育|小学教育/.test(s)) return '法学文教师范';
  if (/土木|建筑|城乡规划|给排水|道路|桥梁/.test(s)) return '土木建筑';
  if (/化工|环境|材料|生物|食品|应用化学|制药/.test(s)) return '生化环材食品';
  if (/数学|物理|化学|生物科学|统计学/.test(s)) return '基础理科';
  return '其他专业';
}

function normalizedItems(items = [], candidateRank = null) {
  return (Array.isArray(items) ? items : []).slice(0, 112).map((item, index) => {
    const poolBand = item.poolBand?.detail ? item.poolBand : classify(item);
    const rank2025 = num(item.rank2025 ?? item.rank ?? item.minRank ?? item.lowestRank ?? item.referenceRank, null);
    const rankGap = getRankGap(candidateRank, rank2025);
    return {
      id: clean(item.id || `${item.school}-${item.major}-${item.score2025}-${item.rank2025}`, 240),
      order: index + 1,
      school: clean(item.school, 120),
      major: clean(item.major, 180),
      score2025: num(item.score2025 ?? item.score, null),
      rank2025,
      scoreDelta: num(item.scoreDelta, 0),
      rankGap,
      rankGapText: rankGapText(rankGap),
      statusKey: clean(item.statusKey, 40),
      statusLabel: clean(item.statusLabel || poolBand.detail, 40),
      displayLocation: clean(item.displayLocation || item.geoEntity || '', 80),
      natureLabel: clean(item.natureLabel || item.nature || '', 60),
      flags: Array.isArray(item.flags) ? item.flags.map(x => clean(x, 80)).filter(Boolean).slice(0, 8) : [],
      poolBand,
      majorFamily: majorFamily(item.major)
    };
  }).filter(x => x.school || x.major);
}

function getStats(items) {
  const stats = {
    total: items.length,
    rushCount: 0,
    stableCount: 0,
    safeCount: 0,
    highRushCount: 0,
    floorCount: 0,
    deepSafeCount: 0,
    missingRankCount: 0,
    withRankCount: 0,
    maxForwardRankGap: null,
    maxBackwardRankGap: null,
    byCity: {},
    byMajorFamily: {},
    byDetail: {},
    byNature: {}
  };
  for (const item of items) {
    const band = item.poolBand || classify(item);
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (band.detail === '高冲') stats.highRushCount += 1;
    if (band.detail === '兜底') stats.floorCount += 1;
    if (band.detail === '强保' || band.detail === '兜底') stats.deepSafeCount += 1;
    stats.byDetail[band.detail] = (stats.byDetail[band.detail] || 0) + 1;
    const city = item.displayLocation || '未知地域';
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;
    const family = item.majorFamily || majorFamily(item.major);
    stats.byMajorFamily[family] = (stats.byMajorFamily[family] || 0) + 1;
    const nature = item.natureLabel || '属性待核验';
    stats.byNature[nature] = (stats.byNature[nature] || 0) + 1;
    if (item.rankGap == null) stats.missingRankCount += 1;
    else {
      stats.withRankCount += 1;
      if (item.rankGap > 0 && (stats.maxForwardRankGap == null || item.rankGap > stats.maxForwardRankGap)) stats.maxForwardRankGap = item.rankGap;
      if (item.rankGap < 0 && (stats.maxBackwardRankGap == null || Math.abs(item.rankGap) > stats.maxBackwardRankGap)) stats.maxBackwardRankGap = Math.abs(item.rankGap);
    }
  }
  return stats;
}

function topEntry(map = {}) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || ['', 0];
}
function pct(part, total) { return total ? Math.round(part / total * 100) : 0; }

function addUnique(list, value) {
  const s = clean(value, 300);
  if (s && !list.includes(s)) list.push(s);
}

function applyRankZoneRules({ stats, risks, actions, rankZone, policy }) {
  const total = stats.total || 0;
  if (!total) return;
  const zoneKey = rankZone.zoneKey;
  addUnique(actions, `当前定位为“${policy.zoneName}”，本轮排序应围绕“${policy.mainGoal}”来检查，不要只按固定分数段套话。`);

  if (zoneKey === 'special-edge-zone') {
    if (stats.safeCount < Math.max(4, Math.ceil(total * 0.30))) addUnique(risks, '特控线附近保底区偏薄，浅保底容易在密集竞争中失效。');
    if (stats.deepSafeCount < Math.max(2, Math.ceil(total * 0.12))) addUnique(risks, '深层保底不足，后段缺少真正拉开位次的兜底项。');
    addUnique(actions, '补充低一层位次、专业能接受、学费和校区清楚的公办优先保底项。');
  }

  if (zoneKey === 'applied-tech-main-zone') {
    const appliedCount = (stats.byMajorFamily['电气电子信息'] || 0) + (stats.byMajorFamily['机械自动化制造'] || 0) + (stats.byMajorFamily['计算机/软件数据'] || 0);
    if (appliedCount < Math.ceil(total * 0.25)) addUnique(risks, '应用技术路线承接不足，当前自选池里可形成技能积累的工科/信息类比例偏低。');
    addUnique(actions, '主体区优先补齐机械、自动化、电气、电子信息、计算机软件等能形成技能路径的专业。');
  }

  if (zoneKey === 'industry-entry-zone') {
    addUnique(actions, '行业入口选择区要逐条比较学校行业属性、专业课程、校招资源和是否适合回辽宁就业。');
    if ((stats.byMajorFamily['土木建筑'] || 0) >= Math.ceil(total * 0.25)) addUnique(risks, '土木建筑类占比较高，需要结合行业周期、工作环境和孩子接受度重新核验。');
  }

  if (zoneKey === 'industry-platform-zone') {
    addUnique(actions, '这个位次层级开始出现省内平台与省外特色行业院校的权衡，排序前要先确定“回辽宁就业/出省发展/考研考公”的主路径。');
    if (stats.rushCount > Math.ceil(total * 0.35)) addUnique(risks, '平台/行业选择区冲刺比例偏高，可能压缩真正可录的主体专业。');
  }

  if (zoneKey === 'platform-major-balance-zone') {
    if (stats.highRushCount > 2) addUnique(risks, '高分段高冲过多会稀释有效志愿，建议只保留孩子真正愿意接受的梦校或强专业。');
    addUnique(actions, '平台与专业博弈区要避免“为了校名接受完全不喜欢的专业”，保底也不应过度下沉。');
  }

  const aiMicroCount = stats.byMajorFamily['AI/微电子/智能类'] || 0;
  if (aiMicroCount >= Math.max(2, Math.ceil(total * 0.20))) {
    addUnique(risks, 'AI/微电子/智能类占比较高，需要核验学校师资、实验室、课程体系和产业合作，不要只看专业名。');
    addUnique(actions, '把新办热门专业从“名称吸引”改为“师资、实验室、校招、课程难度”逐条核验。');
  }

  const medCount = stats.byMajorFamily['医药卫生'] || 0;
  if (medCount >= Math.max(2, Math.ceil(total * 0.20))) addUnique(actions, '医学/药学/护理方向要单独核验培养年限、规培、就业城市、学历门槛和家庭承受周期。');
  const teacherCount = stats.byMajorFamily['法学文教师范'] || 0;
  if (teacherCount >= Math.max(3, Math.ceil(total * 0.25))) addUnique(actions, '师范/法学/文教考公路径要核验本地编制竞争、岗位专业限制和是否接受长期备考。');
}

function buildFallbackAi({ summary, rankZone, policy, risks, actions }) {
  return normalizePathAiOutput({
    overall: summary,
    rankZoneExplain: rankZone?.note || '',
    structureDiagnosis: summary,
    majorPathDiagnosis: `该功能区优先方向：${(policy.prefer || []).slice(0, 5).join('、')}；谨慎方向：${(policy.cautions || []).slice(0, 4).join('、')}。`,
    bottomLineRisk: policy.bottomAdvice || '',
    actions,
    parentVersion: `${policy.zoneName}：${policy.mainGoal} 当前先按规则版诊断执行，AI不可用时不影响使用。`,
    reportMarkdown: `### AI高报师解读（规则兜底版）\n\n${rankZone?.note || ''}\n\n${summary}\n\n重点建议：${actions.slice(0, 4).join('；')}。`
  }, { summary, actions, rankZone });
}

function reportText({ candidateScore, rankZone, stats, summary, risks, actions, sections, ordered, aiNarrative, source }) {
  const lines = [];
  lines.push('辽宁物理类志愿自选池排序诊断报告');
  lines.push('');
  lines.push(`考生分数：${candidateScore || '未填写'}`);
  lines.push(`考生位次：${rankZone?.candidateRankLabel || '位次待核验'}`);
  lines.push(`特控线锚点：${rankZone?.specialControlScore || '—'} 分｜${rankZone?.specialControlRankLabel || '位次待核验'}`);
  lines.push(`功能区：${rankZone?.zoneName || '待判断'}`);
  lines.push('数据口径：辽宁 2025 物理类专业数据，数据来源为 /fenxi 已接入专业池；本报告用于志愿讨论，不等同于录取预测。');
  lines.push('');
  lines.push(`自选池总数：${stats.total} 个`);
  lines.push(`冲刺：${stats.rushCount} 个（${pct(stats.rushCount, stats.total)}%）`);
  lines.push(`稳妥：${stats.stableCount} 个（${pct(stats.stableCount, stats.total)}%）`);
  lines.push(`保底：${stats.safeCount} 个（${pct(stats.safeCount, stats.total)}%）`);
  lines.push('');
  lines.push(`整体判断：${summary}`);
  lines.push('');
  if (aiNarrative?.overall) {
    lines.push(`AI解读来源：${source}`);
    lines.push(`AI整体解读：${aiNarrative.overall}`);
    lines.push(`位次功能区：${aiNarrative.rankZoneExplain}`);
    lines.push(`结构诊断：${aiNarrative.structureDiagnosis}`);
    lines.push(`专业路径：${aiNarrative.majorPathDiagnosis}`);
    lines.push(`保底底线：${aiNarrative.bottomLineRisk}`);
    lines.push('');
  }
  sections.forEach(section => lines.push(`${section.title}：${section.content}`));
  lines.push('');
  lines.push('主要风险：');
  risks.forEach((risk, index) => lines.push(`${index + 1}. ${risk}`));
  lines.push('');
  lines.push('调整建议：');
  actions.forEach((action, index) => lines.push(`${index + 1}. ${action}`));
  lines.push('');
  lines.push('当前排序：');
  ordered.forEach((item) => {
    const score = Number.isFinite(Number(item.score2025)) ? `${item.score2025}分` : '分数缺失';
    const rank = Number.isFinite(Number(item.rank2025)) ? `位次${item.rank2025}` : '位次缺失';
    lines.push(`${item.order}. ${item.school} · ${item.major}｜${item.poolBand.detail}｜${score}｜${rank}｜${item.rankGapText}`);
  });
  lines.push('');
  lines.push('人工复核清单：2026 年一分一段、招生计划、选科要求、体检限制、学费、校区、中外合作/专项/高收费等特殊项目。');
  return lines.join('\n');
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
  const parts = [error?.message, error?.name, error?.code, error?.status, error?.cause?.message, error?.stack].filter(Boolean);
  return parts.join(' | ');
}

function isAiQuotaLimit(error) {
  const s = errorText(error).toLowerCase();
  return s.includes('3036') || s.includes('account limited') || s.includes('daily free allocation') || s.includes('10,000 neurons') || s.includes('10000 neurons') || s.includes('free allocation') || (s.includes('429') && s.includes('neuron'));
}

function shortError(error) {
  return errorText(error).replace(/\s+/g, ' ').slice(0, 240);
}

async function maybeRunAi(context, base) {
  const model = String(context.env?.AI_PATH_MODEL || '@cf/meta/llama-3.1-8b-instruct').trim();
  if (!context.env?.AI || typeof context.env.AI.run !== 'function') {
    return { source: 'rules-only', model: '', message: '未检测到 Cloudflare Workers AI 绑定，已返回规则版诊断。', aiNarrative: buildFallbackAi(base) };
  }
  try {
    const messages = buildPathAiMessages({
      candidateContext: base.rankZone,
      zonePolicy: base.policy,
      stats: base.stats,
      risks: base.risks,
      actions: base.actions,
      sections: base.sections,
      orderedItems: base.orderedItems
    });
    const aiResult = await context.env.AI.run(model, { messages, temperature: 0.1, max_tokens: 900 });
    const text = getAiText(aiResult);
    return { source: 'workers-ai', model, message: 'AI解读已生成。', aiNarrative: parsePathAiOutput(text, base) };
  } catch (error) {
    const source = isAiQuotaLimit(error) ? 'rules-only-quota' : 'rules-only-error';
    const message = source === 'rules-only-quota' ? 'Cloudflare AI 免费额度已用完，已自动切换为规则版诊断。' : 'AI 调用暂时失败，已自动切换为规则版诊断。';
    return { source, model, message, aiError: shortError(error), aiNarrative: buildFallbackAi(base) };
  }
}

function analyzeRules({ items, candidateScore, orderSignature = '', year = 2025, region = 'ln', subject = 'physics' }) {
  const rankZone = buildRankZoneContext({ candidateScore, year, region, subject });
  const policy = getRankZonePolicy(rankZone.zoneKey);
  const ordered = normalizedItems(items, rankZone.candidateRank);
  const stats = getStats(ordered);
  const risks = [];
  const actions = [];
  const total = stats.total;

  if (!total) {
    const summary = '自选池暂无专业志愿。';
    const fallback = buildFallbackAi({ summary, rankZone, policy, risks: ['自选池为空，无法判断冲稳保结构。'], actions: ['先加入上探、主体、稳妥和保底区间的专业。'] });
    return { ok: true, version: 'v3.9.5.5', level: 'empty', source: 'rules-only', summary, candidateContext: rankZone, rankZone, policySnapshot: policy, stats, risks: ['自选池为空，无法判断冲稳保结构。'], actions: ['先加入上探、主体、稳妥和保底区间的专业。'], sections: [], orderedItems: [], orderSignature: clean(orderSignature, 600), aiNarrative: fallback, reportText: '自选池暂无专业志愿。' };
  }

  if (total < 12) { addUnique(risks, '自选池数量偏少，暂时更像候选清单，不适合作为完整填报方案。'); addUnique(actions, '继续补充主体承接区和后段保底区，先扩展到至少 20 个以上再做正式排序。'); }
  if (stats.safeCount < Math.max(3, Math.ceil(total * 0.22))) { addUnique(risks, '保底区数量偏少，后段承接能力不足。'); addUnique(actions, '增加若干“小保 / 强保 / 兜底”专业，尤其补充低风险、可接受专业方向。'); }
  if (stats.stableCount < Math.ceil(total * 0.34)) { addUnique(risks, '主体稳妥区偏薄，中段承接不够厚。'); addUnique(actions, '优先补充“边稳 / 稳妥”专业，作为真实录取承接区。'); }
  if (stats.rushCount > Math.ceil(total * 0.38)) { addUnique(risks, '冲刺区占比偏高，容易形成“前段好看、后段发虚”的排序。'); addUnique(actions, '保留少量高价值冲刺，其余用更接近位次的专业替换。'); }
  if (stats.highRushCount > 2) { addUnique(risks, '高冲专业数量偏多，高冲只能承担梦想位，不应作为主要录取依赖。'); addUnique(actions, '高冲建议控制在 1-2 个左右，并放在排序最前部。'); }
  if (stats.missingRankCount) addUnique(risks, `${fmt(stats.missingRankCount)} 个专业缺少可识别参考位次，位次跨度和保底深度需要人工补核。`);

  applyRankZoneRules({ stats, risks, actions, rankZone, policy });

  const [topCity, topCityCount] = topEntry(stats.byCity);
  if (topCity && total >= 8 && topCityCount >= Math.ceil(total * 0.45)) { addUnique(risks, `地域集中度偏高：${topCity} 相关志愿占比较大。`); addUnique(actions, '在同专业方向下补充其他城市/省份的可接受选择，避免地域单点风险。'); }
  const [topFamily, topFamilyCount] = topEntry(stats.byMajorFamily);
  if (topFamily && total >= 8 && topFamilyCount >= Math.ceil(total * 0.55)) { addUnique(risks, `专业方向集中度偏高：${topFamily} 占比较大。`); addUnique(actions, '如果孩子确实强偏好该方向，可以保留；否则建议加入 1-2 个相邻专业方向做风险分散。'); }

  const rushItems = ordered.filter(x => x.poolBand.group === 'rush');
  const stableItems = ordered.filter(x => x.poolBand.group === 'stable');
  const safeItems = ordered.filter(x => x.poolBand.group === 'safe');
  const sections = [
    { title: '考生位次定位', content: `${rankZone.note} 当前功能区：${policy.zoneName}。${policy.role}` },
    { title: '前段冲刺区', content: rushItems.length ? `当前有 ${rushItems.length} 个冲刺志愿，其中高冲 ${stats.highRushCount} 个。冲刺位适合放在前段，但不能替代中后段承接。` : '当前几乎没有冲刺志愿，方案偏保守；如愿意尝试，可少量加入可接受的上探专业。' },
    { title: '中段稳妥区', content: stableItems.length ? `当前有 ${stableItems.length} 个边稳/稳妥志愿，这是方案的主要录取承接区。建议继续检查这些专业是否都是孩子能接受的方向。` : '当前缺少边稳/稳妥志愿，中段承接断层明显，需要优先补充。' },
    { title: '后段保底区', content: safeItems.length ? `当前有 ${safeItems.length} 个保底/兜底志愿。后段不是随便填低分专业，而是要保证学校、城市、专业方向都能接受。${policy.bottomAdvice}` : `当前没有明显保底志愿，滑档或被迫接受低接受度专业的风险较高。${policy.bottomAdvice}` }
  ];
  const level = risks.length >= 5 ? 'high' : risks.length >= 3 ? 'medium' : 'low';
  const summary = level === 'high' ? `当前自选池整体风险偏高。结合${policy.zoneName}定位，需要先补齐中段承接和后段保底，再做最终排序。` : level === 'medium' ? `当前自选池已有基本框架。结合${policy.zoneName}定位，仍需调整冲稳保比例、保底深度和集中度风险。` : `当前自选池结构相对均衡。结合${policy.zoneName}定位，可以进入人工复核、排序微调和报告整理。`;
  if (!risks.length) addUnique(risks, '暂未发现明显结构性风险，但仍需人工核验招生计划、选科、体检、学费和校区。');
  if (!actions.length) addUnique(actions, '保持当前冲稳保结构，逐条核验专业接受度、计划变化和特殊项目标签。');
  return { ok: true, version: 'v3.9.5.5', level, summary, candidateContext: rankZone, rankZone, policySnapshot: policy, stats, risks, actions, sections, orderedItems: ordered, orderSignature: clean(orderSignature, 600), generatedAt: new Date().toISOString() };
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ ok: false, message: '只支持 POST 请求。' }, 405);
  try {
    const body = await context.request.json();
    const base = analyzeRules({
      items: body.items || body.orderedItems || [],
      candidateScore: body.candidateScore || null,
      orderSignature: body.orderSignature || '',
      year: body.year || 2025,
      region: body.region || 'ln',
      subject: body.subject || 'physics'
    });
    if (!base.ok || base.level === 'empty') return json(base);
    const ai = await maybeRunAi(context, { ...base, policy: base.policySnapshot });
    const result = {
      ...base,
      source: ai.source,
      model: ai.model,
      message: ai.message,
      aiError: ai.aiError || '',
      aiNarrative: ai.aiNarrative
    };
    result.reportText = reportText({ candidateScore: body.candidateScore || null, rankZone: result.rankZone, stats: result.stats, summary: result.summary, risks: result.risks, actions: result.actions, sections: result.sections, ordered: result.orderedItems, aiNarrative: result.aiNarrative, source: result.source });
    return json(result);
  } catch (error) {
    return json({ ok: false, message: error && error.message ? error.message : String(error), hint: '请检查 path-analysis v3.9.5.5 的位次规则和 AI 绑定；AI失败时应自动降级规则版。' }, 500);
  }
}
