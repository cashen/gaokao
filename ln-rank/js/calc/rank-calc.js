(function () {
  'use strict';

  const UP_LEVELS = ['match', 'smallRush', 'midRush', 'bigRush', 'superRush'];
  const DOWN_LEVELS = ['match', 'stable', 'superStable', 'safe', 'lowReference'];

  function normalizeNumber(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.trunc(num);
  }

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('zh-CN');
  }

  function signed(value) {
    if (value > 0) return `+${value}`;
    return String(value);
  }

  function buildDenseRows(yearData) {
    const explicit = new Map();
    yearData.rows.forEach(([score, people, cumulative]) => {
      explicit.set(Number(score), {
        score: Number(score),
        people: Number(people),
        cumulative: Number(cumulative),
        filled: false
      });
    });

    let lastCumulative = 0;
    const map = {};
    for (let score = yearData.scoreMax; score >= yearData.scoreMin; score -= 1) {
      if (explicit.has(score)) {
        const row = explicit.get(score);
        lastCumulative = row.cumulative;
        map[String(score)] = row;
      } else {
        map[String(score)] = {
          score,
          people: 0,
          cumulative: lastCumulative,
          filled: true,
          fillReason: '统计表未出现该分数，按 0 人补齐，累计位次沿用上一高分。'
        };
      }
    }
    return map;
  }

  function prepareData(data) {
    Object.values(data.subjects).forEach((subject) => {
      Object.values(subject.years).forEach((yearData) => {
        if (yearData.unavailable || !Array.isArray(yearData.rows) || yearData.rows.length === 0) return;
        yearData.scoreMap = buildDenseRows(yearData);
      });
    });
    return data;
  }

  function getAvailableYears(data, subjectKey) {
    const subject = data.subjects[subjectKey];
    return Object.keys(subject.years).filter((year) => !subject.years[year].unavailable && subject.years[year].scoreMap);
  }

  function getScoreRow(yearData, scoreInput) {
    const safeScore = clamp(normalizeNumber(scoreInput, yearData.defaultScore), yearData.scoreMin, yearData.scoreMax);
    return yearData.scoreMap[String(safeScore)];
  }

  function getEquivalentScoreByRank(baseYearData, rank) {
    const rows = Object.values(baseYearData.scoreMap);
    let best = rows[0];
    for (const row of rows) {
      if (Math.abs(row.cumulative - rank) < Math.abs(best.cumulative - rank)) best = row;
    }
    return best;
  }

  function findRuleByAbsDiff(data, direction, absDiff) {
    const rules = data.diffRules[direction];
    return rules.find((rule) => absDiff <= rule.maxAbsDiff) || rules[rules.length - 1];
  }

  function findRuleByPeople(data, subjectKey, direction, people) {
    const key = direction === 'up' ? 'upRank' : 'downRank';
    const rules = data.levelRules[subjectKey][key];
    return rules.find((rule) => people <= rule.maxPeople) || rules[rules.length - 1];
  }

  function applyHeatToUpIndex(data, index, heatKey, absDiff) {
    const heat = data.heatAdjust[heatKey] || data.heatAdjust.normal;
    let next = index + Number(heat.adjust || 0);
    if (absDiff >= 50) next = Math.max(next, 4);
    else if (absDiff >= 30) next = Math.max(next, 3);
    return clamp(next, 1, UP_LEVELS.length);
  }

  function chooseLevel(data, subjectKey, direction, sameYearDiff, peopleChange, heatKey) {
    const absDiff = Math.abs(sameYearDiff);
    if (absDiff === 0 || direction === 'same') {
      return { key: 'match', index: 1, heat: data.heatAdjust[heatKey] || data.heatAdjust.normal };
    }

    const diffRule = findRuleByAbsDiff(data, direction, absDiff);
    const peopleRule = findRuleByPeople(data, subjectKey, direction, peopleChange);
    let index = Math.max(diffRule.index, peopleRule.index);

    if (direction === 'up') index = applyHeatToUpIndex(data, index, heatKey, absDiff);

    const levels = direction === 'up' ? UP_LEVELS : DOWN_LEVELS;
    const key = levels[clamp(index, 1, levels.length) - 1];
    return { key, index, heat: data.heatAdjust[heatKey] || data.heatAdjust.normal };
  }

  function calcGradient(data, state) {
    const subject = data.subjects[state.subjectKey];
    const currentYearData = subject.years[state.currentYear];
    const baseYearData = subject.years[state.baseYear];

    const currentInput = normalizeNumber(state.currentScore, currentYearData.defaultScore);
    const targetInput = normalizeNumber(state.targetScore, baseYearData.defaultScore);
    const currentScore = clamp(currentInput, currentYearData.scoreMin, currentYearData.scoreMax);
    const targetScore = clamp(targetInput, baseYearData.scoreMin, baseYearData.scoreMax);

    const currentRow = getScoreRow(currentYearData, currentScore);
    const equivalentRow = state.currentYear === state.baseYear
      ? getScoreRow(baseYearData, currentScore)
      : getEquivalentScoreByRank(baseYearData, currentRow.cumulative);
    const targetRow = getScoreRow(baseYearData, targetScore);

    const equivalentScore = equivalentRow.score;
    const sameYearDiff = targetScore - equivalentScore;
    const direction = sameYearDiff > 0 ? 'up' : sameYearDiff < 0 ? 'down' : 'same';
    const peopleChange = direction === 'up'
      ? Math.max(0, equivalentRow.cumulative - targetRow.cumulative)
      : direction === 'down'
        ? Math.max(0, targetRow.cumulative - equivalentRow.cumulative)
        : 0;

    const absDiff = Math.abs(sameYearDiff);
    const level = chooseLevel(data, state.subjectKey, direction, sameYearDiff, peopleChange, state.heatKey);

    return {
      subjectKey: state.subjectKey,
      subjectLabel: subject.label,
      parentLabel: subject.parentLabel,
      currentYear: state.currentYear,
      baseYear: state.baseYear,
      currentScore,
      targetScore,
      currentRow,
      equivalentRow,
      targetRow,
      currentRank: currentRow.cumulative,
      equivalentScore,
      equivalentRank: equivalentRow.cumulative,
      targetRank: targetRow.cumulative,
      sameYearDiff,
      direction,
      peopleChange,
      densityPerPoint: absDiff > 0 ? Math.round(peopleChange / absDiff) : 0,
      currentClamped: currentInput !== currentScore,
      targetClamped: targetInput !== targetScore,
      hasFilled: currentRow.filled || equivalentRow.filled || targetRow.filled,
      isEquivalentMode: state.currentYear !== state.baseYear,
      level
    };
  }

  function makeCompareRows(data, state) {
    const baseYearData = data.subjects[state.subjectKey].years[state.baseYear];
    const base = calcGradient(data, state).equivalentScore;
    return data.quickDiffs.map((diff) => {
      const targetScore = clamp(base + diff, baseYearData.scoreMin, baseYearData.scoreMax);
      return calcGradient(data, { ...state, targetScore });
    });
  }

  function makeNarrative(result, uiText) {
    const level = uiText.levels[result.level.key];
    const relation = result.direction === 'up'
      ? `位次跨度约 ${formatNumber(result.peopleChange)} 名。`
      : result.direction === 'down'
        ? `位次余量约 ${formatNumber(result.peopleChange)} 名。`
        : '位次比较接近。';

    return [
      `考生分数 ${result.currentScore} 分，想看的目标分 ${result.targetScore} 分，分差参考为 ${signed(result.sameYearDiff)} 分。`,
      relation,
      '',
      `这个目标属于“${level.name}”，适合位置：${level.position}。`,
      level.advice,
      '',
      '这个结果用于理解位次关系和志愿梯度，不等同于录取预测。'
    ].join('\n');
  }

  window.ScoreCalc = {
    prepareData,
    getAvailableYears,
    calcGradient,
    makeCompareRows,
    makeNarrative,
    formatNumber,
    signed,
    clamp,
    normalizeNumber
  };
})();
