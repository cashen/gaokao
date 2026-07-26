import { REPORT_COPY } from '../../domain/human-copy-dictionary.v3964_0.js?v=3964_0';
import { fmt } from '../../core/number-utils.js?v=3951_0';
import { renderHistoryScore } from './history-score-render.v3964_0.js?v=3964_0';
import { mountDiagnoseButtons } from '../diagnose/controller.js?v=3951_0';
import { buildReviewPointsForRecord } from './review-point-builder.js?v=3951_0';
import { buildSchoolIndustryTags } from '../../knowledge/index.js?v=3951_0';
import { getLocalBackgroundHint } from '../../knowledge/local-background-hint.js?v=3951_0';
import { get211BackgroundHint } from '../../knowledge/211-background-hint.js?v=3951_0';
import { normalizeScoreBand } from '../../domain/score-band-contract.v3963_1.js?v=3963_1';
import { normalizeSpecialProjectMode, SPECIAL_PROJECT_SHOW_MODE, specialProjectResultNote, specialProjectCardBadge } from '../../domain/special-project-policy.js?v=3951_0';
import { resolveLocalStrengthMark, filterLocalStrengthRecords, buildLocalStrengthSummary, localStrengthRelationText } from './local-strength-view.js?v=3951_0';
import { majorUnderstandingCard } from '../../knowledge/major-understanding-resolver.js?v=3951_0';

const expandedMajorUnderstandingCards = new Set();
const expandedLocalStrengthCards = new Set();
const expandedReviewPointCards = new Set();
const naturalCompareState = { open: false, type: '', key: '', signature: '', showAll: false };

function interactionKey(record = {}, prefix = 'card') {
  const base = majorUnderstandingKey(record);
  return `${prefix}__${base}`;
}

function majorUnderstandingKey(record = {}) {
  return [record.id, record.schoolCode2026, record.majorCode2026, record.school, record.major, record.score2026 ?? record.score, record.rank2026 ?? record.rank].filter(Boolean).join('__') || `${record.school || ''}__${record.major || ''}`;
}

function safe(value, fallback = '—') { return value == null || value === '' ? fallback : value; }
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function tagClass(tag) {
  if (['985','211','双一流'].includes(tag)) return 'strong';
  if (tag.includes('公办') || tag.includes('双非')) return 'public';
  if (tag.includes('民办') || tag.includes('独立') || tag.includes('合作办学')) return 'private';
  if (tag.includes('·') || ['北京','天津','上海','广东','江苏','浙江','山东','河北','吉林','黑龙江'].includes(tag)) return 'location';
  if (tag.includes('核验') || tag.includes('缺失')) return 'warning';
  if (tag.includes('分校') || tag.includes('校区') || tag.includes('研究院')) return 'campus';
  return '';
}

function bandKeyFromActive(activeBand, record = {}) {
  const key = String(activeBand || record.bandKey || record.band || '').trim();
  if (['upper','near','steady'].includes(key)) return key;
  const text = [record.statusLabel, record.position, record.matchBand, record.matchReason].filter(Boolean).join(' ');
  if (/稍高目标|少量看|上探/.test(text)) return 'upper';
  if (/低分侧补充|补安全|偏稳/.test(text)) return 'steady';
  return 'near';
}
function bandLabel(key) {
  return key === 'upper' ? '稍高目标' : key === 'steady' ? '低分侧补充' : '主要参考';
}

function tags(record) {
  const arr = [];
  const tier = Array.isArray(record.schoolTierTags) && record.schoolTierTags.length ? record.schoolTierTags : record.schoolTags;
  if (Array.isArray(tier)) arr.push(...tier);
  else if (record.isNon985211) arr.push('双非（非985/211）');
  arr.push(record.natureLabel || '性质待核验');
  if (record.schoolEntityTypeLabel) arr.push(record.schoolEntityTypeLabel);
  arr.push(record.displayLocation || '地域待核验');
  if (Array.isArray(record.bottomLineTags)) arr.push(...record.bottomLineTags.filter(tag => !arr.includes(tag)));
  if (record.locationWarning) arr.push(record.locationWarning);
  return [...new Set(arr.filter(Boolean))];
}

function keywordContextParts(data) {
  const q = data?.keywordQuery;
  if (!q?.rawKeywords?.length) return null;
  const rawKeywords = q.rawKeywords.map(k => String(k || '').trim()).filter(Boolean);
  if (!rawKeywords.length) return null;
  const visibleKeywords = rawKeywords.slice(0, 3);
  const extraCount = Math.max(0, rawKeywords.length - visibleKeywords.length);
  const keywords = rawKeywords.map(k => escapeHtml(k)).join(' / ');
  const s = data?.matchSummary || {};
  const summaryParts = [];
  if (s.exact) summaryParts.push(`精准匹配 ${fmt(s.exact)} 个`);
  if (s.related) summaryParts.push(`相关方向 ${fmt(s.related)} 个`);
  if (s.industry) summaryParts.push(`行业关联 ${fmt(s.industry)} 个`);
  if (s.project) summaryParts.push(`项目属性 ${fmt(s.project)} 个`);
  const flags = [];
  if (q.hasProjectKeyword) flags.push('包含项目属性搜索');
  if (q.hasIndustryKeyword) flags.push('包含行业路径搜索');
  if (Array.isArray(data.keywordWarnings)) flags.push(...data.keywordWarnings.filter(Boolean));
  return { rawKeywords, visibleKeywords, extraCount, keywords, summaryParts, flags };
}

function buildSpecialProjectContext(specialMode, source = {}) {
  const hidden = Number(source?.specialProjectHidden || source?.specialProjectStats?.hidden || 0);
  const shown = Number(source?.specialProjectShown || source?.specialProjectStats?.shown || 0);
  if (specialMode === SPECIAL_PROJECT_SHOW_MODE) {
    return {
      tone: 'showing',
      short: shown ? `特殊项目已显示 ${fmt(shown)} 条` : '特殊项目已显示',
      action: '继续隐藏',
      detail: '专项、定向、预科等需要单独确认资格、服务年限、费用和校区，不能按普通专业简单比较。'
    };
  }
  return {
    tone: 'hidden',
    short: hidden ? `已隐藏特殊项目 ${fmt(hidden)} 条` : '特殊项目默认隐藏',
    action: '显示',
    detail: '专项、定向、预科等通常需要资格、服务年限或费用确认，普通家庭默认先看常规专业。'
  };
}

function resultScope(group = {}, state = {}) {
  const records = Array.isArray(group?.records) ? group.records : [];
  const eligible = Math.max(records.length, Number(group?.count || 0));
  const loaded = records.length;
  const configuredVisible = Number(state?.visible?.[state?.activeBand] || 16);
  const visible = Math.min(loaded, Math.max(0, configuredVisible));
  const pagination = group?.pagination || {};
  return {
    eligible,
    loaded,
    visible,
    hasMore: Boolean(pagination.hasMore),
    remaining: Math.max(0, eligible - loaded)
  };
}

