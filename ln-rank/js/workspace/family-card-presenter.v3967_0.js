import {
  resolveCardSchoolResource,
  buildTongxueSchoolHref
} from '../../../shared/resources/schools/school-resource-center.js?v=3961_0';
import {
  FAMILY_LANGUAGE,
  readFamilyCandidateScore,
  tongxueEntryCopy
} from '../domain/family-decision-contract.v3955_0.js?v=3961_0';
import { createDecisionContext } from '../../../shared/decision-context/decision-context.v001.js';
import { captureCurrentReturnSnapshot } from '../../../shared/decision-context/return-snapshot.v001.js';

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

function currentReturnTarget() {
  const url = new URL(location.href);
  if (!url.hash) url.hash = 'resultsPanel';
  return `${url.pathname}${url.search}${url.hash}`;
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
  section.setAttribute('aria-label', '家庭先看这两件事');
  section.innerHTML = `
    <div><b>为什么出现</b><p>${why}</p></div>
    <div><b>最需要确认</b><p>${confirm}</p></div>`;
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
  const decisionContext = createDecisionContext({
    sourceSurface: 'ln-rank',
    sourceAction: 'view_student_voice',
    returnTo: currentReturnTarget(),
    resultMode: 'score-bands',
    returnAnchor: 'resultsPanel',
    province: '辽宁',
    admissionYear: 2026,
    track: '物理类',
    score: readFamilyCandidateScore(),
    school: target.school,
    schoolCode: target.entityId,
    evidenceRefs: [{ kind: 'ln-rank-result', label: '当前学校结果', ref: target.entityId }]
  });
  const href = buildTongxueSchoolHref({
    ...target,
    returnTo: decisionContext.returnTo,
    resultMode: decisionContext.resultMode,
    returnAnchor: decisionContext.returnAnchor,
    decisionContext
  });
  if (!href) return;
  const link = document.createElement('a');
  link.className = 'tongxue-card-entry';
  link.href = href;
  link.setAttribute('aria-label', `查看${target.school}的大学生怎么说`);
  link.title = '这里是学生分享，不代表学校官方结论。';
  link.addEventListener('click', () => {
    captureCurrentReturnSnapshot({
      contextId: decisionContext.contextId,
      returnTo: decisionContext.returnTo,
      sourceSurface: decisionContext.sourceSurface,
      resultMode: decisionContext.resultMode,
      anchorId: decisionContext.returnAnchor,
      focusId: decisionContext.returnAnchor,
      recordKey: target.entityId
    });
  }, { passive: true });
  link.innerHTML = `<span class="tongxue-card-entry__brand">大学生说学校</span><span class="tongxue-card-entry__text">看看这所学校的大学生怎么说</span><span class="tongxue-card-entry__arrow" aria-hidden="true">→</span>`;
  const hint = card.querySelector('.pool-add-hint');
  if (hint) hint.before(link);
  else card.append(link);
}

function processCard(card) {
  if (!(card instanceof HTMLElement) || card.dataset.familyPresentation === 'v3967') return;
  rewriteStatusBadge(card);
  rewriteMetaPills(card);
  rewriteTags(card);
  rewriteActions(card);
  ensureDecisionSummary(card);
  ensureTongxueEntry(card);
  card.dataset.familyPresentation = 'v3967';
}

export function presentFamilyResults(root = document) {
  root.querySelectorAll?.('.major-card').forEach(processCard);
}

export const FAMILY_CARD_PRESENTATION_VERSION = 'family-card-presentation-v3967_0';
