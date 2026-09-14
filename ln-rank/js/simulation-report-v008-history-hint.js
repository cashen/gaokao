const STORAGE_KEY = 'gaokao:simulation-report:v002';

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
}

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function formatRank(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('zh-CN') : '—';
}

function historyCell(year, row) {
  const item = row?.history?.years?.[year];
  if (!item || (item.score == null && item.rank == null)) {
    return `<div class="history-hint-item history-hint-empty"><b>${year}</b><span>暂无严格记录</span></div>`;
  }
  const score = item.score == null ? '—' : `${item.score}分`;
  const rank = item.rank == null ? '—' : `${formatRank(item.rank)}位`;
  const needsCheck = item.comparable === false && item.recordStatus !== 'primary-record';
  return `<div class="history-hint-item"><b>${year}</b><span>${esc(score)}</span><small>${esc(rank)}${needsCheck ? ' · 需核验' : ''}</small></div>`;
}

function buildHistoryHint(row) {
  return `<section class="history-hint" aria-label="近3年分数位次参考">
    <div class="history-hint-head"><strong>近3年分数 / 位次</strong><span>历史投档参考</span></div>
    <div class="history-hint-grid">${historyCell(2026, row)}${historyCell(2025, row)}${historyCell(2024, row)}</div>
    <p>只用于回看近三年投档记录，不代表今年录取结果。</p>
  </section>`;
}

function enhanceCard(card, row) {
  if (!card || !row || card.querySelector('.history-hint')) return;
  const caption = card.querySelector('.major-caption');
  if (!caption) return;
  caption.insertAdjacentHTML('afterend', buildHistoryHint(row));
}

function enhance() {
  const state = readState();
  if (!Array.isArray(state?.volunteers)) return;
  document.querySelectorAll('.volunteer-card[data-card-id]').forEach(card => {
    const row = state.volunteers.find(item => String(item.id) === String(card.dataset.cardId));
    enhanceCard(card, row);
  });
}

function start() {
  enhance();
  const root = document.querySelector('#wbRows');
  if (!root) return;
  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  observer.observe(root, { childList: true, subtree: true });
  setInterval(enhance, 800);
}

start();
