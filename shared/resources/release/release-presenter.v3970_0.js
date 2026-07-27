import { CURRENT_RELEASE } from './current-release.js?v=3970_0';

export function syncCurrentRelease(root = document) {
  if (typeof document === 'undefined') return CURRENT_RELEASE;
  const doc = root?.nodeType === 9 ? root : root?.ownerDocument || document;
  const release = CURRENT_RELEASE.display;
  if (doc.documentElement) doc.documentElement.dataset.release = release;
  if (doc.body) {
    doc.body.dataset.release = release;
    doc.body.dataset.uiRelease = release;
    doc.body.dataset.resourceExecution = CURRENT_RELEASE.resourceExecutionVersion;
    doc.body.dataset.academicBackground = CURRENT_RELEASE.academicBackgroundVersion;
    doc.body.dataset.schoolQuery = CURRENT_RELEASE.schoolQueryVersion;
    doc.body.dataset.familyAction = CURRENT_RELEASE.familyActionVersion;
  }
  doc.querySelectorAll('[data-current-release]').forEach(node => {
    node.textContent = release;
    node.dataset.releaseSource = CURRENT_RELEASE.resourceOwners.release;
  });
  globalThis.__GAOKAO_RELEASE__ = CURRENT_RELEASE;
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
