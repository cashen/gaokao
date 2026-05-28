import { diagnoseCard } from './diagnose-api.v3920.js';
import {
  renderDiagnoseError,
  renderDiagnoseLoading,
  renderDiagnoseResult
} from './diagnose-render.v3920.js';

const cache = new Map();

function keyOf(record) {
  return String(record?.id || `${record?.school || ''}-${record?.major || ''}-${record?.score2025 || record?.score || ''}`);
}

export function mountDiagnoseButtons(root, records, state) {
  if (!root || !Array.isArray(records)) return;

  root.querySelectorAll('[data-diagnose-index]').forEach(button => {
    const index = Number(button.dataset.diagnoseIndex);
    const record = records[index];
    if (!record) return;

    const article = button.closest('.major-card');
    const slot = article?.querySelector('[data-diagnose-slot]');
    const key = keyOf(record);

    if (cache.has(key) && slot) {
      renderDiagnoseResult(slot, cache.get(key));
    }

    button.addEventListener('click', async () => {
      if (!slot) return;

      if (cache.has(key)) {
        renderDiagnoseResult(slot, cache.get(key));
        return;
      }

      button.disabled = true;
      button.textContent = '诊断中…';
      renderDiagnoseLoading(slot);

      try {
        const result = await diagnoseCard({
          record,
          candidateScore: state.candidateScore
        });
        cache.set(key, result);
        renderDiagnoseResult(slot, result);
        button.textContent = '已诊断';
      } catch (error) {
        renderDiagnoseError(slot, error.message || String(error));
        button.textContent = '重新诊断';
      } finally {
        button.disabled = false;
      }
    });
  });
}

export function clearDiagnoseCache() {
  cache.clear();
}
