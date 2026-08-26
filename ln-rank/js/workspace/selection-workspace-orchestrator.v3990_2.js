import { SITE_RUNTIME_CONTRACT } from '../../../shared/resources/release/site-runtime-contract.v3990_2.js?v=3990_2';

const VERSION = 'selection-workspace-orchestration-v3990_2';
const INTERACTION_VERSION = 'interaction-transaction-v3990_2';

const interaction = globalThis.__GAOKAO_INTERACTION_TRANSACTION__;
if (interaction?.version !== INTERACTION_VERSION) {
  throw new Error(`interaction transaction unavailable: ${interaction?.version || 'missing'}`);
}
if (interaction?.generation !== SITE_RUNTIME_CONTRACT.generation) {
  throw new Error(`interaction generation mismatch: ${interaction?.generation || 'missing'}`);
}
const interactionState = interaction.getState();
if (interactionState.preActivationDomMutationPolicy !== 'forbidden') {
  throw new Error('native chooser activation integrity contract missing');
}
if (!interactionState.tailGuardStartsAfterOutcome) {
  throw new Error('native chooser tail guard ordering contract missing');
}

const stableModule = await import('./selection-workspace-orchestrator.v3969_1.js?v=3969_1');
const stableWorkspace = await stableModule.selectionWorkspaceReady;

const workspace = Object.freeze({
  version: VERSION,
  generation: SITE_RUNTIME_CONTRACT.generation,
  delegateVersion: stableWorkspace?.version || '',
  interactionVersion: interaction.version,
  disclosureOwner: interaction.getState().disclosureOwner,
  navigationOwner: interaction.getState().auxiliaryNavigationOwner,
  nativeChooserActivationOwner: SITE_RUNTIME_CONTRACT.owners.nativeChooserActivation,
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

