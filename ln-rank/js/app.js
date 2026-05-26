(function () {
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
    R.renderYearSelectors(data, state, setYear);
    R.updateBounds(data, state);
    setCurrentScore(state.currentScore);
    setReferenceScore(state.referenceScore);
  }

  function setYear(kind, year) {
    if (kind === 'currentYear') state.currentYear = year;
    if (kind === 'baseYear') state.baseYear = year;
    ensureAvailableYears();
    R.renderYearSelectors(data, state, setYear);
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

  R.renderYearSelectors(data, state, setYear);
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
})();
