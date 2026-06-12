import { REPORT_COPY } from '../../domain/human-copy-dictionary.js?v=3933_2';
import { fmt } from '../../core/number-utils.js?v=3933_2';
import { renderHistoryScore } from './history-score-render.js?v=3933_2';
import { mountDiagnoseButtons } from '../diagnose/controller.js?v=3933_2';
import { buildReviewPointsForRecord } from './review-point-builder.js?v=3933_2';
import { buildSchoolIndustryTags, safeGetLocalContextPresentation } from '../../knowledge/index.js?v=3933_2';
import { normalizeScoreBand } from '../../domain/score-band-contract.js?v=3933_2';
import { normalizeSpecialProjectMode, SPECIAL_PROJECT_SHOW_MODE, specialProjectResultNote, specialProjectCardBadge } from '../../domain/special-project-policy.js?v=3933_2';

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
  if (/稳妥补充|补安全|偏稳/.test(text)) return 'steady';
  return 'near';
}
function bandLabel(key) {
  return key === 'upper' ? '稍高目标' : key === 'steady' ? '稳妥补充' : '主要参考';
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
function renderSearchAdvices(data) {
  const advices = data?.searchAdvices || [];
  if (!Array.isArray(advices) || !advices.length) return '';
  return advices.map(advice => `<div class="search-advice search-advice-${escapeHtml(advice.level || 'info')}"><div>${escapeHtml(advice.message || '')}</div>${advice.action ? `<button type="button" data-search-advice-action="${escapeHtml(advice.action.type)}" data-target="${escapeHtml(advice.action.target)}">${escapeHtml(advice.action.label || '应用建议')}</button>` : ''}</div>`).join('');
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
  return `<div class="match-reason">命中原因：${escapeHtml(reason).replace(/^命中原因：/, '')}</div>`;
}


function renderKnowledgeChips(record) {
  const tags = buildSchoolIndustryTags(record).slice(0, 3);
  if (!tags.length) return '';
  return `<div class="knowledge-chip-row" aria-label="院校背景提示">${tags.map(x => `<span class="knowledge-chip">${escapeHtml(x.tag)}</span>`).join('')}</div>`;
}

function renderLocalContextInline(record) {
  const view = safeGetLocalContextPresentation(record, 'card');
  if (!view) return '';
  return `<div class="local-context-inline" title="该提示不是录取判断，只说明专业和学校办学背景、行业方向关联较强。"><span class="local-context-chip">${escapeHtml(view.label)}</span><span class="local-context-name">${escapeHtml(view.name)}</span></div>`;
}

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

function card(record, index = 0, selectionPool = null, activeBand = 'near') {
  const delta = Number(record.scoreDelta || 0);
  const deltaText = delta > 0 ? `+${delta}` : String(delta);
  const statusKey = record.statusKey || 'match';
  const bandKey = bandKeyFromActive(activeBand, record);
  const bandClass = `is-band-${bandKey}`;
  const displayBandLabel = bandLabel(bandKey);
  const tagHtml = tags(record).map(t => `<span class="school-tag ${tagClass(t)}">${escapeHtml(t)}</span>`).join('');
  return `<article class="major-card ln-major-card status-${statusKey} ${bandClass}">
    <div class="major-card-top">
      <div><div class="school">${escapeHtml(safe(record.school))}</div><div class="major">${escapeHtml(safe(record.major))}${matchBadge(record)}${renderSpecialProjectBadge(record)}</div></div>
      <span class="status-badge ln-band-pill ${bandClass}">${escapeHtml(displayBandLabel)}</span>
    </div>
    <div class="meta-pills">
      <span class="meta-pill">2025最低分：${fmt(record.score2025 ?? record.score)} 分</span>
      <span class="meta-pill">2025最低位次：${fmt(record.rank2025 ?? record.rank)}</span>
      <span class="meta-pill">相对考生：${deltaText} 分</span>
      <span class="meta-pill">适合位置：<b class="ln-fit-position ${bandClass}">${escapeHtml(safe(record.position))}</b></span>
    </div>
    ${renderHistoryScore(record)}
    ${tagHtml ? `<div class="school-tags">${tagHtml}</div>` : ''}
    ${renderKnowledgeChips(record)}
    ${renderLocalContextInline(record)}
    ${Array.isArray(record.flags) && record.flags.length ? `<div class="meta-pills">${record.flags.slice(0,2).map(f => `<span class="meta-pill">需核验：${escapeHtml(f)}</span>`).join('')}</div>` : ''}
    ${renderMajorCode(record)}
    ${matchReason(record)}
    ${renderSpecialProjectAlert(record)}
    ${renderReviewPoints(record)}
    <div class="major-card-actions">
      ${poolButton(record, index, selectionPool)}
      <button class="diagnose-button" type="button" data-diagnose-index="${index}">单条解读</button>
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
    title.textContent = '读取失败'; badge.textContent = '请检查'; meta.textContent = '专业数据暂时无法读取';
    root.className = 'results-grid error'; root.textContent = state.bands.error; return;
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
  title.textContent = `符合条件的可讨论专业：${group.title}`;
  badge.textContent = group.rangeText || '输入分数后生成';
  meta.textContent = `共 ${fmt(group.records.length)} 条｜总专业池 ${fmt(data.counts.total)} 条｜${data.meta.dataScope}`;
  const visible = state.visible[state.activeBand] || 16;
  const shown = group.records.slice(0, visible);
  const bottomLine = data.meta?.bottomLine || null;
  const bottomLineMode = data.meta?.bottomLineMode || 'all';
  const excluded = Number(data.source?.bottomLineExcluded || 0);
  const searchAdvices = renderSearchAdvices(data);
  const bottomLineNote = bottomLine && bottomLineMode !== 'all'
    ? `<div class="results-bottomline-note result-assist-line"><span class="result-assist-icon" aria-hidden="true">◇</span><span>当前办学性质底线：<b>${escapeHtml(bottomLine.label || '')}</b>。${escapeHtml(bottomLine.help || '')}${excluded ? ` 本轮按该底线排除 ${fmt(excluded)} 条不符合条件的记录。` : ''}</span></div>`
    : '';
  const specialMode = normalizeSpecialProjectMode(data.meta?.specialProjectMode || data.source?.specialProjectMode);
  const resultContextBar = renderResultContextBar(data, group, state, specialMode);
  root.className = 'results-grid';
  const emptyReason = bottomLineMode !== 'all'
    ? `<div class="empty">当前条件下暂时没有结果。可以先选择“多看一些”，或放宽地域、学校、专业关键词和公办底线。</div>`
    : `<div class="empty">当前条件下暂时没有结果，可以放宽地域、学校或专业关键词。</div>`;
  const assistParts = [searchAdvices, bottomLineNote].filter(Boolean).join('');
  const assistBlock = assistParts ? `<details class="result-assist-details"><summary>查看筛选说明</summary><div class="result-assist-details-body">${assistParts}</div></details>` : '';
  root.innerHTML = resultContextBar + assistBlock + (shown.length ? shown.map((record, index) => card(record, index, selectionPool, state.activeBand)).join('') : emptyReason);
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
  root.querySelectorAll('[data-search-advice-action="switch_bottomline"]').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      if (!target) return;
      try { localStorage.setItem('lnRank.bottomLineMode.current', target); } catch {}
      document.querySelectorAll('[data-bottomline-mode]').forEach(el => el.classList.toggle('is-active', el.dataset.bottomlineMode === target));
      document.querySelector(`[data-bottomline-mode="${target}"]`)?.click?.();
    });
  });
  if (group.records.length > visible) {
    root.insertAdjacentHTML('beforeend', `<button class="more-button" data-more="${state.activeBand}">查看更多 ${group.title}</button>`);
    root.querySelector('[data-more]')?.addEventListener('click', () => onMore(state.activeBand));
  }
}
