import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  isPublicBottomLineVisible as sharedBottomLineVisible
} from '../../../shared/resources/exam/liaoning-physics.js';
import { FEISHU_YEAR_CALIBER } from '../../../shared/resources/reports/feishu-report-contract.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const YEAR_CALIBER_KB = {
  version: FEISHU_YEAR_CALIBER.version,
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
  pageCopy: FEISHU_YEAR_CALIBER.pageCopy,
  reportCopy: FEISHU_YEAR_CALIBER.reportCopy,
  aiCopy: `AI解读必须以${FEISHU_YEAR_CALIBER.primaryFact}为主事实；${FEISHU_YEAR_CALIBER.historicalBoundary} ${FEISHU_YEAR_CALIBER.unpublishedBoundary}`,
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
