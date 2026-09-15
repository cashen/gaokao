const STORAGE_KEY = 'gaokao:simulation-report:v002';

const OPTIONS = [
  { value: '保留', label: '继续考虑', hint: '还值得认真看' },
  { value: '备选', label: '候选', hint: '准备和其他志愿比较' },
  { value: '待讨论', label: '还没决定', hint: '暂时不下结论' },
  { value: '已排除', label: '排除', hint: '不再继续考虑' }
];

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function writeFamilyStatus(id, value) {
  try {
    const state = readState();
    if (!state || !Array.isArray(state.volunteers)) return false;
    const row = state.volunteers.find(item => String(item.id) === String(id));
    if (!row) return false;
    row.familyStatus = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function getRow(id) {
  const state = readState();
  return state?.volunteers?.find(row => String(row.id) === String(id)) || null;
}

function getLegacyRow(id) {
  return document.querySelector(`#volunteerRows tr[data-row-id="${CSS.escape(id)}"]`);
}

function syncFamilyStatus(id, value) {
  const legacyRow = getLegacyRow(id);
  const select = legacyRow?.querySelector('[data-field="familyStatus"]');
  if (!select) return false;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function currentCopy(value) {
  return OPTIONS.find(option => option.value === value)?.label || '还没决定';
}

function familyDecisionMarkup(row) {
  const id = String(row.id);
  const selected = row.familyStatus || '待讨论';
  const buttons = OPTIONS.map(option => {
    const active = selected === option.value;
    const suffix = option.value === '保留' ? 'keep' : option.value === '备选' ? 'candidate' : option.value === '已排除' ? 'exclude' : 'undecided';
    return `<button type="button" class="family-option family-option-${suffix}" data-family-option="${option.value}" data-family-id="${id}" aria-pressed="${active ? 'true' : 'false'}" title="${option.hint}"><span>${option.label}</span></button>`;
  }).join('');
  return `<div class="family-decision" data-family-decision="${id}" role="group" aria-label="这所学校怎么处理？"><div class="family-decision-heading"><span>这所学校怎么处理？</span><span class="family-current" data-family-current>已选：${currentCopy(selected)}</span></div><div class="family-decision-options">${buttons}</div></div>`;
}

function enhanceCard(card) {
  if (!card || card.querySelector('.family-decision')) return;
  const row = getRow(card.dataset.cardId);
  if (!row) return;
  const legacyFooter = card.querySelector('.card-footer');
  if (!legacyFooter) return;
  legacyFooter.insertAdjacentHTML('afterend', familyDecisionMarkup(row));
}

function enhance() {
  document.querySelectorAll('.volunteer-card[data-card-id]').forEach(enhanceCard);
}

function paintSelection(container, value) {
  const selected = OPTIONS.find(option => option.value === value);
  container.querySelectorAll('[data-family-option]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.familyOption === value ? 'true' : 'false');
  });
  const current = container.querySelector('[data-family-current]');
  if (current) current.textContent = `已选：${selected?.label || '还没决定'}`;
  container.dataset.selectedFamily = value;
}

function handleClick(event) {
  const button = event.target.closest('[data-family-option]');
  if (!button) return;
  const id = button.dataset.familyId;
  const value = button.dataset.familyOption;
  const container = button.closest('.family-decision');
  if (!id || !value || !container) return;

  if (!writeFamilyStatus(id, value)) {
    paintSelection(container, getRow(id)?.familyStatus || '待讨论');
    return;
  }
  syncFamilyStatus(id, value);
  paintSelection(container, value);
  button.blur();
}

function start() {
  const root = document.querySelector('#wbRows');
  if (!root) return;
  document.addEventListener('click', handleClick);
  enhance();
  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  observer.observe(root, { childList: true, subtree: true });
}

start();
