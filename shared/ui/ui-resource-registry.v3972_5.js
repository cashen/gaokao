import { CURRENT_RELEASE } from '../resources/release/current-release.js?v=3972_5';
import { SITE_RUNTIME_CONTRACT } from '../resources/release/site-runtime-contract.v3972_5.js?v=3972_5';
import { UI_PAGE_REGISTRY as STABLE_UI_PAGE_CATALOG } from './ui-registry.v3970_0.js?v=3970_0';

export const UI_RESOURCE_REGISTRY_VERSION = 'ui-resource-registry-v3972_5';
export const UI_CSS_RESOURCE_GRAPH_VERSION = 'css-resource-graph-v3972_5';
export const UI_COMPONENT_REGISTRY_VERSION = CURRENT_RELEASE.uiComponentExecutionVersion;

const stripQuery = value => String(value || '').split('?')[0];
const active = key => stripQuery(SITE_RUNTIME_CONTRACT.activeEntrypoints[key]);
const stable = path => String(path || '');
const resource = (value, classification, role, owner = value) => Object.freeze({
  path: stripQuery(value),
  classification,
  role,
  owner: stripQuery(owner)
});

export const UI_PAGE_REGISTRY = STABLE_UI_PAGE_CATALOG;

export const UI_ACTIVE_RESOURCE_REGISTRY = Object.freeze({
  familyShellJs: active('familyShell'),
  familyShellCss: active('familyShellStyles'),
  familyPlanEntryJs: active('familyPlanEntry'),
  familyPlanEntryCss: active('familyPlanEntryStyles'),
  interactionJs: active('interactionRuntime'),
  interactionCss: active('interactionStyles'),
  homeRuntime: active('homeRuntime'),
  selectionBootstrap: active('selectionBootstrap'),
  selectionRuntime: active('selectionRuntime'),
  selectionWorkspace: active('selectionWorkspace'),
  familyPlanBootstrap: active('familyPlanBootstrap'),
  familyPlanRuntime: active('familyPlanRuntime')
});

export const UI_STABLE_RESOURCE_REGISTRY = Object.freeze({
  pageCatalogAdapter: stable('/shared/ui/ui-registry.v3970_0.js'),
  foundationCss: stable('/shared/ui/tokens/foundation.v3959_0.css'),
  semanticCss: stable('/shared/ui/tokens/semantic.v3959_0.css'),
  modeSwitchCss: stable('/shared/ui/components/mode-switch.v3963_0.css'),
  actionContract: stable('/shared/ui/contracts/action-contract.v3970_0.js'),
  copyContract: stable('/shared/ui/contracts/copy-contract.v3970_0.js'),
  stateContract: stable('/shared/ui/contracts/state-contract.v3970_0.js'),
  familyDecisionContract: stable('/ln-rank/js/domain/family-decision-contract.v3970_0.js'),
  familyPlanCopyAdapter: stable('/ln-rank/js/domain/family-plan-copy-adapter.v3970_0.js'),
  workspaceCss: stable('/ln-rank/css/ln-rank-workspace.v3967_0.css'),
  schoolResultsCss: stable('/ln-rank/css/school-all-mode.v3967_0.css'),
  historyEvidenceCss: stable('/ln-rank/css/history-evidence.v3967_0.css'),
  selectionPoolCss: stable('/ln-rank/css/selection-pool.v3964_0.css'),
  academicBackgroundCss: stable('/ln-rank/css/academic-background.v3968_0.css'),
  localStrengthCss: stable('/ln-rank/css/local-strength.v3971_2.css'),
  localStrengthScorePositionCss: stable('/ln-rank/css/local-strength-score-position.v3972_3.css'),
  all211Css: stable('/ln-rank/css/all211-static.v3972_0.css')
});

