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
      explicit.set(Number(score), { score: Number(score), people: Number(people), cumulative: Number(cumulative), filled: false });
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
      return { key: 'match', index: 1, text: data.levelText.match, heat: data.heatAdjust[heatKey] || data.heatAdjust.normal };
    }

    const diffRule = findRuleByAbsDiff(data, direction, absDiff);
    const peopleRule = findRuleByPeople(data, subjectKey, direction, peopleChange);
    let index = Math.max(diffRule.index, peopleRule.index);

    if (direction === 'up') index = applyHeatToUpIndex(data, index, heatKey, absDiff);

    const levels = direction === 'up' ? UP_LEVELS : DOWN_LEVELS;
    const key = levels[clamp(index, 1, levels.length) - 1];
    return { key, index, text: data.levelText[key], heat: data.heatAdjust[heatKey] || data.heatAdjust.normal };
  }

  function calcGradient(data, state) {
    const subject = data.subjects[state.subjectKey];
    const currentYearData = subject.years[state.currentYear];
    const baseYearData = subject.years[state.baseYear];

    const currentScore = clamp(normalizeNumber(state.currentScore, currentYearData.defaultScore), currentYearData.scoreMin, currentYearData.scoreMax);
    const referenceScore = clamp(normalizeNumber(state.referenceScore, baseYearData.defaultScore), baseYearData.scoreMin, baseYearData.scoreMax);

    const currentRow = getScoreRow(currentYearData, currentScore);
    const equivalentRow = state.currentYear === state.baseYear
      ? getScoreRow(baseYearData, currentScore)
      : getEquivalentScoreByRank(baseYearData, currentRow.cumulative);
    const referenceRow = getScoreRow(baseYearData, referenceScore);

    const equivalentScore = equivalentRow.score;
    const sameYearDiff = referenceScore - equivalentScore;
    const direction = sameYearDiff > 0 ? 'up' : sameYearDiff < 0 ? 'down' : 'same';
    const peopleChange = direction === 'up'
      ? Math.max(0, equivalentRow.cumulative - referenceRow.cumulative)
      : direction === 'down'
        ? Math.max(0, referenceRow.cumulative - equivalentRow.cumulative)
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
      referenceScore,
      currentRow,
      equivalentRow,
      referenceRow,
      currentRank: currentRow.cumulative,
      equivalentScore,
      equivalentRank: equivalentRow.cumulative,
      referenceRank: referenceRow.cumulative,
      sameYearDiff,
      direction,
      peopleChange,
      densityPerPoint: absDiff > 0 ? Math.round(peopleChange / absDiff) : 0,
      currentClamped: normalizeNumber(state.currentScore, currentYearData.defaultScore) !== currentScore,
      referenceClamped: normalizeNumber(state.referenceScore, baseYearData.defaultScore) !== referenceScore,
      hasFilled: currentRow.filled || equivalentRow.filled || referenceRow.filled,
      isEquivalentMode: state.currentYear !== state.baseYear,
      level
    };
  }

  function makeCompareRows(data, state) {
    const baseYearData = data.subjects[state.subjectKey].years[state.baseYear];
    const base = calcGradient(data, state).equivalentScore;
    return data.quickDiffs.map((diff) => {
      const referenceScore = clamp(base + diff, baseYearData.scoreMin, baseYearData.scoreMax);
      return calcGradient(data, { ...state, referenceScore });
    });
  }

  function makeNarrative(result) {
    const fmt = formatNumber;
    const heat = result.level.heat;

    const scoreLine = `按当前数据口径，考生分数 ${result.currentScore} 分，对应位次参考约 ${fmt(result.equivalentRank)} 名；目标分数 ${result.referenceScore} 分，对应目标位次约 ${fmt(result.referenceRank)} 名。`;

    let relation;
    if (result.direction === 'up') {
      relation = `两者之间的分差参考为 ${signed(result.sameYearDiff)} 分，位次跨度约 ${fmt(result.peopleChange)} 名。`;
    } else if (result.direction === 'down') {
      relation = `两者之间的分差参考为 ${signed(result.sameYearDiff)} 分，位次余量约 ${fmt(result.peopleChange)} 名。`;
    } else {
      relation = '两者位置比较接近，分差参考为 0 分。';
    }

    return [
      scoreLine,
      relation,
      '',
      `当前判断为“${result.level.text.name}”。${result.level.text.short}${result.level.text.advice}`,
      '',
      `专业热度参考为“${heat.label}”。${heat.note}`,
      '',
      '这个结果不代表能否录取，只用于理解位次变化和志愿梯度。实际填报还需要结合院校专业、往年录取位次、选科要求和招生计划变化。'
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
