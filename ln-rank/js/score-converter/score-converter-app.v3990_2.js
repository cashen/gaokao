import { FAMILY_DECISION_STORAGE } from '../domain/family-decision-contract.v3970_0.js?v=3970_0';

export const SCORE_CONVERTER_APP_VERSION = 'score-converter-app-v3990_2';

const API_URL = '/api/score-equivalence';
const REQUEST_TIMEOUT_MS = 10000;

const elements = {
  form: document.querySelector('#scoreForm'),
  input: document.querySelector('#scoreInput'),
  submit: document.querySelector('#submitButton'),
  error: document.querySelector('#scoreError'),
  loading: document.querySelector('#loadingPanel'),
  empty: document.querySelector('#emptyPanel'),
  result: document.querySelector('#resultPanel'),
  title: document.querySelector('#resultTitle'),
  summary: document.querySelector('#resultSummary'),
  warning: document.querySelector('#resultWarning'),
  comparisonRank: document.querySelector('#comparisonRank'),
  cards: document.querySelector('#yearCards'),
  calculation: document.querySelector('#calculationDetails'),
  sources: document.querySelector('#sourceDetails'),
  reset: document.querySelector('#resetButton'),
  continue: document.querySelector('#continueButton')
};

let activeScore = null;
let requestSequence = 0;

function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function scoreDeltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n) || n === 0) return '与2026参考分相同';
  return `比2026参考分${n > 0 ? '高' : '低'}${Math.abs(n)}分`;
}

function parseInput() {
  const raw = String(elements.input?.value || '').trim();
  if (!raw) return { ok: false, message: '请输入2026参考分数。' };
  if (!/^\d+$/.test(raw)) return { ok: false, message: '一分一段表按整数分数统计，请输入整数分数。' };
  const score = Number(raw);
  if (!Number.isSafeInteger(score) || score < 150 || score > 750) {
    return { ok: false, message: '当前支持查询150至750分。' };
  }
  return { ok: true, score };
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function setLoading(loading) {
  elements.submit.disabled = loading;
  elements.input.disabled = loading;
  elements.submit.textContent = loading ? '正在换算…' : '查看历年同位次';
  elements.loading.hidden = !loading;
  if (loading) {
    elements.empty.hidden = true;
    elements.result.hidden = true;
  }
}

function createText(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function createYearCard(item, options = {}) {
  const card = document.createElement('article');
  card.className = `score-converter-year-card${options.anchor ? ' is-anchor' : ''}`;
  card.dataset.year = String(item.year);

  const head = createText('div', 'score-converter-year-card-head', '');
  head.append(
    createText('span', '', `${item.year}年`),
    createText('strong', '', options.anchor ? '当前输入' : '同位次参考')
  );

  const score = createText('div', 'score-converter-year-score', `${item.score}分`);
  const rank = createText('div', 'score-converter-year-rank', '');
  rank.append(
    createText('span', '', '位次区间'),
    createText('strong', '', `${formatNumber(item.rankStart)}—${formatNumber(item.rankEnd)}`)
  );

  const facts = document.createElement('dl');
  facts.className = 'score-converter-year-facts';
  const pairs = [
    ['同分人数', `${formatNumber(item.sameCount)}人`],
    ['最低位次', formatNumber(item.rankEnd)]
  ];
  for (const [label, value] of pairs) {
    facts.append(createText('dt', '', label), createText('dd', '', value));
  }

  const note = createText('p', 'score-converter-year-note', options.anchor
    ? `本次以最低位次${formatNumber(options.comparisonRank)}作为跨年换算锚点。`
    : `锚点${formatNumber(options.comparisonRank)}落在这个分数区间内；${scoreDeltaText(item.scoreDelta)}。`);

  card.append(head, score, rank, facts, note);
  return card;
}

function renderSources(sources = []) {
  elements.sources.replaceChildren();
  const list = document.createElement('ul');
  list.className = 'score-converter-source-list';
  for (const source of sources) {
    const item = document.createElement('li');
    item.append(createText('strong', '', `${source.year}年`), createText('span', '', source.name));
    if (source.page) {
      const link = document.createElement('a');
      link.href = source.page;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '查看原始来源';
      item.append(link);
    }
    list.append(item);
  }
  elements.sources.append(
    createText('p', '', '所有结果均由对应年度一分一段表逐位次查找，不使用线性插值或模型预测。'),
    list,
    createText('p', 'score-converter-source-boundary', '同位次只用于历史位置对照；正式填报仍需核验当年招生计划、专业组、选科要求、学费、校区和体检限制。')
  );
}

function renderResult(data) {
  const anchor = data.anchor;
  const [year2025, year2024] = data.equivalents;
  activeScore = Number(data.input.score);

  elements.title.textContent = `2026年${data.input.scoreLabel}的最低位次是${formatNumber(anchor.comparisonRank)}`;
  elements.summary.textContent = `按这个位次换算，约对应2025年${year2025.score}分、2024年${year2024.score}分。`;
  elements.comparisonRank.textContent = formatNumber(anchor.comparisonRank);

  if (data.input.isMergedTopRange) {
    elements.warning.hidden = false;
    elements.warning.textContent = `官方表将${data.input.sourceLookupScore}分及以上合并统计，不能区分${data.input.score}分的精确位次。`;
  } else if (data.controls.belowUndergraduate) {
    elements.warning.hidden = false;
    elements.warning.textContent = `该分数低于2026物理类本科控制线${data.controls.undergraduateControlScore}分；本页仍提供位次历史对照。`;
  } else {
    elements.warning.hidden = true;
    elements.warning.textContent = '';
  }

  elements.cards.replaceChildren(
    createYearCard(anchor, { anchor: true, comparisonRank: anchor.comparisonRank }),
    createYearCard(year2025, { comparisonRank: anchor.comparisonRank }),
    createYearCard(year2024, { comparisonRank: anchor.comparisonRank })
  );

  elements.calculation.replaceChildren();
  const steps = document.createElement('ol');
  steps.className = 'score-converter-calculation-list';
  const stepText = [
    `查到2026年${anchor.sourceLookupScore}分共有${formatNumber(anchor.sameCount)}人，位次区间为${formatNumber(anchor.rankStart)}—${formatNumber(anchor.rankEnd)}。`,
    `统一使用该分数的最低位次${formatNumber(anchor.comparisonRank)}作为跨年换算锚点。`,
    `2025年${year2025.score}分和2024年${year2024.score}分的同分位次区间都覆盖该锚点，因此作为同位次参考分。`
  ];
  for (const text of stepText) steps.append(createText('li', '', text));
  elements.calculation.append(steps);
  renderSources(data.sources);

  elements.empty.hidden = true;
  elements.result.hidden = false;
  elements.result.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

async function queryScore(score, { updateUrl = true } = {}) {
  const sequence = ++requestSequence;
  showError('');
  setLoading(true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}?score=${encodeURIComponent(score)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (sequence !== requestSequence) return;
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error?.message || '暂时无法完成换算，请稍后重试。');
    }
    renderResult(data);
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('score', String(score));
      history.replaceState({ score }, '', url);
    }
  } catch (error) {
    if (sequence !== requestSequence) return;
    const message = error?.name === 'AbortError'
      ? '查询超时，请检查网络后重试。'
      : String(error?.message || '暂时无法完成换算，请稍后重试。');
    showError(message);
    elements.empty.hidden = false;
    elements.result.hidden = true;
  } finally {
    clearTimeout(timeout);
    if (sequence === requestSequence) setLoading(false);
  }
}

