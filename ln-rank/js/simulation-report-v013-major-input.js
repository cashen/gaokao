import { MAJOR_CATALOG_2026 } from '../kb/major-understanding/major-catalog-2026.generated.js';
import { createMajorCatalogResolver, normalizeMajorCode } from '../../shared/resources/majors/major-catalog-contract.js';

const STORAGE_KEY = 'gaokao:simulation-report:v002';
const resolver = createMajorCatalogResolver(MAJOR_CATALOG_2026);
const activeRequests = new Map();
const timers = new Map();

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
}

function norm(value) {
  return String(value || '').normalize('NFKC').trim();
}

function rowById(id) {
  return readState()?.volunteers?.find(row => String(row.id) === String(id)) || null;
}

function patchRow(id, patch) {
  const state = readState();
  if (!state?.volunteers) return null;
  const index = state.volunteers.findIndex(row => String(row.id) === String(id));
  if (index < 0) return null;
  state.volunteers[index] = { ...state.volunteers[index], ...patch };
  saveState(state);
  return state.volunteers[index];
}

function patchRowManual(id, patch) {
  const row = rowById(id);
  if (!row) return null;
  return patchRow(id, { manualCheck: { ...(row.manualCheck || {}), ...patch } });
}

function selectedStatus(row) {
  const match = row?.manualCheck?.majorMatch;
  if (match === 'matched') return ['ok', '✓ 已找到该校相关招生记录'];
  if (match === 'mismatch') return ['warn', row.manualCheck?.majorMatchMessage || '⚠ 这所学校暂未找到这个专业'];
  if (match === 'checking') return ['checking', '正在核对这所学校有没有这个专业…'];
  if (match === 'needs-choice') return ['warn', row.manualCheck?.majorMatchMessage || '请从相近专业中选择一个'];
  return null;
}

function findInput(id) {
  return document.querySelector(`.volunteer-card[data-card-id="${CSS.escape(String(id))}"] [data-field="majorCode"]`);
}

function findCard(id) {
  return document.querySelector(`.volunteer-card[data-card-id="${CSS.escape(String(id))}"]`);
}

function ensureUi(id) {
  const card = findCard(id);
  const input = findInput(id);
  if (!card || !input) return null;
  input.placeholder = '输入专业名称或代码';
  let suggestions = card.querySelector('[data-major-suggestions]');
  if (!suggestions) {
    suggestions = document.createElement('div');
    suggestions.className = 'major-input-suggestions';
    suggestions.dataset.majorSuggestions = String(id);
    input.insertAdjacentElement('afterend', suggestions);
  }
  let helper = card.querySelector('[data-major-input-helper]');
  if (!helper) {
    helper = document.createElement('div');
    helper.className = 'major-input-helper';
    helper.dataset.majorInputHelper = String(id);
    const caption = card.querySelector('.major-caption');
    (caption || suggestions).insertAdjacentElement('afterend', helper);
  }
  return { card, input, suggestions, helper };
}

function hideSuggestions(ui) {
  if (!ui) return;
  ui.suggestions.innerHTML = '';
  ui.suggestions.hidden = true;
}

