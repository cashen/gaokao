import '../../shared/resources/release/release-presenter.v3968_0.js?v=3968_0';
import '../../shared/ui/shell/family-shell.v3965_0.js?v=3965_0';
import '../../shared/ui/navigation/module-navigation.v004.js?v=004&r=r027-card5';
import { startTongxueRuntime } from './tongxue-runtime-controller-v159.js?v=159';

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
await startTongxueRuntime();
