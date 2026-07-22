import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  isPublicBottomLineVisible
} from '../../shared/resources/exam/liaoning-physics.js?v=3955_0';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

globalThis.__GAOKAO_SHARED_RESOURCES__ = Object.freeze({
  ...(globalThis.__GAOKAO_SHARED_RESOURCES__ || {}),
  exam: EXAM
});

await import('./app.v3951_0.js?v=3951_0');

function numericScore(input) {
  const n = Number(String(input?.value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function syncSharedBottomLine() {
  const input = document.getElementById('candidateScore');
  const panel = document.getElementById('bottomLinePanel');
  if (!panel) return;
  const visible = isPublicBottomLineVisible(numericScore(input), EXAM);
  panel.hidden = !visible;
  panel.dataset.examResource = `${EXAM.region}-${EXAM.subject}-${EXAM.dataYear}`;
  const summary = document.getElementById('bottomLineSummary');
  if (summary) {
    summary.textContent = `参考分数位于${EXAM.dataYear}本科线${EXAM.undergraduateControlScore}分至特控线${EXAM.specialControlScore}分之间时，显示学校性质和费用提醒。`;
  }
}

function scheduleSharedSync() {
  queueMicrotask(syncSharedBottomLine);
}

const scoreInput = document.getElementById('candidateScore');
if (scoreInput) {
  for (const eventName of ['input', 'change', 'blur']) {
    scoreInput.addEventListener(eventName, scheduleSharedSync, true);
  }
}

document.addEventListener('lnrank-query-completed', scheduleSharedSync);
syncSharedBottomLine();