function renderResultContextBar(data, group, state, specialMode) {
  const keyword = keywordContextParts(data);
  const special = buildSpecialProjectContext(specialMode, data?.source || {});
  const scope = resultScope(group, state);
  const bandTitle = escapeHtml(group.title || '当前分段');
  const rangeText = escapeHtml(group.rangeText || '输入分数后生成');
  const currentLine = '<span class="result-context-label">当前</span><strong class="result-context-band">' + bandTitle + '</strong><span class="result-context-range">' + rangeText + '</span>';
  const scopeLine = '<span class="result-context-scope">符合当前条件 <b>' + fmt(scope.eligible) + '</b> 条｜已加载 <b>' + fmt(scope.loaded) + '</b> 条｜当前显示 <b>' + fmt(scope.visible) + '</b> 条</span>';
  const keywordLine = keyword
    ? '<span class="result-context-label">关键词</span><span class="result-context-terms">' + keyword.visibleKeywords.map(escapeHtml).join(' / ') + (keyword.extraCount ? ' 等' : '') + '</span><span class="result-context-sort">按当前条件排序</span>'
    : '<span class="result-context-label">关键词</span><span class="result-context-terms">未限定专业方向</span><span class="result-context-sort">按当前条件排序</span>';
  const keywordDetail = keyword
    ? '<div class="result-context-detail-row"><b>关键词：</b>' + keyword.keywords + '<br><b>关键词说明：</b>' + (keyword.summaryParts.length ? escapeHtml(keyword.summaryParts.join('｜')) : '暂无细分数量') + (keyword.flags.length ? '｜' + keyword.flags.map(escapeHtml).join('；') : '') + '<br><span>精准匹配更接近你输入的关键词；相关方向可以一起参考；行业关联需要看具体专业是否真的接受。</span></div>'
    : '<div class="result-context-detail-row"><b>关键词说明：</b>当前未限定专业方向，结果主要按历史分数区间、地区、学校和底线条件筛选。</div>';
  const pageDetail = scope.hasMore
    ? '<div class="result-context-detail-row"><b>结果范围：</b>当前已按统一顺序加载前 ' + fmt(scope.loaded) + ' 条，仍有 ' + fmt(scope.remaining) + ' 条符合条件的专业可继续加载。页面不会把已加载列表当成全部结果。</div>'
    : '<div class="result-context-detail-row"><b>结果范围：</b>当前符合条件的专业已全部加载完成。</div>';
  return '<section class="result-context-bar result-context-' + escapeHtml(special.tone) + '" aria-label="结果说明">' +
    '<div class="result-context-main">' +
      '<span class="result-context-current">' + currentLine + '</span>' +
      scopeLine +
      '<span class="result-context-keyword">' + keywordLine + '</span>' +
      '<span class="result-context-special">' + escapeHtml(special.short) + ' <button type="button" class="result-context-link" data-context-special-toggle>' + escapeHtml(special.action) + '</button></span>' +
      '<button type="button" class="result-context-more" data-result-context-toggle aria-expanded="false">展开说明</button>' +
    '</div>' +
    '<div class="result-context-details" hidden>' +
      keywordDetail +
      pageDetail +
      '<div class="result-context-detail-row"><b>特殊项目：</b>' + escapeHtml(special.detail) + '</div>' +
    '</div>' +
  '</section>';
}

function renderResultViewTabs(state, group) {
  const records = Array.isArray(group?.records) ? group.records : [];
  const summary = buildLocalStrengthSummary(records);
  const mode = state.resultViewMode === 'localStrength' ? 'localStrength' : 'all';
  const allActive = mode === 'all' ? ' is-active' : '';
  const strengthActive = mode === 'localStrength' ? ' is-active' : '';
  const note = summary.total
    ? '已加载的 ' + fmt(records.length) + ' 条中，有 ' + fmt(summary.total) + ' 条院校背景提示' + (summary.sourceText ? '（' + summary.sourceText + '）' : '') + '。提示只说明院校与专业存在可复核对应，不代表录取判断，也不替家庭决定专业。'
    : '已加载的 ' + fmt(records.length) + ' 条中暂未出现院校背景提示，可以继续查看当前列表或加载更多专业。';
  return '<section class="result-view-tabs" aria-label="结果查看方式">' +
    '<div class="result-view-tab-row">' +
      '<button type="button" class="result-view-tab' + allActive + '" data-result-view="all" aria-pressed="' + (mode === 'all' ? 'true' : 'false') + '">当前列表 <b>' + fmt(records.length) + '</b></button>' +
      '<button type="button" class="result-view-tab' + strengthActive + '" data-result-view="localStrength" aria-pressed="' + (mode === 'localStrength' ? 'true' : 'false') + '">背景提示 <b>' + fmt(summary.total) + '</b></button>' +
    '</div>' +
    '<p class="result-view-note">' + escapeHtml(note) + '</p>' +
  '</section>';
}

function renderLocalStrengthFeature(record, activeBand, viewMode) {
  const mark = resolveLocalStrengthMark(record);
  if (!mark.matched) return '';
  const relation = localStrengthRelationText(record, activeBand);
  const verify = Array.isArray(mark.verifyItems) && mark.verifyItems.length ? mark.verifyItems.slice(0, 5).join(' / ') : '招生计划 / 校区 / 近年位次 / 培养方向';
  const source = mark.evidenceLabel || mark.sourceText || (Array.isArray(mark.sourceKinds) && mark.sourceKinds.length ? mark.sourceKinds.join(' / ') : '院校背景');
  const direction = mark.direction || '院校背景方向';
  const why = mark.why || '这条专业与学校办学背景或行业方向有关，建议家庭单独了解和复核。';
  if (viewMode !== 'localStrength') {
    return `<div class="local-strength-mini"><span>院校背景提示</span><b>${escapeHtml(direction)}</b><em>${escapeHtml(source)}</em></div>`;
  }
  const key = interactionKey(record, 'local-strength');
  const panelId = `local-strength-more-${Math.abs(hashText(key))}`;
  const open = expandedLocalStrengthCards.has(key);
  return `<section class="local-strength-card-block is-compact is-controlled${open ? ' is-expanded' : ''}" aria-label="院校背景提示" data-local-strength-card="${escapeHtml(key)}">
    <div class="local-strength-head"><span>院校背景提示</span><b>${escapeHtml(direction)}</b><em>${escapeHtml(source)}</em></div>
    <p class="local-strength-one"><strong>提醒：</strong>${escapeHtml(why)}</p>
    <button type="button" class="local-strength-toggle" data-local-strength-toggle="${escapeHtml(key)}" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${panelId}">${open ? '收起提醒原因' : '展开提醒原因'}</button>
    <div id="${panelId}" class="local-strength-details is-controlled-panel" ${open ? '' : 'hidden'}>
      <p><strong>和当前分数的关系：</strong>${escapeHtml(relation)}</p>
      <p><strong>填报前再确认：</strong>${escapeHtml(verify)}</p>
      <small>${escapeHtml(mark.boundary || '不是录取判断，也不是填报建议；只提醒家庭重点了解和复核。')}</small>
    </div>
  </section>`;
}

