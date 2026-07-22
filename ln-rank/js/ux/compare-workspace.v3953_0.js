/* v3.9.53.0 compare workspace human journey layer.
 * Additive only: preserves ranking, grouping, selection and report logic.
 */
const results = document.getElementById('results');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let mutationQueued = false;
let pendingCompare = null;
let toastTimer = 0;

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function ensureToast() {
  let toast = document.getElementById('lnCompareToast');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'lnCompareToast';
  toast.className = 'ln-compare-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  toast.hidden = true;
  document.body.appendChild(toast);
  return toast;
}

function announce(message) {
  const toast = ensureToast();
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => { toast.hidden = true; }, reduceMotion ? 0 : 180);
  }, 2600);
}

function viewportKind() {
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  if (width < 768) return 'phone';
  if (width < 1200) return 'tablet';
  return 'desktop';
}

function compareLabel(button) {
  const type = button?.dataset?.compareType;
  const key = text(button?.dataset?.compareKey);
  if (type === 'school') return key ? `${key}的同校专业对比` : '同校专业对比';
  if (type === 'major') return key ? `${key}的同专业院校对比` : '同专业院校对比';
  return '同校与同专业对比';
}

function movePanelToWorkspace(panel) {
  if (!results || !panel) return;
  const context = results.querySelector('.result-context-bar');
  const tabs = results.querySelector('.result-view-tabs');
  const anchor = tabs?.nextSibling || context?.nextSibling || results.firstChild;
  if (anchor !== panel) results.insertBefore(panel, anchor);
}

function enhanceRows(panel) {
  const rows = panel.querySelector('.natural-compare-rows');
  if (!rows) return;
  const count = rows.querySelectorAll('.natural-compare-row').length;
  rows.dataset.compareCount = String(count);
  rows.classList.toggle('is-two', count === 2);
  rows.classList.toggle('is-three', count === 3);
  rows.classList.toggle('is-four', count === 4);
  rows.classList.toggle('is-many', count >= 5);
  rows.querySelectorAll('.natural-compare-row').forEach((row, index) => {
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `对比项${index + 1}，共${count}项`);
  });

  let guide = panel.querySelector('.natural-compare-human-guide');
  if (!guide) {
    guide = document.createElement('div');
    guide.className = 'natural-compare-human-guide';
    const detail = panel.querySelector('.natural-compare-detail');
    detail?.insertBefore(guide, rows);
  }
  if (guide) {
    const kind = viewportKind();
    guide.innerHTML = kind === 'desktop'
      ? '<b>横向一起看</b><span>同一组内容并排展示，重点比较2026、2025、2024投档位置和需要确认的项目差异。</span>'
      : kind === 'tablet'
        ? '<b>并排比较</b><span>屏幕可同时看到约两项，左右滑动查看其余内容。</span>'
        : '<b>左右滑动比较</b><span>每次看一项，横向滑动查看下一项。</span>';
  }
}

function enhancePanel(panel) {
  if (!panel) return;
  panel.id = 'naturalCompareWorkspace';
  panel.classList.add('natural-compare-workspace');
  panel.setAttribute('tabindex', '-1');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', '同校与同专业横向对比工作区');
  panel.style.scrollMarginTop = '18px';
  movePanelToWorkspace(panel);
  enhanceRows(panel);
}

function openWorkspace(panel) {
  if (!panel) return;
  enhancePanel(panel);
  panel.classList.remove('is-arriving');
  void panel.offsetWidth;
  panel.classList.add('is-arriving');
  panel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  setTimeout(() => {
    try { panel.focus({ preventScroll: true }); } catch { panel.focus(); }
  }, reduceMotion ? 0 : 260);
  const title = text(panel.querySelector('.natural-compare-detail-title b')?.textContent) || pendingCompare?.label || '对比结果';
  announce(`已打开${title}，页面已移动到横向对比区。`);
  pendingCompare = null;
}

function afterMutation() {
  mutationQueued = false;
  if (!results) return;
  const panel = results.querySelector('.natural-compare-panel');
  if (!panel) return;
  enhancePanel(panel);
  if (pendingCompare && panel.classList.contains('is-open')) openWorkspace(panel);
}

function queueMutation() {
  if (mutationQueued) return;
  mutationQueued = true;
  requestAnimationFrame(() => requestAnimationFrame(afterMutation));
}

function handleCompareClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest?.('#results [data-compare-action]');
  if (!button) return;
  const action = button.dataset.compareAction || '';
  if (action === 'close') {
    pendingCompare = null;
    announce('已收起横向对比。');
    return;
  }
  const isSupportedAction = action === 'open' || action === 'group' || action === 'chip' || action === 'more';
  if (!isSupportedAction) return;
  pendingCompare = {
    action,
    type: button.dataset.compareType || '',
    key: button.dataset.compareKey || '',
    label: compareLabel(button)
  };
  queueMutation();
}

function handleResize() {
  const panel = results?.querySelector('.natural-compare-panel');
  if (panel) enhanceRows(panel);
}

if (results) {
  new MutationObserver(queueMutation).observe(results, { childList: true, subtree: true });
  document.addEventListener('click', handleCompareClick, true);
  window.addEventListener('resize', handleResize, { passive: true });
  afterMutation();
}
