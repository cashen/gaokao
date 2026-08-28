export const UI_COMPONENT_EXECUTION_VERSION = 'ui-component-execution-v3970_0';

export const UI_COMPONENT_REGISTRY = Object.freeze({
  historyEvidence: Object.freeze({
    id: 'history-evidence',
    domOwner: '/ln-rank/js/feature/major-pool/history-score-render.v3967_0.js',
    cssOwner: '/ln-rank/css/history-evidence.v3967_0.css',
    rootClass: 'ln-history-evidence',
    containerName: 'ln-history-evidence',
    variants: Object.freeze(['compact-card', 'three-year-detail', 'selection-item']),
    minReadableWidth: 168,
    forbiddenLegacyClasses: Object.freeze(['history-score', 'history-score--appendix', 'history-evidence'])
  }),
  schoolResults: Object.freeze({
    id: 'school-results',
    domOwner: '/ln-rank/js/feature/school-majors/school-all-mode.v3969_0.js',
    cssOwner: '/ln-rank/css/school-all-mode.v3967_0.css',
    containerName: 'school-results',
    allowedPageOverrides: Object.freeze(['placement', 'outer-gap'])
  }),
  majorResults: Object.freeze({
    id: 'major-results',
    domOwner: '/ln-rank/js/feature/major-pool/render.v3967_0.js',
    cssOwner: '/ln-rank/css/ln-rank-workspace.v3967_0.css',
    allowedPageOverrides: Object.freeze(['placement', 'outer-gap'])
  }),
  familyPlanEntry: Object.freeze({
    id: 'family-plan-entry',
    stateOwner: '/ln-rank/js/domain/family-decision-contract.v3970_0.js',
    domOwner: '/shared/ui/components/family-plan-entry.v3970_0.js',
    cssOwner: '/shared/ui/components/family-plan-entry.v3970_0.css',
    copyOwner: '/shared/ui/contracts/copy-contract.v3970_0.js',
    actionOwner: '/shared/ui/contracts/action-contract.v3970_0.js',
    variants: Object.freeze(['header-compact', 'results-footer']),
    forbiddenVariants: Object.freeze(['fixed-bottom', 'floating-fab', 'sticky-overlay', 'full-width-mobile-overlay']),
    allowedPageOverrides: Object.freeze(['placement', 'outer-gap'])
  })
});
