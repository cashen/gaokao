import { SLIDER_PRESETS } from "../../config/slider-presets.js";
import { getCurrentViewStatus } from "./score-status.js";
import { buildTicks, toPercent } from "./score-slider-ticks.js";
import { formatNumber, signed } from "../../core/number-utils.js";

export function renderPresets(state) {
  const wrap = document.getElementById("presetButtons");
  if (!wrap) return;
  wrap.innerHTML = Object.values(SLIDER_PRESETS).map((preset) => `
    <button type="button" class="preset-button ${state.rangePreset === preset.key ? 'is-active' : ''}" data-preset="${preset.key}">${preset.label}</button>
  `).join("");
  document.getElementById("customRange").hidden = state.rangePreset !== "custom";
}

export function renderViewSummary(state) {
  const status = getCurrentViewStatus(state.viewDelta);
  document.getElementById("viewScoreText").textContent = `${formatNumber(state.viewScore)} 分`;
  document.getElementById("viewDeltaText").textContent = signed(state.viewDelta);
  document.getElementById("viewStatusText").textContent = status.label;
  document.getElementById("viewPositionText").textContent = status.position;
  document.getElementById("zeroScoreText").textContent = formatNumber(state.candidateScore);
}

export function renderSlider(state) {
  const range = document.getElementById("viewDeltaRange");
  range.min = String(state.minDelta);
  range.max = String(state.maxDelta);
  range.value = String(state.viewDelta);

  const zeroMarker = document.getElementById("zeroMarker");
  const viewMarker = document.getElementById("viewMarker");
  const zeroPct = toPercent(0, state.minDelta, state.maxDelta);
  const viewPct = toPercent(state.viewDelta, state.minDelta, state.maxDelta);
  zeroMarker.style.left = `${zeroPct}%`;
  viewMarker.style.left = `${viewPct}%`;
  document.getElementById("viewMarkerText").textContent = `当前查看 ${formatNumber(state.viewScore)}`;

  const tickLayer = document.getElementById("tickLayer");
  tickLayer.innerHTML = buildTicks(state).map((tick) => `
    <div class="tick ${tick.delta === 0 ? 'is-zero' : ''}" style="left:${toPercent(tick.delta, state.minDelta, state.maxDelta)}%">
      <span>${signed(tick.delta)}</span>
      <span class="score">${formatNumber(tick.score)}</span>
    </div>
  `).join("");
}

export function renderExplorer(state) {
  renderPresets(state);
  renderViewSummary(state);
  renderSlider(state);
}