function renderSuggestions(id, query) {
  const ui = ensureUi(id);
  if (!ui) return;
  const value = norm(query);
  if (!value) { hideSuggestions(ui); ui.helper.textContent = '支持输入专业名称或专业代码；写错一点，系统会尽量帮你找。'; ui.helper.dataset.tone = 'neutral'; return; }

  const direct = resolver.findByCode(normalizeMajorCode(value)) || resolver.findByName(value);
  const results = resolver.search(value, { limit: 6 }).map(item => item.item);
  const seen = new Set();
  const ordered = [];
  for (const item of [direct, ...results]) {
    if (!item?.code || seen.has(item.code)) continue;
    seen.add(item.code);
    ordered.push(item);
  }
  if (direct) {
    ui.suggestions.innerHTML = `<button type="button" class="major-suggestion exact" data-major-code="${esc(direct.code)}"><strong>${esc(direct.name)}</strong><span>${esc(direct.code)} · 已识别</span></button>`;
    ui.suggestions.hidden = false;
    ui.helper.textContent = '已识别，可以直接使用这个专业。';
    ui.helper.dataset.tone = 'ok';
    return;
  }
  if (!ordered.length) {
    hideSuggestions(ui);
    ui.helper.textContent = '暂时没有找到相近专业，可以再多写几个字。';
    ui.helper.dataset.tone = 'warn';
    return;
  }
  const best = results[0];
  const label = best?.score >= 0.78 ? '可能是这个专业' : '找到几个相近专业';
  ui.suggestions.innerHTML = `<div class="major-suggestion-label">${label}</div>${ordered.slice(0, 5).map(item => `<button type="button" class="major-suggestion" data-major-code="${esc(item.code)}"><strong>${esc(item.name)}</strong><span>${esc(item.code)}</span></button>`).join('')}`;
  ui.suggestions.hidden = false;
  ui.helper.textContent = '请选择一个具体专业，系统不会替你擅自决定。';
  ui.helper.dataset.tone = 'neutral';
}

function applyMajorSelection(id, item, source = 'user') {
  if (!item?.code || !item?.name) return;
  const ui = ensureUi(id);
  patchRow(id, {
    majorCode: item.code,
    majorName: item.name,
    history: null,
    manualCheck: {
      ...(rowById(id)?.manualCheck || {}),
      majorMatch: 'checking',
      majorMatchMessage: ''
    }
  });
  if (ui) {
    ui.input.value = item.code;
    hideSuggestions(ui);
    ui.helper.textContent = `已识别：${item.name} · ${item.code}${source === 'fuzzy' ? '（根据你的输入帮你匹配）' : ''}`;
    ui.helper.dataset.tone = 'ok';
  }
  verifySchoolMajor(id, item);
}

function clearMajorForTyping(id, value) {
  patchRow(id, {
    majorCode: value,
    majorName: '',
    history: null,
    manualCheck: {
      ...(rowById(id)?.manualCheck || {}),
      majorMatch: value ? 'checking' : '',
      majorMatchMessage: ''
    }
  });
}

function mapHistory(record) {
  const makeYear = year => {
    const score = record?.[`score${year}`];
    const rank = record?.[`rank${year}`];
    if (score == null && rank == null) return null;
    return { score, rank, comparable: true, recordStatus: 'primary-record' };
  };
  return { years: { 2026: makeYear(2026), 2025: makeYear(2025), 2024: makeYear(2024) } };
}

function normalizeSchool(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s·・（）()【】\[\]，,。:：]/g, '');
}

async function verifySchoolMajor(id, item) {
  const row = rowById(id);
  if (!row) return;
  const school = norm(row.school);
  if (!school) {
    patchRowManual(id, { majorMatch: 'major-only', majorMatchMessage: '' });
    paintStatus(id);
    return;
  }
  const requestId = `${id}:${Date.now()}`;
  activeRequests.set(id, requestId);
  patchRowManual(id, { majorMatch: 'checking', majorMatchMessage: '' });
  paintStatus(id);
  try {
    const url = `/api/ai/major-history?major=${encodeURIComponent(item.name)}&schoolKeyword=${encodeURIComponent(school)}&limit=5&offset=0`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!activeRequests.has(id) || activeRequests.get(id) !== requestId) return;
    if (response.status === 409) {
      patchRowManual(id, { majorMatch: 'needs-choice', majorMatchMessage: '这个专业范围太宽，请先选择一个具体专业。' });
      paintStatus(id);
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const records = Array.isArray(payload?.records) ? payload.records : [];
    const targetSchool = normalizeSchool(school);
    const exact = records.find(record => normalizeSchool(record.school) === targetSchool) || records[0];
    if (!exact) {
      patchRow(id, {
        history: null,
        manualCheck: {
          ...(rowById(id)?.manualCheck || {}),
          majorMatch: 'mismatch',
          majorMatchMessage: `⚠ ${school} 暂未找到“${item.name}”的招生记录，请核对学校或专业。`
        }
      });
      paintStatus(id);
      return;
    }
    patchRow(id, {
      history: mapHistory(exact),
      manualCheck: {
        ...(rowById(id)?.manualCheck || {}),
        majorMatch: 'matched',
        majorMatchMessage: ''
      }
    });
    paintStatus(id);
  } catch (error) {
    if (!activeRequests.has(id) || activeRequests.get(id) !== requestId) return;
    patchRowManual(id, { majorMatch: 'needs-check', majorMatchMessage: '暂时无法核对这所学校的招生专业，请稍后再试。' });
    const ui = ensureUi(id);
    if (ui) { ui.helper.textContent = '暂时无法在线核对学校专业，输入本身仍然可以继续保存。'; ui.helper.dataset.tone = 'warn'; }
    paintStatus(id);
  } finally {
    if (activeRequests.get(id) === requestId) activeRequests.delete(id);
  }
}

