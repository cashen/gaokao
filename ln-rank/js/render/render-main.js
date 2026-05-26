(function () {
  'use strict';

  function qs(selector) { return document.querySelector(selector); }
  function qsa(selector) { return Array.from(document.querySelectorAll(selector)); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s]));
  }

  function syncSubjectButtons(subjectKey) {
    qsa('[data-subject]').forEach((btn) => {
      const active = btn.dataset.subject === subjectKey;
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
    qs('#targetScoreRange').min = baseYearData.scoreMin;
    qs('#targetScoreRange').max = baseYearData.scoreMax;
  }

  function renderQuickDiffs(data, onSelect) {
    const wrap = qs('#quickDiffs');
    if (!wrap) return;
    const visible = [-50, -30, -10, 10, 30, 50];
    wrap.innerHTML = visible.map((diff) => {
      const label = diff > 0 ? `+${diff}` : String(diff);
      const sign = diff > 0 ? 'up' : 'down';
      return `<button type="button" class="diff-btn" data-diff="${diff}" data-sign="${sign}">${label}</button>`;
    }).join('');
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-diff]');
      if (!btn) return;
      onSelect(Number(btn.dataset.diff));
    });
  }

  function getChangeTitle(result) {
    if (result.direction === 'up') return '位次跨度';
    if (result.direction === 'down') return '位次余量';
    return '位次接近';
  }

  function getChangeExplain(result) {
    if (result.direction === 'up') return '这个目标比当前位置高一些，下面显示两者之间的位次跨度。';
    if (result.direction === 'down') return '这个目标低于当前位置，下面显示当前分数相对它的位次余量。';
    return '这个目标和当前位置比较接近，适合放在主体讨论区间。';
  }

  function getNearbyExplain(result) {
    if (!result.targetNearby || !result.targetNearby.current) return '用于理解目标分所在分段附近是否集中。';
    const people = result.targetNearby.current.people;
    if (people >= 2000) return '目标分附近人数较集中，几分之间的位次变化会比较明显。';
    if (people >= 800) return '目标分附近有一定人数集中，建议结合位次跨度一起看。';
    return '目标分附近人数相对较少，但仍要结合专业方向和往年位次判断。';
  }

  function renderResult(data, state, result) {
    const fmt = window.ScoreCalc.formatNumber;
    const signed = window.ScoreCalc.signed;
    const ui = window.LNRankUIText;
    const level = ui.levels[result.level.key];

    const app = qs('#app');
    if (app) {
      app.className = app.className.replace(/\blevel-\S+/g, '').trim();
      app.classList.add(`level-${result.level.key}`);
    }

    qs('#levelName').textContent = level.name;
    qs('#positionText').textContent = `适合位置：${level.position}`;
    qs('#changeTitle').textContent = getChangeTitle(result);
    qs('#changePeople').textContent = fmt(result.peopleChange);
    qs('#changeExplain').textContent = getChangeExplain(result);

    if (qs('#targetNearbyText') && result.targetNearby && result.targetNearby.current) {
      qs('#targetNearbyText').textContent = `${result.targetNearby.current.label} 分段约 ${fmt(result.targetNearby.current.people)} 人`;
      qs('#targetNearbyExplain').textContent = getNearbyExplain(result);
    }

    qs('#currentScoreText').textContent = `${result.currentScore} 分`;
    qs('#targetScoreText').textContent = `${result.targetScore} 分`;
    qs('#diffText').textContent = `${signed(result.sameYearDiff)} 分`;
    qs('#adviceText').textContent = level.advice;
    qs('#majorSummary').textContent = data.heatAdjust[state.heatKey].label;

    const dataHint = qs('#dataHint');
    if (result.currentClamped || result.targetClamped) {
      dataHint.hidden = false;
      dataHint.textContent = '有输入分数超出统计范围，系统已按可用边界计算。';
    } else if (result.inputRounded) {
      dataHint.hidden = false;
      dataHint.textContent = '高考分数按整数处理，系统已按最接近的整数分计算。';
    } else if (result.hasFilled) {
      dataHint.hidden = false;
      dataHint.textContent = '个别分数在统计表中人数为 0，系统按累计位次连续规则补齐。';
    } else {
      dataHint.hidden = true;
      dataHint.textContent = '';
    }

    syncSubjectButtons(state.subjectKey);
    syncDiffButtons(result.sameYearDiff);
  }

  function renderRuntimeError(message, detail) {
    const el = qs('#runtimeError');
    if (!el) return;
    el.hidden = false;
    el.innerHTML = '<strong>页面脚本没有正常完成初始化。</strong><br>' +
      escapeHtml(message) +
      (detail ? '<br><small>' + escapeHtml(detail) + '</small>' : '') +
      '<br><small>请确认 data、js、css 三个目录已完整上传，并清理浏览器或 CDN 缓存。</small>';
  }

  window.ScoreRender = {
    qs,
    qsa,
    escapeHtml,
    renderQuickDiffs,
    updateBounds,
    renderResult,
    renderRuntimeError,
    syncSubjectButtons,
    syncDiffButtons
  };
})();
