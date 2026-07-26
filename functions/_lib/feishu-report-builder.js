import { YEAR_CALIBER_KB } from './kb/year-caliber-kb.generated.js';
import { formatLiaoningOrdinaryUndergraduatePolicyLine } from './kb/liaoning-policy-accessor.js';
import { buildCareerAndExamReviewHints } from './kb/report-review-hints.js';
import { ADMISSION_CHARTER_CHECK_KB } from './kb/admission-charter-check-kb.generated.js';
import { buildReviewPointsForItems } from './kb/review-point-builder.js';
import { getCampusForItem, getCampusReviewSummaryForItems, formatCampusReviewLine } from './kb/campus-accessor.js';
import { getRegionLabel } from '../../shared/resources/geo/china-region-catalog.js';
import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';
import { formatHistoricalEvidenceText } from '../../shared/resources/exam/historical-score-rank-contract.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("zh-CN") : "—";
}

const BAND_LABELS = {
  upper: '稍高目标',
  near: '主要参考',
  steady: '低分侧补充'
};

const RANGE_LABELS = {
  standard: '正常查看',
  wide: '多看一些',
  safe: '多看低分侧'
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
  const region = getRegionLabel(filters.region);
  const school = filters.schoolKeyword ? `学校：${filters.schoolKeyword}` : "学校不限";
  const major = filters.majorKeyword ? `专业方向/项目关键词：${filters.majorKeyword}` : "关键词不限";
  const bottom = filters.bottomLineMode && filters.bottomLineMode !== "all" ? `公办底线：${BOTTOMLINE_LABELS[filters.bottomLineMode] || filters.bottomLineMode}` : "公办底线不限";
  return `${region} / ${school} / ${major} / ${bottom}`;
}

function historyText(record) {
  return formatHistoricalEvidenceText(record, { years: [2025, 2024], prefix: false, empty: '暂无严格同口径记录' });
}

function locationText(record) {
  const base = record.displayLocation || record.region || "地域待核验";
  const entity = record.geoEntity && record.geoEntity !== record.school ? `；办学实体：${record.geoEntity}` : "";
  const warning = record.locationWarning ? `；${record.locationWarning}` : "";
  return `${base}${entity}${warning}`;
}


function localContextItems(record = {}) {
  const out = [];
  if (record.localStrongChain?.matched) {
    const type = record.localStrongChain.depth === 'core' ? '本校方向' : '本校相关';
    out.push({
      type,
      direction: record.localStrongChain.chainName || '方向待核验',
      reviewText: record.localStrongChain.reviewText || (record.localStrongChain.reviewPoints || []).join(' / '),
      reportTip: record.localStrongChain.reportTip || record.localStrongChain.cardTip || ''
    });
  }
  if (record.trajectoryChain?.matched) {
    const strongName = String(record.localStrongChain?.chainName || '');
    const trajectoryName = String(record.trajectoryChain.trajectoryName || record.trajectoryChain.chainName || '');
    if (!strongName || !trajectoryName || (!strongName.includes(trajectoryName.replace(/方向$/, '')) && !trajectoryName.includes(strongName.replace(/方向$/, '')))) {
      out.push({
        type: '方向提醒',
        direction: trajectoryName || '方向待核验',
        reviewText: record.trajectoryChain.reviewText || (record.trajectoryChain.reviewPoints || []).join(' / '),
        reportTip: record.trajectoryChain.reportTip || ''
      });
    }
  }
  return out;
}

function localContextText(record = {}) {
  const entry = localContextItems(record)[0];
  if (!entry) return '暂无明显提示';
  return `${entry.type}｜${entry.direction}`;
}

function reviewText(record = {}, entry = null) {
  if (entry?.reviewText) return entry.reviewText;
  if (Array.isArray(record.flags) && record.flags.length) return record.flags.slice(0, 3).join(' / ');
  return '招生计划 / 校区 / 学费 / 体检 / 专业备注';
}


function governanceReviewLines(records = []) {
  const lines = [];
  const hasMedical = records.some(x => /临床|口腔|中医|中西医/.test(`${x.major || ''}`) && !/护理|药学|检验|影像技术|康复/.test(`${x.major || ''}`));
  const hasLaw = records.some(x => /法学/.test(`${x.major || ''}`));
  const hasTeacher = records.some(x => /师范|教育/.test(`${x.major || ''}`));
  const hasExamSensitive = records.some(x => /医学|药学|生物|食品|农学|园艺|动物医学|交通运输|油气储运/.test(`${x.major || ''}`));
  lines.push('## 需要人工复核');
  lines.push('');
  lines.push(`1. 招生章程：${(ADMISSION_CHARTER_CHECK_KB?.generalCheckItems || []).slice(0, 8).join('、')}。`);
  let index = 2;
  const campusReviews = getCampusReviewSummaryForItems(records, { limit: 4 });
  if (campusReviews.length) lines.push(`${index++}. 校区复核：${campusReviews.map(formatCampusReviewLine).join('；')}`);
  for (const hint of buildCareerAndExamReviewHints(records, { limit: 4 })) lines.push(`${index++}. ${hint}`);
  const extra = buildReviewPointsForItems(records, { limit: 5 });
  extra.slice(0, 3).forEach(x => lines.push(`${index++}. ${x}`));
  lines.push('');
  return lines;
}

