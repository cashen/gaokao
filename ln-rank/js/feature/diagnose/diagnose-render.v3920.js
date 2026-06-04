function esc(value) {
  return String(value == null ? '' : value)
    .replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function list(items) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return '';
  return `<ul>${arr.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

export function renderDiagnoseLoading(slot) {
  if (!slot) return;
  slot.innerHTML = `<div class="diagnose-box is-loading">正在生成现实诊断…</div>`;
}

export function renderDiagnoseError(slot, message) {
  if (!slot) return;
  slot.innerHTML = `<div class="diagnose-box is-error">诊断失败：${esc(message || '请稍后重试')}</div>`;
}

export function renderDiagnoseResult(slot, payload) {
  if (!slot) return;
  const d = payload?.diagnosis || {};
  const source = payload?.source === 'rules-only' ? '规则版' : 'AI版';
  slot.innerHTML = `
    <div class="diagnose-box">
      <div class="diagnose-head">
        <span class="diagnose-title">现实诊断</span>
        <span class="diagnose-source">${source}</span>
      </div>
      <div class="diagnose-summary">${esc(d.summary || '暂无诊断')}</div>

      <div class="diagnose-section">
        <strong>主要依据</strong>
        ${list(d.basis)}
      </div>

      <div class="diagnose-section">
        <strong>现实提醒</strong>
        <p>${esc(d.realityReminder || '')}</p>
      </div>

      <div class="diagnose-section">
        <strong>需要核验</strong>
        ${list(d.checks)}
      </div>

      ${d.parentNote ? `<div class="diagnose-parent-note">${esc(d.parentNote)}</div>` : ''}
      <div class="diagnose-disclaimer">${esc(d.disclaimer || '仅作专业卡片解释，不等同于录取预测。')}</div>
    </div>
  `;
}