function onSubmit(event) {
  event.preventDefault();
  const parsed = parseInput();
  if (!parsed.ok) {
    showError(parsed.message);
    elements.input.focus();
    return;
  }
  queryScore(parsed.score);
}

function reset() {
  requestSequence += 1;
  activeScore = null;
  elements.input.disabled = false;
  elements.input.value = '';
  elements.result.hidden = true;
  elements.loading.hidden = true;
  elements.empty.hidden = false;
  showError('');
  const url = new URL(location.href);
  url.searchParams.delete('score');
  history.replaceState({}, '', url);
  elements.input.focus();
  scrollTo({ top: 0, behavior: 'smooth' });
}

function continueToSelection() {
  if (!Number.isFinite(activeScore)) return;
  try {
    localStorage.setItem(FAMILY_DECISION_STORAGE.candidateScore, String(activeScore));
    localStorage.setItem(FAMILY_DECISION_STORAGE.candidateScoreVersion, String(activeScore));
  } catch {
    // Navigation remains useful even when storage is unavailable.
  }
  location.assign('/ln-rank/');
}

function boot() {
  elements.form?.addEventListener('submit', onSubmit);
  elements.reset?.addEventListener('click', reset);
  elements.continue?.addEventListener('click', continueToSelection);
  elements.input?.addEventListener('input', () => {
    elements.input.value = elements.input.value.replace(/\D/g, '').slice(0, 3);
    if (!elements.error.hidden) showError('');
  });

  const score = new URL(location.href).searchParams.get('score');
  if (score && /^\d+$/.test(score)) {
    elements.input.value = score.slice(0, 3);
    const parsed = parseInput();
    if (parsed.ok) queryScore(parsed.score, { updateUrl: false });
  }

  globalThis.__GAOKAO_SCORE_CONVERTER__ = Object.freeze({
    version: SCORE_CONVERTER_APP_VERSION,
    contract: 'score-equivalence-v3990_2',
    sourceYear: 2026,
    targetYears: Object.freeze([2025, 2024])
  });
}

boot();
