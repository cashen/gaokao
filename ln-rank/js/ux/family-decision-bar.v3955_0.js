import {
  FAMILY_DECISION_VERSION,
  readFamilyCandidateScore,
  readFamilySelectionItems,
  countFamilyPendingItems,
  resolveFamilyNextAction
} from '../domain/family-decision-contract.v3955_0.js?v=3955_0';

let mounted = false;
let scheduled = false;

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function ensureRoot() {
  let root = document.querySelector('[data-family-decision-bar]');
  if (root) return root;
  const page = document.querySelector('main.page, main.ln-page-shell, main.ln-selection-page');
  const hero = page?.querySelector(':scope > .hero');
  if (!page) return null;
  root = document.createElement('section');
  root.className = 'family-decision-bar';
  root.dataset.familyDecisionBar = FAMILY_DECISION_VERSION;
  root.setAttribute('aria-label', '当前家庭方案');
  root.innerHTML = `
    <div class="family-decision-bar__main">
      <span class="family-decision-bar__label">当前家庭方案</span>
      <a href="/ln-rank/" data-family-score>参考分数 <b>未填写</b></a>
      <a href="/ln-rank/selection-pool.html" data-family-selected>已选专业 <b>0</b></a>
      <a href="/ln-rank/selection-pool.html" data-family-pending>待确认 <b>0</b></a>
      <a class="family-decision-bar__next" href="/ln-rank/" data-family-next>下一步：先确认孩子目前的参考分数</a>
    </div>
    <nav class="family-decision-mobile" aria-label="家庭方案主导航">
      <a href="/ln-rank/"><span>筛专业</span></a>
      <a href="/ln-rank/selection-pool.html"><span>已选</span><b data-mobile-selected>0</b></a>
      <a href="/ln-rank/selection-pool.html"><span>复核</span><b data-mobile-pending>0</b></a>
    </nav>`;
  if (hero) hero.insertAdjacentElement('afterend', root);
  else page.prepend(root);
  document.body.classList.add('has-family-decision-bar');
  return root;
}

function update() {
  scheduled = false;
  const root = ensureRoot();
  if (!root) return;
  const score = readFamilyCandidateScore();
  const items = readFamilySelectionItems();
  const selectedCount = items.length;
  const pendingCount = countFamilyPendingItems(items);
  const next = resolveFamilyNextAction({ score, items });
  const scoreLink = root.querySelector('[data-family-score] b');
  const selectedLink = root.querySelector('[data-family-selected] b');
  const pendingLink = root.querySelector('[data-family-pending] b');
  const nextLink = root.querySelector('[data-family-next]');
  if (scoreLink) scoreLink.textContent = score ? `${fmt(score)}分` : '未填写';
  if (selectedLink) selectedLink.textContent = fmt(selectedCount);
  if (pendingLink) pendingLink.textContent = fmt(pendingCount);
  if (nextLink) {
    nextLink.href = next.href;
    nextLink.textContent = `下一步：${next.label}`;
  }
  root.querySelectorAll('[data-mobile-selected]').forEach(node => { node.textContent = fmt(selectedCount); });
  root.querySelectorAll('[data-mobile-pending]').forEach(node => { node.textContent = fmt(pendingCount); });
  root.dataset.nextAction = next.key;
}

function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(update);
}

function bind() {
  if (mounted) return;
  mounted = true;
  document.addEventListener('input', event => {
    if (event.target?.matches?.('#candidateScore,#pathCandidateScore')) scheduleUpdate();
  });
  document.addEventListener('change', event => {
    if (event.target?.matches?.('#candidateScore,#pathCandidateScore')) scheduleUpdate();
  });
  window.addEventListener('storage', scheduleUpdate);
  window.addEventListener('lnrank-selection-pool-updated', scheduleUpdate);
  document.addEventListener('click', event => {
    if (event.target?.closest?.('[data-pool-index],#clearPool,[data-remove-id]')) setTimeout(scheduleUpdate, 0);
  });
  scheduleUpdate();
}

bind();
