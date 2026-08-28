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
          <div class="diagnose-modal-kicker">方案解读</div>
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
      正在生成单条解读…
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




function detectSpecialProgramClient(record, diagnosis) {
  const text = [record?.school, record?.major, record?.geoEntity, record?.locationWarning].filter(Boolean).join(' ');
  const fromDiagnosis = diagnosis?.specialProgram;
  if (fromDiagnosis?.hasSpecial) return fromDiagnosis;

  const types = [];
  const checks = [];
  const riskTags = [];
  let reminder = '';
  let parentNote = '';

  if (/中外合作|合作办学|中外联合|国际合作|中美|中英|中澳|中加|中法|中德|中俄/.test(text)) {
    types.push('中外合作办学');
    riskTags.push('中外合作','高收费','培养模式','证书口径');
    checks.push(
      '核验中外合作办学收费、培养模式和毕业证/学位证口径',
      '核验外方合作院校、是否必须出国和英语授课比例',
      '核验转专业限制、保研/升学和奖助政策是否有差异'
    );
    reminder = '这是中外合作办学，不能按普通专业简单理解；重点看收费、培养模式、外方资源和毕业证/学位证口径。';
    parentNote = '分数位置舒服也要先确认家庭预算和培养模式能否接受。';
  } else if (/高收费|较高收费|收费较高|学费较高/.test(text)) {
    types.push('高收费专业');
    riskTags.push('高收费','家庭预算');
    checks.push('核验学费、住宿费、奖助政策和四年总成本');
    reminder = '该专业存在高收费线索，不能只看分数位置，还要先确认家庭预算和培养安排。';
    parentNote = '先算清四年成本和家庭承受力，再决定是否保留。';
  } else if (/联合培养|协同培养|校企合作|产业学院|订单班|定向培养/.test(text)) {
    types.push('联合/校企项目');
    riskTags.push('培养模式','就业约束');
    checks.push('核验培养地点、培养单位、证书口径和协议约束');
    reminder = '该专业存在联合培养或校企合作线索，要重点看培养地点、企业参与和证书口径。';
    parentNote = '不要只看学校名，要先确认实际在哪里学、跟谁学。';
  }

  return types.length ? { hasSpecial: true, types, primaryType: types[0], reminder, checks, parentNote, riskTags } : null;
}

function renderSpecialProgram(payload, record) {
  const d = payload?.diagnosis || {};
  const sp = detectSpecialProgramClient(record, d);
  if (!sp?.hasSpecial) return '';

  const label = (sp.types || [sp.primaryType]).filter(Boolean).join(' / ');
  const tags = Array.isArray(sp.riskTags) ? sp.riskTags.filter(Boolean).slice(0, 4) : [];

  return `
    <div class="diagnose-section diagnose-special-section">
      <strong>特殊项目提醒：${esc(label)}</strong>
      <p>${esc(sp.reminder || '该条存在特殊项目线索，需按项目规则单独核验。')}</p>
      ${tags.length ? `<div class="diagnose-special-tags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
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
      items.push(`背景线索：${family}有相关学科线索（${matched.slice(0, 3).map(shortDiscipline).filter(Boolean).join('、')}），仍需结合学院和培养方案核验。`);
    } else if (da.strongDirections) {
      items.push(`学校方向线索：${da.strongDirections}`);
      items.push(`${family}暂未形成明确本科专业对应，需核验学院、培养方案和就业质量报告。`);
    } else if (da.highestRating) {
      items.push(`学科评估线索：第四轮最高评级 ${da.highestRating}`);
      items.push(`${family}需结合学院、培养方案和就业质量报告核验。`);
    }
  }

  const industries = Array.isArray(school.industrySignals) ? school.industrySignals.filter(Boolean) : [];
  const relatedIndustries = industries.filter(x => families.includes(x));
  if (relatedIndustries.length) {
    items.push(`学校行业方向线索：${relatedIndustries.slice(0, 2).join(' / ')}，仍需结合官方材料核验。`);
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
      <strong>背景线索</strong>
      <ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
      <div class="diagnose-kb-note">注：学校层面线索不等于当前本科专业结论；学科评估只能作为复核线索。</div>
    </div>
  `;
}


export function renderDiagnoseResult(record, payload) {
  openDiagnoseModal(record);
  const root = body();
  if (!root) return;

  const d = payload?.diagnosis || {};
  const sourceMap = {
    'rules-only': '基础解读',
    'rules-only-quota': '暂用基础解读',
    'rules-only-error': '暂用基础解读',
    'workers-ai': '方案解读'
  };
  const source = sourceMap[payload?.source] || '方案解读';
  const quotaNote = payload?.source === 'rules-only-quota'
    ? '<div class="diagnose-quota-note">当前暂用基础解读，仍可先做专业和项目复核。</div>'
    : '';

  root.innerHTML = `
    <div class="diagnose-box">
      <div class="diagnose-head">
        <span class="diagnose-title">单条说明</span>
        <span class="diagnose-source">${source}</span>
      </div>
      <div class="diagnose-summary">${esc(d.summary || '暂无诊断')}</div>\n      ${quotaNote}

      <div class="diagnose-section">
        <strong>主要依据</strong>
        ${list(d.basis)}
      </div>

      ${renderKbEvidence(payload, record)}

      ${renderSpecialProgram(payload, record)}

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
      <div class="diagnose-disclaimer">${esc(d.disclaimer || '仅作专业卡片解释，不等同于录取判断。')}</div>
    </div>
  `;
}
