import '../../shared/resources/release/release-presenter.js?v=3962_2';
import './workspace/viewport-orchestrator.v3961_0.js?v=3961_0';
import '../../shared/ui/shell/family-shell.v3961_0.js?v=3961_0';
import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  isPublicBottomLineVisible
} from '../../shared/resources/exam/liaoning-physics.js?v=3962_2';
import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3962_2';
import { ALGORITHM_CONTRACT } from '../../shared/algorithms/algorithm-registry.js?v=3961_0';
import { state } from './state/app-state.js?v=3961_0';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;
const originalFetch = globalThis.fetch?.bind(globalThis);

globalThis.__GAOKAO_SHARED_RESOURCES__ = Object.freeze({
  ...(globalThis.__GAOKAO_SHARED_RESOURCES__ || {}),
  release: CURRENT_RELEASE,
  exam: EXAM,
  algorithm: ALGORITHM_CONTRACT
});

function numericScore(input) {
  const n = Number(String(input?.value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function rewriteMajorBandsRequest(input, init) {
  if (!originalFetch) return [input, init];
  const rawUrl = input instanceof Request ? input.url : String(input || '');
  let url;
  try {
    url = new URL(rawUrl, location.href);
  } catch {
    return [input, init];
  }
  if (url.pathname !== '/api/major-bands') return [input, init];
  const score = Number(url.searchParams.get('candidateScore'));
  const visible = isPublicBottomLineVisible(score, EXAM);
  const selectedMode = String(url.searchParams.get('bottomLineMode') || state?.filters?.bottomLineMode || 'all');
  url.searchParams.set('bottomLineMode', visible ? selectedMode : 'all');
  url.searchParams.set('examDataYear', String(EXAM.dataYear));
  url.searchParams.set('resourceOwnershipVersion', CURRENT_RELEASE.resourceOwnershipVersion);
  url.searchParams.set('uiOrchestrationVersion', CURRENT_RELEASE.uiOrchestrationVersion);
  url.searchParams.set('algorithmOrchestrationVersion', CURRENT_RELEASE.algorithmOrchestrationVersion);
  if (input instanceof Request) return [new Request(url.toString(), input), init];
  return [url.toString(), init];
}

if (originalFetch) {
  globalThis.fetch = function sharedResourceFetch(input, init) {
    const [nextInput, nextInit] = rewriteMajorBandsRequest(input, init);
    return originalFetch(nextInput, nextInit);
  };
}

function syncSharedBottomLine() {
  const input = document.getElementById('candidateScore');
  const panel = document.getElementById('bottomLinePanel');
  if (!panel) return;
  const visible = isPublicBottomLineVisible(numericScore(input), EXAM);
  panel.hidden = !visible;
  panel.dataset.examResource = `${EXAM.region}-${EXAM.subject}-${EXAM.dataYear}`;
  panel.dataset.releaseResource = CURRENT_RELEASE.assetVersion;
  panel.dataset.uiResource = CURRENT_RELEASE.uiOrchestrationVersion;
  panel.dataset.algorithmResource = CURRENT_RELEASE.algorithmOrchestrationVersion;
}

document.addEventListener('gaokao:workspace-state', syncSharedBottomLine);
await import('./workspace/selection-workspace-orchestrator.v3961_0.js?v=3961_0');
await import('./feature/school-majors/school-all-mode.v3962_2.js?v=3962_2');
syncSharedBottomLine();
