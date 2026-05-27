import { GROUP_TEXT } from "../../config/ui-text.js";
import { renderMajorCard } from "./major-card-render.js";
import { getWindowByViewScore } from "../../core/score-utils.js";

const visibleState = { upper: 12, near: 12, lower: 12 };

function rangeText(key, meta) {
  if (!meta || !meta.window) return '';
  const v = meta.viewScore;
  if (key === 'upper') return `${v + 1}-${v + 10}`;
  if (key === 'near') return `${v - 10}-${v}`;
  return `${v - 25}-${v - 11}`;
}

export function resetVisibleCounts() {
  visibleState.upper = 12;
  visibleState.near = 12;
  visibleState.lower = 12;
}

export function renderMajorPool(state) {
  const title = document.getElementById("majorWindowTitle");
  const sub = document.getElementById("majorWindowSub");
  const load = document.getElementById("majorLoadState");
  const groupsWrap = document.getElementById("majorGroups");
  const window = getWindowByViewScore(state.viewScore);

  title.textContent = `当前查看：${state.viewScore} 分附近专业`;
  sub.textContent = `窗口：${window.lower}-${window.upper}。上探 ${state.viewScore + 1}-${state.viewScore + 10}，主体 ${state.viewScore - 10}-${state.viewScore}，稳妥 ${state.viewScore - 25}-${state.viewScore - 11}。`;

  if (state.majorPool.loading) {
    load.hidden = false; load.className = 'load-state'; load.textContent = '正在读取 /fenxi 专业数据…';
  } else if (state.majorPool.error) {
    load.hidden = false; load.className = 'load-state is-error'; load.textContent = state.majorPool.error;
  } else {
    load.hidden = true;
  }

  const groups = state.majorPool.groups || { upper: [], near: [], lower: [] };
  const meta = state.majorPool.meta || { viewScore: state.viewScore, window };

  groupsWrap.innerHTML = ['upper','near','lower'].map((key) => {
    const items = groups[key] || [];
    const shown = items.slice(0, visibleState[key]);
    const more = items.length > shown.length;
    return `
      <section class="major-group" data-group="${key}">
        <div class="major-group-head">
          <div><h3>${GROUP_TEXT[key].title}（${rangeText(key, meta)}）</h3><span>${GROUP_TEXT[key].explain}</span></div>
          <span>${items.length} 条</span>
        </div>
        <div class="major-list">
          ${shown.length ? shown.map(renderMajorCard).join('') : `<p class="empty-group">当前筛选条件下暂无记录。</p>`}
        </div>
        ${more ? `<button type="button" class="group-more" data-more="${key}">查看更多</button>` : ''}
      </section>
    `;
  }).join('');
}

export function bindMajorPoolRenderEvents(onMore) {
  document.getElementById("majorGroups").addEventListener("click", (event) => {
    const button = event.target.closest("[data-more]");
    if (!button) return;
    const key = button.dataset.more;
    visibleState[key] += 12;
    onMore();
  });
}
