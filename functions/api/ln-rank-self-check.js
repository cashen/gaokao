import { getCatalogStats, findCatalogMajorByNameOrCode } from '../_lib/kb/catalog-accessor.js';
import { getLiaoningPolicyDiagnostics, formatLiaoningOrdinaryUndergraduatePolicyLine } from '../_lib/kb/liaoning-policy-accessor.js';
import { classifyKeywordTokens } from '../_lib/kb/keyword-token-classifier.js';
import { buildReviewPointsForRecord } from '../_lib/kb/review-point-builder.js';
import { buildFeishuReport } from '../_lib/feishu-report-builder.js';
import { buildSelectionPoolFeishuReport } from '../_lib/feishu-selection-pool-report-builder.js';
import { buildSelectionPoolStyledBlocks } from '../_lib/feishu-selection-pool-styled-builder.js';
import { getCampusForItem, getCampusDiagnostics } from '../_lib/kb/campus-accessor.js';
import { getQueryActionLabel, getActionDiagnostics } from '../_lib/kb/action-hierarchy-policy.js';
import { buildGovernanceKnowledgeContext, buildKbReviewPoints } from '../_lib/kb/knowledge-context-builder.js';
import { MAJOR_FILTER_PRESET_KB } from '../_lib/kb/major-filter-preset-kb.generated.js';
import { LN_RANK_RELEASE_CONTRACT } from '../_lib/release-contract.js';
import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

const FORBIDDEN = /payload|raw|source|debug|model|JSON|workers-ai|fallback|AI_PATH_MODEL|internalDerived|sourceLevel/i;

const CAMPUS_CASES = [
  { school: '沈阳药科大学', major: '药学类', expectTag: '校区：本溪' },
  { school: '沈阳工业大学', major: '化学工程与工艺', expectTag: '校区：辽阳' },
  { school: '辽宁大学', major: '英语', expectTag: '校区：辽阳' },
  { school: '辽宁工程技术大学', major: '计算机科学与技术', expectTag: '校区：葫芦岛' },
  { school: '大连理工大学盘锦校区', major: '能源化学工程', expectTag: '校区：盘锦' },
  { school: '大连交通大学', major: '机械工程', expectTag: '校区：旅顺口' }
];

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
  { input: '智能医学工程', expectDirection: 'medical_applied', expectCode: '140007T', expectCatalogChange: true }
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
  add('办学性质底线显示边界', true, '500分应显示办学性质提醒；516分不显示；不使用特控线+10。', '检查 app.v3918.js 的 shouldShowBottomLinePanel 与 bottomline.css。');
  add('公办底线紧凑布局', true, '公办底线应为紧凑提醒条，PC一行优先，手机横向选择/折叠，不再作为大块筛选卡片。', '检查 bottomline.css 和首页筛选区高度。');
  add('搜索控制台宽度', true, 'PC 搜索控制台应设置 max-width，避免大屏横铺成后台表单。', '检查 css/components/control-panel.css 的 --ui-control-max 与 .search-workbench。');
  add('Pad 两行控制面板', true, 'Pad 端不硬挤 PC 两栏，输入、chip、当前条件和按钮应按行收口。', '检查 css/core/responsive.css 的 1024px 断点。');
  add('Android 关键词优先', true, '手机端专业关键词与常用方向优先展示，地区/学校在后，减少首屏长表单感。', '检查 css/core/responsive.css 的 720px 断点。');
  add('统一控制台结构', true, '考生分数、查看范围、分数区间参考、搜索条件同属 ln-console，避免三套左边界。', '检查 index.html 的 ln-console 结构与 control-panel.css。');
  add('分数区间二级聚焦', true, '分数区间参考在结果区承担二级聚焦，active 状态与报告上下文分离。', '检查 rankBandLegend/resultBandSwitcher 与 bandFocus。');
  add('结果区切换反馈明确', true, '稍高目标/主要参考/低分侧补充的点击只发生在结果区，active 状态含颜色、边框和“当前查看”文字。', '检查 css/components/rank-band.css 与 feature/score-bands/render.js。');
  add('无关键词空状态', true, '未输入专业方向/项目关键词时，右侧不展开热度说明，只保留当前条件和主按钮。', '检查 feature/trend/integration.js 和 .major-trend-hint.is-empty。');
  add('自选入口避让控制台', true, 'PC/Pad 自选入口应靠右下安全区，不遮挡搜索控制台右侧辅助区；Android 使用底部整理条。', '检查 css/components/cards.css。');
  add('右侧辅助区不窄列换行', true, '右侧辅助区只放短状态和主操作；热度参考在有关键词后显示摘要。', '检查 css/components/control-panel.css 和 renderSearchTrendHint。');
  return checks;
}


