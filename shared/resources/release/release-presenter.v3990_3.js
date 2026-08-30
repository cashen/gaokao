import { CURRENT_RELEASE } from './current-release.js?v=3990_3&r=r036-major-history-rank-lazy';
import { SITE_RUNTIME_CONTRACT } from './site-runtime-contract.v3990_3.js?v=3990_3&r=r036-major-history-rank-lazy';

export function syncCurrentRelease(root = document) {
  if (typeof document === 'undefined') return CURRENT_RELEASE;
  const doc = root?.nodeType === 9 ? root : root?.ownerDocument || document;
  const release = CURRENT_RELEASE.display;
  const generation = SITE_RUNTIME_CONTRACT.generation;
  if (doc.documentElement) {
    doc.documentElement.dataset.release = release;
    doc.documentElement.dataset.siteRuntimeGeneration = generation;
  }
  if (doc.body) {
    doc.body.dataset.release = release;
    doc.body.dataset.uiRelease = release;
    doc.body.dataset.siteRuntimeGeneration = generation;
    doc.body.dataset.resourceExecution = CURRENT_RELEASE.resourceExecutionVersion;
    doc.body.dataset.runtimeCache = CURRENT_RELEASE.runtimeCacheVersion;
    doc.body.dataset.academicBackground = CURRENT_RELEASE.academicBackgroundVersion;
    doc.body.dataset.schoolQuery = CURRENT_RELEASE.schoolQueryVersion;
    doc.body.dataset.familyAction = CURRENT_RELEASE.familyActionVersion;
    doc.body.dataset.interactionVersion = CURRENT_RELEASE.interactionVersion;
  }
  doc.querySelectorAll('[data-current-release]').forEach(node => {
    node.textContent = release;
    node.dataset.releaseSource = CURRENT_RELEASE.resourceOwners.release;
    node.dataset.siteRuntimeGeneration = generation;
  });
  globalThis.__GAOKAO_RELEASE__ = CURRENT_RELEASE;
  globalThis.__GAOKAO_SITE_RUNTIME__ = SITE_RUNTIME_CONTRACT;
  return CURRENT_RELEASE;
}

export function mountCurrentRelease() {
  if (typeof document === 'undefined') return CURRENT_RELEASE;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncCurrentRelease(document), { once: true });
    return CURRENT_RELEASE;
  }
  return syncCurrentRelease(document);
}

mountCurrentRelease();
