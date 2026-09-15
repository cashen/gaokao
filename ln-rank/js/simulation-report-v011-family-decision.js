const STORAGE_KEY = 'gaokao:simulation-report:v002';

const OPTIONS = [
  { value: '保留', label: '继续考虑' },
  { value: '备选', label: '先留着' },
  { value: '待讨论', label: '候选' },
  { value: '已排除', label: '排除' }
];

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
}

function getRow(id) {
  const state = readState();
  return state?.volunteers?.find(row => String(row.id) === String(id)) || null;
}

function getLegacyRow(id) {
  return document.querySelector(`#volunteerRows tr[data-row-id=\"${CSS.escape(id)}\"]`);
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
  if (value === '保留') return '继续考虑';
  if (value === '备选') return '先留着';
  if (value === '已排除') return '排除';
  return '还没决定';
}

function buildDecision(row) {
  const id = escapeHtml(row.id);
  const selected = row.familyStatus || '待讨论';
  const buttons = OPTIONS.map(option => {
    const pressed = selected === option.value && selected !== '待讨论';
    return `<button type="button" class="family-option" data-family-option="${escapeHtml(option.value)}" data-id="${id}" aria-pressed="${pressed ? 'true' : 'false'}">${escapeHtml(option.label)}</button>`;
  }).join('');
  return `<div class="family-decision" data-family-decision="${id}" role="group" aria-label="这所学校怎么处理？"><div class="family-decision-label">这所学校怎么处理？ <span class="family-current">目前：<strong>${escapeHtml(currentCopy(selected))}</strong></span></div><div class="family-decision-options">${buttons}</div></div>`;
}

function enhanceCard(card) {
  if (!card || card.querySelector('.family-decision')) return;
  const row = getRow(card.dataset.cardId);
  if (!row) return;
  const footer = card.querySelector('.card-footer');
  if (!footer) return;
  footer.insertAdjacentHTML('afterend', buildDecision(row));
}

function enhance() {
  document.querySelectorAll('.volunteer-card[data-card-id]').forEach(enhanceCard);
}

function handleClick(event) {
  const button = event.target.closest('[data-family-option]');
  if (!button) return;
  const id = button.dataset.id;
  const value = button.dataset.familyOption;
  if (!id || !value) return;
  if (!syncFamilyStatus(id, value)) return;
  button.blur();
}

function start() {
  const root = document.querySelector('#wbRows');
  if (!root) return;
  document.addEventListener('click', handleClick);
  enhance();
  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  observer.observe(root, { childList: true, subtree: true });
  setInterval(enhance, 800);
}

start();
