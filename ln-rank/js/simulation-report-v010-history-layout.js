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

function formatYear(year, item) {
  if (!item || (item.score == null && item.rank == null)) return `<span class="history-inline-item"><b>${year}</b> 暂无严格记录</span>`;
  const score = item.score == null ? '—' : `${item.score}分`;
  const rank = item.rank == null ? '—' : `${formatRank(item.rank)}位`;
  return `<span class="history-inline-item"><b>${year}</b> ${esc(score)} / ${esc(rank)}</span>`;
}

function buildHistoryInline(row) {
  return `<div class="history-inline" role="note" aria-label="近3年分数位次参考"><strong>近3年</strong>${formatYear(2026, row?.history?.years?.[2026])}${formatYear(2025, row?.history?.years?.[2025])}${formatYear(2024, row?.history?.years?.[2024])}<span class="history-inline-source">历史投档参考</span></div>`;
}

function enhanceCard(card, row) {
  if (!card || !row || card.querySelector('.history-inline')) return;
  const top = card.querySelector('.volunteer-top');
  if (!top) return;
  top.insertAdjacentHTML('afterend', buildHistoryInline(row));
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
