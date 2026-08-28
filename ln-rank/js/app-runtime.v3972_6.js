import '../../shared/resources/release/release-presenter.v3972_6.js?v=3972_6';
import './workspace/viewport-orchestrator.v3961_0.js?v=3961_0';
import './domain/family-plan-copy-adapter.v3970_0.js?v=3970_0';
import '../../shared/ui/shell/family-shell.v3972_6.js?v=3972_6';
import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  isPublicBottomLineVisible
} from '../../shared/resources/exam/liaoning-physics.js?v=3967_0';
import { CURRENT_RELEASE } from '../../shared/resources/release/current-release.js?v=3972_6';
import { SITE_RUNTIME_CONTRACT } from '../../shared/resources/release/site-runtime-contract.v3972_6.js?v=3972_6';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../../shared/resources/release/runtime-cache-contract.v3972_6.js?v=3972_6';
import { ALGORITHM_CONTRACT } from '../../shared/algorithms/algorithm-registry.js?v=3969_0';
import { state } from './state/app-state.v3963_1.js?v=3963_1';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;
const INTERACTION_VERSION = 'interaction-transaction-v3972_6';
const RUNTIME_VERSION = 'resource-execution-v3972_6';
const originalFetch = globalThis.fetch?.bind(globalThis);

function assertGeneration() {
  const expected = SITE_RUNTIME_CONTRACT.generation;
  const values = [
    CURRENT_RELEASE.siteRuntimeGeneration,
    LN_RANK_RUNTIME_CACHE_CONTRACT.assetVersion,
    globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.generation,
    globalThis.__GAOKAO_RUNTIME_BOOTSTRAP__?.generation
  ];
  if (values.some(value => value !== expected)) {
    throw new Error(`site runtime generation mismatch: ${values.join(',')}`);
  }
  if (CURRENT_RELEASE.resourceExecutionVersion !== RUNTIME_VERSION) {
    throw new Error(`resource execution mismatch: ${CURRENT_RELEASE.resourceExecutionVersion}`);
  }
  const interactionState = globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.getState?.();
  if (interactionState?.preActivationDomMutationPolicy !== 'forbidden') {
    throw new Error('native chooser pre-activation DOM mutation policy missing');
  }
  if (interactionState?.physicalEventFamily !== (typeof PointerEvent === 'function' ? 'pointer' : interactionState?.physicalEventFamily)) {
    throw new Error('native chooser physical event family ownership mismatch');
  }
}

globalThis.__GAOKAO_SHARED_RESOURCES__ = Object.freeze({
  ...(globalThis.__GAOKAO_SHARED_RESOURCES__ || {}),
  release: CURRENT_RELEASE,
  siteRuntime: SITE_RUNTIME_CONTRACT,
  exam: EXAM,
  algorithm: ALGORITHM_CONTRACT,
  runtimeCache: LN_RANK_RUNTIME_CACHE_CONTRACT,
  resourceExecution: RUNTIME_VERSION,
  academicBackground: CURRENT_RELEASE.academicBackgroundVersion,
  schoolQuery: CURRENT_RELEASE.schoolQueryVersion,
  familyAction: CURRENT_RELEASE.familyActionVersion,
  interaction: INTERACTION_VERSION
});

