import { fmt } from '../../core/number-utils.js?v=3920_4';
import { renderHistoryScore } from './history-score-render.js?v=3920_4';
import { mountDiagnoseButtons } from '../diagnose/controller.js?v=3920_4';
import { buildReviewPointsForRecord } from './review-point-builder.js?v=3920_4';
import { normalizeScoreBand } from '../../domain/score-band-contract.js?v=3920_4';
import { normalizeSpecialProjectMode, SPECIAL_PROJECT_SHOW_MODE, specialProjectResultNote, specialProjectCardBadge } from '../../domain/special-project-policy.js?v=3920_4';

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

function renderKeywordSummary(data) {
  const q = data?.keywordQuery;
  if (!q?.rawKeywords?.length) return '';
  const chips = q.rawKeywords.map(k => `<span class="keyword-chip">${escapeHtml(k)}</span>`).join('');
  const project = q.hasProjectKeyword ? '<span class="muted">已启用项目属性搜索</span>' : '';
  const industry = q.hasIndustryKeyword ? '<span class="muted">已启用行业路径搜索</span>' : '';
  const warnings = Array.isArray(data.keywordWarnings) && data.keywordWarnings.length
    ? `<span class="muted">${data.keywordWarnings.map(escapeHtml).join('；')}</span>`
    : '';
  const s = data?.matchSummary || {};
  const summaryParts = [];
  if (s.exact) summaryParts.push(`精准匹配 ${s.exact} 个`);
  if (s.related) summaryParts.push(`相关方向 ${s.related} 个`);
  if (s.industry) summaryParts.push(`行业关联 ${s.industry} 个`);
  if (s.project) summaryParts.push(`项目属性 ${s.project} 个`);
  if (s.weak) summaryParts.push(`弱关联 ${s.weak} 个`);
  const matchSummary = summaryParts.length ? `<span class="keyword-match-summary">${summaryParts.map(escapeHtml).join('｜')}</span>` : '';
  return `<div class="keyword-summary"><span>当前关键词：</span>${chips}<span class="muted">已按关系远近排序</span>${matchSummary}${project}${industry}${warnings}<div class="match-copy-help">提示：精准匹配最接近你的关键词；相关方向可以一起参考；行业关联需要再看具体专业是否真的接受。中外、高收费等属于项目或招生属性，不是专业名。</div></div>`;
}
function renderSearchAdvices(data) {
  const advices = data?.searchAdvices || [];
  if (!Array.isArray(advices) || !advices.length) return '';
  return advices.map(advice => `<div class="search-advice search-advice-${escapeHtml(advice.level || 'info')}"><div>${escapeHtml(advice.message || '')}</div>${advice.action ? `<button type="button" data-search-advice-action="${escapeHtml(advice.action.type)}" data-target="${escapeHtml(advice.action.target)}">${escapeHtml(advice.action.label || '应用建议')}</button>` : ''}</div>`).join('');
}

function poolButton(record, index, selectionPool) {
  const inPool = Boolean(selectionPool?.has?.(record));
  return `<button class="pool-add-button ${inPool ? 'is-added' : ''}" type="button" data-pool-index="${index}" ${inPool ? 'disabled' : ''}>${inPool ? '已加入自选专业' : '加入自选专业'}</button>`;
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

function card(record, index = 0, selectionPool = null) {
  const delta = Number(record.scoreDelta || 0);
  const deltaText = delta > 0 ? `+${delta}` : String(delta);
  const statusKey = record.statusKey || 'match';
  const tagHtml = tags(record).map(t => `<span class="school-tag ${tagClass(t)}">${escapeHtml(t)}</span>`).join('');
  return `<article class="major-card status-${statusKey}">
    <div class="major-card-top">
      <div><div class="school">${escapeHtml(safe(record.school))}</div><div class="major">${escapeHtml(safe(record.major))}${matchBadge(record)}${renderSpecialProjectBadge(record)}</div></div>
      <span class="status-badge">${escapeHtml(safe(record.statusLabel))}</span>
    </div>
    <div class="meta-pills">
      <span class="meta-pill">2025最低分：${fmt(record.score2025 ?? record.score)} 分</span>
      <span class="meta-pill">2025最低位次：${fmt(record.rank2025 ?? record.rank)}</span>
      <span class="meta-pill">相对考生：${deltaText} 分</span>
      <span class="meta-pill">适合位置：${escapeHtml(safe(record.position))}</span>
    </div>
    ${renderHistoryScore(record)}
    ${tagHtml ? `<div class="school-tags">${tagHtml}</div>` : ''}
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
  title.textContent = group.title;
  badge.textContent = group.rangeText || '输入分数后生成';
  meta.textContent = `共 ${fmt(group.records.length)} 条｜总专业池 ${fmt(data.counts.total)} 条｜${data.meta.dataScope}`;
  const visible = state.visible[state.activeBand] || 16;
  const shown = group.records.slice(0, visible);
  const bottomLine = data.meta?.bottomLine || null;
  const bottomLineMode = data.meta?.bottomLineMode || 'all';
  const excluded = Number(data.source?.bottomLineExcluded || 0);
  const keywordSummary = renderKeywordSummary(data);
  const searchAdvices = renderSearchAdvices(data);
  const bottomLineNote = bottomLine && bottomLineMode !== 'all'
    ? `<div class="results-bottomline-note">当前办学性质底线：<b>${escapeHtml(bottomLine.label || '')}</b>。${escapeHtml(bottomLine.help || '')}${excluded ? ` 本轮按该底线排除 ${fmt(excluded)} 条不符合条件的记录。` : ''}</div>`
    : '';
  const specialMode = normalizeSpecialProjectMode(data.meta?.specialProjectMode || data.source?.specialProjectMode);
  const specialNoteText = specialProjectResultNote(specialMode, data.source || {});
  const specialProjectNote = specialNoteText ? `<div class="results-special-project-note ${specialMode === SPECIAL_PROJECT_SHOW_MODE ? 'is-showing' : ''}">${escapeHtml(specialNoteText)}</div>` : '';
  root.className = 'results-grid';
  const emptyReason = bottomLineMode !== 'all'
    ? `<div class="empty">当前条件下暂时没有结果。可以先选择“多看一些”，或放宽地域、学校、专业关键词和公办底线。</div>`
    : `<div class="empty">当前条件下暂时没有结果，可以放宽地域、学校或专业关键词。</div>`;
  root.innerHTML = keywordSummary + searchAdvices + specialProjectNote + bottomLineNote + (shown.length ? shown.map((record, index) => card(record, index, selectionPool)).join('') : emptyReason);
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
        button.textContent = '已加入自选专业';
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
      try { localStorage.setItem('lnRank.bottomLineMode.v3980', target); localStorage.setItem('lnRank.bottomLineMode.v3962', target); } catch {}
      document.querySelectorAll('[data-bottomline-mode]').forEach(el => el.classList.toggle('is-active', el.dataset.bottomlineMode === target));
      document.querySelector(`[data-bottomline-mode="${target}"]`)?.click?.();
    });
  });
  if (group.records.length > visible) {
    root.insertAdjacentHTML('beforeend', `<button class="more-button" data-more="${state.activeBand}">查看更多 ${group.title}</button>`);
    root.querySelector('[data-more]')?.addEventListener('click', () => onMore(state.activeBand));
  }
}
