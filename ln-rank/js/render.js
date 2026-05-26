(function () {
  'use strict';

  function qs(selector) { return document.querySelector(selector); }
  function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }

  function renderYearSelectors(data, state, onChange) {
    const subject = data.subjects[state.subjectKey];
    const current = qs('#currentYearSelect');
    const base = qs('#baseYearSelect');
    if (!current || !base) return;
    const makeOption = (year, yearData) => {
      const disabled = yearData.unavailable ? ' disabled' : '';
      return `<option value="${year}"${disabled}>${yearData.label}</option>`;
    };
    const html = Object.entries(subject.years).map(([year, yearData]) => makeOption(year, yearData)).join('');
    current.innerHTML = html;
    base.innerHTML = html;
    current.value = state.currentYear;
    base.value = state.baseYear;
    current.onchange = () => onChange('currentYear', current.value);
    base.onchange = () => onChange('baseYear', base.value);
  }

  function renderQuickDiffs(data, onSelect) {
    const wrap = qs('#quickDiffs');
    wrap.innerHTML = data.quickDiffs.map((diff) => {
      const label = diff > 0 ? `+${diff}` : String(diff);
      const sign = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
      return `<button type="button" class="diff-btn" data-diff="${diff}" data-sign="${sign}">${label}</button>`;
    }).join('');
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-diff]');
      if (!btn) return;
      onSelect(Number(btn.dataset.diff));
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

  function syncDiffButtons(diff) {
    qsa('[data-diff]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.diff) === Number(diff));
    });
  }

  function updateBounds(data, state) {
    const subject = data.subjects[state.subjectKey];
    const currentYearData = subject.years[state.currentYear];
    const baseYearData = subject.years[state.baseYear];
    qs('#currentScoreRange').min = currentYearData.scoreMin;
    qs('#currentScoreRange').max = currentYearData.scoreMax;
    qs('#referenceScoreRange').min = baseYearData.scoreMin;
    qs('#referenceScoreRange').max = baseYearData.scoreMax;
  }

  function renderModeNote(result) {
    // v3.3 起，年份和折算逻辑属于内部计算口径，不在家长界面展示。
  }

  function renderResult(data, state, result, compareRows, narrative) {
    const fmt = window.ScoreCalc.formatNumber;
    const signed = window.ScoreCalc.signed;
    const currentScoreLabel = qs('#currentScoreLabel');
    const referenceScoreLabel = qs('#referenceScoreLabel');
    if (currentScoreLabel) currentScoreLabel.textContent = '考生分数';
    if (referenceScoreLabel) referenceScoreLabel.textContent = '目标分数';
    const directionText = result.direction === 'up' ? '上探参考' : result.direction === 'down' ? '下探参考' : '位置接近';
    const title = result.direction === 'down' ? '位次余量' : result.direction === 'up' ? '位次跨度' : '位次接近';
    const explain = result.direction === 'down'
      ? '考生分数相对目标分数，对应的累计位次余量。'
      : result.direction === 'up'
        ? '考生分数到目标分数之间，对应的累计位次跨度。'
        : '考生分数和目标分数比较接近。';

    qs('#directionLabel').textContent = directionText;
    qs('#changeTitle').textContent = title;
    qs('#changeExplain').textContent = explain;
    qs('#changePeople').textContent = fmt(result.peopleChange);
    qs('#currentScoreText').textContent = `${result.currentScore} 分`;
    qs('#currentRankText').textContent = `约 ${fmt(result.equivalentRank)} 名`;
    qs('#equivalentScoreText').textContent = data.heatAdjust[state.heatKey].label;
    qs('#sameYearDiffText').textContent = `${signed(result.sameYearDiff)} 分`;
    qs('#referenceScoreText').textContent = `${result.referenceScore} 分`;
    qs('#referenceRankText').textContent = `约 ${fmt(result.referenceRank)} 名`;
    qs('#densityText').textContent = Math.abs(result.sameYearDiff) > 0 ? `约 ${fmt(result.densityPerPoint)} 名/分` : '—';
    qs('#dataStatusText').textContent = result.hasFilled ? '含 0 人补齐分' : '精确分数点';

    const badge = qs('#levelBadge');
    badge.textContent = result.level.text.name;
    badge.dataset.level = result.level.key;
    qs('#levelShort').textContent = result.level.text.short;
    qs('#levelAdvice').textContent = result.level.text.advice;

    const clampHint = qs('#clampHint');
    if (result.currentClamped || result.referenceClamped) {
      clampHint.hidden = false;
      clampHint.textContent = '有输入分数超出统计表范围，系统已按可用范围边界计算。';
    } else if (result.hasFilled) {
      clampHint.hidden = false;
      clampHint.textContent = '有些分数在统计表中人数为 0，系统已按累计位次连续规则补齐。';
    } else {
      clampHint.hidden = true;
      clampHint.textContent = '';
    }

    qs('#compareBody').innerHTML = compareRows.map((row) => {
      const changeLabel = row.direction === 'up' ? '跨度' : row.direction === 'down' ? '余量' : '接近';
      return `<tr><td>${signed(row.sameYearDiff)}</td><td>${row.referenceScore}</td><td>${changeLabel}约 ${fmt(row.peopleChange)} 名</td><td>${row.level.text.name}</td></tr>`;
    }).join('');

    qs('#narrativeText').textContent = narrative;
    syncSubjectButtons(state.subjectKey);
    syncHeatButtons(state.heatKey);
    syncDiffButtons(result.sameYearDiff);
  }

  window.ScoreRender = {
    qs,
    qsa,
    renderYearSelectors,
    renderQuickDiffs,
    renderHeatOptions,
    syncSubjectButtons,
    syncHeatButtons,
    syncDiffButtons,
    updateBounds,
    renderResult
  };
})();
