const VERSION = 'background-link-canonicalizer-v0.01';
const ROUTES = Object.freeze({
  '/ln-rank/local-mainline.html': '/ln-rank/local-mainline',
  '/ln-rank/211-mainline.html': '/ln-rank/211-mainline'
});

function canonicalHref(value) {
  if (!value) return '';
  let url;
  try { url = new URL(value, location.href); } catch { return value; }
  if (url.origin !== location.origin) return value;
  const nextPath = ROUTES[url.pathname];
  if (!nextPath) return value;
  url.pathname = nextPath;
  return `${url.pathname}${url.search}${url.hash}`;
}

function canonicalizeLink(link) {
  if (!(link instanceof HTMLAnchorElement)) return false;
  const current = link.getAttribute('href') || '';
  const next = canonicalHref(current);
  if (!next || next === current) return false;
  link.setAttribute('href', next);
  return true;
}

function scan(root = document) {
  if (root instanceof HTMLAnchorElement) canonicalizeLink(root);
  for (const link of root.querySelectorAll?.('a[href]') || []) canonicalizeLink(link);
}

scan();
document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (link) canonicalizeLink(link);
}, true);

const observer = new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) if (node instanceof Element) scan(node);
  }
});
if (document.body) observer.observe(document.body, { childList: true, subtree: true });

globalThis.__GAOKAO_BACKGROUND_LINK_CANONICALIZER__ = Object.freeze({
  version: VERSION,
  routes: ROUTES,
  canonicalHref
});
