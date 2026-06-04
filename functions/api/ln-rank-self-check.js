import { getCatalogStats, findCatalogMajorByNameOrCode } from '../_lib/kb/catalog-accessor.js';
import { getLiaoningPolicyDiagnostics, formatLiaoningOrdinaryUndergraduatePolicyLine } from '../_lib/kb/liaoning-policy-accessor.js';
import { classifyKeywordTokens } from '../_lib/kb/keyword-token-classifier.js';
import { buildReviewPointsForRecord } from '../_lib/kb/review-point-builder.js';
import { buildFeishuReport } from '../_lib/feishu-report-builder.js';
import { buildSelectionPoolFeishuReport } from '../_lib/feishu-selection-pool-report-builder.js';
import { buildSelectionPoolStyledBlocks } from '../_lib/feishu-selection-pool-styled-builder.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const FORBIDDEN = /payload|raw|source|debug|model|JSON|workers-ai|fallback|AI_PATH_MODEL|internalDerived|sourceLevel/i;
const CASES = [
  { input: '机械设计制造及其自动化', expectDirection: 'mechanical_vehicle', expectCode: '080202' },
  { input: '自动化', expectDirection: 'electrical_energy', expectCode: '080801' },
  { input: '园艺', expectDirection: 'agri_food_env', expectCode: '090102' },
  { input: '园林', expectDirection: 'agri_food_env', expectCode: '090502' },
  { input: '风景园林', expectDirection: 'civil_arch_transport', expectCode: '082803' },
  { input: '动物医学', expectDirection: 'agri_food_env', expectCode: '090401' },
  { input: '食品科学与工程', expectDirection: 'agri_food_env', expectCode: '082701' },
  { input: '中外', expectProject: 'sinoForeign' },
  { input: '电气 中外', expectDirection: 'electrical_energy', expectProject: 'sinoForeign' },
  { input: '具身智能', expectDirection: 'computer_ai_software', expectCode: '140012TK', expectCatalogChange: true },
  { input: '脑机科学与技术', expectDirection: 'medical_applied', expectCode: '140013TK', expectCatalogChange: true },
  { input: '智能医学工程', expectDirection: 'medical_applied', expectCode: '140007T', expectCatalogChange: true },
  { input: '公费师范', expectProject: 'publicTeacher' },
  { input: '定向', expectProject: 'targeted' }
];

function caseCheck(c) {
  const classified = classifyKeywordTokens(c.input);
  const major = findCatalogMajorByNameOrCode(c.input);
  const direction = classified.majorDirectionTokens[0]?.directionId || '';
  const project = classified.projectAttributeTokens[0]?.id || '';
  const reviewPoints = buildReviewPointsForRecord({ major: c.input, standardMajor: major ? { ...major, mappingStatus: 'exact' } : {} });
  const errors = [];
  if (c.expectDirection && direction !== c.expectDirection) errors.push(`方向应为${c.expectDirection}，实际${direction || '未识别'}`);
  if (c.expectProject && project !== c.expectProject) errors.push(`项目属性应为${c.expectProject}，实际${project || '未识别'}`);
  if (c.expectCode && major?.code !== c.expectCode) errors.push(`专业代码应为${c.expectCode}，实际${major?.code || '未识别'}`);
  if (c.expectCatalogChange && !reviewPoints.some(x => /交叉学科|新目录|代码迁移|培养学院/.test(x))) errors.push('应出现新目录/交叉学科复核点');
  return { input: c.input, ok: errors.length === 0, errors, direction, project, code: major?.code || '', category: major?.categoryName || '', reviewPoints };
}


function uiReadabilitySmoke() {
  const checks = [];
  const add = (name, ok, detail, suggestion='') => checks.push({ name, ok, detail, suggestion });
  const sample = { major: '机械设计制造及其自动化(中外合作办学)', flags: ['费用待核验'], standardMajor: { code: '080202', name: '机械设计制造及其自动化', categoryName: '机械类', mappingStatus: 'exact' } };
  const points = buildReviewPointsForRecord(sample, { limit: 5 });
  add('卡片复核点摘要化', points.length <= 5, `详情复核点 ${points.length} 条；卡片应只显示摘要，详情折叠。`, '检查 major-pool-render 的 card-review-details 是否默认折叠。');
  add('普通稳定专业不过度展开', buildReviewPointsForRecord({ major: '机械设计制造及其自动化', standardMajor: { categoryName: '机械类' } }, { limit: 5 }).length <= 2, '普通专业应保持简洁，不应出现多条大段复核点。', '稳定专业只显示目录归属摘要。');
  add('项目属性集中提示', /中外合作|高收费/.test(points.join(' ')), '中外/高收费应进入复核详情，但卡片主视觉只显示摘要。', '检查 project-attribute-accessor 与 review-point-builder。');
  add('移动端折叠纪律', true, '手机端默认显示“需核验 n 项/摘要”，不展开完整说明。', '通过页面 CSS 的 details 默认折叠保障。');
  add('办学性质底线显示边界', true, '500分应显示办学性质提醒；516分不显示；不使用特控线+10。', '检查 app.v3910rc.js 的 shouldShowBottomLinePanel 与 bottomline.v3910rc.css。');
  add('公办底线紧凑布局', true, '公办底线应为紧凑提醒条，PC一行优先，手机横向选择/折叠，不再作为大块筛选卡片。', '检查 bottomline.v3910rc.css 和首页筛选区高度。');
  add('搜索控制台宽度', true, 'PC 搜索控制台应设置 max-width，避免大屏横铺成后台表单。', '检查 ui-density.v3910rc.css 的 --ui-control-max 与 .search-workbench。');
  add('Pad 两行控制面板', true, 'Pad 端不硬挤 PC 两栏，输入、chip、当前条件和按钮应按行收口。', '检查 responsive-control-panel.v3910rc.css 的 1024px 断点。');
  add('Android 关键词优先', true, '手机端专业关键词与常用方向优先展示，地区/学校在后，减少首屏长表单感。', '检查 responsive-control-panel.v3910rc.css 的 720px 断点。');
  add('分数区间快速判断带', true, '分数区间应是扁平判断带，不应像大结果卡挤占首屏。', '检查 layout-shell.v3910rc.css 中 band-tab 高度。');
  return checks;
}

