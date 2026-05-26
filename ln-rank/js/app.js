(function () {
  'use strict';

  function showRuntimeError(message, detail) {
    var el = document.getElementById('runtimeError');
    if (!el) return;
    el.hidden = false;
    el.innerHTML = '<strong>页面脚本没有正常完成初始化。</strong><br>' +
      message +
      (detail ? '<br><small>' + String(detail).replace(/[<>&]/g, function (s) { return {'<':'&lt;','>':'&gt;','&':'&amp;'}[s]; }) + '</small>' : '') +
      '<br><small>请确认 data/gaokao-rank-data.js、js/calc.js、js/render.js、js/app.js 都已上传，并清理浏览器/CDN缓存。</small>';
  }

  try {
    if (!window.GAOKAO_RANK_DATA) throw new Error('数据文件未加载：data/gaokao-rank-data.js');
    if (!window.ScoreCalc) throw new Error('计算脚本未加载：js/calc.js');
    if (!window.ScoreRender) throw new Error('渲染脚本未加载：js/render.js');

  'use strict';

  const data = window.ScoreCalc.prepareData(window.GAOKAO_RANK_DATA);
  const R = window.ScoreRender;
  const C = window.ScoreCalc;

  const state = {
    subjectKey: 'physics',
    heatKey: 'normal',
    currentYear: data.meta.currentYearDefault || '2025',
    baseYear: data.meta.baseYearDefault || '2025',
    currentScore: 520,
    referenceScore: 550
  };

  const currentScoreInput = R.qs('#currentScoreInput');
  const currentScoreRange = R.qs('#currentScoreRange');
  const referenceScoreInput = R.qs('#referenceScoreInput');
  const referenceScoreRange = R.qs('#referenceScoreRange');
  const copyBtn = R.qs('#copyBtn');

  function onlyDigits(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function getYearData(kind) {
    const subject = data.subjects[state.subjectKey];
    return subject.years[kind === 'current' ? state.currentYear : state.baseYear];
  }

  function ensureAvailableYears() {
    const available = C.getAvailableYears(data, state.subjectKey);
    if (!available.includes(state.currentYear)) state.currentYear = available[0];
    if (!available.includes(state.baseYear)) state.baseYear = available[0];
  }

  function setCurrentScore(value, options = {}) {
    const yearData = getYearData('current');
    const raw = onlyDigits(value);
    if (options.fromTextInput) {
      currentScoreInput.value = raw;
      if (raw === '') return;
    }
    state.currentScore = C.clamp(C.normalizeNumber(raw, yearData.defaultScore), yearData.scoreMin, yearData.scoreMax);
    currentScoreRange.value = state.currentScore;
    if (!options.fromTextInput) currentScoreInput.value = state.currentScore;
    update();
  }

  function setReferenceScore(value, options = {}) {
    const yearData = getYearData('base');
    const raw = onlyDigits(value);
    if (options.fromTextInput) {
      referenceScoreInput.value = raw;
      if (raw === '') return;
    }
    state.referenceScore = C.clamp(C.normalizeNumber(raw, yearData.defaultScore), yearData.scoreMin, yearData.scoreMax);
    referenceScoreRange.value = state.referenceScore;
    if (!options.fromTextInput) referenceScoreInput.value = state.referenceScore;
    update();
  }

  function commitCurrentScore() {
    if (currentScoreInput.value.trim() === '') currentScoreInput.value = state.currentScore;
    setCurrentScore(currentScoreInput.value);
  }

  function commitReferenceScore() {
    if (referenceScoreInput.value.trim() === '') referenceScoreInput.value = state.referenceScore;
    setReferenceScore(referenceScoreInput.value);
  }

  function setSubject(subjectKey) {
    state.subjectKey = subjectKey;
    ensureAvailableYears();
    R.updateBounds(data, state);
    setCurrentScore(state.currentScore);
    setReferenceScore(state.referenceScore);
  }


  function setHeat(heatKey) {
    state.heatKey = heatKey;
    update();
  }

  function setReferenceByDiff(diff) {
    const current = C.calcGradient(data, state);
    const baseYearData = getYearData('base');
    const next = C.clamp(current.equivalentScore + diff, baseYearData.scoreMin, baseYearData.scoreMax);
    setReferenceScore(next);
  }

  function update() {
    const result = C.calcGradient(data, state);
    const compareRows = C.makeCompareRows(data, state);
    const narrative = C.makeNarrative(result);
    R.renderResult(data, state, result, compareRows, narrative);
  }

  R.renderQuickDiffs(data, setReferenceByDiff);
  R.renderHeatOptions(data, state.heatKey, setHeat);
  R.qsa('[data-subject]').forEach((btn) => btn.addEventListener('click', () => setSubject(btn.dataset.subject)));

  currentScoreInput.addEventListener('input', (event) => setCurrentScore(event.target.value, { fromTextInput: true }));
  currentScoreInput.addEventListener('change', commitCurrentScore);
  currentScoreInput.addEventListener('blur', commitCurrentScore);
  currentScoreRange.addEventListener('input', (event) => setCurrentScore(event.target.value));

  referenceScoreInput.addEventListener('input', (event) => setReferenceScore(event.target.value, { fromTextInput: true }));
  referenceScoreInput.addEventListener('change', commitReferenceScore);
  referenceScoreInput.addEventListener('blur', commitReferenceScore);
  referenceScoreRange.addEventListener('input', (event) => setReferenceScore(event.target.value));

  copyBtn.addEventListener('click', async () => {
    const text = R.qs('#narrativeText').textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = '已复制';
      setTimeout(() => { copyBtn.textContent = '复制说明'; }, 1300);
    } catch (error) {
      copyBtn.textContent = '请手动复制';
      setTimeout(() => { copyBtn.textContent = '复制说明'; }, 1600);
    }
  });

  ensureAvailableYears();
  R.updateBounds(data, state);
  setCurrentScore(state.currentScore);
  setReferenceScore(state.referenceScore);

  } catch (error) {
    console.error('[ln-rank v3.3]', error);
    showRuntimeError('请检查部署目录是否完整，尤其是 data、js、css 三个目录。', error && (error.stack || error.message));
  }
})();
