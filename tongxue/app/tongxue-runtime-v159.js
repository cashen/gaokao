import '../../shared/resources/release/release-presenter.v3965_0.js?v=3965_0';
import '../../shared/ui/shell/family-shell.v3965_0.js?v=3965_0';
import { startTongxueRuntime } from './tongxue-runtime-controller-v159.js?v=159';

const EXPECTED_BUILD = 'tongxue-v159-single-runtime-owner-20260726';
const actualBuild = document.querySelector('meta[name="tongxue-build"]')?.content || '';
if (actualBuild !== EXPECTED_BUILD) {
  throw new Error(`Tongxue build mismatch: expected ${EXPECTED_BUILD}, received ${actualBuild || 'missing'}`);
}

await startTongxueRuntime();
