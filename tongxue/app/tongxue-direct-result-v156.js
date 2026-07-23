const NEEDS_CONFIRMATION_TITLES = Object.freeze([
  '请确认你想查询的学校',
  '还不能确定是哪所学校',
  '学校名称识别暂不可用'
]);

export function classifyTongxueDirectResult({ hasResult = false, hasChoice = false, title = '' } = {}) {
  const text = String(title || '').trim();
  if (hasChoice || NEEDS_CONFIRMATION_TITLES.includes(text)) return 'needs-confirmation';
  if (hasResult) return 'resolved-result';
  return 'waiting';
}

function clearSuggestionList(input, suggestionsBox) {
  if (suggestionsBox) {
    if (!suggestionsBox.hidden) suggestionsBox.hidden = true;
    if (suggestionsBox.childNodes.length) suggestionsBox.replaceChildren();
  }
  input?.setAttribute('aria-expanded', 'false');
  input?.removeAttribute('aria-activedescendant');
}

function ensureChangeSchoolButton(topbar) {
  if (!topbar) return null;
  let button = document.getElementById('tongxueChangeSchool');
  if (button) return button;
  button = document.createElement('button');
  button.id = 'tongxueChangeSchool';
  button.className = 'back-home direct-change-school';
  button.type = 'button';
  button.hidden = true;
  button.textContent = '换一所学校';
  topbar.insertBefore(button, topbar.lastElementChild || null);
  return button;
}

export function installTongxueDirectResultShell(handoffState, options = {}) {
  if (typeof document === 'undefined') return Object.freeze({ refresh() {}, destroy() {} });

  const state = handoffState || {};
  const hero = document.querySelector('.hero');
  const topbar = document.querySelector('.topbar');
  const result = document.getElementById('result');
  const input = document.getElementById('school');
  const suggestionsBox = document.getElementById('schoolSuggestions');
  const changeButton = ensureChangeSchoolButton(topbar);
  let directMode = Boolean(state.shouldAutoQuery);
  let observer = null;

  function setHeroVisible(visible) {
    if (hero) hero.hidden = !visible;
    document.body?.classList.toggle('tongxue-direct-result', !visible && directMode);
    document.body?.classList.toggle('tongxue-needs-confirmation', visible && directMode);
    if (changeButton) changeButton.hidden = visible || !directMode;
  }

  function currentViewState() {
    const title = result?.querySelector('#resultTitle')?.textContent || '';
    return classifyTongxueDirectResult({
      hasResult: Boolean(result?.children?.length),
      hasChoice: Boolean(result?.querySelector('[data-choice]')),
      title
    });
  }

  function refresh() {
    if (!directMode) {
      setHeroVisible(true);
      return;
    }
    const viewState = currentViewState();
    if (viewState === 'needs-confirmation') {
      setHeroVisible(true);
      input?.removeAttribute('readonly');
      return;
    }
    clearSuggestionList(input, suggestionsBox);
    setHeroVisible(false);
  }

  function leaveDirectMode() {
    directMode = false;
    observer?.disconnect();
    setHeroVisible(true);
    clearSuggestionList(input, suggestionsBox);
    if (result) result.replaceChildren();
    if (input) {
      input.value = '';
      delete input.dataset.tongxueEntity;
      delete input.dataset.tongxueHandoff;
      input.removeAttribute('readonly');
      input.focus({ preventScroll: true });
    }
    hero?.scrollIntoView({ block: 'start', behavior: options.reducedMotion ? 'auto' : 'smooth' });
  }

  changeButton?.addEventListener('click', leaveDirectMode);

  if (directMode) {
    clearSuggestionList(input, suggestionsBox);
    setHeroVisible(false);
    if (result && !result.children.length) {
      result.innerHTML = '<div class="state-card loading direct-opening">正在打开这所学校的公开评论…</div>';
    }
    observer = typeof MutationObserver === 'function'
      ? new MutationObserver(refresh)
      : null;
    observer?.observe(result, { childList: true, subtree: true });
    observer?.observe(suggestionsBox, { childList: true, attributes: true, attributeFilter: ['hidden'] });
  }

  return Object.freeze({
    refresh,
    leaveDirectMode,
    destroy() {
      observer?.disconnect();
      changeButton?.removeEventListener('click', leaveDirectMode);
    }
  });
}