export const UI_COMPONENT_REGISTRY = Object.freeze({
  globalShell: Object.freeze({
    id: 'global-shell',
    domOwner: UI_ACTIVE_RESOURCE_REGISTRY.familyShellJs,
    cssOwner: UI_ACTIVE_RESOURCE_REGISTRY.familyShellCss,
    classification: 'active-generation'
  }),
  familyPlanEntry: Object.freeze({
    id: 'family-plan-entry',
    domOwner: UI_ACTIVE_RESOURCE_REGISTRY.familyPlanEntryJs,
    cssOwner: UI_ACTIVE_RESOURCE_REGISTRY.familyPlanEntryCss,
    stateOwner: UI_STABLE_RESOURCE_REGISTRY.familyDecisionContract,
    copyOwner: UI_STABLE_RESOURCE_REGISTRY.copyContract,
    classification: 'active-generation',
    variants: Object.freeze(['header-compact', 'results-footer']),
    forbiddenVariants: Object.freeze(['fixed-bottom', 'floating-fab', 'sticky-overlay', 'full-width-mobile-overlay'])
  }),
  interactionTransaction: Object.freeze({
    id: 'interaction-transaction',
    domOwner: UI_ACTIVE_RESOURCE_REGISTRY.interactionJs,
    cssOwner: UI_ACTIVE_RESOURCE_REGISTRY.interactionCss,
    classification: 'active-generation'
  }),
  majorResults: Object.freeze({
    id: 'major-results',
    domOwner: '/ln-rank/js/feature/major-pool/render.v3967_0.js',
    cssOwner: UI_STABLE_RESOURCE_REGISTRY.workspaceCss,
    classification: 'stable-business-resource'
  }),
  schoolResults: Object.freeze({
    id: 'school-results',
    domOwner: '/ln-rank/js/feature/school-majors/school-all-mode.v3969_0.js',
    cssOwner: UI_STABLE_RESOURCE_REGISTRY.schoolResultsCss,
    classification: 'stable-business-resource',
    containerName: 'school-results'
  }),
  historyEvidence: Object.freeze({
    id: 'history-evidence',
    domOwner: '/ln-rank/js/feature/major-pool/history-score-render.v3967_0.js',
    cssOwner: UI_STABLE_RESOURCE_REGISTRY.historyEvidenceCss,
    classification: 'stable-business-resource',
    rootClass: 'ln-history-evidence',
    containerName: 'ln-history-evidence'
  }),
  localStrength: Object.freeze({
    id: 'local-strength',
    domOwner: '/ln-rank/js/local-strength/local-strength-app.v3971_2.js',
    cssOwner: UI_STABLE_RESOURCE_REGISTRY.localStrengthCss,
    supplementalCssOwner: UI_STABLE_RESOURCE_REGISTRY.localStrengthScorePositionCss,
    classification: 'stable-page-resource'
  }),
  all211: Object.freeze({
    id: 'all-211',
    domOwner: '/ln-rank/js/academic-background/all211-static-app.v3972_0.js',
    cssOwner: UI_STABLE_RESOURCE_REGISTRY.all211Css,
    classification: 'stable-page-resource'
  })
});

export const UI_CSS_RESOURCE_GRAPH = Object.freeze([
  resource(UI_STABLE_RESOURCE_REGISTRY.foundationCss, 'stable-foundation', 'design-token'),
  resource(UI_STABLE_RESOURCE_REGISTRY.semanticCss, 'stable-foundation', 'semantic-token'),
  resource(UI_STABLE_RESOURCE_REGISTRY.modeSwitchCss, 'stable-component', 'mode-switch'),
  resource(UI_ACTIVE_RESOURCE_REGISTRY.familyShellCss, 'active-generation', 'global-shell', UI_ACTIVE_RESOURCE_REGISTRY.familyShellJs),
  resource(UI_ACTIVE_RESOURCE_REGISTRY.familyPlanEntryCss, 'active-generation', 'family-plan-entry', UI_ACTIVE_RESOURCE_REGISTRY.familyPlanEntryJs),
  resource(UI_ACTIVE_RESOURCE_REGISTRY.interactionCss, 'active-generation', 'interaction-transaction', UI_ACTIVE_RESOURCE_REGISTRY.interactionJs),
  resource(UI_STABLE_RESOURCE_REGISTRY.workspaceCss, 'stable-business-resource', 'major-results'),
  resource(UI_STABLE_RESOURCE_REGISTRY.schoolResultsCss, 'stable-business-resource', 'school-results'),
  resource(UI_STABLE_RESOURCE_REGISTRY.historyEvidenceCss, 'stable-business-resource', 'history-evidence'),
  resource(UI_STABLE_RESOURCE_REGISTRY.selectionPoolCss, 'stable-page-resource', 'family-plan-page'),
  resource(UI_STABLE_RESOURCE_REGISTRY.academicBackgroundCss, 'stable-business-resource', 'academic-background'),
  resource(UI_STABLE_RESOURCE_REGISTRY.localStrengthCss, 'stable-page-resource', 'local-strength'),
  resource(UI_STABLE_RESOURCE_REGISTRY.localStrengthScorePositionCss, 'stable-page-resource', 'local-strength-score-position'),
  resource(UI_STABLE_RESOURCE_REGISTRY.all211Css, 'stable-page-resource', 'all-211')
]);

export const UI_RESOURCE_POLICIES = Object.freeze({
  singleCurrentRegistry: true,
  activeGenerationDerivedFromSiteContract: true,
  oldVersionMayOnlyBeStableAdapter: true,
  cssOwnerMustBeRegistered: true,
  componentDomAndCssOwnersMustBeExplicit: true,
  deviceSpecificBusinessCssForbidden: true,
  historicalAssetsCannotClaimActiveOwnership: true
});

export function getUiPage(key) {
  return UI_PAGE_REGISTRY[key] || UI_PAGE_REGISTRY.home;
}

export function getUiComponent(key) {
  return UI_COMPONENT_REGISTRY[key] || null;
}

export function getUiResource(key) {
  return UI_ACTIVE_RESOURCE_REGISTRY[key] || UI_STABLE_RESOURCE_REGISTRY[key] || '';
}
