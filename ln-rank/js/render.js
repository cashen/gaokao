(function () {
  'use strict';

  function qs(selector) { return document.querySelector(selector); }
  function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }

  function renderQuickDeltas(data, onSelect) {
    const wrap = qs('#quickDeltas');
    wrap.innerHTML = data.quickDeltas.map((delta) => `<button type="button" class="delta-btn" data-delta="${delta}">+${delta}</button>`).join('');
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-delta]');
      if (!btn) return;
      onSelect(Number(btn.dataset.delta));
    });
  }

  function renderHeatOptions(data, currentHeat, onSelect) {
    const wrap = qs('#heatOptions');
    wrap.innerHTML = Object.entries(data.heatAdjust).map(([key, item]) => {
      const active = key === currentHeat ? ' is-active' : '';
      return `<button type="button" class="heat-btn${active}" data-heat="${key}" aria-pressed="${key === currentHeat}"><strong>${item.label}</strong><span>${item.note}</span></button>`;
    }).join('');
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-heat]');
      if (!btn) return;
      onSelect(btn.dataset.heat);
    });
  }

  function syncSubjectButtons(subjectKey) {
    qsa('[data-subject]').forEach((btn) => {
      const active = btn.dataset.subject === subjectKey;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function syncHeatButtons(heatKey) {
    qsa('[data-heat]').forEach((btn) => {
      const active = btn.dataset.heat === heatKey;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function syncDeltaButtons(delta) {
    qsa('[data-delta]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.delta) === Number(delta));
    });
  }

  function updateSubjectBounds(data, state) {
    const subject = data.subjects[state.subjectKey];
    const scoreInput = qs('#scoreInput');
    const scoreRange = qs('#scoreRange');
    scoreInput.min = subject.scoreMin;
    scoreInput.max = subject.scoreMax;
    scoreRange.min = subject.scoreMin;
    scoreRange.max = subject.scoreMax;
  }

  function renderResult(data, state, result, compareRows, narrative) {
    const fmt = window.ScoreCalc.formatNumber;
    qs('#crossPeople').textContent = fmt(result.crossPeople);
    qs('#currentScoreText').textContent = result.currentScore;
    qs('#targetScoreText').textContent = result.targetScore;
    qs('#currentRankText').textContent = fmt(result.currentRank);
    qs('#targetRankText').textContent = fmt(result.targetRank);
    qs('#densityText').textContent = result.delta > 0 ? `约 ${fmt(result.densityPerPoint)} 名/分` : '—';
    qs('#dataStatusText').textContent = result.currentRow.filled || result.targetRow.filled ? '含 0 人补齐分' : '精确分数点';

    const badge = qs('#levelBadge');
    badge.textContent = result.level.text.name;
    badge.dataset.level = result.level.key;
    qs('#levelShort').textContent = result.level.text.short;
    qs('#levelAdvice').textContent = result.level.text.advice;

    const clampHint = qs('#clampHint');
    if (result.targetClamped) {
      clampHint.hidden = false;
      clampHint.textContent = `参考分超过 ${result.subjectLabel} 统计表范围，已按 ${result.targetScore} 分计算。`;
    } else if (result.inputClamped) {
      clampHint.hidden = false;
      clampHint.textContent = `当前分超出 ${result.subjectLabel} 统计表范围，已按 ${result.currentScore} 分计算。`;
    } else if (result.currentRow.filled || result.targetRow.filled) {
      clampHint.hidden = false;
      clampHint.textContent = '有些分数在统计表中人数为 0，系统已按累计位次连续规则补齐。';
    } else {
      clampHint.hidden = true;
      clampHint.textContent = '';
    }

    qs('#compareBody').innerHTML = compareRows.map((row) => {
      return `<tr><td>+${row.delta}</td><td>${row.targetScore}</td><td>约 ${fmt(row.crossPeople)} 名</td><td>${row.level.text.name}</td></tr>`;
    }).join('');

    qs('#narrativeText').textContent = narrative;
    syncSubjectButtons(state.subjectKey);
    syncHeatButtons(state.heatKey);
    syncDeltaButtons(state.delta);
  }

  window.ScoreRender = {
    qs,
    qsa,
    renderQuickDeltas,
    renderHeatOptions,
    syncSubjectButtons,
    syncHeatButtons,
    syncDeltaButtons,
    updateSubjectBounds,
    renderResult
  };
})();
