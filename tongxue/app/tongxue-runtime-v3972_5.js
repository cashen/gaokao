import '../../shared/resources/release/release-presenter.v3972_5.js?v=3972_5';
import '../../shared/ui/shell/family-shell.v3972_5.js?v=3972_5';
import { SITE_RUNTIME_CONTRACT } from '../../shared/resources/release/site-runtime-contract.v3972_5.js?v=3972_5';
import { startTongxueRuntime } from './tongxue-runtime-controller-v159.js?v=159';

export const TONGXUE_RUNTIME_VERSION = 'tongxue-runtime-v3972_5';
const EXPECTED_BUILD = 'tongxue-v159-single-runtime-owner-20260726';
const actualBuild = document.querySelector('meta[name="tongxue-build"]')?.content || '';
if (actualBuild !== EXPECTED_BUILD) {
  throw new Error(`Tongxue build mismatch: expected ${EXPECTED_BUILD}, received ${actualBuild || 'missing'}`);
}

function installTongxueRuntimeLayout() {
  if (document.querySelector('[data-tongxue-runtime-layout="v159"]')) return;
  const style = document.createElement('style');
  style.dataset.tongxueRuntimeLayout = 'v159';
  style.textContent = `
    @media (max-width: 700px) {
      #schoolSuggestions.suggestions {
        position: static;
        margin-top: 8px;
        max-height: min(46vh, 320px);
      }
    }
  `;
  document.head.append(style);
}

installTongxueRuntimeLayout();
document.body.dataset.siteRuntimeGeneration = SITE_RUNTIME_CONTRACT.generation;
await startTongxueRuntime();

globalThis.__GAOKAO_TONGXUE_RUNTIME__ = Object.freeze({
  version: TONGXUE_RUNTIME_VERSION,
  generation: SITE_RUNTIME_CONTRACT.generation,
  coreVersion: 'tongxue-runtime-v159',
  build: EXPECTED_BUILD
});
