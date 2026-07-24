import {
  resolveCardSchoolResource,
  buildTongxueSchoolHref
} from '../../../shared/resources/schools/school-resource-center.js?v=3961_0';
import {
  FAMILY_LANGUAGE,
  tongxueEntryCopy
} from '../domain/family-decision-contract.v3955_0.js?v=3961_0';

function parseNumber(value) {
  const matched = String(value || '').replace(/[，,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return matched ? Number(matched[0]) : null;
}

function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function numberAfter(text, pattern) {
  const matched = String(text || '').match(pattern);
  return matched ? parseNumber(matched[1]) : null;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function findText(root, selector, includes) {
  return [...root.querySelectorAll(selector)].find(node => String(node.textContent || '').includes(includes));
}

function rewriteStatusBadge(card) {
  const badge = card.querySelector('.status-badge');
  if (!badge) return;
  badge.textContent = badge.textContent.replace(/^\s*分数位置[：:]\s*/, '').trim();
  badge.title = '这是当前查看分组，只用于家庭讨论，不代表录取把握。';
}

function rewriteMetaPills(card) {
  const container = card.querySelector('.meta-pills');
  if (!container || container.dataset.familyRewritten === '1') return;
  const pills = [...container.querySelectorAll('.meta-pill')];
  for (const pill of pills) {
    const text = cleanText(pill.textContent);
    if (text.includes('2026投档最低分')) {
      const n = numberAfter(text, /最低分[：:]?\s*([\d,，]+)/);
      pill.textContent = `2026最低分 ${formatNumber(n)}`;
      pill.classList.add('family-primary-data');
    } else if (text.includes('2026对应累计位次约')) {
      const n = numberAfter(text, /位次约[：:]?\s*([\d,，]+)/);
      pill.textContent = `约对应全省 ${formatNumber(n)} 名`;
      pill.classList.add('family-primary-data');
    } else if (text.includes('相对参考分数')) {
      const n = numberAfter(text, /参考分数[：:]?\s*([+-]?[\d,，]+)/);
      pill.textContent = n == null
        ? '与参考分数的差距待确认'
        : n > 0
          ? `比你的参考分数高 ${formatNumber(Math.abs(n))} 分`
          : n < 0
            ? `比你的参考分数低 ${formatNumber(Math.abs(n))} 分`
            : '和你的参考分数相同';
      pill.classList.add('family-score-gap');
    } else if (text.includes('适合位置')) {
      pill.hidden = true;
      pill.dataset.familyHidden = 'duplicate-position';
    }
  }
  container.dataset.familyRewritten = '1';
}

function historyConclusion(rank2026, rank2025) {
  if (!Number.isFinite(rank2026) || !Number.isFinite(rank2025) || rank2025 <= 0) return '';
  const delta = rank2026 - rank2025;
  const absolute = Math.abs(delta);
  const stableLimit = Math.max(500, rank2025 * 0.025);
  if (absolute <= stableLimit) return '近两年最低投档位置基本稳定';
  const ratio = absolute / rank2025;
  if (delta < 0) return ratio >= 0.08 ? '2026年最低投档所需位次明显更靠前' : '2026年最低投档所需位次略微更靠前';
  return ratio >= 0.08 ? '2026年最低投档所需位次明显相对靠后' : '2026年最低投档所需位次略微相对靠后';
}

function extractHistory(text, year) {
  const pattern = new RegExp(`${year}\\s*([\\d,，—-]+)\\s*分\\s*[｜|/]\\s*([\\d,，—-]+)\\s*位`);
  const matched = String(text || '').match(pattern);
  if (!matched) return null;
  return { year, score: parseNumber(matched[1]), rank: parseNumber(matched[2]) };
}

function currentRank(card) {
  const pill = findText(card, '.meta-pill', '约对应全省') || findText(card, '.meta-pill', '2026对应累计位次约');
  return pill ? parseNumber(pill.textContent) : null;
}

function rewriteHistory(card) {
  if (card.querySelector('.family-history-block')) return;
  const line = card.querySelector('.history-score-line');
  if (!line) return;
  const text = String(line.textContent || '').replace(/^\s*近三年\s*/, '').trim();
  const rows = [extractHistory(text, 2025), extractHistory(text, 2024)].filter(Boolean);
  if (!rows.length) {
    line.innerHTML = '<span class="family-history-title">往年最低投档记录</span><p class="family-history-empty">暂时没有可严格对应的往年记录。</p>';
    line.classList.add('family-history-block');
    return;
  }
  const rank25 = rows.find(row => row.year === 2025)?.rank;
  const conclusion = historyConclusion(currentRank(card), rank25);
  line.className = 'family-history-block';
  line.innerHTML = `
    <div class="family-history-title">往年最低投档记录</div>
    <div class="family-history-years">${rows.map(row => `
      <div class="family-history-year"><b>${row.year}</b><span>${formatNumber(row.score)}分</span><span>约${formatNumber(row.rank)}名</span></div>`).join('')}</div>
    ${conclusion ? `<p class="family-history-conclusion"><span>近年变化</span>${conclusion}</p>` : ''}`;
}

function rewriteTags(card) {
  const replacements = [
    [/^双非公办$/, '公办'],
    [/^双非$/, '非985/211/双一流'],
    [/费用待核验/g, '填报前确认学费'],
    [/需核验/g, '填报前确认'],
    [/复核：2026目录归属：/g, '专业类别：'],
    [/复核：/g, '填报前确认：']
  ];
  card.querySelectorAll('.school-tag,.meta-pill,.card-review-summary,.special-project-alert,.major-code-line').forEach(node => {
    let text = String(node.textContent || '');
    for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
    if (node.textContent !== text) node.textContent = text;
  });
}

function rewriteActions(card) {
  card.querySelectorAll('button,a').forEach(node => {
    const text = cleanText(node.textContent);
    if (text === '放进报告' || text === '加入自选') node.textContent = FAMILY_LANGUAGE.addSelected;
    if (text === '已放进报告' || text === '已加入自选') node.textContent = '已加入';
    if (text === '从报告中移除') node.textContent = '移出已选专业';
    if (text === '查看复核详情') node.textContent = '查看要确认什么';
    if (text === '收起复核详情') node.textContent = '收起确认事项';
    if (text === '看懂这条' || text === '查看详细说明') node.textContent = FAMILY_LANGUAGE.inspectFit;
  });
}

function majorName(card) {
  const node = card.querySelector('.major');
  if (!node) return '';
  const clone = node.cloneNode(true);
  clone.querySelectorAll('*').forEach(child => child.remove());
  return cleanText(clone.textContent) || cleanText(node.childNodes?.[0]?.textContent);
}

function ensureDecisionSummary(card) {
  if (card.querySelector('.family-decision-summary')) return;
  const actions = card.querySelector('.major-card-actions');
  if (!actions) return;
  const status = cleanText(card.querySelector('.status-badge')?.textContent) || '当前参考';
  const understanding = cleanText(card.querySelector('.major-understanding-one-line')?.textContent);
  const review = cleanText(card.querySelector('.card-review-summary')?.textContent);
  const major = majorName(card);
  const why = `这条${major ? `“${major}”` : '专业'}处在“${status}”范围，并符合上一轮已提交的分数和筛选条件。`;
  const confirm = review
    ? review.replace(/^填报前确认[:：]?\s*/, '')
    : understanding
      ? `先确认孩子是否接受：${understanding}`
      : '先确认孩子是否愿意学习这个方向，再核对校区、学费和培养方式。';
  const section = document.createElement('section');
  section.className = 'family-decision-summary';
  section.setAttribute('aria-label', '家庭先看这三件事');
  section.innerHTML = `
    <div><b>为什么出现</b><p>${why}</p></div>
    <div><b>最需要确认</b><p>${confirm}</p></div>
    <div><b>现在还不知道</b><p>${FAMILY_LANGUAGE.unknown2027}</p></div>`;
  actions.before(section);
}

function schoolCandidates(card) {
  const school = cleanText(card.querySelector('.school')?.textContent);
  const campusTags = [...card.querySelectorAll('.school-tag')]
    .map(node => cleanText(node.textContent))
    .filter(text => /校区|分校|研究院/.test(text));
  return [...new Set([...campusTags, school].filter(Boolean))];
}

function ensureTongxueEntry(card) {
  if (card.querySelector('.tongxue-card-entry')) return;
  const target = resolveCardSchoolResource(schoolCandidates(card));
  if (!target) return;
  const href = buildTongxueSchoolHref(target);
  if (!href) return;
  const link = document.createElement('a');
  link.className = 'tongxue-card-entry';
  link.href = href;
  link.setAttribute('aria-label', `查看${target.school}的公开评论和来源摘要`);
  link.title = '公开评论只反映部分评论者的个人体验，不代表学校官方结论。';
  link.innerHTML = `<span class="tongxue-card-entry__brand">同学你好</span><span class="tongxue-card-entry__text">${tongxueEntryCopy(target.entityType)}</span><span class="tongxue-card-entry__arrow" aria-hidden="true">→</span>`;
  const hint = card.querySelector('.pool-add-hint');
  if (hint) hint.before(link);
  else card.append(link);
}

function processCard(card) {
  if (!(card instanceof HTMLElement) || card.dataset.familyPresentation === 'v3961') return;
  rewriteStatusBadge(card);
  rewriteMetaPills(card);
  rewriteHistory(card);
  rewriteTags(card);
  rewriteActions(card);
  ensureDecisionSummary(card);
  ensureTongxueEntry(card);
  card.dataset.familyPresentation = 'v3961';
}

export function presentFamilyResults(root = document) {
  root.querySelectorAll?.('.major-card').forEach(processCard);
}

export const FAMILY_CARD_PRESENTATION_VERSION = 'family-card-presentation-v3961';
