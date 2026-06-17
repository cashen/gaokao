// v3.9.20.5 特殊项目策略：专项、定向、预科等默认隐藏；用户手动显示后强提示资格核验。
// 中外/高收费继续由办学性质底线控制，不在本策略默认隐藏范围内。

function clean(value, max = 120) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function collectText(record = {}) {
  const parts = [
    record.school,
    record.major,
    record.remark,
    record.notes,
    record.projectType,
    record.batch,
    record.planType,
    record.rawText,
    record.matchReason,
    Array.isArray(record.flags) ? record.flags.join(' ') : '',
    Array.isArray(record.schoolTags) ? record.schoolTags.join(' ') : '',
    Array.isArray(record.bottomLineTags) ? record.bottomLineTags.join(' ') : ''
  ];
  return parts.filter(Boolean).join(' ');
}

const RULES = [
  {
    key: 'college_special',
    label: '高校专项',
    re: /高校专项|高校专项计划/,
    review: ['核验高校专项报考资格、报名审核结果和 2026 年招生计划备注']
  },
  {
    key: 'national_special',
    label: '国家专项',
    re: /国家专项|国家专项计划/,
    review: ['核验国家专项报考资格、户籍/学籍要求和招生批次']
  },
  {
    key: 'local_special',
    label: '地方专项',
    re: /地方专项|地方专项计划/,
    review: ['核验地方专项报考资格、户籍/学籍要求和招生批次']
  },
  {
    key: 'special_plan',
    label: '专项计划',
    re: /专项计划|专项/,
    review: ['核验专项计划报考资格、招生批次和 2026 年计划备注']
  },
  {
    key: 'public_teacher',
    label: '公费师范/优师专项',
    re: /公费师范|国家公费师范|地方公费师范|优师专项|优师计划/,
    review: ['核验公费师范/优师专项履约地区、服务年限、违约责任和就业安排']
  },
  {
    key: 'targeted',
    label: '定向项目',
    re: /免费医学定向|医学定向|定向就业|定向培养|定向|订单班|委托培养/,
    review: ['核验定向培养/就业的服务地区、服务年限、协议和违约责任']
  },
  {
    key: 'ethnic_preparatory',
    label: '民族班/预科',
    re: /少数民族预科|民族预科|预科班|预科|民族班/,
    review: ['核验民族班/预科报考资格、培养年限、转段规则和招生计划备注']
  },
  {
    key: 'public_security_justice',
    label: '公安/司法等特殊要求',
    re: /公安|警察|侦查|刑事科学|司法|监狱学|司法警察/,
    review: ['核验公安/司法类体检、政审、面试、批次和就业要求']
  },
  {
    key: 'navigation_marine',
    label: '航海/轮机等特殊要求',
    re: /航海|轮机|船舶电子电气|海上|海员/,
    review: ['核验航海/轮机类体检要求、就业环境和培养限制']
  }
];

const SHOW_MODE = 'show_eligibility_projects';
const HIDE_MODE = 'hide_eligibility_projects';

export function normalizeSpecialProjectMode(value) {
  return String(value || '').trim() === SHOW_MODE ? SHOW_MODE : HIDE_MODE;
}

export function isSpecialProjectVisible(mode) {
  return normalizeSpecialProjectMode(mode) === SHOW_MODE;
}

export function detectSpecialProject(record = {}) {
  const text = collectText(record);
  const matches = [];
  const reviewPoints = [];
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      matches.push({ key: rule.key, label: rule.label });
      reviewPoints.push(...rule.review);
    }
  }
  let labels = unique(matches.map(x => x.label));
  let keys = unique(matches.map(x => x.key));
  if (labels.length > 1 && labels.includes('专项计划')) labels = labels.filter(x => x !== '专项计划');
  if (keys.length > 1 && keys.includes('special_plan')) keys = keys.filter(x => x !== 'special_plan');
  const hasSpecialProject = labels.length > 0;
  const primaryLabel = labels[0] || '';
  return {
    hasSpecialProject,
    shouldHideByDefault: hasSpecialProject,
    group: hasSpecialProject ? 'eligibility' : '',
    keys,
    labels,
    primaryLabel,
    labelText: labels.join(' / '),
    reviewPoints: unique(reviewPoints).slice(0, 6),
    parentNote: hasSpecialProject
      ? `${primaryLabel || '特殊项目'}不能按普通专业简单参考，请先核验报考资格、招生批次和 2026 年招生计划备注。`
      : '',
    hideReason: hasSpecialProject ? '需要报考资格或特殊条件，已按普通家庭默认隐藏。' : ''
  };
}

export function shouldHideSpecialProject(record = {}, mode = HIDE_MODE) {
  const info = record.specialProject || detectSpecialProject(record);
  return Boolean(info.hasSpecialProject && !isSpecialProjectVisible(mode));
}

export function enrichSpecialProjectRecord(record = {}) {
  const specialProject = detectSpecialProject(record);
  if (!specialProject.hasSpecialProject) return { ...record, specialProject };
  const flags = Array.isArray(record.flags) ? [...record.flags] : [];
  const reviewPoints = Array.isArray(record.reviewPoints) ? [...record.reviewPoints] : [];
  const flagText = `特殊项目：${specialProject.labelText || specialProject.primaryLabel}，需资格核验`;
  if (!flags.includes(flagText)) flags.push(flagText);
  for (const point of specialProject.reviewPoints) {
    if (!reviewPoints.includes(point)) reviewPoints.push(point);
  }
  return {
    ...record,
    specialProject,
    flags,
    reviewPoints
  };
}

export function createSpecialProjectStats() {
  return { hidden: 0, shown: 0, byBand: { upper: 0, near: 0, steady: 0 }, byLabel: {} };
}

export function addSpecialProjectStat(stats, info, band, action = 'hidden') {
  if (!stats || !info?.hasSpecialProject) return stats;
  if (action === 'shown') stats.shown += 1;
  else stats.hidden += 1;
  if (band && stats.byBand && Object.prototype.hasOwnProperty.call(stats.byBand, band) && action !== 'shown') stats.byBand[band] += 1;
  for (const label of info.labels || []) stats.byLabel[label] = (stats.byLabel[label] || 0) + 1;
  return stats;
}

export const SPECIAL_PROJECT_COPY = {
  hideLabel: '默认隐藏专项、定向、预科等需要资格核验的专业',
  showLabel: '已显示专项、定向、预科等特殊项目，请先核验资格',
  hiddenResultPrefix: '已为普通家庭默认隐藏',
  showWarning: '当前已显示特殊项目，请重点核验报考资格、招生批次、服务年限、违约责任、户籍/体检/政审等条件。'
};
