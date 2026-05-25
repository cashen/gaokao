(function () {
  'use strict';

  const LEVEL_ORDER = ['close', 'mild', 'active', 'high', 'explore'];

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

  function buildDenseRows(subject) {
    const explicit = new Map();
    subject.rows.forEach(([score, people, cumulative]) => {
      explicit.set(Number(score), { score: Number(score), people: Number(people), cumulative: Number(cumulative), filled: false });
    });

    let lastCumulative = 0;
    const map = {};
    for (let score = subject.scoreMax; score >= subject.scoreMin; score -= 1) {
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
    Object.keys(data.subjects).forEach((key) => {
      const subject = data.subjects[key];
      subject.scoreMap = buildDenseRows(subject);
    });
    return data;
  }

  function getScoreRow(data, subjectKey, scoreInput) {
    const subject = data.subjects[subjectKey];
    const safeScore = clamp(normalizeNumber(scoreInput, subject.defaultScore), subject.scoreMin, subject.scoreMax);
    return subject.scoreMap[String(safeScore)];
  }

  function findBaseLevel(data, subjectKey, crossPeople) {
    const rules = data.riskRules[subjectKey];
    return rules.find((rule) => crossPeople <= rule.maxCross) || rules[rules.length - 1];
  }

  function adjustLevel(data, baseRule, heatKey, delta) {
    const heat = data.heatAdjust[heatKey] || data.heatAdjust.normal;
    let index = baseRule.index + heat.adjust;

    // 业务底线：大幅上探即使遇到相对冷门，也不应被文案降成过于轻松。
    if (delta >= 50) index = Math.max(index, 4);
    else if (delta >= 30) index = Math.max(index, 3);

    index = clamp(index, 1, LEVEL_ORDER.length);
    const key = LEVEL_ORDER[index - 1];
    return { key, index, text: data.levelText[key], heat };
  }

  function calcSpan(data, subjectKey, scoreInput, deltaInput, heatKey) {
    const subject = data.subjects[subjectKey];
    const currentScore = clamp(normalizeNumber(scoreInput, subject.defaultScore), subject.scoreMin, subject.scoreMax);
    const delta = clamp(normalizeNumber(deltaInput, data.delta.default), data.delta.min, data.delta.max);
    const rawTargetScore = currentScore + delta;
    const targetScore = clamp(rawTargetScore, subject.scoreMin, subject.scoreMax);
    const currentRow = getScoreRow(data, subjectKey, currentScore);
    const targetRow = getScoreRow(data, subjectKey, targetScore);
    const crossPeople = Math.max(0, currentRow.cumulative - targetRow.cumulative);
    const baseRule = findBaseLevel(data, subjectKey, crossPeople);
    const level = adjustLevel(data, baseRule, heatKey, delta);

    return {
      subjectKey,
      subjectLabel: subject.label,
      parentLabel: subject.parentLabel,
      currentScore,
      targetScore,
      rawTargetScore,
      delta,
      currentRow,
      targetRow,
      currentRank: currentRow.cumulative,
      targetRank: targetRow.cumulative,
      crossPeople,
      densityPerPoint: delta > 0 ? Math.round(crossPeople / delta) : 0,
      targetClamped: rawTargetScore !== targetScore,
      inputClamped: normalizeNumber(scoreInput, subject.defaultScore) !== currentScore,
      level
    };
  }

  function makeCompareRows(data, subjectKey, scoreInput, heatKey) {
    return data.quickDeltas.map((delta) => calcSpan(data, subjectKey, scoreInput, delta, heatKey));
  }

  function makeNarrative(result) {
    const heat = result.level.heat;
    return [
      `按辽宁 ${result.subjectLabel} ${result.currentScore} 分计算，如果参考 ${result.targetScore} 分附近的目标，两者之间的累计位次差约为 ${formatNumber(result.crossPeople)} 名。`,
      '',
      `${result.level.text.short}${result.level.text.advice}`,
      '',
      `当前选择的专业热度为“${heat.label}”。${heat.note}`,
      '',
      '这个结果不代表能否录取，只用于理解上探幅度和志愿梯度。实际填报还需要结合院校专业、往年录取位次、选科要求和招生计划变化。'
    ].join('\n');
  }

  window.ScoreCalc = {
    prepareData,
    calcSpan,
    makeCompareRows,
    makeNarrative,
    formatNumber,
    clamp,
    normalizeNumber
  };
})();
