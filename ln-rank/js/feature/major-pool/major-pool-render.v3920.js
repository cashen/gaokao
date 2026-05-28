import { fmt } from '../../core/number-utils.v3912.js';
import { renderHistoryScore } from './history-score-render.v3917.js';
import { mountDiagnoseButtons } from '../diagnose/diagnose-controller.v3920.js';
function safe(value, fallback = '—') { return value == null || value === '' ? fallback : value; }
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
  return [...new Set(arr.filter(Boolean))].slice(0, 6);
}
function card(record, index = 0) {
  const delta = Number(record.scoreDelta || 0);
  const deltaText = delta > 0 ? `+${delta}` : String(delta);
  const statusKey = record.statusKey || 'match';
  const tagHtml = tags(record).map(t => `<span class="school-tag ${tagClass(t)}">${t}</span>`).join('');
  return `<article class="major-card status-${statusKey}">
    <div class="major-card-top">
      <div><div class="school">${safe(record.school)}</div><div class="major">${safe(record.major)}</div></div>
      <span class="status-badge">${safe(record.statusLabel)}</span>
    </div>
    <div class="meta-pills">
      <span class="meta-pill">2025最低分：${fmt(record.score2025 ?? record.score)} 分</span>
      <span class="meta-pill">2025最低位次：${fmt(record.rank2025 ?? record.rank)}</span>
      <span class="meta-pill">相对考生：${deltaText} 分</span>
      <span class="meta-pill">适合位置：${safe(record.position)}</span>
    </div>
    ${renderHistoryScore(record)}
    ${tagHtml ? `<div class="school-tags">${tagHtml}</div>` : ''}
    ${Array.isArray(record.flags) && record.flags.length ? `<div class="meta-pills">${record.flags.slice(0,2).map(f => `<span class="meta-pill">需核验：${f}</span>`).join('')}</div>` : ''}
    <div class="diagnose-actions"><button class="diagnose-button" type="button" data-diagnose-index="${index}">现实诊断</button></div>
    <div class="diagnose-slot" data-diagnose-slot></div>
  </article>`;
}
export function renderMajorResults(state, { onMore }) {
  const meta = document.getElementById('resultsMeta');
  const root = document.getElementById('results');
  const title = document.getElementById('resultsTitle');
  const badge = document.getElementById('activeBandBadge');
  const panel = document.getElementById('resultsPanel');
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
  root.className = 'results-grid';
  root.innerHTML = shown.length ? shown.map((record, index) => card(record, index)).join('') : `<div class="empty">当前筛选条件下暂无记录，可以放宽地域、学校或专业关键词。</div>`;
  mountDiagnoseButtons(root, shown, state);
  if (group.records.length > visible) {
    root.insertAdjacentHTML('beforeend', `<button class="more-button" data-more="${state.activeBand}">查看更多 ${group.title}</button>`);
    root.querySelector('[data-more]').addEventListener('click', () => onMore(state.activeBand));
  }
}
