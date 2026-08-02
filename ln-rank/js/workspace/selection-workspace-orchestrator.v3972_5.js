import { SITE_RUNTIME_CONTRACT } from '../../../shared/resources/release/site-runtime-contract.v3972_5.js?v=3972_5';

const VERSION = 'selection-workspace-orchestration-v3972_5';
const INTERACTION_VERSION = 'interaction-transaction-v3972_5';

const interaction = globalThis.__GAOKAO_INTERACTION_TRANSACTION__;
if (interaction?.version !== INTERACTION_VERSION) {
  throw new Error(`interaction transaction unavailable: ${interaction?.version || 'missing'}`);
}
if (interaction?.generation !== SITE_RUNTIME_CONTRACT.generation) {
  throw new Error(`interaction generation mismatch: ${interaction?.generation || 'missing'}`);
}

const stableModule = await import('./selection-workspace-orchestrator.v3969_0.js?v=3969_0');
const stableWorkspace = await stableModule.selectionWorkspaceReady;

const workspace = Object.freeze({
  version: VERSION,
  generation: SITE_RUNTIME_CONTRACT.generation,
  delegateVersion: stableWorkspace?.version || '',
  interactionVersion: interaction.version,
  disclosureOwner: interaction.getState().disclosureOwner,
  navigationOwner: interaction.getState().auxiliaryNavigationOwner,
  getState: () => Object.freeze({
    ...(stableWorkspace?.getState?.() || {}),
    generation: SITE_RUNTIME_CONTRACT.generation,
    interaction: interaction.getState()
  }),
  submit: (...args) => stableWorkspace?.submit?.(...args),
  selectBand: (...args) => stableWorkspace?.selectBand?.(...args)
});

globalThis.__GAOKAO_SELECTION_WORKSPACE__ = workspace;
document.body.dataset.workspaceOrchestration = VERSION;
document.body.dataset.siteRuntimeGeneration = SITE_RUNTIME_CONTRACT.generation;

export const selectionWorkspaceReady = Promise.resolve(workspace);

export function mountSelectionWorkspace() {
  return workspace;
}
