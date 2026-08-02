import '../../../shared/resources/release/release-presenter.v3972_5.js?v=3972_5';
import '../../../shared/ui/shell/family-shell.v3972_5.js?v=3972_5';
import { SITE_RUNTIME_CONTRACT } from '../../../shared/resources/release/site-runtime-contract.v3972_5.js?v=3972_5';

await import('./local-strength-app.v3971_2.js?v=3972_3');

document.body.dataset.siteRuntimeGeneration = SITE_RUNTIME_CONTRACT.generation;
globalThis.__GAOKAO_LOCAL_STRENGTH_ENTRY__ = Object.freeze({
  version: 'local-strength-entry-v3972_5',
  generation: SITE_RUNTIME_CONTRACT.generation,
  packageVersion: 'local-strength-static-v3971_2',
  scorePositionVersion: 'local-strength-score-position-v3972_3'
});
