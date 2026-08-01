export const LN_RANK_INTERACTION_RUNTIME_CONTRACT = Object.freeze({
  version: 'interaction-runtime-coherence-v3972_5',
  releaseVersion: 'v3.9.72.2',
  assetVersion: 'v3972_5',
  entrypoints: Object.freeze({
    page: '/ln-rank/',
    bootstrap: '/ln-rank/js/app.v3972_5.js?v=3972_5',
    runtime: '/ln-rank/js/app-runtime.v3972_5.js?v=3972_5',
    workspace: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js?v=3972_5',
    interaction: '/shared/ui/interaction/interaction-transaction.v3972_5.js?v=3972_5',
    styles: '/shared/ui/interaction/interaction-transaction.v3972_5.css?v=3972_5'
  }),
  owners: Object.freeze({
    filterState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3969_0.js',
    disclosureState: '/shared/ui/interaction/interaction-transaction.v3972_5.js',
    auxiliaryNavigation: '/shared/ui/interaction/interaction-transaction.v3972_5.js',
    runtimeBootstrap: '/ln-rank/js/app.v3972_5.js'
  }),
  policies: Object.freeze({
    nativeChooserQuarantineMs: 1200,
    auxiliaryNativeHrefForbidden: true,
    auxiliaryNavigationSingleOwner: true,
    navigationDuringChooserForbidden: true,
    navigationDuringQuarantineForbidden: true,
    freshPointerOriginCannotBypassQuarantine: true,
    scoreDisclosureUserOwned: true,
    schoolModeMayForceDisclosureOpen: true,
    scoreModeRestoresUserDisclosure: true,
    androidSpecificBusinessBranchForbidden: true,
    stableBusinessDelegatePreserved: true
  })
});
