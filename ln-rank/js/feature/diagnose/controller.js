import { diagnoseCard } from './api.js?v=3933_1';
import {
  renderDiagnoseError,
  renderDiagnoseLoading,
  renderDiagnoseResult
} from './render.js?v=3933_1';

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

    const key = keyOf(record);

    button.addEventListener('click', async () => {
      if (cache.has(key)) {
        renderDiagnoseResult(record, cache.get(key));
        return;
      }

      button.disabled = true;
      button.textContent = '诊断中…';
      renderDiagnoseLoading(record);

      try {
        const result = await diagnoseCard({
          record,
          candidateScore: state.candidateScore
        });
        cache.set(key, result);
        renderDiagnoseResult(record, result);
        button.textContent = '单条解读';
      } catch (error) {
        renderDiagnoseError(record, error.message || String(error));
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
