import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  isPublicBottomLineVisible as sharedBottomLineVisible
} from '../../../shared/resources/exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const YEAR_CALIBER_KB = {
  version: 'v3955-year-caliber-ln-physics-2026-shared',
  province: EXAM.provinceName,
  subject: EXAM.subjectName,
  activeDataYear: EXAM.dataYear,
  rankTableYear: EXAM.rankYear,
  referencePlanYear: EXAM.admissionBaseYear,
  audienceYear: EXAM.audienceYear,
  planYear: null,
  lines: {
    specialControlLine: EXAM.specialControlScore,
    undergraduateLine: EXAM.undergraduateControlScore,
    vocationalLine: EXAM.vocationalControlScore
  },
  publicBottomLinePolicy: {
    visibleWhen: 'undergraduateLine <= candidateScore <= specialControlLine',
    visibleMin: EXAM.undergraduateControlScore,
    visibleMax: EXAM.specialControlScore,
    forbidBufferAboveSpecialControlLine: true,
    note: '中外合作、高收费和特殊项目只作为家庭复核事项，不因分数接近而自动判断适合。'
  },
  pageCopy: '当前基于辽宁2026年物理类专业最低投档记录和2026一分一段进行历史初选参考。',
  reportCopy: '基于2026年专业最低投档记录生成，用于家庭讨论和人工复核；2025、2024只作严格同口径历史对照，正式填报以2027年一分一段、招生计划、院校章程和志愿系统为准。',
  aiCopy: 'AI解读必须以2026年专业最低投档分和位次为主事实，2025、2024只作历史对照；2027招生计划、选科要求、学费、校区和培养方式尚需以正式资料为准。',
  updateTriggers: ['2027一分一段公布', '2027本科线公布', '2027特控线公布', '2027招生计划公布'],
  source: {
    level: 'A',
    name: '辽宁省教育厅转载辽宁招生考试之窗：辽宁2026年高考分数线',
    year: 2026,
    url: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2026063013492555300/index.shtml'
  },
  rankSource: {
    level: 'A',
    name: '辽宁省教育厅转载辽宁招生考试之窗：辽宁省2026年普通高校招生考试成绩统计表',
    year: 2026,
    url: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2026063014014729932/index.shtml'
  }
};

export function getActiveLines() {
  return YEAR_CALIBER_KB.lines;
}

export function isPublicBottomLineVisible(score) {
  return sharedBottomLineVisible(score, EXAM);
}
