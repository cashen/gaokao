import { fmt } from '../../core/number-utils.v3912.js';
import { renderHistoryScore } from './history-score-render.v3917.js';
import { mountDiagnoseButtons } from '../diagnose/diagnose-controller.v3935.js';

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
  return `<div class="keyword-summary"><span>当前关键词：</span>${chips}<span class="muted">匹配逻辑：任意命中</span>${project}${industry}${warnings}</div>`;
}
function renderSearchAdvices(data) {
  const advices = data?.searchAdvices || [];
  if (!Array.isArray(advices) || !advices.length) return '';
  return advices.map(advice => `<div class="search-advice search-advice-${escapeHtml(advice.level || 'info')}"><div>${escapeHtml(advice.message || '')}</div>${advice.action ? `<button type="button" data-search-advice-action="${escapeHtml(advice.action.type)}" data-target="${escapeHtml(advice.action.target)}">${escapeHtml(advice.action.label || '应用建议')}</button>` : ''}</div>`).join('');
}

function poolButton(record, index, selectionPool) {
  const inPool = Boolean(selectionPool?.has?.(record));
  return `<button class="pool-add-button ${inPool ? 'is-added' : ''}" type="button" data-pool-index="${index}" ${inPool ? 'disabled' : ''}>${inPool ? '已加入自选池' : '加入自选池'}</button>`;
}
function card(record, index = 0, selectionPool = null) {
  const delta = Number(record.scoreDelta || 0);
  const deltaText = delta > 0 ? `+${delta}` : String(delta);
  const statusKey = record.statusKey || 'match';
  const tagHtml = tags(record).map(t => `<span class="school-tag ${tagClass(t)}">${escapeHtml(t)}</span>`).join('');
  return `<article class="major-card status-${statusKey}">
    <div class="major-card-top">
      <div><div class="school">${escapeHtml(safe(record.school))}</div><div class="major">${escapeHtml(safe(record.major))}</div></div>
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
    ${Array.isArray(record.matchBadges) && record.matchBadges.length ? `<div class="match-badges">${record.matchBadges.slice(0,3).map(f => `<span class="match-badge">${escapeHtml(f)}</span>`).join('')}</div>` : ''}
    <div class="major-card-actions">
      ${poolButton(record, index, selectionPool)}
      <button class="diagnose-button" type="button" data-diagnose-index="${index}">AI诊断</button>
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
  const group = data.bands[state.activeBand];
  title.textContent = group.title;
  badge.textContent = `${group.rangeText} 分`;
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
  root.className = 'results-grid';
  const emptyReason = bottomLineMode !== 'all'
    ? `<div class="empty">当前筛选条件下暂无记录。可能是办学性质底线、查询范围、地域或专业关键词共同限制导致。可以切换为“公办优先”、扩大查询范围，或放宽专业/地域。</div>`
    : `<div class="empty">当前筛选条件下暂无记录，可以放宽地域、学校或专业关键词。</div>`;
  root.innerHTML = keywordSummary + searchAdvices + bottomLineNote + (shown.length ? shown.map((record, index) => card(record, index, selectionPool)).join('') : emptyReason);
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
        button.textContent = '已加入自选池';
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
      try { localStorage.setItem('lnRank.bottomLineMode.v3964', target); localStorage.setItem('lnRank.bottomLineMode.v3962', target); } catch {}
      document.querySelectorAll('[data-bottomline-mode]').forEach(el => el.classList.toggle('is-active', el.dataset.bottomlineMode === target));
      document.querySelector(`[data-bottomline-mode="${target}"]`)?.click?.();
    });
  });
  if (group.records.length > visible) {
    root.insertAdjacentHTML('beforeend', `<button class="more-button" data-more="${state.activeBand}">查看更多 ${group.title}</button>`);
    root.querySelector('[data-more]')?.addEventListener('click', () => onMore(state.activeBand));
  }
}