function paintStatus(id) {
  const card = findCard(id);
  const row = rowById(id);
  if (!card || !row) return;
  const line = card.querySelector('.state-line');
  const result = selectedStatus(row);
  if (!line || !result) return;
  line.classList.remove('complete', 'needs-check', 'incomplete', 'checking');
  line.classList.add(result[0] === 'ok' ? 'complete' : result[0] === 'checking' ? 'checking' : 'needs-check');
  const text = line.querySelector('span:nth-of-type(2)');
  if (text) text.textContent = result[1];
}

function handleMajorInput(event) {
  const input = event.target.closest('[data-field="majorCode"]');
  if (!input) return;
  const id = input.dataset.id;
  const value = norm(input.value);
  clearTimeout(timers.get(id));
  clearMajorForTyping(id, value);
  renderSuggestions(id, value);
  if (!value) return;
  const direct = resolver.findByCode(normalizeMajorCode(value)) || resolver.findByName(value);
  if (direct) {
    applyMajorSelection(id, direct, 'direct');
    return;
  }
  const result = resolver.search(value, { limit: 1 })[0];
  if (result?.score >= 0.82) {
    timers.set(id, setTimeout(() => applyMajorSelection(id, result.item, 'fuzzy'), 650));
  }
  paintStatus(id);
}

function handleSuggestionClick(event) {
  const button = event.target.closest('[data-major-code]');
  if (!button) return;
  const card = button.closest('.volunteer-card');
  if (!card) return;
  const id = card.dataset.cardId;
  const item = resolver.findByCode(button.dataset.majorCode);
  if (!item) return;
  applyMajorSelection(id, item, 'fuzzy');
  event.preventDefault();
}

function handleSchoolInput(event) {
  const input = event.target.closest('[data-field="school"]');
  if (!input) return;
  const id = input.dataset.id;
  const value = norm(input.value);
  const row = rowById(id);
  if (!row) return;
  patchRow(id, {
    school: value,
    majorName: row.majorName || '',
    manualCheck: {
      ...(row.manualCheck || {}),
      majorMatch: row.majorName ? 'checking' : '',
      majorMatchMessage: ''
    }
  });
  if (row.majorName) {
    const item = resolver.findByCode(row.majorCode) || resolver.findByName(row.majorName);
    if (item) verifySchoolMajor(id, item);
  }
}

function ensureAllCards() {
  document.querySelectorAll('.volunteer-card[data-card-id]').forEach(card => {
    const id = card.dataset.cardId;
    ensureUi(id);
    paintStatus(id);
  });
}

function start() {
  const root = document.querySelector('#wbRows');
  if (!root) return;
  document.addEventListener('input', handleMajorInput);
  document.addEventListener('input', handleSchoolInput);
  document.addEventListener('click', handleSuggestionClick);
  ensureAllCards();
  const observer = new MutationObserver(() => requestAnimationFrame(ensureAllCards));
  observer.observe(root, { childList: true, subtree: true });
  setInterval(ensureAllCards, 650);
}

start();
