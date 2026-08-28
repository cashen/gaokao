import { diagnoseCard } from './api.js?v=3955_0';
import {
  renderDiagnoseError,
  renderDiagnoseLoading,
  renderDiagnoseResult
} from './render.js?v=3955_0';

const cache = new Map();

function keyOf(record, candidateScore) {
  return [
    record?.id || `${record?.school || ''}-${record?.major || ''}`,
    `candidate:${Number(candidateScore) || 0}`,
    `score2026:${record?.score2026 ?? record?.score ?? ''}`,
    `rank2026:${record?.rank2026 ?? record?.rank ?? ''}`,
    `score2025:${record?.score2025 ?? ''}`,
    `rank2025:${record?.rank2025 ?? ''}`
  ].join('|');
}

export function mountDiagnoseButtons(root, records, state) {
  if (!root || !Array.isArray(records)) return;

  root.querySelectorAll('[data-diagnose-index]').forEach(button => {
    const index = Number(button.dataset.diagnoseIndex);
    const record = records[index];
    if (!record) return;

    const candidateScore = Number(state?.candidateScore || 0);
    const key = keyOf(record, candidateScore);

    button.addEventListener('click', async () => {
      if (cache.has(key)) {
        renderDiagnoseResult(record, cache.get(key));
        return;
      }

      button.disabled = true;
      button.textContent = '解读中…';
      renderDiagnoseLoading(record);

      try {
        const result = await diagnoseCard({
          record,
          candidateScore
        });
        cache.set(key, result);
        renderDiagnoseResult(record, result);
        button.textContent = '单条解读';
      } catch (error) {
        renderDiagnoseError(record, error.message || String(error));
        button.textContent = '重新解读';
      } finally {
        button.disabled = false;
      }
    });
  });
}

export function clearDiagnoseCache() {
  cache.clear();
}
