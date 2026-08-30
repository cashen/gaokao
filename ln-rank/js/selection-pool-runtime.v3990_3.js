import { SITE_RUNTIME_CONTRACT } from '../../shared/resources/release/site-runtime-contract.v3990_3.js?v=3990_3';

await import('./selection-pool-runtime.v3967_0.js?v=3967_0');

document.body.dataset.siteRuntimeGeneration = SITE_RUNTIME_CONTRACT.generation;
globalThis.__GAOKAO_SELECTION_POOL_RUNTIME__ = Object.freeze({
  version: 'selection-pool-runtime-v3990_3',
  generation: SITE_RUNTIME_CONTRACT.generation,
  delegateVersion: 'selection-pool-runtime-v3967_0'
});
