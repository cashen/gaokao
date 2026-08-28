const VERSION = 'selection-workspace-orchestration-v3972_4';
const INTERACTION_VERSION = 'interaction-transaction-v3972_4';

const interaction = globalThis.__GAOKAO_INTERACTION_TRANSACTION__;
if (interaction?.version !== INTERACTION_VERSION) {
  throw new Error(`interaction transaction unavailable: ${interaction?.version || 'missing'}`);
}

const legacyModule = await import('./selection-workspace-orchestrator.v3969_0.js?v=3969_0');
const legacyWorkspace = await legacyModule.selectionWorkspaceReady;

const workspace = Object.freeze({
  version: VERSION,
  delegateVersion: legacyWorkspace?.version || '',
  interactionVersion: interaction.version,
  disclosureOwner: interaction.getState().disclosureOwner,
  getState: () => Object.freeze({
    ...(legacyWorkspace?.getState?.() || {}),
    interaction: interaction.getState()
  }),
  submit: (...args) => legacyWorkspace?.submit?.(...args),
  selectBand: (...args) => legacyWorkspace?.selectBand?.(...args)
});

globalThis.__GAOKAO_SELECTION_WORKSPACE__ = workspace;
document.body.dataset.workspaceOrchestration = VERSION;

export const selectionWorkspaceReady = Promise.resolve(workspace);

export function mountSelectionWorkspace() {
  return workspace;
}
