function esc(value) {
  return String(value == null ? '' : value)
    .replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function list(items) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return '';
  return `<ul>${arr.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function viewportMode() {
  const w = window.innerWidth || document.documentElement.clientWidth || 1024;
  if (w <= 640) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}

function applyMode(modal) {
  const mode = viewportMode();
  modal.dataset.mode = mode;
  modal.classList.toggle('is-mobile', mode === 'mobile');
  modal.classList.toggle('is-tablet', mode === 'tablet');
  modal.classList.toggle('is-desktop', mode === 'desktop');
}

function ensureModal() {
  let modal = document.getElementById('diagnoseModal');
  if (modal) {
    applyMode(modal);
    return modal;
  }

  modal = document.createElement('div');
  modal.id = 'diagnoseModal';
  modal.className = 'diagnose-modal is-hidden';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="diagnose-modal-backdrop" data-diagnose-close></div>
    <section class="diagnose-modal-card" role="dialog" aria-modal="true" aria-labelledby="diagnoseModalTitle">
      <div class="diagnose-modal-grip" aria-hidden="true"></div>
      <button class="diagnose-modal-close" type="button" aria-label="关闭诊断" data-diagnose-close>×</button>
      <div class="diagnose-modal-top">
        <div>
          <div class="diagnose-modal-kicker">AI诊断</div>
          <h3 id="diagnoseModalTitle" class="diagnose-modal-title">专业卡片诊断</h3>
        </div>
      </div>
      <div id="diagnoseModalBody" class="diagnose-modal-body"></div>
      <div class="diagnose-modal-footer">
        <button class="diagnose-footer-close" type="button" data-diagnose-close>阅读完成，关闭</button>
      </div>
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

  window.addEventListener('resize', () => {
    if (!modal.classList.contains('is-hidden')) applyMode(modal);
  }, { passive: true });

  applyMode(modal);
  return modal;
}

function body() {
  const modal = ensureModal();
  return modal.querySelector('#diagnoseModalBody');
}

function cardEl() {
  return ensureModal().querySelector('.diagnose-modal-card');
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
  applyMode(modal);
  modal.classList.remove('is-hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('diagnose-modal-open');

  const card = cardEl();
  if (card) card.scrollTop = 0;

  const closeButton = modal.querySelector('.diagnose-modal-close');
  setTimeout(() => closeButton?.focus?.(), 0);
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
      正在生成AI诊断…
      <div class="diagnose-mini-note">只解释当前卡片，不改变原始专业池排序。</div>
    </div>
  `;
}

export function renderDiagnoseError(record, message) {
  openDiagnoseModal(record);
  const root = body();
  if (!root) return;
  root.innerHTML = `
    <div class="diagnose-box is-error">
      <strong>诊断失败</strong>
      <p>${esc(message || '请稍后重试')}</p>
    </div>
  `;
}

export function renderDiagnoseResult(record, payload) {
  openDiagnoseModal(record);
  const root = body();
  if (!root) return;

  const d = payload?.diagnosis || {};
  const sourceMap = {
    'rules-only': '规则版',
    'rules-only-quota': '额度已用完 · 规则版',
    'rules-only-error': 'AI暂不可用 · 规则版',
    'workers-ai': 'AI版'
  };
  const source = sourceMap[payload?.source] || 'AI版';
  const quotaNote = payload?.source === 'rules-only-quota'
    ? '<div class="diagnose-quota-note">今日 Cloudflare AI 免费额度已用完，系统已自动切换为规则版诊断。</div>'
    : (payload?.message ? `<div class="diagnose-quota-note">${esc(payload.message)}</div>` : '');

  root.innerHTML = `
    <div class="diagnose-box">
      <div class="diagnose-head">
        <span class="diagnose-title">AI诊断</span>
        <span class="diagnose-source">${source}</span>
      </div>
      <div class="diagnose-summary">${esc(d.summary || '暂无诊断')}</div>\n      ${quotaNote}

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
