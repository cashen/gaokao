import { YEAR_CALIBER_KB } from './kb/year-caliber-kb.generated.js';
import { LIAONING_POLICY_KB } from './kb/liaoning-policy-kb.generated.js';
import { ADMISSION_CHARTER_CHECK_KB } from './kb/admission-charter-check-kb.generated.js';
import { PHYSICAL_EXAM_KB } from './kb/physical-exam-kb.generated.js';
import { CAREER_PATH_MEDICAL_KB } from './kb/career-path-medical-kb.generated.js';
import { CAREER_PATH_LAW_KB } from './kb/career-path-law-kb.generated.js';
import { CAREER_PATH_TEACHER_KB } from './kb/career-path-teacher-kb.generated.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("zh-CN") : "—";
}

const BAND_LABELS = {
  upper: '稍高目标',
  near: '主要参考',
  steady: '稳妥补充'
};

const RANGE_LABELS = {
  standard: '正常查看',
  wide: '多看一些',
  safe: '稳妥一点'
};

const BOTTOMLINE_LABELS = {
  all: '全部院校',
  public_first: '公办优先',
  public_regular_only: '只看公办普通',
  public_include_sino: '公办含中外/高收费'
};

function bandTitle(band) {
  return BAND_LABELS[band?.key] || band?.title || '主要参考';
}

function standardMajorText(record) {
  const sm = record?.standardMajor || {};
  if (sm.code && sm.name) return `${sm.code}｜${sm.name}`;
  if (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category') return `专业类 ${sm.categoryCode}｜${sm.categoryName}`;
  return '';
}

const REGION_LABELS = {
  all: "不限",
  ln: "辽宁省内",
  shenyang: "沈阳",
  dalian: "大连",
  "ln-other": "辽宁其他",
  outside: "省外",
  beijing: "北京",
  tianjin: "天津",
  hebei: "河北",
  shandong: "山东",
  jilin: "吉林",
  heilongjiang: "黑龙江",
  jiangzhehu: "江浙沪",
  guangdong: "广东",
  huazhong: "华中",
  southwest: "西南",
  northwest: "西北"
};

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return "—";
  return n > 0 ? `+${n}` : String(n);
}

function tags(record) {
  const arr = [];
  if (Array.isArray(record.schoolTags)) arr.push(...record.schoolTags);
  if (record.natureLabel) arr.push(record.natureLabel);
  if (record.displayLocation) arr.push(record.displayLocation);
  return [...new Set(arr.filter(Boolean))].join(" / ") || "标签待核验";
}

function filterText(filters) {
  const region = REGION_LABELS[filters.region] || "不限";
  const school = filters.schoolKeyword ? `学校：${filters.schoolKeyword}` : "学校不限";
  const major = filters.majorKeyword ? `专业方向/项目关键词：${filters.majorKeyword}` : "关键词不限";
  const bottom = filters.bottomLineMode && filters.bottomLineMode !== "all" ? `公办底线：${BOTTOMLINE_LABELS[filters.bottomLineMode] || filters.bottomLineMode}` : "公办底线不限";
  return `${region} / ${school} / ${major} / ${bottom}`;
}

function historyText(record) {
  const has2024 = record?.historyCompare?.has2024 || record.score2024 != null || record.rank2024 != null;
  if (!has2024) return "2024参考：暂无同口径数据";
  const score = record.score2024 != null ? `${fmt(record.score2024)} 分` : "分数待核验";
  const rank = record.rank2024 != null ? `${fmt(record.rank2024)} 位` : "位次待核验";
  const trend = record?.historyCompare?.rankTrendText ? `；${record.historyCompare.rankTrendText}` : "";
  return `2024参考：${score} / ${rank}${trend}`;
}

function locationText(record) {
  const base = record.displayLocation || record.region || "地域待核验";
  const entity = record.geoEntity && record.geoEntity !== record.school ? `；办学实体：${record.geoEntity}` : "";
  const warning = record.locationWarning ? `；${record.locationWarning}` : "";
  return `${base}${entity}${warning}`;
}


function governanceReviewLines(records = []) {
  const lines = [];
  const hasMedical = records.some(x => /临床|口腔|中医|中西医/.test(`${x.major || ''}`) && !/护理|药学|检验|影像技术|康复/.test(`${x.major || ''}`));
  const hasLaw = records.some(x => /法学/.test(`${x.major || ''}`));
  const hasTeacher = records.some(x => /师范|教育/.test(`${x.major || ''}`));
  const hasExamSensitive = records.some(x => /医学|药学|生物|食品|农学|园艺|动物医学|交通运输|油气储运/.test(`${x.major || ''}`));
  lines.push('## 需要人工复核');
  lines.push('');
  lines.push(`1. 招生章程：${ADMISSION_CHARTER_CHECK_KB.generalCheckItems.slice(0, 8).join('、')}。`);
  let index = 2;
  if (hasMedical) lines.push(`${index++}. ${CAREER_PATH_MEDICAL_KB.medicalCore.aiCopy}`);
  if (hasLaw) lines.push(`${index++}. ${CAREER_PATH_LAW_KB.law.aiCopy}`);
  if (hasTeacher) lines.push(`${index++}. ${CAREER_PATH_TEACHER_KB.teacher.aiCopy}`);
  if (hasExamSensitive) lines.push(`${index++}. ${PHYSICAL_EXAM_KB.colorWeakness.aiCopy}`);
  lines.push('');
  return lines;
}

