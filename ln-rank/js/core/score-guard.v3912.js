export function getScoreGuard(score) {
  const n = Number(score);

  if (!Number.isFinite(n) || n <= 0) {
    return {
      key: 'empty',
      level: 'ready',
      canQuery: false,
      buttonText: '输入分数后查看专业',
      statusText: '程序就绪',
      guide: '请先输入考生分数，例如 520。输入后可直接点击按钮查看专业。',
      resultTitle: '等待查看',
      resultBadge: '待输入',
      resultMessage: '请输入考生分数，选择地域、学校或专业后，点击查看符合条件的专业。'
    };
  }

  if (n < 400) {
    return {
      key: 'belowCoverage',
      level: 'warn',
      canQuery: false,
      buttonText: '低分段需单独分析',
      statusText: '数据覆盖有限',
      guide: '当前专业池主要覆盖 400 分以上区间。这个分数段建议结合专科批、职业本科、民办院校和当年招生计划单独分析。',
      resultTitle: '低分段提示',
      resultBadge: '数据有限',
      resultMessage: '当前专业池低分段覆盖有限，暂不建议直接用本工具判断。建议结合专科批、职业本科、民办院校和当年招生计划另行分析。'
    };
  }

  if (n > 750) {
    return {
      key: 'invalidHigh',
      level: 'warn',
      canQuery: false,
      buttonText: '请检查分数',
      statusText: '请检查分数',
      guide: '分数似乎超过了常规满分范围，请确认是否输入错了。',
      resultTitle: '请检查分数',
      resultBadge: '超出范围',
      resultMessage: '分数似乎超过了常规满分范围。请输入 0～750 之间的有效分数。'
    };
  }

  if (n >= 700) {
    return {
      key: 'topRange',
      level: 'top',
      canQuery: true,
      buttonText: '查看高分段专业',
      statusText: '高分段',
      guide: '这个分数已经是很强的高分段。可以继续查看附近专业，但最终应重点结合顶尖院校、专业方向、城市偏好和当年位次变化。',
      resultTitle: '高分段提示',
      resultBadge: '精细判断',
      resultMessage: '高分段结果仅作专业池参考。这个分数段更需要结合位次、专业方向、城市偏好和顶尖院校计划变化综合判断。'
    };
  }

  return {
    key: 'normal',
    level: 'ready',
    canQuery: true,
    buttonText: '查看符合条件的专业',
    statusText: '程序就绪',
    guide: '点击后，结果会显示在下方专业列表。也可以直接按 Enter。',
    resultTitle: '等待查看',
    resultBadge: '待查看',
    resultMessage: '请输入考生分数，选择地域、学校或专业后，点击查看符合条件的专业。'
  };
}
