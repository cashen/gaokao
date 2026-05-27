import { state, setState } from "../../state/app-state.js";
import { SLIDER_PRESETS } from "../../config/slider-presets.js";
import { toInt, clamp } from "../../core/number-utils.js";

export function bindScoreExplorerControls() {
  const candidateInput = document.getElementById("candidateScoreInput");
  const deltaRange = document.getElementById("viewDeltaRange");
  const customMinInput = document.getElementById("customMinInput");
  const customMaxInput = document.getElementById("customMaxInput");

  candidateInput.addEventListener("input", () => {
    const candidateScore = clamp(toInt(candidateInput.value, state.candidateScore), 150, 707);
    setState({ candidateScore });
  });

  deltaRange.addEventListener("input", () => {
    setState({ viewDelta: toInt(deltaRange.value, 0) });
  });

  document.getElementById("presetButtons").addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    if (!button) return;
    const key = button.dataset.preset;
    let preset = SLIDER_PRESETS[key];
    let minDelta = preset.min;
    let maxDelta = preset.max;
    if (key === "custom") {
      const left = Math.abs(toInt(customMinInput.value, 50));
      const right = Math.abs(toInt(customMaxInput.value, 100));
      minDelta = -left;
      maxDelta = right;
    }
    setState({ rangePreset: key, minDelta, maxDelta, viewDelta: clamp(state.viewDelta, minDelta, maxDelta) });
  });

  [customMinInput, customMaxInput].forEach((input) => {
    input.addEventListener("change", () => {
      if (state.rangePreset !== "custom") return;
      const left = Math.abs(toInt(customMinInput.value, 50));
      const right = Math.abs(toInt(customMaxInput.value, 100));
      setState({ customMinAbs: left, customMaxAbs: right, minDelta: -left, maxDelta: right, viewDelta: clamp(state.viewDelta, -left, right) });
    });
  });
}
