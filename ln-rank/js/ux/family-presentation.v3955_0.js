import {
  resolveCardSchoolResource,
  buildTongxueSchoolHref
} from '../../../shared/resources/schools/school-resource-center.js?v=3955_0';
import { FAMILY_LANGUAGE, tongxueEntryCopy } from '../domain/family-decision-contract.v3955_0.js?v=3955_0';

const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

function log(...args) {
  if (DEBUG) console.info('[family-presentation-v3955]', ...args);
}

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

function findText(root, selector, includes) {
  return [...root.querySelectorAll(selector)].find(node => String(node.textContent || '').includes(includes));
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
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
    const text = String(pill.textContent || '').trim();
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
    const text = String(node.textContent || '').trim();
    if (text === '放进报告' || text === '加入自选') node.textContent = FAMILY_LANGUAGE.addSelected;
    if (text === '已放进报告' || text === '已加入自选') node.textContent = '已加入';
    if (text === '从报告中移除') node.textContent = '移出已选专业';
    if (text === '查看复核详情') node.textContent = '查看要确认什么';
    if (text === '收起复核详情') node.textContent = '收起确认事项';
    if (text === '看懂这条' || text === '查看详细说明') node.textContent = FAMILY_LANGUAGE.inspectFit;
  });
}

function compactBackground(card) {
  const stack = card.querySelector('.background-hint-stack');
  if (!stack) return;
  stack.setAttribute('aria-label', '学校与专业背景');
  stack.querySelectorAll('.local-context-review').forEach(node => {
    node.textContent = node.textContent.replace(/^再看：/, '填报前再看：');
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
  const why = `这条${major ? `“${major}”` : '专业'}处在“${status}”范围，并符合当前分数和筛选条件。`;
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

function resolveTongxueTarget(card) {
  return resolveCardSchoolResource(schoolCandidates(card));
}

function ensureTongxueEntry(card) {
  if (card.querySelector('.tongxue-card-entry')) return;
  const target = resolveTongxueTarget(card);
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
  if (!(card instanceof HTMLElement)) return;
  rewriteStatusBadge(card);
  rewriteMetaPills(card);
  rewriteHistory(card);
  rewriteTags(card);
  rewriteActions(card);
  compactBackground(card);
  ensureDecisionSummary(card);
  ensureTongxueEntry(card);
  card.dataset.familyPresentation = 'v3955';
}

function sanitizeTechnicalStatus(root = document) {
  root.querySelectorAll('#results,.api-error-card,.results-grid,.major-trend-hint,.major-trend-selection-box,[aria-live]').forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const text = String(node.textContent || '');
    if (text.includes('正在读取 /fenxi')) node.textContent = '正在准备专业数据，请稍候。';
    if (node.classList.contains('api-error-card')) {
      const original = text.trim();
      if (original) console.error('[ln-rank-visible-error-hidden]', original);
      node.innerHTML = '<b>暂时没能读取专业数据。</b><p>这不代表当前分数没有专业可看。请稍后重试，或调整条件后重新查看。</p>';
    }
  });
}

function rewriteTrendHint(root = document) {
  root.querySelectorAll('.major-trend-hint').forEach(box => {
    if (!(box instanceof HTMLElement) || box.classList.contains('is-empty')) return;
    const main = box.querySelector('.major-trend-main');
    if (main) main.innerHTML = '<b>过去三年报考难度变化</b><p>可以查看这个专业方向相比多数专业是更难报、更容易报，还是变化不明显。这里只看历史最低投档记录，不预测2027录取。</p>';
    const link = box.querySelector('a');
    if (link) {
      link.href = '/ln2026.html';
      link.textContent = '查看报考难度变化';
    }
  });
  root.querySelectorAll('.major-trend-selection-box').forEach(box => {
    const title = box.querySelector('.major-trend-selection-title');
    if (title) title.textContent = '过去三年报考难度变化';
    box.querySelectorAll('li').forEach(item => {
      item.textContent = item.textContent
        .replace(/建议先确认孩子是否真正接受该方向，再到 2026 三年观察页查看相对投档位置；趋势不作为自动增减依据。/g, '先确认孩子是否真正接受这个方向，再查看过去三年的报考难度变化。历史变化不能自动决定增加或删除专业。')
        .replace(/相对投档位置/g, '报考难度');
    });
    const p = box.querySelector('p');
    if (p) p.textContent = '这里只观察过去三年的最低投档记录，不代表报名人数、专业质量或2027年录取结果。';
    const link = box.querySelector('a');
    if (link) {
      link.href = '/ln2026.html';
      link.textContent = '查看完整变化';
    }
  });
}

function rewriteFlowLanguage(root = document) {
  const mainLabels = {
    input: ['确认孩子的位置', '输入参考分数'],
    filter: ['说清想看什么', '专业与家庭条件'],
    select: ['圈出并整理专业', '加入已选'],
    report: ['家庭逐项复核', '生成报告']
  };
  root.querySelectorAll('[data-flow-step]').forEach(item => {
    const copy = mainLabels[item.dataset.flowStep];
    if (!copy) return;
    const title = item.querySelector('b');
    const small = item.querySelector('small');
    if (title) title.textContent = copy[0];
    if (small) small.textContent = copy[1];
  });
  const planLabels = {
    score: '确认孩子的位置',
    selected: '检查已选专业',
    structure: '检查方案结构',
    report: '保存复核报告'
  };
  root.querySelectorAll('[data-plan-step]').forEach(item => {
    const title = item.querySelector('b');
    if (title && planLabels[item.dataset.planStep]) title.textContent = planLabels[item.dataset.planStep];
  });
}

function rewriteSelectionPage(root = document) {
  root.querySelectorAll('button,a,.workspace-desc,.ln-report-help,.data-note,.ln-stepper-flow-note,.ln-plan-status-note,.pool-add-hint').forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const original = String(node.textContent || '');
    const next = original
      .replace(/放进报告/g, '加入已选专业')
      .replace(/已经在报告里了/g, '已经在已选专业里了')
      .replace(/已放进报告/g, '已加入已选专业')
      .replace(/从报告中移除/g, '移出已选专业')
      .replace(/自选池/g, '已选专业')
      .replace(/自选专业/g, '已选专业')
      .replace(/相对参考分数/g, '与参考分数的差距')
      .replace(/扣除年度共同位移后的相对观察/g, '先校正不同年份整体变化，再看专业方向的历史难度变化')
      .replace(/近三年投档位置变化参考/g, '专业报考难度变化');
    if (next !== original && node.children.length === 0) node.textContent = next;
  });
}

function process(root = document) {
  root.querySelectorAll?.('.major-card').forEach(processCard);
  sanitizeTechnicalStatus(root);
  rewriteTrendHint(root);
  rewriteFlowLanguage(root);
  rewriteSelectionPage(root);
}

const observer = new MutationObserver(records => {
  for (const record of records) {
    if (record.target instanceof HTMLElement) process(record.target);
    record.addedNodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches?.('.major-card')) processCard(node);
      process(node);
    });
  }
});

process(document);
observer.observe(document.documentElement, { childList: true, subtree: true });
log('active');
