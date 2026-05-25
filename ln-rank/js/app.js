(function () {
  'use strict';

  const data = window.ScoreCalc.prepareData(window.LN2025_SCORE_RANK);
  const R = window.ScoreRender;
  const C = window.ScoreCalc;

  const state = {
    subjectKey: 'physics',
    heatKey: 'normal',
    score: data.subjects.physics.defaultScore,
    delta: data.delta.default
  };

  const scoreInput = R.qs('#scoreInput');
  const scoreRange = R.qs('#scoreRange');
  const deltaInput = R.qs('#deltaInput');
  const deltaRange = R.qs('#deltaRange');
  const copyBtn = R.qs('#copyBtn');

  function setScore(value) {
    const subject = data.subjects[state.subjectKey];
    state.score = C.clamp(C.normalizeNumber(value, subject.defaultScore), subject.scoreMin, subject.scoreMax);
    scoreInput.value = state.score;
    scoreRange.value = state.score;
    update();
  }

  function setDelta(value) {
    state.delta = C.clamp(C.normalizeNumber(value, data.delta.default), data.delta.min, data.delta.max);
    deltaInput.value = state.delta;
    deltaRange.value = state.delta;
    update();
  }

  function setSubject(subjectKey) {
    state.subjectKey = subjectKey;
    const subject = data.subjects[subjectKey];
    R.updateSubjectBounds(data, state);
    state.score = C.clamp(state.score, subject.scoreMin, subject.scoreMax);
    scoreInput.value = state.score;
    scoreRange.value = state.score;
    update();
  }

  function setHeat(heatKey) {
    state.heatKey = heatKey;
    update();
  }

  function update() {
    const result = C.calcSpan(data, state.subjectKey, state.score, state.delta, state.heatKey);
    const compareRows = C.makeCompareRows(data, state.subjectKey, state.score, state.heatKey);
    const narrative = C.makeNarrative(result);
    R.renderResult(data, state, result, compareRows, narrative);
  }

  R.renderQuickDeltas(data, setDelta);
  R.renderHeatOptions(data, state.heatKey, setHeat);
  R.qsa('[data-subject]').forEach((btn) => btn.addEventListener('click', () => setSubject(btn.dataset.subject)));

  scoreInput.addEventListener('input', (event) => setScore(event.target.value));
  scoreRange.addEventListener('input', (event) => setScore(event.target.value));
  deltaInput.addEventListener('input', (event) => setDelta(event.target.value));
  deltaRange.addEventListener('input', (event) => setDelta(event.target.value));

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

  R.updateSubjectBounds(data, state);
  setScore(state.score);
  setDelta(state.delta);
})();
