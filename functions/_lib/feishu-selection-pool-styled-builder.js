import {
  bulletBlock,
  bulletRunsBlock,
  dividerBlock,
  heading1,
  heading2,
  heading3,
  orderedRunsBlock,
  styledTextBlock,
  textRunsBlock
} from './feishu-block-builder.js';
import { groupMeta, STYLE, styleForBand, styleForDelta } from './feishu-selection-style-map.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function clean(value, max = 800) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function pct(part, total) {
  return total ? Math.round(part / total * 100) : 0;
}

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return '分差待核验';
  return `相对考生 ${n > 0 ? '+' : ''}${n} 分`;
}

function scoreRankText(item) {
  const score = Number.isFinite(Number(item.score2025)) ? `${fmt(item.score2025)} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2025)) ? `${fmt(item.rank2025)} 位` : '位次待核验';
  return `2025最低 ${score} / ${rank}`;
}

function shortTags(item) {
  const tags = [];
  if (item.displayLocation) tags.push(item.displayLocation);
  if (item.natureLabel) tags.push(item.natureLabel);
  if (Array.isArray(item.schoolTags)) tags.push(...item.schoolTags.slice(0, 3));
  return [...new Set(tags.filter(Boolean))].join(' / ');
}

function groupCounts(items = []) {
  const groups = { rush: [], stable: [], safe: [] };
  items.forEach(item => {
    const group = item.poolBand?.group || 'safe';
    if (group === 'rush') groups.rush.push(item);
    else if (group === 'stable') groups.stable.push(item);
    else groups.safe.push(item);
  });
  return groups;
}

function statsBullet(label, count, total, style) {
  return bulletRunsBlock([
    { content: `${label}：`, style },
    { content: `${fmt(count)} 个（${pct(count, total)}%）`, style: STYLE.strong }
  ]);
}

function itemRuns(item) {
  const band = item.poolBand || {};
  const bandLabel = band.detail || item.statusLabel || '待判断';
  const bandStyle = styleForBand(band);
  const deltaStyle = styleForDelta(item.scoreDelta);
  const tags = shortTags(item);
  return [
    { content: `第 ${item.order} 位｜`, style: STYLE.muted },
    { content: `${item.school || '学校待核验'}｜${item.major || '专业待核验'}`, style: STYLE.strong },
    { content: '｜' },
    { content: bandLabel, style: bandStyle },
    { content: '｜' },
    { content: deltaText(item.scoreDelta), style: deltaStyle },
    { content: `｜${scoreRankText(item)}` },
    tags ? { content: `｜${tags}`, style: STYLE.muted } : null
  ].filter(Boolean);
}

function analysisBlocks(analysis = {}) {
  const blocks = [];
  if (!analysis || typeof analysis !== 'object') return blocks;
  blocks.push(heading2('二、检查当前排序', STYLE.action));
  if (analysis.summary) {
    blocks.push(bulletRunsBlock([
      { content: '整体判断：', style: STYLE.strong },
      { content: clean(analysis.summary, 800) }
    ]));
  }
  if (Array.isArray(analysis.sections) && analysis.sections.length) {
    analysis.sections.slice(0, 6).forEach(section => {
      blocks.push(heading3(clean(section.title, 80), STYLE.strong));
      blocks.push(styledTextBlock(clean(section.content, 1200), STYLE.muted));
    });
  }
  if (Array.isArray(analysis.risks) && analysis.risks.length) {
    blocks.push(heading3('主要风险', STYLE.risk));
    analysis.risks.slice(0, 10).forEach(risk => blocks.push(bulletRunsBlock([
      { content: clean(risk, 500), style: STYLE.risk }
    ])));
  }
  if (Array.isArray(analysis.actions) && analysis.actions.length) {
    blocks.push(heading3('调整建议', STYLE.action));
    analysis.actions.slice(0, 10).forEach(action => blocks.push(bulletRunsBlock([
      { content: clean(action, 500), style: STYLE.action }
    ])));
  }
  return blocks;
}

export function buildSelectionPoolStyledBlocks(input = {}) {
  const {
    title,
    candidateScore,
    items = [],
    stats = {},
    hasAnalysis = false,
    analysis = null,
    reportType = 'selectionPoolOnly'
  } = input;
  const blocks = [];
  const total = Number(stats.total) || items.length || 0;
  const groups = groupCounts(items);

  blocks.push(heading1(title, STYLE.title));
  blocks.push(textRunsBlock([
    { content: '考生分数：', style: STYLE.strong },
    { content: String(candidateScore || '未填写'), style: STYLE.strong },
    { content: '｜报告类型：' },
    { content: reportType === 'selectionPoolWithAnalysis' ? '完整诊断报告' : '当前排序清单', style: STYLE.action }
  ]));
  blocks.push(styledTextBlock('颜色只用于辅助阅读，不代表录取承诺。正式填报仍需结合 2026 年当年位次、招生计划、选科、体检、学费、校区和专业备注逐条复核。', STYLE.warning));

  blocks.push(heading2('一、自选池总览', STYLE.title));
  blocks.push(bulletRunsBlock([
    { content: '排序口径：', style: STYLE.strong },
    { content: '按整理页当前显示的最终顺序写入飞书；每次排序后会重新编号并保存。' }
  ]));
  blocks.push(bulletRunsBlock([
    { content: '数据口径：', style: STYLE.strong },
    { content: '辽宁 2025 物理类专业数据，数据来源为 /fenxi 已接入专业池。' }
  ]));
  blocks.push(statsBullet('冲刺', groups.rush.length || stats.rushCount || 0, total, STYLE.rush));
  blocks.push(statsBullet('匹配 / 稳妥', groups.stable.length || stats.stableCount || 0, total, STYLE.stable));
  blocks.push(statsBullet('保底', groups.safe.length || stats.safeCount || 0, total, STYLE.safe));
  if (stats.highRushCount) blocks.push(bulletRunsBlock([{ content: `高冲：${fmt(stats.highRushCount)} 个，建议控制数量。`, style: STYLE.risk }]));
  if (stats.floorCount) blocks.push(bulletRunsBlock([{ content: `兜底：${fmt(stats.floorCount)} 个，请确认专业和城市是否真的接受。`, style: STYLE.floor }]));

  blocks.push(dividerBlock());

  if (hasAnalysis) {
    blocks.push(...analysisBlocks(analysis));
    blocks.push(dividerBlock());
  }

  blocks.push(heading2(hasAnalysis ? '三、冲稳保快速复核' : '二、冲稳保快速复核', STYLE.title));
  ['rush', 'stable', 'safe'].forEach(group => {
    const meta = groupMeta(group);
    const list = groups[group] || [];
    blocks.push(heading3(meta.title, meta.style));
    blocks.push(styledTextBlock(meta.note, STYLE.muted));
    const sample = list.slice(0, 12).map(item => `第${item.order}位`).join('、') || '暂无';
    blocks.push(bulletRunsBlock([
      { content: `数量：${fmt(list.length)} 个｜涉及顺序：`, style: meta.style },
      { content: sample }
    ]));
  });

  blocks.push(dividerBlock());
  blocks.push(heading2(hasAnalysis ? '四、最终排序清单' : '三、最终排序清单', STYLE.title));
  blocks.push(styledTextBlock('以下按当前页面最终顺序排列，标签和相对分差会使用不同颜色提醒。', STYLE.muted));
  if (!items.length) {
    blocks.push(bulletBlock('当前自选池为空。'));
  } else {
    items.forEach(item => blocks.push(orderedRunsBlock(itemRuns(item))));
  }

  blocks.push(dividerBlock());
  blocks.push(heading2(hasAnalysis ? '五、人工复核清单' : '四、人工复核清单', STYLE.title));
  [
    '2026 年一分一段与考生实际位次。',
    '2026 年招生计划、专业备注、选科要求、体检限制。',
    '学费、校区、联合培养、中外合作、专项计划、高收费项目。',
    '家庭预算、城市接受度、专业接受度和未来转专业规则。'
  ].forEach(line => blocks.push(bulletBlock(line)));
  blocks.push(heading2(hasAnalysis ? '六、口径说明' : '五、口径说明', STYLE.title));
  blocks.push(styledTextBlock('本报告基于辽宁 2025 物理类历史录取数据和 /fenxi 已接入专业池生成，用于形成可讨论专业池与自选池排序诊断，不等同于录取预测。正式填报仍需结合当年位次、等位分/同位分、招生计划、选科、体检、学费、校区和专业特殊要求综合判断。', STYLE.muted));

  return blocks.slice(0, 170);
}
