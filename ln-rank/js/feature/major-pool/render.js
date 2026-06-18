import { REPORT_COPY } from '../../domain/human-copy-dictionary.js?v=3947_5';
import { fmt } from '../../core/number-utils.js?v=3947_5';
import { renderHistoryScore } from './history-score-render.js?v=3947_5';
import { mountDiagnoseButtons } from '../diagnose/controller.js?v=3947_5';
import { buildReviewPointsForRecord } from './review-point-builder.js?v=3947_5';
import { buildSchoolIndustryTags } from '../../knowledge/index.js?v=3947_5';
import { getLocalBackgroundHint } from '../../knowledge/local-background-hint.js?v=3947_5';
import { get211BackgroundHint } from '../../knowledge/211-background-hint.js?v=3947_5';
import { normalizeScoreBand } from '../../domain/score-band-contract.js?v=3947_5';
import { normalizeSpecialProjectMode, SPECIAL_PROJECT_SHOW_MODE, specialProjectResultNote, specialProjectCardBadge } from '../../domain/special-project-policy.js?v=3947_5';
import { resolveLocalStrengthMark, filterLocalStrengthRecords, buildLocalStrengthSummary, localStrengthRelationText } from './local-strength-view.js?v=3947_5';
import { majorUnderstandingCard } from '../../knowledge/major-understanding-resolver.js?v=3947_5';

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
  if (tag.includes('民办') || tag.includes('独立')) return 'private';
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
  if (Array.isArray(record.schoolTags)) arr.push(...record.schoolTags);
  if (record.natureLabel) arr.push(record.natureLabel);
  if (record.displayLocation) arr.push(record.displayLocation);
  if (record.geoEntity && record.geoEntity !== record.school) arr.push(record.geoEntity);
  if (record.locationWarning) arr.push(record.locationWarning);
  if (Array.isArray(record.bottomLineTags)) arr.push(...record.bottomLineTags.slice(0, 2));
  return [...new Set(arr.filter(Boolean))].slice(0, 6);
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
  if (specialMode === SPECIAL_PROJECT_SHOW_MODE) {
    return {
      tone: 'showing',
      short: '特殊项目已显示',
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

function renderResultContextBar(data, group, state, specialMode) {
  const keyword = keywordContextParts(data);
  const special = buildSpecialProjectContext(specialMode, data?.source || {});
  const bandTitle = escapeHtml(group.title || '当前分段');
  const rangeText = escapeHtml(group.rangeText || '输入分数后生成');
  const recordCount = escapeHtml(fmt(group.records?.length || 0));
  const currentLine = `<span class="result-context-label">当前</span><strong class="result-context-band">${bandTitle}</strong><span class="result-context-range">${rangeText}</span><span class="result-context-count">${recordCount} 条</span>`;
  const keywordLine = keyword
    ? `<span class="result-context-label">关键词</span><span class="result-context-terms">${keyword.visibleKeywords.map(escapeHtml).join(' / ')}${keyword.extraCount ? ' 等' : ''}</span><span class="result-context-sort">按接近程度排序</span>`
    : `<span class="result-context-label">关键词</span><span class="result-context-terms">未限定专业方向</span><span class="result-context-sort">按当前条件查看</span>`;
  const keywordDetail = keyword
    ? `<div class="result-context-detail-row"><b>关键词：</b>${keyword.keywords}<br><b>关键词说明：</b>${keyword.summaryParts.length ? escapeHtml(keyword.summaryParts.join('｜')) : '暂无细分数量'}${keyword.flags.length ? `｜${keyword.flags.map(escapeHtml).join('；')}` : ''}<br><span>精准匹配更接近你输入的关键词；相关方向可以一起参考；行业关联需要看具体专业是否真的接受。</span></div>`
    : `<div class="result-context-detail-row"><b>关键词说明：</b>当前未限定专业方向，结果主要按分数区间、地区、学校和底线条件筛选。</div>`;
  return `<section class="result-context-bar result-context-${escapeHtml(special.tone)}" aria-label="结果说明">
    <div class="result-context-main">
      <span class="result-context-current">${currentLine}</span>
      <span class="result-context-keyword">${keywordLine}</span>
      <span class="result-context-special">${escapeHtml(special.short)} <button type="button" class="result-context-link" data-context-special-toggle>${escapeHtml(special.action)}</button></span>
      <button type="button" class="result-context-more" data-result-context-toggle aria-expanded="false">展开说明</button>
    </div>
    <div class="result-context-details" hidden>
      ${keywordDetail}
      <div class="result-context-detail-row"><b>特殊项目：</b>${escapeHtml(special.detail)}</div>
    </div>
  </section>`;
}

function renderResultViewTabs(state, group) {
  const records = Array.isArray(group?.records) ? group.records : [];
  const summary = buildLocalStrengthSummary(records);
  const mode = state.resultViewMode === 'localStrength' ? 'localStrength' : 'all';
  const allActive = mode === 'all' ? ' is-active' : '';
  const strengthActive = mode === 'localStrength' ? ' is-active' : '';
  const note = summary.total
    ? `当前结果里发现 ${fmt(summary.total)} 条学校强项方向。它们来自省内背景、211背景或方向线索，不是录取判断，只是提醒家庭重点了解和复核。`
    : '当前范围暂时没有明显的学校强项提示，可以继续查看全部专业，或放宽地区、专业方向后再看。';
  return `<section class="result-view-tabs" aria-label="结果视图切换">
    <div class="result-view-tab-row">
      <button type="button" class="result-view-tab${allActive}" data-result-view="all" aria-pressed="${mode === 'all' ? 'true' : 'false'}">全部专业 <b>${fmt(records.length)}</b></button>
      <button type="button" class="result-view-tab${strengthActive}" data-result-view="localStrength" aria-pressed="${mode === 'localStrength' ? 'true' : 'false'}">学校强项 <b>${fmt(summary.total)}</b></button>
    </div>
    <p class="result-view-note">${escapeHtml(note)}</p>
  </section>`;
}

function renderLocalStrengthFeature(record, activeBand, viewMode) {
  const mark = resolveLocalStrengthMark(record);
  if (!mark.matched) return '';
  const relation = localStrengthRelationText(record, activeBand);
  const verify = Array.isArray(mark.verifyItems) && mark.verifyItems.length ? mark.verifyItems.slice(0, 5).join(' / ') : '招生计划 / 校区 / 近年位次 / 培养方向';
  const source = mark.sourceText || (Array.isArray(mark.sourceKinds) && mark.sourceKinds.length ? mark.sourceKinds.join(' / ') : '学校背景');
  if (viewMode !== 'localStrength') {
    return `<div class="local-strength-mini"><span>学校强项方向</span><b>${escapeHtml(mark.direction || '学校背景方向')}</b><em>${escapeHtml(source)}</em></div>`;
  }
  return `<section class="local-strength-card-block" aria-label="学校强项提醒">
    <div class="local-strength-head"><span>学校强项方向</span><b>${escapeHtml(mark.direction || '学校背景方向')}</b></div>
    <p><strong>提示来源：</strong>${escapeHtml(source)}</p>
    <p><strong>为什么提醒：</strong>${escapeHtml(mark.why || '这条专业与学校办学背景或行业方向有关，建议家庭单独了解和复核。')}</p>
    <p><strong>和当前分数的关系：</strong>${escapeHtml(relation)}</p>
    <p><strong>填报前再确认：</strong>${escapeHtml(verify)}</p>
    <small>${escapeHtml(mark.boundary || '不是录取判断，也不是填报建议；只提醒家庭重点了解和复核。')}</small>
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
  const details = points.length ? `<details class="card-review-details"><summary>查看复核详情</summary><ul class="card-review-list">${detailItems}</ul></details>` : '';
  return `<div class="card-review-points"><div class="card-review-summary">${escapeHtml(summary || '需核验：查看复核详情')}</div>${details}</div>`;
}


function renderMajorUnderstandingPreview(record) {
  const info = majorUnderstandingCard(record);
  if (!info?.oneLine) return '';
  const questions = Array.isArray(info.questions) ? info.questions.slice(0, 2).filter(Boolean) : [];
  const qHtml = questions.length ? `<div class="major-understanding-questions">${questions.map(q => `<span>${escapeHtml(q)}</span>`).join('')}</div>` : '';
  const classLevel = info.isClassLevel ? ' is-class-level' : '';
  return `<section class="major-understanding-preview${classLevel}" aria-label="这个专业先了解什么">
    <div class="major-understanding-title">这个专业先了解</div>
    <p>${escapeHtml(info.oneLine)}</p>
    ${qHtml}
  </section>`;
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

function card(record, index = 0, selectionPool = null, activeBand = 'near', viewMode = 'all') {
  const delta = Number(record.scoreDelta || 0);
  const deltaText = delta > 0 ? `+${delta}` : String(delta);
  const statusKey = record.statusKey || 'match';
  const bandKey = bandKeyFromActive(activeBand, record);
  const bandClass = `is-band-${bandKey}`;
  const displayBandLabel = bandLabel(bandKey);
  const tagHtml = tags(record).map(t => `<span class="school-tag ${tagClass(t)}">${escapeHtml(t)}</span>`).join('');
  const localStrength = resolveLocalStrengthMark(record);
  const strengthClass = localStrength.matched ? ' has-local-strength' : '';
  return `<article class="major-card ln-major-card status-${statusKey} ${bandClass}${strengthClass}">
    <div class="major-card-top">
      <div><div class="school">${escapeHtml(safe(record.school))}</div><div class="major">${escapeHtml(safe(record.major))}${matchBadge(record)}${renderSpecialProjectBadge(record)}</div></div>
      <span class="status-badge ln-band-pill ${bandClass}" title="分数位置：只是当前查看分组，不代表录取把握。">分数位置：${escapeHtml(displayBandLabel)}</span>
    </div>
    <div class="meta-pills">
      <span class="meta-pill">2025最低分：${fmt(record.score2025 ?? record.score)} 分</span>
      <span class="meta-pill">2025最低位次：${fmt(record.rank2025 ?? record.rank)}</span>
      <span class="meta-pill">相对考生：${deltaText} 分</span>
      <span class="meta-pill">适合位置：<b class="ln-fit-position ${bandClass}">${escapeHtml(safe(record.position))}</b></span>
    </div>
    ${renderHistoryScore(record)}
    ${tagHtml ? `<div class="school-tags">${tagHtml}</div>` : ''}
    ${renderMajorCode(record)}
    ${renderMajorUnderstandingPreview(record)}
    ${renderKnowledgeChips(record)}
    ${renderLocalContextInline(record)}
    ${renderLocalStrengthFeature(record, activeBand, viewMode)}
    ${Array.isArray(record.flags) && record.flags.length ? `<div class="meta-pills">${record.flags.slice(0,2).map(f => `<span class="meta-pill">需核验：${escapeHtml(f)}</span>`).join('')}</div>` : ''}
    ${matchReason(record)}
    ${renderSpecialProjectAlert(record)}
    ${renderReviewPoints(record)}
    <div class="major-card-actions">
      ${poolButton(record, index, selectionPool)}
      <button class="diagnose-button" type="button" data-diagnose-index="${index}">看懂这条</button>
    </div>
    <div class="pool-add-hint" data-pool-hint="${index}"></div>
  </article>`;
}
export function renderMajorResults(state, { onMore, selectionPool, onSelectionChange } = {}) {
  const meta = document.getElementById('resultsMeta');
  const root = document.getElementById('results');
  const title = document.getElementById('resultsTitle');
  const badge = document.getElementById('activeBandBadge');
  const panel = document.getElementById('resultsPanel');
  if (!root || !title || !badge || !meta || !panel) return;
  panel.classList.remove('band-upper-shell','band-near-shell','band-steady-shell');
  panel.classList.add(`band-${state.activeBand}-shell`);
  if (state.bands.loading) {
    title.textContent = '专业列表'; badge.textContent = '读取中'; meta.textContent = '正在读取 /fenxi 专业数据…';
    root.className = 'results-grid loading'; root.textContent = '正在读取 /fenxi 专业数据…'; return;
  }
  if (state.bands.error) {
    title.textContent = '读取失败'; badge.textContent = '可重试'; meta.textContent = '专业数据暂时无法读取';
    const detail = state.bands.errorDetail ? `<details class="api-diagnostic-note"><summary>查看诊断信息</summary><div><b>工程诊断：</b>${escapeHtml(state.bands.errorDetail)}<br><span>先测 <code>/api/ln-rank-runtime-health</code>，再测 <code>/api/major-bands-health?probe=1</code>。如果 health 正常但这里失败，重点检查低分段查询耗时、公办优先筛选和浏览器缓存。</span></div></details>` : '';
    root.className = 'results-grid error';
    root.innerHTML = `<div class="api-error-card"><b>${escapeHtml(state.bands.error)}</b><p>这不是录取判断，也不代表这个分数没有结果。可以先切回“全部院校”或放宽筛选条件后重试。</p>${detail}<div class="api-error-actions"><a href="/api/ln-rank-runtime-health" target="_blank" rel="noopener">查看运行时健康</a><a href="/api/major-bands-health?probe=1" target="_blank" rel="noopener">查看专业池健康</a></div></div>`;
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
  const localStrengthRecords = filterLocalStrengthRecords(group.records);
  const visibleRecords = viewMode === 'localStrength' ? localStrengthRecords : group.records;
  title.textContent = viewMode === 'localStrength' ? `别漏看的学校强项：${group.title}` : `符合条件的可讨论专业：${group.title}`;
  badge.textContent = group.rangeText || '输入分数后生成';
  meta.textContent = viewMode === 'localStrength'
    ? `学校强项 ${fmt(localStrengthRecords.length)} 条｜当前范围全部 ${fmt(group.records.length)} 条｜${data.meta.dataScope}`
    : `共 ${fmt(group.records.length)} 条｜学校强项 ${fmt(localStrengthRecords.length)} 条｜总专业池 ${fmt(data.counts.total)} 条｜${data.meta.dataScope}`;
  const visible = state.visible[state.activeBand] || 16;
  const shown = visibleRecords.slice(0, visible);
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
  root.className = 'results-grid';
  const emptyReason = viewMode === 'localStrength'
    ? `<div class="empty local-strength-empty is-light"><span>当前范围暂无明显学校强项，已保留全部专业结果。</span><button type="button" class="result-view-inline-button" data-result-view="all">查看全部专业</button></div>`
    : (bottomLineMode !== 'all'
      ? `<div class="empty">当前条件下暂时没有结果。可以先选择“多看一些”，或放宽地域、学校、专业关键词和公办底线。</div>`
      : `<div class="empty">当前条件下暂时没有结果，可以放宽地域、学校或专业关键词。</div>`);
  const assistParts = [searchAdvices, bottomLineNote].filter(Boolean).join('');
  const assistBlock = assistParts ? `<details class="result-assist-details"><summary>查看筛选说明</summary><div class="result-assist-details-body">${assistParts}</div></details>` : '';
  root.innerHTML = resultContextBar + resultViewTabs + assistBlock + (shown.length ? shown.map((record, index) => card(record, index, selectionPool, state.activeBand, viewMode)).join('') : emptyReason);
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
  root.querySelectorAll('[data-result-view]').forEach(button => {
    button.addEventListener('click', () => {
      const next = button.dataset.resultView === 'localStrength' ? 'localStrength' : 'all';
      state.resultViewMode = next;
      renderMajorResults(state, { onMore, selectionPool, onSelectionChange });
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
  if (visibleRecords.length > visible) {
    root.insertAdjacentHTML('beforeend', `<button class="more-button" data-more="${state.activeBand}">查看更多 ${viewMode === 'localStrength' ? '学校强项' : group.title}</button>`);
    root.querySelector('[data-more]')?.addEventListener('click', () => onMore(state.activeBand));
  }
}