function governanceBoundaryLines() {
  return [
    '## 数据和使用边界',
    '',
    `- 年度口径：${YEAR_CALIBER_KB.reportCopy}`,
    `- 辽宁志愿模式：${formatLiaoningOrdinaryUndergraduatePolicyLine()}`, 
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
  lines.push("## 辽宁 2026 物理类专业初选参考");
  lines.push("");
  lines.push(`- 考生分数：${data.candidateScore}`);
  const bandRangeText = String(band.rangeText || '').includes('分') ? band.rangeText : `${band.rangeText} 分`;
  lines.push(`- 当前区间：${displayBandTitle}（${bandRangeText}）`);
  lines.push(`- 筛选条件：${filterText(data.filters)}`);
  lines.push(`- 数据口径：${data.dataScope}专业数据`);
  lines.push("");
  lines.push("## 结果摘要");
  lines.push("");
  lines.push(`- 稍高目标：${fmt(data.counts.upper)} 条`);
  lines.push(`- 主要参考：${fmt(data.counts.near)} 条`);
  lines.push(`- 低分侧补充：${fmt(data.counts.steady)} 条`);
  lines.push(`- 当前生成：${displayBandTitle}前 ${data.selectedRecords.length} 条`);
  lines.push(`- 查看范围：${RANGE_LABELS[data.rangePreset] || data.rangePreset || "正常查看"}`);
  if (data.keywordQuery?.rawKeywords?.length) lines.push(`- 关键词识别：${data.keywordQuery.rawKeywords.join("、")}`);
  if (data.matchSummary) lines.push(`- 命中统计：精准匹配 ${fmt(data.matchSummary.exact)} 个｜相关方向 ${fmt(data.matchSummary.related)} 个｜行业关联 ${fmt(data.matchSummary.industry)} 个｜项目属性 ${fmt(data.matchSummary.project)} 个`);
  lines.push("");
  lines.push(`## ${displayBandTitle}专业列表`);
  lines.push("");

  data.selectedRecords.forEach((record, index) => {
    const campus = getCampusForItem(record);
    lines.push(`### ${index + 1}. ${record.school}｜${record.major}`);
    lines.push("");
    const majorCode = standardMajorText(record) || '待人工核验';
    const contextEntry = localContextItems(record)[0] || null;
    const referencePosition = [record.statusLabel, record.matchLabel, record.position].filter(Boolean).join(' / ') || '待核验';
    lines.push(`- 2026最低投档分：${fmt(record.score2026 ?? record.score)} 分`);
    lines.push(`- 2026最低投档位次：${fmt(record.rank2026 ?? record.rank)}`);
    lines.push(`- 相对孩子：${deltaText(record.scoreDelta)} 分`);
    lines.push(`- 参考位置：${referencePosition}`);
    lines.push(`- 地域：${locationText(record)}`);
    lines.push(`- 专业代码：${majorCode}`);
    lines.push(`- 院校专业背景：${localContextText(record)}`);
    lines.push(`- 建议再看：${reviewText(record, contextEntry)}`);
    if (record.matchReason) lines.push(`- 为什么出现：${record.matchReason}`);
    if (campus?.displayTag) lines.push(`- 校区提醒：${campus.displayTag}｜${campus.reviewSummary}`);
    lines.push(`- 标签：${tags(record)}`);
    if (record.tuition) lines.push(`- 学费：${record.tuition}`);
    lines.push("");
  });

  lines.push("## 历史对照附录（不参与2026当前分组）");
  lines.push("");
  lines.push("2025、2024只作同校、同专业、同项目属性的历史对照，不改变前面按2026数据形成的位置分组。");
  lines.push("");
  data.selectedRecords.forEach((record, index) => {
    lines.push(`- ${index + 1}. ${record.school || '学校待核验'} · ${record.major || '专业待核验'}｜${historyText(record)}`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(...governanceReviewLines(data.selectedRecords || []));
  lines.push(...governanceBoundaryLines());

  return {
    title,
    markdown: lines.join("\n"),
    recordsCount: data.selectedRecords.length,
    bandTitle: band.title,
    rangeText: band.rangeText,
    reportType: FEISHU_REPORT_CONTRACT.currentBandReportType,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    rankYear: FEISHU_REPORT_CONTRACT.rankYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion
  };
}
