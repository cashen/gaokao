import { CURRENT_RELEASE } from './current-release.js?v=3990_2&r=r036-major-history-rank-lazy';
import { syncCurrentRelease } from './release-presenter.v3990_2.js?v=3990_2&r=r036-major-history-rank-lazy';

export const RELEASE_FOOTER_VERSION = CURRENT_RELEASE.releaseFooterContractVersion;
const STYLE_HREF = `${CURRENT_RELEASE.resourceOwners.releaseFooterStyles}?v=${CURRENT_RELEASE.asset}`;

function ensureStyles(doc) {
  if (doc.querySelector(`link[href^="${CURRENT_RELEASE.resourceOwners.releaseFooterStyles}"]`)) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.releaseFooter = RELEASE_FOOTER_VERSION;
  doc.head?.append(link);
}

function ensureCurrentReleaseNode(doc, footer) {
  if (footer.querySelector('[data-current-release]')) return;
  const line = doc.createElement('span');
  line.dataset.releaseCurrentLine = RELEASE_FOOTER_VERSION;
  line.innerHTML = '全站发布：<span data-current-release></span>';
  footer.append(doc.createTextNode('｜'), line);
}

function ensureReleaseLogLink(doc, footer) {
  let link = footer.querySelector('[data-release-log-link]');
  if (!link) {
    footer.append(doc.createTextNode('｜'));
    link = doc.createElement('a');
    link.dataset.releaseLogLink = RELEASE_FOOTER_VERSION;
    footer.append(link);
  }
  link.href = CURRENT_RELEASE.releaseLogHref;
  link.textContent = CURRENT_RELEASE.releaseLogLabel;
  link.dataset.releaseSource = CURRENT_RELEASE.resourceOwners.release;
  link.dataset.siteRuntimeGeneration = CURRENT_RELEASE.siteRuntimeGeneration;
}

export function syncReleaseFooter(root = document) {
  if (typeof document === 'undefined') return CURRENT_RELEASE;
  const doc = root?.nodeType === 9 ? root : root?.ownerDocument || document;
  const isAiPlusSurface = doc.body?.dataset?.aiPlus === 'family-advisor';
  if (!isAiPlusSurface) ensureStyles(doc);
  syncCurrentRelease(doc);
  let footer = doc.querySelector('footer[data-release-footer]');
  if (!footer) {
    footer = doc.createElement('footer');
    footer.className = 'site-release-footer';
    footer.dataset.releaseFooter = RELEASE_FOOTER_VERSION;
    (doc.body || doc.documentElement).append(footer);
  }
  footer.dataset.releaseSource = CURRENT_RELEASE.resourceOwners.release;
  footer.dataset.siteRuntimeGeneration = CURRENT_RELEASE.siteRuntimeGeneration;
  ensureCurrentReleaseNode(doc, footer);
  ensureReleaseLogLink(doc, footer);
  doc.querySelectorAll('[data-release-log-link]').forEach(link => {
    link.href = CURRENT_RELEASE.releaseLogHref;
    link.textContent = CURRENT_RELEASE.releaseLogLabel;
    link.dataset.releaseSource = CURRENT_RELEASE.resourceOwners.release;
    link.dataset.siteRuntimeGeneration = CURRENT_RELEASE.siteRuntimeGeneration;
  });
  syncCurrentRelease(doc);
  return CURRENT_RELEASE;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => syncReleaseFooter(document), { once: true });
  } else {
    syncReleaseFooter(document);
  }
}
