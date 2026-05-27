import { state, subscribe } from "./state/app-state.js";
import { renderExplorer } from "./feature/score-explorer/score-explorer-render.js";
import { bindScoreExplorerControls } from "./feature/score-explorer/score-explorer-controller.js";
import { bindMajorPoolControls, debouncedLoadMajorPool, loadMajorPool } from "./feature/major-pool/major-pool-controller.js";
import { renderMajorPool, bindMajorPoolRenderEvents } from "./feature/major-pool/major-pool-render.js";

function renderAll() {
  renderExplorer(state);
  renderMajorPool(state);
}

function boot() {
  try {
    subscribe(() => renderAll());
    bindScoreExplorerControls();
    bindMajorPoolControls();
    bindMajorPoolRenderEvents(renderAll);
    renderAll();
    loadMajorPool();
    let lastKey = `${state.candidateScore}|${state.viewScore}`;
    subscribe((next) => {
      const key = `${next.candidateScore}|${next.viewScore}`;
      if (key !== lastKey) {
        lastKey = key;
        debouncedLoadMajorPool();
      }
    });
  } catch (error) {
    const alert = document.getElementById('runtimeError');
    alert.hidden = false;
    alert.textContent = `页面初始化失败：${error.message || error}`;
  }
}

boot();