function numericScore(input) {
  const n = Number(String(input?.value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function rewriteMajorBandsRequest(input, init) {
  if (!originalFetch) return [input, init];
  const rawUrl = input instanceof Request ? input.url : String(input || '');
  let url;
  try { url = new URL(rawUrl, location.href); } catch { return [input, init]; }
  if (url.pathname !== '/api/major-bands') return [input, init];
  const score = Number(url.searchParams.get('candidateScore'));
  const visible = isPublicBottomLineVisible(score, EXAM);
  const selectedMode = String(url.searchParams.get('bottomLineMode') || state?.filters?.bottomLineMode || 'all');
  url.searchParams.set('bottomLineMode', visible ? selectedMode : 'all');
  url.searchParams.set('examDataYear', String(EXAM.dataYear));
  url.searchParams.set('resourceOwnershipVersion', CURRENT_RELEASE.resourceOwnershipVersion);
  url.searchParams.set('resourceExecutionVersion', CURRENT_RELEASE.resourceExecutionVersion);
  url.searchParams.set('siteRuntimeGeneration', CURRENT_RELEASE.siteRuntimeGeneration);
  url.searchParams.set('uiOrchestrationVersion', CURRENT_RELEASE.uiOrchestrationVersion);
  url.searchParams.set('algorithmOrchestrationVersion', CURRENT_RELEASE.algorithmOrchestrationVersion);
  url.searchParams.set('searchIntentVersion', CURRENT_RELEASE.searchIntentVersion);
  url.searchParams.set('schoolQueryContractVersion', CURRENT_RELEASE.schoolQueryVersion);
  url.searchParams.set('historyEvidenceVersion', CURRENT_RELEASE.historyEvidenceVersion);
  url.searchParams.set('familyActionVersion', CURRENT_RELEASE.familyActionVersion);
  url.searchParams.set('interactionVersion', INTERACTION_VERSION);
  if (!url.searchParams.get('schoolEntityId') && state?.filters?.schoolEntityId) url.searchParams.set('schoolEntityId', state.filters.schoolEntityId);
  if (!url.searchParams.get('schoolQueryIntent') && state?.filters?.schoolQueryIntent) url.searchParams.set('schoolQueryIntent', state.filters.schoolQueryIntent);
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
  panel.dataset.siteRuntimeGeneration = CURRENT_RELEASE.siteRuntimeGeneration;
  panel.dataset.uiResource = CURRENT_RELEASE.uiOrchestrationVersion;
  panel.dataset.algorithmResource = CURRENT_RELEASE.algorithmOrchestrationVersion;
  panel.dataset.historyEvidenceResource = CURRENT_RELEASE.historyEvidenceVersion;
  panel.dataset.schoolQueryResource = CURRENT_RELEASE.schoolQueryVersion;
  panel.dataset.familyActionResource = CURRENT_RELEASE.familyActionVersion;
  panel.dataset.interactionResource = INTERACTION_VERSION;
}

document.addEventListener('gaokao:workspace-state', syncSharedBottomLine);
let startPromise = null;

export function startLnRankRuntime() {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    assertGeneration();
    if (globalThis.__GAOKAO_INTERACTION_TRANSACTION__?.version !== INTERACTION_VERSION) {
      throw new Error('unified interaction transaction did not initialize');
    }
    const workspace = await import('./workspace/selection-workspace-orchestrator.v3972_6.js?v=3972_6');
    await workspace.selectionWorkspaceReady;
    const schoolMode = await import('./feature/school-majors/school-all-mode.v3969_0.js?v=3969_0');
    await schoolMode.schoolAllModeReady;
    syncSharedBottomLine();
    return Object.freeze({
      version: RUNTIME_VERSION,
      generation: SITE_RUNTIME_CONTRACT.generation,
      contractVersion: SITE_RUNTIME_CONTRACT.version,
      runtimeCache: LN_RANK_RUNTIME_CACHE_CONTRACT.version,
      workspace: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.version || '',
      workspaceDelegate: globalThis.__GAOKAO_SELECTION_WORKSPACE__?.delegateVersion || '',
      schoolMode: globalThis.__GAOKAO_SCHOOL_ALL_MODE__?.version || '',
      report: globalThis.__GAOKAO_FEISHU_REPORT__?.version || '',
      historyEvidence: CURRENT_RELEASE.historyEvidenceVersion,
      academicBackground: CURRENT_RELEASE.academicBackgroundVersion,
      schoolQuery: CURRENT_RELEASE.schoolQueryVersion,
      familyAction: CURRENT_RELEASE.familyActionVersion,
      interaction: INTERACTION_VERSION
    });
  })();
  return startPromise;
}
