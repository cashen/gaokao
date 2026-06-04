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

function majorFamilies(major) {
  const text = String(major || '');
  const families = [];
  const add = name => { if (!families.includes(name)) families.push(name); };

  if (/计算机|软件|人工智能|数据科学|网络空间|物联网|信息安全/.test(text)) add('邮电电子');
  if (/电气|电力|智能电网/.test(text)) add('电力能源');
  if (/自动化|机器人工程|智能制造|机械|车辆/.test(text)) add('制造自动化');
  if (/临床|口腔|麻醉|影像|护理|药学|中医|医学/.test(text)) add('医学');
  if (/交通|航海|海事|船舶|航空|飞行器/.test(text)) add('海事交通');
  if (/金融|经济|会计|财务|审计|财政|工商管理|市场营销/.test(text)) add('财经政法');
  if (/法学|知识产权/.test(text)) add('财经政法');
  if (/师范|教育|心理/.test(text)) add('师范教育');
  if (/土木|建筑|城乡规划|风景园林|工程管理/.test(text)) add('建筑水利');
  if (/农业|林学|园艺|水产|海洋/.test(text)) add('农林海洋');
  if (/外国语|新闻|传播|传媒|体育|音乐|美术|设计|戏剧/.test(text)) add('语言传媒体育艺术');
  if (/石油|地质|矿业|测绘|资源勘查/.test(text)) add('地矿资源');
  return families;
}

function familyLabel(families, record) {
  if (families.includes('邮电电子')) return '计算机/电子信息方向';
  if (families.includes('电力能源')) return '电气/能源方向';
  if (families.includes('医学')) return '医学方向';
  if (families.includes('财经政法')) return '财经/法学方向';
  if (families.includes('海事交通')) return '交通/海事方向';
  if (families.includes('师范教育')) return '师范教育方向';
  if (families.includes('建筑水利')) return '土木建筑方向';
  if (families.includes('制造自动化')) return '机械/自动化方向';
  return record?.major ? `当前专业（${record.major}）` : '当前专业';
}

function kbEvidenceItems(payload, record) {
  const kb = payload?.knowledgeContext || {};
  const school = kb.school || {};
  if (!school || !school.matched) return [];

  const items = [];
  const families = majorFamilies(record?.major);
  const family = familyLabel(families, record);

  const tags = Array.isArray(school.tags) ? school.tags.filter(Boolean) : [];
  if (tags.length) {
    items.push(`学校层面：${tags.slice(0, 4).join(' / ')}`);
  }

  if (school.doubleFirstClassSubjects) {
    items.push(`双一流学科：${school.doubleFirstClassSubjects}`);
  }

  const da = school.disciplineAssessment || {};
  if (da.matched) {
    const matched = Array.isArray(da.matchedMajorDisciplines) ? da.matchedMajorDisciplines : [];
    if (matched.length) {
      items.push(`专业相关性：${family}命中已收录学科 ${matched.slice(0, 3).map(shortDiscipline).filter(Boolean).join('、')}`);
    } else if (da.strongDirections) {
      items.push(`学校较强方向：${da.strongDirections}`);
      items.push(`专业相关性：${family}未命中已收录优势/相关学科，需核验学院实力和就业质量报告`);
    } else if (da.highestRating) {
      items.push(`学科评估线索：第四轮最高评级 ${da.highestRating}`);
      items.push(`专业相关性：${family}需结合学院和就业质量报告核验`);
    }
  }

  const industries = Array.isArray(school.industrySignals) ? school.industrySignals.filter(Boolean) : [];
  const relatedIndustries = industries.filter(x => families.includes(x));
  if (relatedIndustries.length) {
    items.push(`行业特色相关：${relatedIndustries.slice(0, 2).join(' / ')}（仍需结合官方材料核验）`);
  }

  if (school.medicalSignal && families.includes('医学')) {
    items.push('医学资源相关：需核验附属医院、规培/读研路径和就业质量报告');
  }

  const slots = school.sourceSlots || {};
  const missing = [];
  if (!slots.officialProfileSummary) missing.push('官网简介');
  if (!slots.admissionCampusSummary) missing.push('招生章程/校区');
  if (!slots.employmentSummary) missing.push('就业质量报告');
  if (missing.length) {
    items.push(`待补官方证据：${missing.join('、')}，AI不得自行编造`);
  }

  return [...new Set(items.filter(Boolean))].slice(0, 6);
}

function renderKbEvidence(payload, record) {
  const items = kbEvidenceItems(payload, record);
  if (!items.length) return '';
  return `
    <div class="diagnose-section diagnose-kb-section">
      <strong>知识库依据</strong>
      <ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      <div class="diagnose-kb-note">注：学校层面优势不等于当前专业优势；学科评估是学科层面线索，不等同于本科专业强弱。</div>
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

      ${renderKbEvidence(payload, record)}

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
