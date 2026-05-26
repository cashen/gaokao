(function () {
  'use strict';

  try {
    if (!window.GAOKAO_RANK_DATA) throw new Error('数据文件未加载：data/gaokao-rank-data.js');
    if (!window.LNRankUIText) throw new Error('文案配置未加载：js/config/ui-text.js');
    if (!window.ScoreCalc) throw new Error('计算脚本未加载：js/calc/rank-calc.js');
    if (!window.ScoreRender) throw new Error('渲染脚本未加载：js/render/render-main.js');
    if (!window.ScoreDrawer) throw new Error('抽屉脚本未加载：js/render/render-drawer.js');

    const C = window.ScoreCalc;
    const R = window.ScoreRender;
    const D = window.ScoreDrawer;
    const data = C.prepareData(window.GAOKAO_RANK_DATA);

    const state = {
      subjectKey: 'physics',
      heatKey: 'normal',
      currentYear: data.meta.currentYearDefault || '2025',
      baseYear: data.meta.baseYearDefault || '2025',
      currentScore: 520,
      targetScore: 550
    };

    const currentScoreInput = R.qs('#currentScoreInput');
    const currentScoreRange = R.qs('#currentScoreRange');
    const targetScoreInput = R.qs('#targetScoreInput');
    const targetScoreRange = R.qs('#targetScoreRange');
    const drawerClose = R.qs('#drawerClose');
    const drawerBackdrop = R.qs('#drawerBackdrop');

    let lastResult = null;
    let lastCompareRows = [];
    let lastNarrative = '';

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

    function update() {
      lastResult = C.calcGradient(data, state);
      lastCompareRows = C.makeCompareRows(data, state);
      lastNarrative = C.makeNarrative(lastResult, window.LNRankUIText);
      R.renderResult(data, state, lastResult);
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

    function setTargetScore(value, options = {}) {
      const yearData = getYearData('base');
      const raw = onlyDigits(value);
      if (options.fromTextInput) {
        targetScoreInput.value = raw;
        if (raw === '') return;
      }
      state.targetScore = C.clamp(C.normalizeNumber(raw, yearData.defaultScore), yearData.scoreMin, yearData.scoreMax);
      targetScoreRange.value = state.targetScore;
      if (!options.fromTextInput) targetScoreInput.value = state.targetScore;
      update();
    }

    function commitCurrentScore() {
      if (currentScoreInput.value.trim() === '') currentScoreInput.value = state.currentScore;
      setCurrentScore(currentScoreInput.value);
    }

    function commitTargetScore() {
      if (targetScoreInput.value.trim() === '') targetScoreInput.value = state.targetScore;
      setTargetScore(targetScoreInput.value);
    }

    function setSubject(subjectKey) {
      state.subjectKey = subjectKey;
      ensureAvailableYears();
      R.updateBounds(data, state);
      setCurrentScore(state.currentScore);
      setTargetScore(state.targetScore);
    }

    function setHeat(heatKey) {
      state.heatKey = heatKey;
      update();
      if (!R.qs('#drawer')?.hidden) {
        D.openDrawer('major', getDrawerContext());
      }
    }

    function setTargetByDiff(diff) {
      const current = C.calcGradient(data, state);
      const baseYearData = getYearData('base');
      const next = C.clamp(current.equivalentScore + diff, baseYearData.scoreMin, baseYearData.scoreMax);
      setTargetScore(next);
    }

    function getDrawerContext() {
      return {
        data,
        state,
        result: lastResult || C.calcGradient(data, state),
        compareRows: lastCompareRows.length ? lastCompareRows : C.makeCompareRows(data, state),
        narrative: lastNarrative || C.makeNarrative(lastResult || C.calcGradient(data, state), window.LNRankUIText)
      };
    }

    function handleDrawerClick(event) {
      const heatBtn = event.target.closest('[data-heat]');
      if (heatBtn) {
        setHeat(heatBtn.dataset.heat);
        return;
      }

      const copyBtn = event.target.closest('#copyNarrativeBtn');
      if (copyBtn) {
        const text = R.qs('#narrativeText')?.textContent.trim() || '';
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '已复制';
          window.setTimeout(() => { copyBtn.textContent = '复制说明'; }, 1300);
        }).catch(() => {
          copyBtn.textContent = '请手动复制';
          window.setTimeout(() => { copyBtn.textContent = '复制说明'; }, 1600);
        });
      }
    }

    R.renderQuickDiffs(data, setTargetByDiff);
    R.qsa('[data-subject]').forEach((btn) => btn.addEventListener('click', () => setSubject(btn.dataset.subject)));
    R.qsa('[data-drawer]').forEach((btn) => btn.addEventListener('click', () => D.openDrawer(btn.dataset.drawer, getDrawerContext())));

    currentScoreInput.addEventListener('input', (event) => setCurrentScore(event.target.value, { fromTextInput: true }));
    currentScoreInput.addEventListener('change', commitCurrentScore);
    currentScoreInput.addEventListener('blur', commitCurrentScore);
    currentScoreRange.addEventListener('input', (event) => setCurrentScore(event.target.value));

    targetScoreInput.addEventListener('input', (event) => setTargetScore(event.target.value, { fromTextInput: true }));
    targetScoreInput.addEventListener('change', commitTargetScore);
    targetScoreInput.addEventListener('blur', commitTargetScore);
    targetScoreRange.addEventListener('input', (event) => setTargetScore(event.target.value));

    drawerClose.addEventListener('click', D.closeDrawer);
    drawerBackdrop.addEventListener('click', D.closeDrawer);
    R.qs('#drawerBody').addEventListener('click', handleDrawerClick);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') D.closeDrawer();
    });

    ensureAvailableYears();
    R.updateBounds(data, state);
    setCurrentScore(state.currentScore);
    setTargetScore(state.targetScore);
  } catch (error) {
    console.error('[ln-rank v3.5]', error);
    if (window.ScoreRender) {
      window.ScoreRender.renderRuntimeError('请检查部署目录是否完整，尤其是 data、js、css 三个目录。', error && (error.stack || error.message));
    }
  }
})();