function governanceBoundaryLines() {
  return [
    '## 数据和使用边界',
    '',
    `- 年度口径：${YEAR_CALIBER_KB.reportCopy}`,
    `- 辽宁志愿模式：普通类本科批按“${LIAONING_POLICY_KB.ordinary本科批.mode}”理解，最多 ${LIAONING_POLICY_KB.ordinary本科批.maxChoices} 个志愿；本报告按专业条目复核。`,
    '- 学费、校区、培养模式、体检限制、外语语种、转专业和毕业证/学位证口径必须以学校当年招生章程为准。',
    ''
  ];
}

export function buildFeishuReport(data) {
  const band = data.selectedBand;
  const displayBandTitle = bandTitle(band);
  const title = `${data.candidateScore}分｜${displayBandTitle}专业池｜辽宁物理类`;
  const lines = [];

  lines.push(`# ${title}`);
  lines.push("");
  lines.push("## 辽宁物理类专业初选参考");
  lines.push("");
  lines.push(`- 考生分数：${data.candidateScore}`);
  lines.push(`- 当前区间：${displayBandTitle}（${band.rangeText} 分）`);
  lines.push(`- 筛选条件：${filterText(data.filters)}`);
  lines.push(`- 数据口径：${data.dataScope}专业数据`);
  lines.push("");
  lines.push("## 结果摘要");
  lines.push("");
  lines.push(`- 稍高目标：${fmt(data.counts.upper)} 条`);
  lines.push(`- 主要参考：${fmt(data.counts.near)} 条`);
  lines.push(`- 稳妥补充：${fmt(data.counts.steady)} 条`);
  lines.push(`- 当前生成：${displayBandTitle}前 ${data.selectedRecords.length} 条`);
  lines.push(`- 查看范围：${RANGE_LABELS[data.rangePreset] || data.rangePreset || "正常查看"}`);
  if (data.keywordQuery?.rawKeywords?.length) lines.push(`- 关键词识别：${data.keywordQuery.rawKeywords.join("、")}`);
  if (data.matchSummary) lines.push(`- 命中统计：精准匹配 ${fmt(data.matchSummary.exact)} 个｜相关方向 ${fmt(data.matchSummary.related)} 个｜行业关联 ${fmt(data.matchSummary.industry)} 个｜项目属性 ${fmt(data.matchSummary.project)} 个`);
  lines.push("");
  lines.push(`## ${displayBandTitle}专业列表`);
  lines.push("");

  data.selectedRecords.forEach((record, index) => {
    lines.push(`### ${index + 1}. ${record.school}｜${record.major}`);
    lines.push("");
    const majorCode = standardMajorText(record);
    lines.push(`- 2025最低分：${fmt(record.score2025 ?? record.score)} 分`);
    if (majorCode) lines.push(`- 专业代码：${majorCode}`);
    lines.push(`- 2025最低位次：${fmt(record.rank2025 ?? record.rank)}`);
    lines.push(`- ${historyText(record)}`);
    lines.push(`- 相对考生：${deltaText(record.scoreDelta)} 分`);
    lines.push(`- 状态：${record.statusLabel || "待核验"}`);
    if (record.matchLabel) lines.push(`- 匹配关系：${record.matchLabel}`);
    if (record.matchReason) lines.push(`- 命中原因：${record.matchReason}`);
    lines.push(`- 适合位置：${record.position || "待核验"}`);
    lines.push(`- 地域：${locationText(record)}`);
    lines.push(`- 标签：${tags(record)}`);
    if (record.tuition) lines.push(`- 学费：${record.tuition}`);
    if (Array.isArray(record.flags) && record.flags.length) {
      lines.push(`- 需核验：${record.flags.slice(0, 2).join(" / ")}`);
    }
    lines.push("");
  });

  lines.push("---");
  lines.push("");
  lines.push(...governanceReviewLines(data.selectedRecords || []));
  lines.push(...governanceBoundaryLines());

  return {
    title,
    markdown: lines.join("\n"),
    recordsCount: data.selectedRecords.length,
    bandTitle: band.title,
    rangeText: band.rangeText
  };
}
