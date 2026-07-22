const DEBUG = new URLSearchParams(location.search).get('debug') === '1';

function log(...args) {
  if (DEBUG) console.info('[family-presentation-v3952]', ...args);
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
  if (absolute <= stableLimit) return '近两年录取位置基本稳定';
  const ratio = absolute / rank2025;
  if (delta < 0) return ratio >= 0.08 ? '2026年录取所需位次明显提高' : '2026年录取所需位次略有提高';
  return ratio >= 0.08 ? '2026年录取所需位次明显降低' : '2026年录取所需位次略有降低';
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
    line.innerHTML = '<span class="family-history-title">往年投档记录</span><p class="family-history-empty">暂时没有可严格对应的往年记录。</p>';
    line.classList.add('family-history-block');
    return;
  }
  const rank25 = rows.find(row => row.year === 2025)?.rank;
  const conclusion = historyConclusion(currentRank(card), rank25);
  line.className = 'family-history-block';
  line.innerHTML = `
    <div class="family-history-title">往年投档记录</div>
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
    if (text === '放进报告' || text === '加入自选') node.textContent = '加入已选专业';
    if (text === '已放进报告' || text === '已加入自选') node.textContent = '已加入';
    if (text === '从报告中移除') node.textContent = '移出已选专业';
    if (text === '查看复核详情') node.textContent = '查看要确认什么';
    if (text === '收起复核详情') node.textContent = '收起确认事项';
    if (text === '看懂这条') node.textContent = '查看详细说明';
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

function processCard(card) {
  if (!(card instanceof HTMLElement)) return;
  rewriteStatusBadge(card);
  rewriteMetaPills(card);
  rewriteHistory(card);
  rewriteTags(card);
  rewriteActions(card);
  compactBackground(card);
  card.dataset.familyPresentation = 'v3952';
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
    if (main) main.innerHTML = '<b>过去三年报考难度变化</b><p>可以查看这个专业方向相比多数专业是更难报、更容易报，还是变化不明显。这里只看历史记录，不预测2027录取。</p>';
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
    if (p) p.textContent = '这里只观察过去三年的投档记录，不代表报名人数、专业质量或2027年录取结果。';
    const link = box.querySelector('a');
    if (link) {
      link.href = '/ln2026.html';
      link.textContent = '查看完整变化';
    }
  });
}

function rewriteSelectionPage(root = document) {
  root.querySelectorAll('button,a,.workspace-desc,.ln-report-help,.data-note').forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const original = String(node.textContent || '');
    const next = original
      .replace(/放进报告/g, '加入已选专业')
      .replace(/从报告中移除/g, '移出已选专业')
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
  rewriteSelectionPage(root);
}

const observer = new MutationObserver(records => {
  for (const record of records) {
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
