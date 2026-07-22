const UNDERGRADUATE_CONTROL_SCORE = 344;
const SPECIAL_CONTROL_SCORE = 508;
const VOCATIONAL_CONTROL_SCORE = 150;

function state({
  key,
  level = 'ready',
  canQuery,
  buttonText,
  statusText,
  guide,
  resultTitle,
  resultBadge,
  resultMessage
}) {
  return {
    key,
    level,
    canQuery,
    buttonText,
    statusText,
    guide,
    resultTitle,
    resultBadge,
    resultMessage
  };
}

export function getScoreGuard(score) {
  const raw = score == null ? '' : String(score).trim();
  const n = Number(raw);

  if (!raw || !Number.isFinite(n) || n <= 0) {
    return state({
      key: 'empty',
      canQuery: false,
      buttonText: '输入分数后查看专业',
      statusText: '历史参考数据已加载',
      guide: '请先输入模考或预估参考分数，例如 580。',
      resultTitle: '等待查看',
      resultBadge: '待输入',
      resultMessage: '请输入模考或预估参考分数，选择地区、学校或专业方向后查看。'
    });
  }

  if (n > 750) {
    return state({
      key: 'invalidHigh',
      level: 'warn',
      canQuery: false,
      buttonText: '请检查分数',
      statusText: '请检查分数',
      guide: '分数不能高于 750，请检查输入。',
      resultTitle: '请检查分数',
      resultBadge: '超出范围',
      resultMessage: '请输入 1—750 之间的有效参考分数。'
    });
  }

  if (n < VOCATIONAL_CONTROL_SCORE) {
    return state({
      key: 'belowCoverage',
      level: 'warn',
      canQuery: false,
      buttonText: '请检查分数或另行分析',
      statusText: '低于专科控制线',
      guide: '该参考分数低于 2026 年辽宁普通类专科控制线 150 分，请检查输入或另行了解其他升学路径。',
      resultTitle: '分数范围提示',
      resultBadge: '需单独分析',
      resultMessage: '当前专业池是普通类本科批历史投档数据，不适合分析这个分数区间。'
    });
  }

  if (n < UNDERGRADUATE_CONTROL_SCORE) {
    return state({
      key: 'belowCoverage',
      level: 'warn',
      canQuery: false,
      buttonText: '本科线以下需单独分析',
      statusText: '低于本科控制线',
      guide: '该参考分数低于 2026 年辽宁物理类本科控制线 344 分。当前普通本科批专业数据不适合作为主要参考。',
      resultTitle: '本科线以下提示',
      resultBadge: '需单独分析',
      resultMessage: '建议另行查看专科、职业教育及当年招生计划；少量带资格限制的特殊项目不作为普通入口参考。'
    });
  }

  if (n < SPECIAL_CONTROL_SCORE) {
    return state({
      key: 'underSpecial',
      level: 'ready',
      canQuery: true,
      buttonText: '查看符合条件的专业',
      statusText: '可以查看',
      guide: '该参考分数位于 2026 本科线 344 分至特控线 508 分之间，建议重点确认学校性质、学费、校区和特殊项目。',
      resultTitle: '等待查看',
      resultBadge: '可查询',
      resultMessage: '点击查看后，结果会按 2026 专业投档最低分分成三个参考区间。'
    });
  }

  if (n >= 700) {
    return state({
      key: 'topRange',
      level: 'top',
      canQuery: true,
      buttonText: '查看高分段专业',
      statusText: '高分段',
      guide: '这是很高的参考分数。可以查看附近专业，但仍应结合专业方向、城市、招生计划和 2027 年正式位次。',
      resultTitle: '高分段提示',
      resultBadge: '精细核验',
      resultMessage: '高分段更需要逐校逐专业核验，不应只根据历史最低分形成结论。'
    });
  }

  return state({
    key: 'normal',
    level: 'ready',
    canQuery: true,
    buttonText: '查看符合条件的专业',
    statusText: '可以查看',
    guide: '可以按 2026 专业投档最低分查看可讨论专业；位次用于解释历史位置。',
    resultTitle: '等待查看',
    resultBadge: '待查看',
    resultMessage: '点击查看后，结果会按参考分数与 2026 投档最低分的分差整理。'
  });
}