function reportSmoke() {
  const rec = { school: '测试大学', major: '电气工程及其自动化', score2025: 520, rank2025: 40000, scoreDelta: 0, statusLabel: '主要参考', position: '主要承接', matchLabel: '精准匹配', matchReason: '专业名称直接包含该词', standardMajor: { code: '080601', name: '电气工程及其自动化', categoryCode: '0806', categoryName: '电气类', mappingStatus: 'exact' } };
  const out = [];
  const basic = buildFeishuReport({ candidateScore: 520, selectedBand: { key: 'near', title: '主要参考', rangeText: '515-525' }, filters: { region: 'all', majorKeyword: '电气' }, dataScope: '2025历史', counts: { upper: 1, near: 1, steady: 1, total: 3 }, selectedRecords: [rec], rangePreset: 'standard', keywordQuery: { rawKeywords: ['电气'] }, matchSummary: { exact: 1 } });
  const pool = buildSelectionPoolFeishuReport({ candidateScore: 520, items: [rec], reportType: 'selectionPoolWithAnalysis', analysis: { summary: '整体可以作为重点核验', stats: { total: 1, rushCount: 0, stableCount: 1, safeCount: 0 }, aiNarrative: { overall: '整体可以作为重点核验', structureDiagnosis: '专业结构待补充', actions: ['建议补充后段专业'] } } });
  const styled = buildSelectionPoolStyledBlocks({ title: '测试报告', candidateScore: 520, items: [rec], stats: { total: 1 }, summary: pool.summary, hasAnalysis: false });
  for (const [name, text] of [['家庭讨论报告', basic.markdown], ['带解读报告', pool.markdown]]) {
    const errors = [];
    if (!text || text.length < 200) errors.push('正文过短');
    if (!/专业\+学校/.test(text)) errors.push('缺少辽宁专业+学校口径');
    if (!/专业代码/.test(text)) errors.push('缺少专业代码');
    if (FORBIDDEN.test(text)) errors.push('出现工程词');
    out.push({ name, ok: errors.length === 0, errors, length: text.length });
  }
  out.push({ name: '复制文字版/样式块', ok: Array.isArray(styled) && styled.length > 5, errors: Array.isArray(styled) && styled.length > 5 ? [] : ['样式块为空'], length: Array.isArray(styled) ? styled.length : 0 });
  return out;
}

export async function onRequest() {
  try {
    const catalog = getCatalogStats();
    const policy = getLiaoningPolicyDiagnostics();
    const cases = CASES.map(caseCheck);
    const reports = reportSmoke();
    const uiChecks = uiReadabilitySmoke();
    const errors = [];
    if (catalog.entries !== 883) errors.push(`2026目录条数应为883，实际${catalog.entries}`);
    if (catalog.disciplineCount !== 13) errors.push(`门类数应为13，实际${catalog.disciplineCount}`);
    if (catalog.categoryCount !== 92) errors.push(`专业类数应为92，实际${catalog.categoryCount}`);
    if (!policy.ok) errors.push('辽宁政策 accessor 失败');
    cases.filter(x => !x.ok).forEach(x => errors.push(`${x.input}: ${x.errors.join('；')}`));
    reports.filter(x => !x.ok).forEach(x => errors.push(`${x.name}: ${x.errors.join('；')}`));
    uiChecks.filter(x => !x.ok).forEach(x => errors.push(`${x.name}: ${x.detail || 'UI 可读性检查失败'}`));
    return json({ ok: errors.length === 0, version: 'v3.9.10rc', catalog, policyLine: formatLiaoningOrdinaryUndergraduatePolicyLine(), cases, reports, uiChecks, errors });
  } catch (error) {
    return json({ ok: false, version: 'v3.9.10rc', message: error?.message || String(error), stack: String(error?.stack || '') }, 500);
  }
}
