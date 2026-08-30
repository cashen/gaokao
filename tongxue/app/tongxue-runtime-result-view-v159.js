import {
  escapeHtml as html,
  escapeAttribute as attr,
  tidySummary,
  formatTime,
  formatReviewDate,
  sourceInfo,
  dedupeReviews,
  summaryGroups
} from './tongxue-runtime-utils-v159.js?v=159';
import { buildUndergradGraduatePathwayView, UNDERGRAD_GRADUATE_PATHWAY_VIEW_META } from '../../shared/resources/majors/undergrad-graduate-pathway-view.v001.js?v=001_1&r=r041-unified-min-score-navigation';
import { summarizeDecisionContext } from '../../shared/decision-context/decision-context.v001.js';
import { buildMinScoreEntryModel } from '../../shared/resources/admissions/min-score-navigation.v001.js';

const PAGE_VERSION = 'v1.5.9-uec01-evidence02';
const PATHWAY_VIEW_VERSION = UNDERGRAD_GRADUATE_PATHWAY_VIEW_META.version;
const DIMENSIONS = Object.freeze({ dormitory:'宿舍', cafeteria:'食堂', faculty:'师资', environment:'环境', culture:'氛围', employment:'就业感受', safety:'安全', stability:'稳定感受', difficulty:'学习难度', work_env:'工作环境感受' });
const TOPIC_LABELS = Object.freeze({
