export const UI_COMPONENT_EXECUTION_VERSION = 'ui-component-execution-v3967_0';

export const UI_COMPONENT_REGISTRY = Object.freeze({
  historyEvidence: Object.freeze({
    id: 'history-evidence',
    domOwner: '/ln-rank/js/feature/major-pool/history-score-render.v3967_0.js',
    cssOwner: '/ln-rank/css/history-evidence.v3967_0.css',
    rootClass: 'ln-history-evidence',
    containerName: 'ln-history-evidence',
    variants: Object.freeze(['compact-card','three-year-detail','selection-item']),
    minReadableWidth: 168,
    forbiddenLegacyClasses: Object.freeze(['history-score','history-score--appendix','history-evidence'])
  }),
  schoolResults: Object.freeze({
    id: 'school-results',
    domOwner: '/ln-rank/js/feature/school-majors/school-all-mode.v3967_0.js',
    cssOwner: '/ln-rank/css/school-all-mode.v3967_0.css',
    containerName: 'school-results',
    allowedPageOverrides: Object.freeze(['placement','outer-gap'])
  }),
  majorResults: Object.freeze({
    id: 'major-results',
    domOwner: '/ln-rank/js/feature/major-pool/render.v3967_0.js',
    cssOwner: '/ln-rank/css/ln-rank-workspace.v3967_0.css',
    allowedPageOverrides: Object.freeze(['placement','outer-gap'])
  })
});