function renderSearchAdvices(data) {
  const advices = [...(Array.isArray(data?.filterConflicts) ? data.filterConflicts : []), ...(Array.isArray(data?.searchAdvices) ? data.searchAdvices : [])];
  if (!advices.length) return '';
  return advices.map(advice => {
    const actions = Array.isArray(advice.actions) ? advice.actions : (advice.action ? [advice.action] : []);
    return `<div class="search-advice search-advice-${escapeHtml(advice.level || 'info')}"><div>${escapeHtml(advice.message || '')}</div>${advice.explanation ? `<small>${escapeHtml(advice.explanation)}</small>` : ''}${actions.length ? `<div class="search-advice-actions">${actions.map(action => `<button type="button" data-search-advice-action="${escapeHtml(action.type)}" data-target="${escapeHtml(action.target || '')}">${escapeHtml(action.label || '应用建议')}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
}

function poolButton(record, index, selectionPool) {
  const inPool = Boolean(selectionPool?.has?.(record));
  return `<button class="pool-add-button ${inPool ? 'is-added' : ''}" type="button" data-pool-index="${index}" ${inPool ? 'disabled' : ''}>${inPool ? REPORT_COPY.added : REPORT_COPY.add}</button>`;
}
function matchBadge(record) {
  const label = record.matchLabel || (Array.isArray(record.matchBadges) ? record.matchBadges[0] : '');
  if (!label) return '';
  const level = record.matchLevel || 'generic';
  return `<span class="match-trust-badge match-${escapeHtml(level)}">${escapeHtml(label)}</span>`;
}
function matchReason(record) {
  const reason = record.matchReason || '';
  if (!reason) return '';
  return `<div class="match-reason">为什么出现：${escapeHtml(reason).replace(new RegExp('^命' + '中原因：'), '').replace(/^为什么出现：/, '')}</div>`;
}



function normalizeCompareText(value = '') {
  return String(value || '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function compareRecordKey(record = {}) {
  return majorUnderstandingKey(record);
}

function scoreDistance(record = {}) {
  const v = Number(record.scoreDelta);
  return Number.isFinite(v) ? Math.abs(v) : 9999;
}

function compareYearText(record = {}) {
  const s2026 = record.score2026 ?? record.score;
  const r2026 = record.rank2026 ?? record.rank;
  const s2025 = record.score2025;
  const r2025 = record.rank2025;
  const s2024 = record.score2024 ?? record.historyScore2024 ?? record.lastYearScore;
  const r2024 = record.rank2024 ?? record.historyRank2024 ?? record.lastYearRank;
  const year2026 = (s2026 != null || r2026 != null) ? `2026 ${fmt(s2026)}分 / ${fmt(r2026)}位` : '2026投档数据待核验';
  const year2025 = (s2025 != null || r2025 != null) ? `2025 ${fmt(s2025)}分 / ${fmt(r2025)}位` : '2025同口径待核验';
  const year2024 = (s2024 != null || r2024 != null) ? `2024 ${fmt(s2024)}分 / ${fmt(r2024)}位` : '2024同口径待核验';
  return { year2026, year2025, year2024 };
}

function compareProgramVariant(record = {}) {
  const special = record.specialProject || {};
  const text = [record.major, special.labelText, special.primaryLabel, ...(Array.isArray(record.flags) ? record.flags : [])].filter(Boolean).join(' ');
  if (special.hasSpecialProject) {
    const label = String(special.labelText || special.primaryLabel || '特殊项目').trim();
    return { key: 'special:' + normalizeCompareText(label || 'special'), label: label || '特殊项目', isSpecial: true };
  }
  if (/中外|合作办学|国际本科|校企合作/.test(text)) return { key: 'cooperation', label: '合作项目', isSpecial: true };
  if (/高收费|较高收费/.test(text)) return { key: 'high-fee', label: '高收费项目', isSpecial: true };
  if (/定向|专项|预科|民族班/.test(text)) return { key: 'eligibility', label: '需资格项目', isSpecial: true };
  if (/试验班|实验班|拔尖|强基|本硕|本博|菁英班|卓越班/.test(text)) return { key: 'program-variant', label: '培养项目', isSpecial: true };
  return { key: 'regular', label: '', isSpecial: false };
}

function compareFamilyLabel(label, variant) {
  const base = String(label || '').trim() || '专业待核验';
  return variant?.label ? base + '（' + variant.label + '）' : base;
}

function majorFamily(record = {}) {
  const sm = record.standardMajor || {};
  const raw = String(record.major || '').trim();
  const variant = compareProgramVariant(record);
  if (sm.name && ['exact', 'alias'].includes(sm.mappingStatus || 'exact')) {
    return {
      key: 'major:' + normalizeCompareText(sm.name) + '|' + variant.key,
      label: compareFamilyLabel(sm.name, variant),
      level: 'exact',
      variant
    };
  }
  if (sm.categoryName && sm.categoryName.length >= 2) {
    return {
      key: 'category:' + normalizeCompareText(sm.categoryName) + '|' + variant.key,
      label: compareFamilyLabel(sm.categoryName, variant),
      level: 'class',
      variant
    };
  }
  const cleaned = normalizeCompareText(raw)
    .replace(/中外合作办学|合作办学|高收费|较高收费|国际本科|校企合作/g, '')
    .replace(/\d\+\d|本硕|本博|菁英班|卓越班/g, '');
  if (!cleaned || cleaned.length < 2) return null;
  return {
    key: 'raw:' + cleaned + '|' + variant.key,
    label: compareFamilyLabel(cleaned.length > 18 ? cleaned.slice(0, 18) + '…' : cleaned, variant),
    level: 'raw',
    variant
  };
}

function makeCompareGroups(records = []) {
  const list = Array.isArray(records) ? records : [];
  const schools = new Map();
  const majors = new Map();
  const byRecord = new Map();
  list.forEach((record) => {
    const rKey = compareRecordKey(record);
    if (!rKey) return;
    const schoolLabel = String(record.school || '').trim();
    const schoolKey = normalizeCompareText(schoolLabel);
    if (schoolKey) {
      if (!schools.has(schoolKey)) schools.set(schoolKey, { type: 'school', key: schoolKey, label: schoolLabel, records: [] });
      schools.get(schoolKey).records.push(record);
    }
    const family = majorFamily(record);
    if (family?.key) {
      if (!majors.has(family.key)) majors.set(family.key, { type: 'major', key: family.key, label: family.label, level: family.level, records: [] });
      majors.get(family.key).records.push(record);
    }
  });
  const schoolGroups = [...schools.values()]
    .filter(g => g.records.length >= 2)
    .map(g => ({ ...g, records: g.records.sort((a, b) => scoreDistance(a) - scoreDistance(b)).slice(0, 8) }))
    .sort((a, b) => b.records.length - a.records.length || String(a.label).localeCompare(String(b.label), 'zh-Hans-CN'))
    .slice(0, 8);
  const majorGroups = [...majors.values()]
    .filter(g => new Set(g.records.map(r => normalizeCompareText(r.school))).size >= 2)
    .map(g => ({ ...g, schoolCount: new Set(g.records.map(r => normalizeCompareText(r.school))).size, records: g.records.sort((a, b) => scoreDistance(a) - scoreDistance(b)).slice(0, 8) }))
    .sort((a, b) => (b.schoolCount || 0) - (a.schoolCount || 0) || b.records.length - a.records.length || String(a.label).localeCompare(String(b.label), 'zh-Hans-CN'))
    .slice(0, 8);
  schoolGroups.forEach(g => g.records.forEach(record => {
    const key = compareRecordKey(record);
    const info = byRecord.get(key) || {};
    info.school = g;
    byRecord.set(key, info);
  }));
  majorGroups.forEach(g => g.records.forEach(record => {
    const key = compareRecordKey(record);
    const info = byRecord.get(key) || {};
    info.major = g;
    byRecord.set(key, info);
  }));
  return { schoolGroups, majorGroups, byRecord };
}

function compareProjectSummary(record = {}) {
  const variant = compareProgramVariant(record);
  const campus = String(record.campusName || record.campus || record.campusLabel || '').trim();
  const parts = [];
  if (variant.isSpecial) parts.push(variant.label || '需单独比较项目');
  if (campus) parts.push('校区：' + campus);
  return parts.join('｜');
}

function compareRowNote(record = {}, type = 'school') {
  const notes = [];
  const mark = resolveLocalStrengthMark(record);
  if (mark?.matched) notes.push('院校背景提示：' + (mark.evidenceLabel || mark.sourceText || '可复核'));
  const project = compareProjectSummary(record);
  if (project) notes.push(project);
  const review = reviewSummary(record, buildReviewPointsForRecord(record, { limit: 2 }));
  if (review) notes.push(review.replace(/^复核：/, '复核：').replace(/^需核验：/, '需核验：'));
  if (type === 'school') {
    const info = majorUnderstandingCard(record);
    if (info?.oneLine) notes.push(info.oneLine.replace(/。$/, '').slice(0, 34));
  }
  return notes.slice(0, 3).join('；') || '建议结合招生章程、校区和培养方案复核';
}

function renderCompareRows(group) {
  const type = group?.type || 'school';
  const rows = (group?.records || []).slice(0, 8).map(record => {
    const years = compareYearText(record);
    const first = type === 'school' ? safe(record.major) : safe(record.school);
    const second = type === 'school'
      ? years.year2026
      : String(record.displayLocation || record.geoEntity || '地区待核验') + '｜' + years.year2026;
    return '<li class="natural-compare-row">' +
      '<b>' + escapeHtml(first) + '</b>' +
      '<span>' + escapeHtml(second) + '</span>' +
      '<span>' + escapeHtml(years.year2025) + '</span>' +
      '<span>' + escapeHtml(years.year2024) + '</span>' +
      '<em>' + escapeHtml(compareRowNote(record, type)) + '</em>' +
    '</li>';
  }).join('');
  return '<ul class="natural-compare-rows">' + rows + '</ul>';
}

function renderNaturalComparePanel(compareInfo, scope = {}) {
  const schoolGroups = compareInfo?.schoolGroups || [];
  const majorGroups = compareInfo?.majorGroups || [];
  const total = schoolGroups.length + majorGroups.length;
  if (!total) return '';
  if (naturalCompareState.key) {
    const groups = naturalCompareState.type === 'major' ? majorGroups : schoolGroups;
    if (!groups.some(g => g.key === naturalCompareState.key)) {
      naturalCompareState.key = '';
      naturalCompareState.type = '';
    }
  }
  const selectedGroups = naturalCompareState.type === 'major' ? majorGroups : schoolGroups;
  const selected = naturalCompareState.key ? selectedGroups.find(g => g.key === naturalCompareState.key) : null;
  const opened = naturalCompareState.open || Boolean(selected);
  const loaded = Number(scope.loaded || 0);
  const summary = '已加载的 ' + fmt(loaded) + ' 条里，有 ' + fmt(total) + ' 组可以放在一起比较：同一学校 ' + fmt(schoolGroups.length) + ' 组，同一专业 ' + fmt(majorGroups.length) + ' 组。';
  if (!opened) {
    return '<section class="natural-compare-panel is-compact" aria-label="同校与同专业比较">' +
      '<div class="natural-compare-head"><span>同校 / 同专业比较</span><p>' + escapeHtml(summary) + '</p><button type="button" data-compare-action="open">开始比较</button></div>' +
    '</section>';
  }
  const perBucket = naturalCompareState.showAll || Boolean(selected) ? 8 : 4;
  const groupButton = (group, type) => {
    const active = selected?.type === type && selected.key === group.key ? ' is-active' : '';
    const count = type === 'school' ? group.records.length + ' 条' : (group.schoolCount || group.records.length) + ' 所';
    return '<button type="button" class="natural-compare-group' + active + '" data-compare-action="group" data-compare-type="' + type + '" data-compare-key="' + escapeHtml(group.key) + '"><b>' + escapeHtml(group.label) + '</b><span>' + fmt(count.replace(/[^0-9]/g, '')) + (type === 'school' ? ' 条' : ' 所') + '</span></button>';
  };
  const schoolButtons = schoolGroups.slice(0, perBucket).map(g => groupButton(g, 'school')).join('');
  const majorButtons = majorGroups.slice(0, perBucket).map(g => groupButton(g, 'major')).join('');
  const shownGroups = Math.min(schoolGroups.length, perBucket) + Math.min(majorGroups.length, perBucket);
  const hiddenGroups = Math.max(0, total - shownGroups);
  const moreButton = hiddenGroups || naturalCompareState.showAll
    ? '<button type="button" class="natural-compare-more" data-compare-action="more">' + (naturalCompareState.showAll ? '收起扩展分组' : '查看其余 ' + fmt(hiddenGroups) + ' 组') + '</button>'
    : '';
  const fallback = '<div class="natural-compare-empty">先选择“同一学校”或“同一专业”中的一组，只比较已加载的专业，不改变筛选条件。</div>';
  const selectedTitle = selected
    ? (selected.type === 'school' ? selected.label + '：同校不同专业' : selected.label + '：同专业不同学校')
    : '';
  const selectedHtml = selected
    ? '<div class="natural-compare-detail"><div class="natural-compare-detail-title"><b>' + escapeHtml(selectedTitle) + '</b><span>用于家庭比较和复核，不替家庭下结论。</span></div>' + renderCompareRows(selected) + '</div>'
    : fallback;
  return '<section class="natural-compare-panel is-open" aria-label="同校与同专业比较">' +
    '<div class="natural-compare-head"><span>同校 / 同专业比较</span><p>' + escapeHtml(summary) + '</p><button type="button" data-compare-action="close">收起</button></div>' +
    '<div class="natural-compare-groups">' +
      (schoolButtons ? '<div class="natural-compare-bucket"><strong>同一学校，比较专业</strong>' + schoolButtons + '</div>' : '') +
      (majorButtons ? '<div class="natural-compare-bucket"><strong>同一专业，比较学校</strong>' + majorButtons + '</div>' : '') +
    '</div>' +
    moreButton +
    selectedHtml +
  '</section>';
}

function renderCompareChips(record, compareInfo) {
  const info = compareInfo?.byRecord?.get?.(compareRecordKey(record));
  if (!info) return '';
  const chips = [];
  if (info.school) chips.push(`<button type="button" class="natural-compare-chip" data-compare-action="chip" data-compare-type="school" data-compare-key="${escapeHtml(info.school.key)}">同校比较（另 ${fmt(Math.max(0, info.school.records.length - 1))} 条）</button>`);
  if (info.major) chips.push(`<button type="button" class="natural-compare-chip" data-compare-action="chip" data-compare-type="major" data-compare-key="${escapeHtml(info.major.key)}">同专业比较（另 ${fmt(Math.max(0, (info.major.schoolCount || info.major.records.length) - 1))} 所）</button>`);
  if (!chips.length) return '';
  return `<div class="natural-compare-chip-row" aria-label="可横向比较">${chips.slice(0, 2).join('')}</div>`;
}

function renderKnowledgeChips(record) {
  const tags = buildSchoolIndustryTags(record).slice(0, 3);
  if (!tags.length) return '';
  return `<div class="knowledge-chip-row" aria-label="院校背景提示">${tags.map(x => `<span class="knowledge-chip">${escapeHtml(x.tag)}</span>`).join('')}</div>`;
}

function renderBackgroundHints(record) {
  const local = getLocalBackgroundHint(record);
  const national211 = get211BackgroundHint(record);
  const hints = [];
  if (local?.visible) hints.push({ ...local, kind: 'local', link: `/ln-rank/local-mainline.html?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}`, linkText: '省内背景' });
  if (national211?.visible) hints.push({ ...national211, kind: '211', link: `/ln-rank/211-mainline.html?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}`, linkText: '211背景' });
  if (!hints.length) return '';
  return `<div class="background-hint-stack" aria-label="学校专业背景提示">${hints.slice(0, 2).map(hint => {
    const review = Array.isArray(hint.reviewPoints) && hint.reviewPoints.length ? `再看：${hint.reviewPoints.slice(0, 3).join(' / ')}` : '再看：课程方向 / 招生章程';
    const title = `${hint.text}。${review}。该提示不是录取判断，只说明专业和学校背景有可复核对应。`;
    const extra = hint.kind === '211' ? ' national-211-hint' : '';
    return `<div class="local-context-inline local-background-hint${extra} is-${escapeHtml(hint.level || 'trajectory')}" title="${escapeHtml(title)}"><span class="local-context-chip">${escapeHtml(hint.label)}</span><span class="local-context-name">${escapeHtml(hint.direction)}</span><span class="local-context-review">${escapeHtml(review)}</span><a class="mainline-card-link" href="${hint.link}">${escapeHtml(hint.linkText)}</a></div>`;
  }).join('')}</div>`;
}
function renderLocalContextInline(record) { return renderBackgroundHints(record); }

function renderSpecialProjectBadge(record) {
  const label = specialProjectCardBadge(record);
  return label ? `<span class="special-project-badge">${escapeHtml(label)}｜需资格核验</span>` : '';
}

function renderSpecialProjectAlert(record) {
  const info = record.specialProject || {};
  if (!info.hasSpecialProject) return '';
  const review = Array.isArray(info.reviewPoints) && info.reviewPoints.length
    ? info.reviewPoints.slice(0, 2).join('；')
    : '请核验报考资格、招生批次和 2026 年招生计划备注。';
  return `<div class="special-project-alert"><b>特殊项目提醒：</b>${escapeHtml(info.labelText || info.primaryLabel || '特殊项目')}不能按普通专业简单参考，${escapeHtml(review)}</div>`;
}


function reviewSummary(record, points) {
  const text = [record.major, record.school, record.matchReason, ...(Array.isArray(record.flags) ? record.flags : []), ...points].join(' ');
  const labels = [];
  if (/中外|合作办学/.test(text)) labels.push('中外合作');
  if (/高收费|较高收费|费用待核验/.test(text)) labels.push('高收费/学费');
  if (/公费师范|优师专项/.test(text)) labels.push('公费师范');
  if (/定向/.test(text)) labels.push('定向');
  if (/试验班|实验班|拔尖班|本博|本研/.test(text)) labels.push('试验班/分流');
  if (labels.length) return `需核验：${labels.slice(0, 3).join(' / ')}`;
  if (/交叉学科|新目录|培养学院|课程设置/.test(text)) return '需核验：新目录/交叉学科，查看招生计划与培养学院';
  const sm = record.standardMajor || {};
  if (sm.categoryName) return `复核：2026目录归属：${sm.categoryName}`;
  return points[0] ? `需核验：${points[0].replace(/^按2026本科专业目录，?/, '').slice(0, 34)}` : '';
}

function renderReviewPoints(record) {
  const points = buildReviewPointsForRecord(record, { limit: 5 });
  if (!points.length) return '';
  const summary = reviewSummary(record, points);
  const detailItems = points.slice(0, 5).map(p => `<li>${escapeHtml(p)}</li>`).join('');
  const key = interactionKey(record, 'review');
  const panelId = `card-review-more-${Math.abs(hashText(key))}`;
  const open = expandedReviewPointCards.has(key);
  const details = points.length ? `<div class="card-review-details is-controlled${open ? ' is-expanded' : ''}" data-review-points-card="${escapeHtml(key)}"><button type="button" class="card-review-toggle" data-review-points-toggle="${escapeHtml(key)}" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${panelId}">${open ? '收起复核详情' : '查看复核详情'}</button><ul id="${panelId}" class="card-review-list" ${open ? '' : 'hidden'}>${detailItems}</ul></div>` : '';
  return `<div class="card-review-points"><div class="card-review-summary">${escapeHtml(summary || '需核验：查看复核详情')}</div>${details}</div>`;
}


function renderMajorUnderstandingPreview(record) {
  const info = majorUnderstandingCard(record);
  if (!info?.oneLine) return '';
  const questions = Array.isArray(info.questions) ? info.questions.slice(0, 2).filter(Boolean) : [];
  const qHtml = questions.length ? `<ul class="major-understanding-questions">${questions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul>` : '';
  const classLevel = info.isClassLevel ? ' is-class-level' : '';
  const key = majorUnderstandingKey(record);
  const panelId = `major-understanding-more-${Math.abs(hashText(key))}`;
  const open = expandedMajorUnderstandingCards.has(key);
  if (!questions.length) {
    return `<section class="major-understanding-preview is-static${classLevel}" aria-label="这个专业先了解什么">
      <div class="major-understanding-summary">
        <span class="major-understanding-title">这个专业先了解</span>
        <span class="major-understanding-one-line">${escapeHtml(info.oneLine)}</span>
      </div>
    </section>`;
  }
  return `<section class="major-understanding-preview is-controlled${classLevel}${open ? ' is-expanded' : ''}" aria-label="这个专业先了解什么" data-major-understanding-card="${escapeHtml(key)}">
    <button type="button" class="major-understanding-summary" data-major-understanding-toggle="${escapeHtml(key)}" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${panelId}">
      <span class="major-understanding-title">这个专业先了解</span>
      <span class="major-understanding-one-line">${escapeHtml(info.oneLine)}</span>
      <span class="major-understanding-toggle" aria-hidden="true">${open ? '收起' : '展开'}</span>
    </button>
    <div id="${panelId}" class="major-understanding-more" ${open ? '' : 'hidden'}><b>家庭先确认：</b>${qHtml}</div>
  </section>`;
}

function hashText(value = '') {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return hash || 1;
}

function renderMajorCode(record) {
  const sm = record?.standardMajor || {};
  if (sm.code && sm.name && ['exact','alias'].includes(sm.mappingStatus || 'exact')) {
    return `<div class="major-code-line"><span>专业代码：<b>${escapeHtml(sm.code)}</b>｜${escapeHtml(sm.name)}</span></div>`;
  }
  if (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category') {
    return `<div class="major-code-line is-category"><span>专业类：<b>${escapeHtml(sm.categoryCode)}</b>｜${escapeHtml(sm.categoryName)}</span></div>`;
  }
  return '';
}

function localMainlineLink(record) {
  if (!record?.school || !record?.major) return '';
  const hint = getLocalBackgroundHint(record);
  if (!hint?.visible) return '';
  const href = `/ln-rank/local-mainline.html?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}`;
  const title = `${hint.text}。这里只用于家庭复核，不代表录取判断。`;
  return `<a class="local-mainline-card-link" href="${href}" title="${escapeHtml(title)}">省内背景</a>`;
}

function card(record, index = 0, selectionPool = null, activeBand = 'near', viewMode = 'all', compareInfo = null) {
  const delta = Number(record.scoreDelta || 0);
  const deltaText = delta > 0 ? `+${delta}` : String(delta);
  const statusKey = record.statusKey || 'match';
  const bandKey = bandKeyFromActive(activeBand, record);
  const bandClass = `is-band-${bandKey}`;
  const displayBandLabel = bandLabel(bandKey);
  const tagHtml = tags(record).map(t => `<span class="school-tag ${tagClass(t)}">${escapeHtml(t)}</span>`).join('');
  const localStrength = resolveLocalStrengthMark(record);
  const strengthClass = localStrength.matched ? ' has-local-strength' : '';
  const schoolEntity = record.schoolEntity || {};
  return `<article class="major-card ln-major-card status-${statusKey} ${bandClass}${strengthClass}">
    <div class="major-card-top">
      <div><div class="school">${escapeHtml(safe(record.school))}</div><div class="major">${escapeHtml(safe(record.major))}${matchBadge(record)}${renderSpecialProjectBadge(record)}</div></div>
      <span class="status-badge ln-band-pill ${bandClass}" title="历史位置：按辽宁2026位次关系分组，不代表录取把握。">历史位置：${escapeHtml(displayBandLabel)}</span>
    </div>
    <div class="meta-pills">
      <span class="meta-pill">2026投档最低分：${fmt(record.score2026 ?? record.score)} 分</span>
      <span class="meta-pill">2026对应累计位次约：${fmt(record.rank2026 ?? record.rank)}</span>
      <span class="meta-pill">相对参考分数：${deltaText} 分</span>
      <span class="meta-pill">讨论位置：<b class="ln-fit-position ${bandClass}">${escapeHtml(safe(record.position))}</b></span>
    </div>
    ${tagHtml ? `<div class="school-tags">${tagHtml}</div>` : ''}
    ${matchReason(record)}
    <div class="major-card-actions major-card-actions--primary">
      ${poolButton(record, index, selectionPool)}
      <button class="school-all-entry-button" type="button" data-view-school-all data-school="${escapeHtml(record.school || '')}" data-school-entity="${escapeHtml(schoolEntity.entityId || record.schoolEntityId || '')}" data-school-entity-type="${escapeHtml(schoolEntity.entityType || record.schoolEntityType || '')}">看这所学校的在辽专业</button>
    </div>
    <details class="major-card-details">
      <summary>为什么出现、历史对照与核验项</summary>
      <div class="major-card-details__body">
        ${renderHistoryScore(record)}
        ${renderMajorCode(record)}
        ${renderMajorUnderstandingPreview(record)}
        ${renderCompareChips(record, compareInfo)}
        ${renderKnowledgeChips(record)}
        ${renderLocalContextInline(record)}
        ${renderLocalStrengthFeature(record, activeBand, viewMode)}
        ${Array.isArray(record.flags) && record.flags.length ? `<div class="meta-pills">${record.flags.slice(0,2).map(f => `<span class="meta-pill">需核验：${escapeHtml(f)}</span>`).join('')}</div>` : ''}
        ${renderSpecialProjectAlert(record)}
        ${renderReviewPoints(record)}
        <button class="diagnose-button" type="button" data-diagnose-index="${index}">逐项看懂这条记录</button>
      </div>
    </details>
    <div class="pool-add-hint" data-pool-hint="${index}"></div>
  </article>`;
}

function setControlledOpen({ key, set, card, button, panel, nextOpen, expandedText = '收起', collapsedText = '展开' }) {
  if (key) {
    if (nextOpen) set.add(key);
    else set.delete(key);
  }
  button?.setAttribute('aria-expanded', String(nextOpen));
  card?.classList.toggle('is-expanded', nextOpen);
  if (panel) panel.hidden = !nextOpen;
  if (button) button.textContent = nextOpen ? expandedText : collapsedText;
}

function bindResultInteractionController(root) {
  if (!root || root.__lnRankResultInteractionBound) return;
  root.__lnRankResultInteractionBound = true;
  root.addEventListener('click', (event) => {
    const context = root.__lnRankResultInteractionContext || {};
    const state = context.state;
    const target = event.target;
    const schoolButton = target?.closest?.('[data-view-school-all]');
    if (schoolButton && root.contains(schoolButton)) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('gaokao:view-school-all', {
        detail: Object.freeze({
          school: schoolButton.dataset.school || '',
          entityId: schoolButton.dataset.schoolEntity || '',
          entityType: schoolButton.dataset.schoolEntityType || ''
        })
      }));
      return;
    }
    const compareButton = target?.closest?.('[data-compare-action]');
    if (compareButton && root.contains(compareButton)) {
      event.preventDefault();
      const action = compareButton.dataset.compareAction || '';
      if (action === 'close') {
        naturalCompareState.open = false;
        naturalCompareState.type = '';
        naturalCompareState.key = '';
        naturalCompareState.showAll = false;
      } else if (action === 'open') {
        naturalCompareState.open = true;
      } else if (action === 'more') {
        naturalCompareState.open = true;
        naturalCompareState.showAll = !naturalCompareState.showAll;
      } else if (action === 'group' || action === 'chip') {
        naturalCompareState.open = true;
        naturalCompareState.type = compareButton.dataset.compareType || '';
        naturalCompareState.key = compareButton.dataset.compareKey || '';
      }
      renderMajorResults(state, context.options || {});
      return;
    }

    const viewButton = target?.closest?.('[data-result-view]');
    if (viewButton && root.contains(viewButton)) {
      event.preventDefault();
      const next = viewButton.dataset.resultView === 'localStrength' ? 'localStrength' : 'all';
      if (state) state.resultViewMode = next;
      renderMajorResults(state, context.options || {});
      return;
    }

    const majorButton = target?.closest?.('[data-major-understanding-toggle]');
    if (majorButton && root.contains(majorButton)) {
      event.preventDefault();
      const key = majorButton.dataset.majorUnderstandingToggle || '';
      const card = majorButton.closest('[data-major-understanding-card]');
      const panel = card?.querySelector('.major-understanding-more');
      const nextOpen = majorButton.getAttribute('aria-expanded') !== 'true';
      setControlledOpen({ key, set: expandedMajorUnderstandingCards, card, button: majorButton, panel, nextOpen, expandedText: '收起', collapsedText: '展开' });
      const toggle = majorButton.querySelector('.major-understanding-toggle');
      if (toggle) toggle.textContent = nextOpen ? '收起' : '展开';
      return;
    }

    const localStrengthButton = target?.closest?.('[data-local-strength-toggle]');
    if (localStrengthButton && root.contains(localStrengthButton)) {
      event.preventDefault();
      const key = localStrengthButton.dataset.localStrengthToggle || '';
      const card = localStrengthButton.closest('[data-local-strength-card]');
      const panel = card?.querySelector('.local-strength-details');
      const nextOpen = localStrengthButton.getAttribute('aria-expanded') !== 'true';
      setControlledOpen({ key, set: expandedLocalStrengthCards, card, button: localStrengthButton, panel, nextOpen, expandedText: '收起提醒原因', collapsedText: '展开提醒原因' });
      return;
    }

    const reviewButton = target?.closest?.('[data-review-points-toggle]');
    if (reviewButton && root.contains(reviewButton)) {
      event.preventDefault();
      const key = reviewButton.dataset.reviewPointsToggle || '';
      const card = reviewButton.closest('[data-review-points-card]');
      const panel = card?.querySelector('.card-review-list');
      const nextOpen = reviewButton.getAttribute('aria-expanded') !== 'true';
      setControlledOpen({ key, set: expandedReviewPointCards, card, button: reviewButton, panel, nextOpen, expandedText: '收起复核详情', collapsedText: '查看复核详情' });
    }
  });
}

