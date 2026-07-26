import { getHistoryScoreRankEvidence } from '../../../shared/resources/exam/historical-score-rank-contract.js';
import { getCampusForItem } from './campus-accessor.js';

function clean(value, max = 180) { return String(value == null ? '' : value).trim().slice(0, max); }
function textOf(item = {}) { return `${item.school || ''} ${item.major || ''} ${item.displayLocation || ''} ${(item.flags || []).join(' ')} ${(item.schoolTags || []).join(' ')}`; }
function outProvince(item = {}) {
  const t = textOf(item);
  if (/辽宁|沈阳|大连|鞍山|抚顺|本溪|丹东|锦州|营口|阜新|辽阳|盘锦|铁岭|朝阳|葫芦岛/.test(t)) return false;
  return /北京|天津|河北|山东|江苏|浙江|上海|广东|福建|湖北|湖南|陕西|四川|重庆|吉林|黑龙江|内蒙古|河南|安徽|江西|山西|甘肃|贵州|云南|广西|海南|新疆|西藏|青海|宁夏/.test(t);
}
function rankVolatility(item = {}) {
  const history = getHistoryScoreRankEvidence(item);
  const ranks = [2026, 2025, 2024].map(year => history.years?.[year]?.rankForGap).filter(Number.isFinite)
    .map(Number)
    .filter(Number.isFinite);
  if (ranks.length < 2) return null;
  return Math.round(Math.max(...ranks) - Math.min(...ranks));
}
function makeCategory(id, title, level='medium') { return { id, title, level, items: [] }; }
function push(cat, item, reason, action) {
  if (!item || !cat) return;
  cat.items.push({ school: clean(item.school || '学校待核验',80), major: clean(item.major || '专业待核验',120), reason: clean(reason,180), action: clean(action,180) });
}
export function buildSelectionReviewChecklist(items = []) {
  const cats = [
    makeCategory('campus','校区 / 办学地点','high'),
    makeCategory('fee','学费 / 中外合作 / 高收费','high'),
    makeCategory('rank','位次参考稳定性','medium'),
    makeCategory('plan','招生计划人数待核验','medium'),
    makeCategory('exam','体检限制相关方向','medium'),
    makeCategory('language','外语语种 / 单科要求','low'),
    makeCategory('service','定向 / 公费师范 / 履约项目','high')
  ];
  const by = Object.fromEntries(cats.map(c => [c.id,c]));
  (Array.isArray(items) ? items : []).forEach(item => {
    const t = textOf(item);
    const campus = getCampusForItem(item);
    if (campus?.reviewSummary || /校区待核验|校区需核验/.test(t)) push(by.campus, item, campus?.reviewSummary || '该专业办学地点/校区需要以招生计划备注核验。', '核验招生计划中的办学地点、校区和住宿通勤。');
    if (/中外|合作办学|高收费|较高收费|收费较高|国际|联合培养/.test(t)) push(by.fee, item, '该条目涉及中外合作、高收费或项目属性。', '核验学费、培养模式、是否必须出国、毕业证/学位证、校区和转专业政策。');
    const vol = rankVolatility(item);
    if (vol == null) push(by.rank, item, '历史位次证据不完整，不能只按单一年份最低位次判断。', '以 2026 主记录为起点，结合 2025、2024 同口径历史和 2027 正式计划人工复核。');
    else if (vol >= 12000) push(by.rank, item, `2024—2026 最低投档位次跨度约 ${vol.toLocaleString('zh-CN')} 位，变化较大。`, '降低单一位次余量的判断权重，结合 2027 正式计划复核。');
    else if (vol >= 6000) push(by.rank, item, `2024—2026 最低投档位次跨度约 ${vol.toLocaleString('zh-CN')} 位，需结合正式计划复核。`, '以 2026 主记录为起点，不要把 2025 或 2024 单独当成当前结论。');
    if (outProvince(item) || /计划人数待核验|省外/.test(t)) push(by.plan, item, '省外高校在辽宁招生计划人数需要重点确认。', '核验 2027 年辽宁物理类招生计划人数，避免只按历史位次判断。');
    if (/医学|药学|生物|食品|农学|园艺|动物医学|兽医|交通运输|油气储运|化工|材料|护理|检验|影像|康复/.test(t)) push(by.exam, item, '该方向可能涉及体检限制或培养要求。', '如孩子存在色弱、色盲、视力等情况，结合招生章程和体检指导意见人工核验。');
    if (/英语|日语|俄语|翻译|商务英语|外语|中外|国际|双语|口试|语种/.test(t)) push(by.language, item, '该方向可能涉及外语语种、口试、单科成绩或授课语言要求。', '核验招生章程中的外语语种、口试、单科成绩和授课语言。');
    if (/定向|公费师范|优师|订单|免费医学|培养协议|委托培养/.test(t)) push(by.service, item, '该条目可能涉及定向、公费师范、优师或履约项目。', '核验培养协议、服务地区、履约年限、违约责任和招生条件。');
  });
  const categories = cats.map(cat => {
    const seen = new Set();
    const items = [];
    for (const it of cat.items) {
      const key = `${it.school}|${it.major}|${it.reason}`;
      if (seen.has(key)) continue;
      seen.add(key); items.push(it);
    }
    return { ...cat, count: items.length, items: items.slice(0, 12) };
  }).filter(c => c.count > 0);
  return { summary: { totalCategories: categories.length, totalItems: categories.reduce((s,c)=>s+c.count,0), headline: categories.length ? `本方案有 ${categories.length} 类事项建议人工复核` : '暂未汇总出明显复核事项' }, categories };
}
export function reviewChecklistMarkdownLines(checklist = {}) {
  const lines = ['## 本方案复核清单', ''];
  const categories = Array.isArray(checklist.categories) ? checklist.categories : [];
  if (!categories.length) {
    lines.push('- 暂未汇总出明显复核事项；正式填报仍需核验 2027 招生计划和招生章程。', '');
    return lines;
  }
  lines.push(`- ${checklist.summary?.headline || `本方案有 ${categories.length} 类事项建议人工复核`}。`);
  lines.push('');
  categories.slice(0, 7).forEach((cat, idx) => {
    lines.push(`### ${idx + 1}. ${cat.title}（${cat.count} 条）`, '');
    cat.items.slice(0, 5).forEach((it, i) => lines.push(`${i + 1}. ${it.school}｜${it.major}：${it.reason} 建议：${it.action}`));
    lines.push('');
  });
  return lines;
}
