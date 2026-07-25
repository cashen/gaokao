import '../../shared/resources/release/release-presenter.v3963_1.js?v=3963_1';
import './workspace/viewport-orchestrator.v3961_0.js?v=3961_0';
import '../../shared/ui/shell/family-shell.v3963_1.js?v=3963_1';
import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  isPublicBottomLineVisible
} from '../../shared/resources/exam/liaoning-physics.js?v=3962_2';
import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3963_1';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../../shared/resources/release/runtime-cache-contract.v3963_1.js?v=3963_1';
import { ALGORITHM_CONTRACT } from '../../shared/algorithms/algorithm-registry.js?v=3963_0';
import { state } from './state/app-state.v3963_1.js?v=3963_1';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;
const originalFetch = globalThis.fetch?.bind(globalThis);

globalThis.__GAOKAO_SHARED_RESOURCES__ = Object.freeze({
  ...(globalThis.__GAOKAO_SHARED_RESOURCES__ || {}),
  release: CURRENT_RELEASE,
  exam: EXAM,
  algorithm: ALGORITHM_CONTRACT,
  runtimeCache: LN_RANK_RUNTIME_CACHE_CONTRACT
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
  url.searchParams.set('searchIntentVersion', CURRENT_RELEASE.searchIntentVersion);
  if (!url.searchParams.get('schoolEntityId') && state?.filters?.schoolEntityId) {
    url.searchParams.set('schoolEntityId', state.filters.schoolEntityId);
  }
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
  panel.dataset.bottomLineEligible = String(isPublicBottomLineVisible(numericScore(input), EXAM));
  panel.dataset.examResource = `${EXAM.region}-${EXAM.subject}-${EXAM.dataYear}`;
  panel.dataset.releaseResource = CURRENT_RELEASE.assetVersion;
  panel.dataset.uiResource = CURRENT_RELEASE.uiOrchestrationVersion;
  panel.dataset.algorithmResource = CURRENT_RELEASE.algorithmOrchestrationVersion;
}

document.addEventListener('gaokao:workspace-state', syncSharedBottomLine);

let startPromise = null;

export function startLnRankRuntime() {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    const workspace = await import('./workspace/selection-workspace-orchestrator.v3963_1.js?v=3963_1');
    await workspace.selectionWorkspaceReady;
    const schoolMode = await import('./feature/school-majors/school-all-mode.v3963_1.js?v=3963_1');
    await schoolMode.schoolAllModeReady;
    syncSharedBottomLine();
    return Object.freeze({
      version: LN_RANK_RUNTIME_CACHE_CONTRACT.version,
      workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
      schoolMode: globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.version || ''
    });
  })();
  return startPromise;
}