export function renderMajorResults(state, { onMore, selectionPool, onSelectionChange } = {}) {
  const meta = document.getElementById('resultsMeta');
  const root = document.getElementById('results');
  const title = document.getElementById('resultsTitle');
  const badge = document.getElementById('activeBandBadge');
  const panel = document.getElementById('resultsPanel');
  if (!root || !title || !badge || !meta || !panel) return;
  bindResultInteractionController(root);
  root.__lnRankResultInteractionContext = { state, options: { onMore, selectionPool, onSelectionChange } };
  panel.classList.remove('band-upper-shell','band-near-shell','band-steady-shell');
  panel.classList.add(`band-${state.activeBand}-shell`);
  if (state.bands.loading) {
    title.textContent = '专业列表'; badge.textContent = '读取中'; meta.textContent = '正在读取 /fenxi 专业数据…';
    root.className = 'results-grid loading'; root.textContent = '正在读取 /fenxi 专业数据…'; return;
  }
  if (state.bands.error) {
    title.textContent = '暂时没能读取';
    badge.textContent = '可重试';
    meta.textContent = '专业数据暂时没有读取成功';
    root.className = 'results-grid error';
    root.innerHTML = `<div class="api-error-card"><b>${escapeHtml(state.bands.error)}</b><p>这不代表这个分数没有专业可看。请稍后重试，或调整地区、学校和专业方向后再看。</p></div>`;
    return;
  }
  if (state.bands.stale) {
    title.textContent = '条件已变化';
    badge.textContent = '需重新查看';
    meta.textContent = '当前筛选条件已经变化，旧结果不再作为当前结果展示';
    root.className = 'results-grid empty is-stale-result';
    root.innerHTML = '<div class="stale-result-card"><b>条件已变化，请重新查看符合条件的专业。</b><p>你刚调整了分数、范围、地区、学校、专业方向、办学性质或特殊项目显示方式。为避免把上一轮结果当成当前结果，请重新点击查看。</p></div>';
    return;
  }
  const data = state.bands.data;
  if (!data) {
    title.textContent = state.bands.title || '等待查看';
    badge.textContent = state.bands.badge || '待输入';
    meta.textContent = state.bands.meta || '尚未查询';
    root.className = `results-grid empty ${state.bands.noticeClass || ''}`;
    root.textContent = state.bands.message || '请输入考生分数，选择地域、学校或专业后，点击查看符合条件的专业。';
    return;
  }
  const group = normalizeScoreBand(data.bands[state.activeBand], { key: state.activeBand, candidateScore: state.candidateScore, rangePreset: state.rangePreset });
  const viewMode = state.resultViewMode === 'localStrength' ? 'localStrength' : 'all';
  const loadedRecords = Array.isArray(group.records) ? group.records : [];
  const localStrengthRecords = filterLocalStrengthRecords(loadedRecords);
  const visibleRecords = viewMode === 'localStrength' ? localStrengthRecords : loadedRecords;
  const visible = state.visible[state.activeBand] || 16;
  const shown = visibleRecords.slice(0, visible);
  const scope = resultScope(group, state);
  const compareSignature = [state.activeBand, group.title, group.rangeText, loadedRecords.length, data?.meta?.bottomLineMode || '', data?.keywordQuery?.rawKeywords?.join('|') || ''].join('__');
  if (naturalCompareState.signature !== compareSignature) {
    naturalCompareState.signature = compareSignature;
    naturalCompareState.open = false;
    naturalCompareState.type = '';
    naturalCompareState.key = '';
    naturalCompareState.showAll = false;
  }
  const compareInfo = makeCompareGroups(loadedRecords);
  title.textContent = viewMode === 'localStrength'
    ? '院校背景提示：' + group.title
    : '可讨论专业 · ' + group.title;
  badge.textContent = group.rangeText || '输入分数后生成';
  meta.textContent = viewMode === 'localStrength'
    ? '已加载 ' + fmt(scope.loaded) + ' 条中有 ' + fmt(localStrengthRecords.length) + ' 条背景提示｜当前显示 ' + fmt(shown.length) + ' 条｜' + data.meta.dataScope
    : '符合当前条件 ' + fmt(scope.eligible) + ' 条｜已加载 ' + fmt(scope.loaded) + ' 条｜当前显示 ' + fmt(shown.length) + ' 条｜' + data.meta.dataScope;
  const bottomLine = data.meta?.bottomLine || null;
  const bottomLineMode = data.meta?.bottomLineMode || 'all';
  const excluded = Number(data.source?.bottomLineExcluded || 0);
  const searchAdvices = renderSearchAdvices(data);
  const bottomLineNote = bottomLine && bottomLineMode !== 'all'
    ? `<div class="results-bottomline-note result-assist-line"><span class="result-assist-icon" aria-hidden="true">◇</span><span>当前办学性质底线：<b>${escapeHtml(bottomLine.label || '')}</b>。${escapeHtml(bottomLine.help || '')}${excluded ? ` 本轮按该底线排除 ${fmt(excluded)} 条不符合条件的记录。` : ''}</span></div>`
    : '';
  const specialMode = normalizeSpecialProjectMode(data.meta?.specialProjectMode || data.source?.specialProjectMode);
  const resultContextBar = renderResultContextBar(data, group, state, specialMode);
  const resultViewTabs = renderResultViewTabs(state, group);
  const naturalComparePanel = viewMode === 'all' ? renderNaturalComparePanel(compareInfo, scope) : '';
  root.className = 'results-grid';
  const emptyReason = viewMode === 'localStrength'
    ? '<div class="empty local-strength-empty is-light"><span>当前已加载范围暂时没有院校背景提示，已保留当前列表。</span><button type="button" class="result-view-inline-button" data-result-view="all">返回当前列表</button></div>'
    : (bottomLineMode !== 'all'
      ? '<div class="empty">当前条件下暂时没有结果。可以先选择“多看一些”，或放宽地域、学校、专业关键词和办学性质条件。</div>'
      : '<div class="empty">当前条件下暂时没有结果，可以放宽地域、学校或专业关键词。</div>');
  const assistParts = [searchAdvices, bottomLineNote].filter(Boolean).join('');
  const assistBlock = assistParts ? '<details class="result-assist-details"><summary>查看筛选说明</summary><div class="result-assist-details-body">' + assistParts + '</div></details>' : '';
  const cards = shown.map((record, index) => card(record, index, selectionPool, state.activeBand, viewMode, compareInfo));
  const initialCards = cards.slice(0, 4).join('');
  const remainingCards = cards.slice(4).join('');
  root.innerHTML = resultContextBar + resultViewTabs + (shown.length
    ? initialCards + naturalComparePanel + assistBlock + remainingCards
    : assistBlock + emptyReason);
  root.querySelectorAll('[data-result-context-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const bar = button.closest('.result-context-bar');
      const detail = bar?.querySelector('.result-context-details');
      const open = detail?.hidden;
      if (!detail) return;
      detail.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.textContent = open ? '收起说明' : '展开说明';
    });
  });
  root.querySelectorAll('[data-context-special-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById('specialProjectToggle')?.click?.();
    });
  });
  root.querySelectorAll('[data-result-view-delegated-disabled]').forEach(button => {
    button.addEventListener('click', () => {
      const next = button.dataset.resultView === 'localStrength' ? 'localStrength' : 'all';
      state.resultViewMode = next;
      renderMajorResults(state, { onMore, selectionPool, onSelectionChange });
    });
  });
  root.querySelectorAll('[data-major-understanding-toggle-delegated-disabled]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = button.dataset.majorUnderstandingToggle || '';
      const card = button.closest('[data-major-understanding-card]');
      const panel = card?.querySelector('.major-understanding-more');
      const nextOpen = button.getAttribute('aria-expanded') !== 'true';
      if (key) {
        if (nextOpen) expandedMajorUnderstandingCards.add(key);
        else expandedMajorUnderstandingCards.delete(key);
      }
      button.setAttribute('aria-expanded', String(nextOpen));
      card?.classList.toggle('is-expanded', nextOpen);
      if (panel) panel.hidden = !nextOpen;
      const toggle = button.querySelector('.major-understanding-toggle');
      if (toggle) toggle.textContent = nextOpen ? '收起' : '展开';
    });
  });
  mountDiagnoseButtons(root, shown, state);
  root.querySelectorAll('[data-pool-index]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.poolIndex);
      const record = shown[index];
      if (!record || !selectionPool?.add) return;
      const result = selectionPool.add(record);
      const hint = root.querySelector(`[data-pool-hint="${index}"]`);
      if (hint) {
        hint.textContent = result.message || '';
        hint.className = `pool-add-hint ${result.ok ? 'is-ok' : 'is-warn'}`;
      }
      if (result.ok) {
        button.textContent = REPORT_COPY.added;
        button.classList.add('is-added');
        button.disabled = true;
      }
      if (typeof onSelectionChange === 'function') onSelectionChange();
    });
  });
  root.querySelectorAll('[data-search-advice-action="switch_special_project"]').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target || 'show_eligibility_projects';
      try { localStorage.setItem('lnRank.specialProjectMode.current', target); } catch {}
      document.getElementById('specialProjectToggle')?.click?.();
    });
  });
  root.querySelectorAll('[data-search-advice-action="remove_keyword_group"]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById('majorKeyword');
      if (!input) return;
      const target = button.dataset.target || '';
      const re = target === 'sino_high_fee' ? /中外|合作办学|高收费|较高收费|国际本科|国际班/ : target === 'special_project' ? /定向|专项|公费师范|优师|预科|民族班|公安|司法|航海|轮机/ : /民办|独立学院|独立院校/;
      input.value = String(input.value || '').split(/[,，、\s/；;|]+/).filter(Boolean).filter(w => !re.test(w)).join(' ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  root.querySelectorAll('[data-search-advice-action="switch_bottomline"]').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      if (!target) return;
      try { localStorage.setItem('lnRank.bottomLineMode.current', target); } catch {}
      document.querySelectorAll('[data-bottomline-mode]').forEach(el => el.classList.toggle('is-active', el.dataset.bottomlineMode === target));
      document.querySelector(`[data-bottomline-mode="${target}"]`)?.click?.();
    });
  });
  const canShowLoadedMore = viewMode === 'all' && visibleRecords.length > visible;
  const canLoadAnotherPage = viewMode === 'all' && Boolean(group.pagination?.hasMore);
  if (canShowLoadedMore || canLoadAnotherPage) {
    const isLoadingMore = state.bands.loadingMoreBand === state.activeBand;
    const shownNow = Math.min(visible, visibleRecords.length);
    const remainingLoaded = Math.max(0, visibleRecords.length - shownNow);
    const label = isLoadingMore
      ? '正在加载下一批专业…'
      : canShowLoadedMore
        ? `查看下一批 ${fmt(Math.min(16, remainingLoaded))} 条（已显示 ${fmt(shownNow)} / 已加载 ${fmt(visibleRecords.length)}）`
        : `继续加载符合条件的专业（已加载 ${fmt(visibleRecords.length)} / 共 ${fmt(group.count)}）`;
    root.insertAdjacentHTML('beforeend', `<button class="more-button" data-more="${state.activeBand}"${isLoadingMore ? ' disabled aria-busy="true"' : ''}>${label}</button>`);
    if (!isLoadingMore) root.querySelector('[data-more]')?.addEventListener('click', () => onMore?.(state.activeBand));
  }
  if (viewMode === 'all' && state.bands.moreError) {
    root.insertAdjacentHTML('beforeend', `<p class="result-load-more-error" role="status">${escapeHtml(state.bands.moreError)}</p>`);
  }
}
