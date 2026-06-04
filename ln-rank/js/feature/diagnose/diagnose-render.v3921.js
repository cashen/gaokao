function esc(value) {
  return String(value == null ? '' : value)
    .replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function list(items) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return '';
  return `<ul>${arr.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function ensureModal() {
  let modal = document.getElementById('diagnoseModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'diagnoseModal';
  modal.className = 'diagnose-modal is-hidden';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="diagnose-modal-backdrop" data-diagnose-close></div>
    <section class="diagnose-modal-card" role="dialog" aria-modal="true" aria-labelledby="diagnoseModalTitle">
      <button class="diagnose-modal-close" type="button" aria-label="关闭诊断" data-diagnose-close>×</button>
      <div class="diagnose-modal-top">
        <div>
          <div class="diagnose-modal-kicker">现实诊断</div>
          <h3 id="diagnoseModalTitle" class="diagnose-modal-title">专业卡片诊断</h3>
        </div>
      </div>
      <div id="diagnoseModalBody" class="diagnose-modal-body"></div>
    </section>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll('[data-diagnose-close]').forEach(el => {
    el.addEventListener('click', closeDiagnoseModal);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.classList.contains('is-hidden')) {
      closeDiagnoseModal();
    }
  });

  return modal;
}

function body() {
  const modal = ensureModal();
  return modal.querySelector('#diagnoseModalBody');
}

function setTitle(record) {
  const modal = ensureModal();
  const title = modal.querySelector('#diagnoseModalTitle');
  if (title) {
    title.textContent = `${record?.school || '学校'}｜${record?.major || '专业'}`;
  }
}

export function openDiagnoseModal(record) {
  const modal = ensureModal();
  setTitle(record);
  modal.classList.remove('is-hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('diagnose-modal-open');
}

export function closeDiagnoseModal() {
  const modal = ensureModal();
  modal.classList.add('is-hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('diagnose-modal-open');
}

export function renderDiagnoseLoading(record) {
  openDiagnoseModal(record);
  const root = body();
  if (!root) return;
  root.innerHTML = `
    <div class="diagnose-box is-loading">
      正在生成现实诊断…
      <div class="diagnose-mini-note">只解释当前卡片，不改变原始专业池排序。</div>
    </div>
  `;
}

export function renderDiagnoseError(record, message) {
  openDiagnoseModal(record);
  const root = body();
  if (!root) return;
  root.innerHTML = `<div class="diagnose-box is-error">诊断失败：${esc(message || '请稍后重试')}</div>`;
}

export function renderDiagnoseResult(record, payload) {
  openDiagnoseModal(record);
  const root = body();
  if (!root) return;

  const d = payload?.diagnosis || {};
  const source = payload?.source === 'rules-only' ? '规则版' : 'AI版';

  root.innerHTML = `
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