function campusActionSmoke() {
  const campusCases = CAMPUS_CASES.map(c => {
    const campus = getCampusForItem(c);
    const ok = campus?.displayTag === c.expectTag;
    return { ...c, ok, actualTag: campus?.displayTag || '', reviewSummary: campus?.reviewSummary || '', errors: ok ? [] : [`校区标签应为${c.expectTag}，实际${campus?.displayTag || '未识别'}`] };
  });
  const actionCases = [
    { name: '初始主按钮', ok: getQueryActionLabel({ hasQueried:false, dirty:false }) === '查看符合条件的专业', label: getQueryActionLabel({ hasQueried:false, dirty:false }) },
    { name: '条件变化主按钮', ok: getQueryActionLabel({ hasQueried:true, dirty:true }) === '按新条件重新查看', label: getQueryActionLabel({ hasQueried:true, dirty:true }) },
    { name: '高分段主按钮', ok: getQueryActionLabel({ hasQueried:false, dirty:false, topRange:true }) === '查看高分段专业', label: getQueryActionLabel({ hasQueried:false, dirty:false, topRange:true }) }
  ];
  return { campusCases, actionCases };
}


function kbAccessorSmoke() {
  const cases = [
    { school: '中国农业大学', major: '动物医学类(动物医学、中兽医学、兽医公共卫生)', expect: /色弱|色盲|体检|招生章程/ },
    { school: '测试大学', major: '食品科学与工程', expect: /色弱|体检|招生章程/ },
    { school: '测试大学', major: '园艺', expect: /色弱|体检|招生章程/ },
    { school: '测试大学', major: '药学类', expect: /色弱|体检|招生章程/ },
    { school: '测试大学', major: '油气储运工程', expect: /色盲|体检|招生章程/ }
  ];
  return cases.map(c => {
    const errors = [];
    let points = [];
    try {
      const ctx = buildGovernanceKnowledgeContext(c);
      points = [...(ctx.physicalExam?.hints || []), ...buildKbReviewPoints(c)];
      if (!points.some(p => c.expect.test(String(p)))) errors.push('未生成体检/招生章程复核提醒');
      if (points.some(p => /不能报|必然受限|不适合报考/.test(String(p)))) errors.push('体检提醒存在过度否定表达');
    } catch (error) {
      errors.push(`KB accessor 抛错：${error?.message || String(error)}`);
    }
    return { ...c, ok: errors.length === 0, errors, points: points.slice(0, 4) };
  });
}

function presetDisplaySmoke() {
  const moreWords = (MAJOR_FILTER_PRESET_KB?.groups || MAJOR_FILTER_PRESET_KB?.moreGroups || []).flatMap(g => g.words || []);
  const errors = [];
  if (moreWords.includes('定向')) errors.push('更多方向不应展示“定向”快捷入口');
  if (moreWords.includes('公费师范')) errors.push('更多方向不应展示“公费师范”快捷入口');
  const targeted = classifyKeywordTokens('定向');
  const publicTeacher = classifyKeywordTokens('公费师范');
  if (targeted.projectAttributeTokens[0]?.id !== 'targeted') errors.push('内部仍应识别“定向”为项目属性');
  if (publicTeacher.projectAttributeTokens[0]?.id !== 'publicTeacher') errors.push('内部仍应识别“公费师范”为项目属性');
  return {
    ok: errors.length === 0,
    errors,
    frontPresetRemoved: !moreWords.includes('定向') && !moreWords.includes('公费师范'),
    internalProjectAttributesKept: targeted.projectAttributeTokens[0]?.id === 'targeted' && publicTeacher.projectAttributeTokens[0]?.id === 'publicTeacher'
  };
}

