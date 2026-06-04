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


function shortDiscipline(item) {
  if (!item) return '';
  const name = item.name || item.discipline || '';
  const rating = item.rating || '';
  return rating ? `${name} ${rating}` : name;
}

function kbEvidenceItems(payload) {
  const kb = payload?.knowledgeContext || {};
  const school = kb.school || {};
  if (!school || !school.matched) return [];

  const items = [];

  const tags = Array.isArray(school.tags) ? school.tags.filter(Boolean) : [];
  if (tags.length) {
    items.push(`学校标签：${tags.slice(0, 4).join(' / ')}`);
  }

  if (school.doubleFirstClassSubjects) {
    items.push(`双一流学科：${school.doubleFirstClassSubjects}`);
  }

  const da = school.disciplineAssessment || {};
  if (da.matched) {
    const matched = Array.isArray(da.matchedMajorDisciplines) ? da.matchedMajorDisciplines : [];
    if (matched.length) {
      items.push(`相关学科评估：${matched.slice(0, 3).map(shortDiscipline).filter(Boolean).join('、')}`);
    } else if (da.strongDirections) {
      items.push(`学科评估线索：${da.strongDirections}；当前专业是否属于优势方向需核验`);
    } else if (da.highestRating) {
      items.push(`学科评估线索：第四轮最高评级 ${da.highestRating}`);
    }
  }

  const industries = Array.isArray(school.industrySignals) ? school.industrySignals.filter(Boolean) : [];
  if (industries.length) {
    items.push(`行业特色线索：${industries.slice(0, 3).join(' / ')}（需结合官方材料核验）`);
  }

  if (school.medicalSignal) {
    items.push('医学资源线索：需核验附属医院、规培/读研路径和就业质量报告');
  }

  const slots = school.sourceSlots || {};
  const missing = [];
  if (!slots.officialProfileSummary) missing.push('官网简介');
  if (!slots.admissionCampusSummary) missing.push('招生章程/校区');
  if (!slots.employmentSummary) missing.push('就业质量报告');
  if (missing.length) {
    items.push(`待补官方证据：${missing.join('、')}，AI不得自行编造`);
  }

  return [...new Set(items.filter(Boolean))].slice(0, 5);
}

function renderKbEvidence(payload) {
  const items = kbEvidenceItems(payload);
  if (!items.length) return '';
  return `
    <div class="diagnose-section diagnose-kb-section">
      <strong>知识库依据</strong>
      <ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      <div class="diagnose-kb-note">注：学科评估是学科层面线索，不等同于本科专业强弱。</div>
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

      ${renderKbEvidence(payload)}

      <div class="diagnose-section">
        <strong>现实提醒</strong>
        <p>${esc(d.realityReminder || '')}</p>
      </div>

      <div class="diagnose-section">
        <strong>需要核验</strong>
        ${list(d.checks)}
      </div>

      ${d.parentNote ? `
        <div class="diagnose-section diagnose-parent-section">
          <strong>家长提醒</strong>
          <p>${esc(d.parentNote)}</p>
        </div>
      ` : ''}
      <div class="diagnose-disclaimer">${esc(d.disclaimer || '仅作专业卡片解释，不等同于录取预测。')}</div>
    </div>
  `;
}