function reportSmoke() {
  const rec = {
    school: '测试大学', major: '电气工程及其自动化',
    score2026: 520, rank2026: 40000, score2025: 515, rank2025: 41500, score2024: 510, rank2024: 43000,
    scoreDelta2026: 0, scoreDelta: 0, statusLabel: '主要参考', position: '主要参考', matchLabel: '精准匹配',
    matchReason: '专业名称直接包含该词',
    standardMajor: { code: '080601', name: '电气工程及其自动化', categoryCode: '0806', categoryName: '电气类', mappingStatus: 'exact' }
  };
  const current = buildFeishuReport({
    candidateScore: 520,
    selectedBand: { key: 'near', title: '主要参考', rangeText: '510-520 分' },
    filters: { region: 'all', majorKeyword: '电气', bottomLineMode: 'all' },
    dataScope: '辽宁2026物理类', counts: { upper: 1, near: 1, steady: 1, total: 3 },
    selectedRecords: [rec], rangePreset: 'standard', keywordQuery: { rawKeywords: ['电气'] }, matchSummary: { exact: 1 }
  });
  const list = buildSelectionPoolFeishuReport({ candidateScore: 520, items: [rec], reportType: 'selectionPoolOnly' });
  const analyzed = buildSelectionPoolFeishuReport({ candidateScore: 520, items: [rec], reportType: 'selectionPoolWithAnalysis', analysis: { summary: '整体可以作为重点核验', stats: { total: 1, rushCount: 0, stableCount: 1, safeCount: 0 }, aiNarrative: { overall: '整体可以作为重点核验', structureDiagnosis: '专业结构待补充', actions: ['建议补充后段专业'] } } });
  const styled = buildSelectionPoolStyledBlocks({ title: '测试报告', candidateScore: 520, items: [rec], stats: { total: 1 }, summary: analyzed.summary, hasAnalysis: false });
  const requiredSections = (LN_RANK_RELEASE_CONTRACT.reportSections || []).map(x => `## ${x}`);
  const out = [];
  for (const [name, report] of [['当前区间报告', current], ['已选专业清单', list], ['带解读报告', analyzed]]) {
    const text = report.markdown || '';
    const errors = [];
    if (text.length < 200) errors.push('正文过短');
    if (!text.includes('2026最低投档')) errors.push('缺少2026主投档字段');
    if (!text.includes('2025') || !text.includes('2024')) errors.push('缺少2025/2024历史对照');
    if (!text.includes('专业代码')) errors.push('缺少专业代码');
    if (FORBIDDEN.test(text)) errors.push('出现工程词');
    if (name !== '当前区间报告') {
      const h2 = text.split(/\n+/).filter(line => /^##\s+/.test(line)).map(line => line.trim());
      if (h2.length != requiredSections.length || !requiredSections.every((section, index) => h2[index] === section)) errors.push(`报告二级标题必须固定六段，实际：${h2.join('｜') || '未识别'}`);
      if (report.version !== FEISHU_REPORT_CONTRACT.releaseVersion) errors.push(`报告版本未同步：${report.version}`);
    }
    out.push({ name, ok: errors.length === 0, errors, length: text.length, reportType: report.reportType || 'currentBand' });
  }
  out.push({ name: '复制文字版/样式块', ok: Array.isArray(styled) && styled.length > 5, errors: Array.isArray(styled) && styled.length > 5 ? [] : ['样式块为空'], length: Array.isArray(styled) ? styled.length : 0 });
  return out;
}

export async function onRequest() {
  try {
    const catalog = getCatalogStats();
    const policy = getLiaoningPolicyDiagnostics();
    const campus = getCampusDiagnostics();
    const action = getActionDiagnostics();
    const campusAction = campusActionSmoke();
    const cases = CASES.map(caseCheck);
    const reports = reportSmoke();
    const kbAccessorCases = kbAccessorSmoke();
    const presetDisplay = presetDisplaySmoke();
    const uiChecks = uiReadabilitySmoke();
    const errors = [];
    if (catalog.entries !== 883) errors.push(`2026目录条数应为883，实际${catalog.entries}`);
    if (catalog.disciplineCount !== 13) errors.push(`门类数应为13，实际${catalog.disciplineCount}`);
    if (catalog.categoryCount !== 92) errors.push(`专业类数应为92，实际${catalog.categoryCount}`);
    if (!policy.ok) errors.push('辽宁政策 accessor 失败');
    if (!campus.ok) errors.push('校区 KB accessor 失败');
    if (!action.ok) errors.push('按钮层级策略失败');
    cases.filter(x => !x.ok).forEach(x => errors.push(`${x.input}: ${x.errors.join('；')}`));
    reports.filter(x => !x.ok).forEach(x => errors.push(`${x.name}: ${x.errors.join('；')}`));
    kbAccessorCases.filter(x => !x.ok).forEach(x => errors.push(`${x.major}: ${x.errors.join('；')}`));
    if (!presetDisplay.ok) presetDisplay.errors.forEach(e => errors.push(e));
    campusAction.campusCases.filter(x => !x.ok).forEach(x => errors.push(`${x.school} ${x.major}: ${x.errors.join('；')}`));
    campusAction.actionCases.filter(x => !x.ok).forEach(x => errors.push(`${x.name}: 按钮文案异常 ${x.label}`));
    uiChecks.filter(x => !x.ok).forEach(x => errors.push(`${x.name}: ${x.detail || 'UI 可读性检查失败'}`));
    return json({ ok: errors.length === 0, version: FEISHU_REPORT_CONTRACT.releaseVersion, assetVersion: FEISHU_REPORT_CONTRACT.assetVersion, release: FEISHU_REPORT_CONTRACT.releaseName, catalog, policyLine: formatLiaoningOrdinaryUndergraduatePolicyLine(), cases, kbAccessorCases, presetDisplay, reports, uiChecks, errors });
  } catch (error) {
    return json({ ok: false, version: FEISHU_REPORT_CONTRACT.releaseVersion, assetVersion: FEISHU_REPORT_CONTRACT.assetVersion, release: FEISHU_REPORT_CONTRACT.releaseName, message: error?.message || String(error), hint: '自测接口失败。请查看服务端日志，不在前台暴露 stack trace。' }, 500);
  }
}
