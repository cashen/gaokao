export const VERSION = 'module-navigation-v0.02';
const STORAGE_KEY = 'gaokao.module-navigation.v001';
export const ROOT_MODULES = Object.freeze([
  Object.freeze({ key: 'home', label: '家庭首页', route: '/' }),
  Object.freeze({ key: 'selection', label: '专业初选', route: '/ln-rank/' }),
  Object.freeze({ key: 'tongxue', label: '同学你好', route: '/tongxue/' })
]);

function text(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function moduleKeyForPath(pathname = '/') {
  const path = text(pathname).replace(/\/{2,}/g, '/');
  if (path === '/') return 'home';
  if (path.startsWith('/tongxue')) return 'tongxue';
  if (path.startsWith('/ln-rank')) return 'selection';
  if (path.startsWith('/major-path')) return 'major-path';
  if (path.startsWith('/aiplus')) return 'aiplus';
  if (path.startsWith('/Public_company')) return 'public-company';
  if (path.startsWith('/ln2026') || path.startsWith('/zy2026') || path.startsWith('/lngk2026')) return 'evidence';
  return 'other';
}

export function sanitizeModulePath(value, origin = globalThis.location?.origin || 'https://gaokao.powers.org.cn') {
  const raw = text(value);
  if (!raw) return '';
  let url;
  try { url = new URL(raw, origin); } catch { return ''; }
  if (url.origin !== new URL(origin).origin || !url.pathname.startsWith('/')) return '';
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildModuleRoots(currentKey = '') {
  return ROOT_MODULES.map(module => Object.freeze({
    ...module,
    current: module.key === currentKey
  }));
}

function readSession(storage = globalThis.sessionStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function writeSession(value, storage = globalThis.sessionStorage) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
}

export function rememberModuleVisit(locationLike = globalThis.location, storage = globalThis.sessionStorage) {
  const currentPath = sanitizeModulePath(locationLike?.href || String(locationLike || ''));
  const currentKey = moduleKeyForPath(locationLike?.pathname || '/');
  const previous = readSession(storage);
  const previousVisit = previous.current && typeof previous.current === 'object' ? previous.current : null;
  const previousPath = sanitizeModulePath(previousVisit?.path || '', locationLike?.origin);
  const previousKey = text(previousVisit?.module);
  const returnTarget = previousKey && previousKey !== currentKey ? {
    path: previousPath,
    module: previousKey,
    label: ROOT_MODULES.find(item => item.key === previousKey)?.label || '上一个模块'
  } : (previous.returnTarget || null);
  const next = {
    current: { module: currentKey, path: currentPath },
    returnTarget: returnTarget?.path ? returnTarget : null
  };
  writeSession(next, storage);
  return Object.freeze({
    currentKey,
    currentPath,
    returnPath: returnTarget?.path || '',
    returnModule: returnTarget?.module || '',
    returnLabel: returnTarget?.label || ''
  });
}

function currentModuleLabel(key) {
  return ROOT_MODULES.find(item => item.key === key)?.label || '当前模块';
}

function setReturnLink(link, visit) {
  if (!(link instanceof HTMLAnchorElement)) return;
  if (!visit.returnPath || visit.returnModule === visit.currentKey) {
    link.hidden = true;
    link.removeAttribute('href');
    link.textContent = '';
    return;
  }
  link.hidden = false;
  link.href = visit.returnPath;
  link.textContent = `返回${visit.returnLabel || '上一个模块'}`;
  link.setAttribute('aria-label', `返回${visit.returnLabel || '上一个模块'}`);
}

function makeRootLink(module, currentKey) {
  const link = document.createElement('a');
  link.href = module.route;
  link.textContent = module.label;
  link.dataset.uiModuleRoot = module.key;
  if (module.key === currentKey) link.setAttribute('aria-current', 'page');
  return link;
}

function enhanceGlobalNav(visit) {
  const nav = document.querySelector('.ui-global-nav');
  if (!(nav instanceof HTMLElement)) return false;
  let tongxue = nav.querySelector('[data-ui-module-root="tongxue"],[data-ui-route="tongxue"]');
  if (!(tongxue instanceof HTMLAnchorElement)) {
    tongxue = makeRootLink(ROOT_MODULES[2], visit.currentKey);
    const selected = nav.querySelector('[data-ui-route="selected"]');
    nav.insertBefore(tongxue, selected || nav.firstChild?.nextSibling || null);
  } else {
    tongxue.href = ROOT_MODULES[2].route;
    tongxue.textContent = ROOT_MODULES[2].label;
    tongxue.dataset.uiModuleRoot = 'tongxue';
    if (visit.currentKey === 'tongxue') tongxue.setAttribute('aria-current', 'page');
  }
  let back = nav.querySelector('[data-ui-module-back]');
  if (!(back instanceof HTMLAnchorElement)) {
    back = document.createElement('a');
    back.dataset.uiModuleBack = VERSION;
    nav.append(back);
  }
  setReturnLink(back, visit);
  nav.dataset.uiModuleNavigation = VERSION;
  return true;
}

function ensureMobileNav(visit) {
  let root = document.querySelector('[data-ui-mobile-module-nav]');
  if (!(root instanceof HTMLElement)) {
    root = document.createElement('section');
    root.className = 'ui-mobile-module-nav';
    root.dataset.uiMobileModuleNav = VERSION;
    root.setAttribute('aria-label', '模块切换');
    root.innerHTML = '<div class="ui-mobile-module-nav__head"><strong>切换模块</strong><span data-ui-module-current-label></span></div><div class="ui-mobile-module-nav__roots"></div><a class="ui-mobile-module-nav__back" data-ui-module-back></a>';
    const header = document.querySelector('[data-ui-global-header]');
    const mount = header?.parentElement || document.body;
    if (header && header.nextSibling) mount.insertBefore(root, header.nextSibling);
    else mount.append(root);
  }
  const currentLabel = root.querySelector('[data-ui-module-current-label]');
  if (currentLabel) currentLabel.textContent = currentModuleLabel(visit.currentKey);
  const roots = root.querySelector('.ui-mobile-module-nav__roots');
  if (roots) roots.replaceChildren(...buildModuleRoots(visit.currentKey).map(item => makeRootLink(item, visit.currentKey)));
  setReturnLink(root.querySelector('.ui-mobile-module-nav__back'), visit);
  return root;
}

function removeStandaloneNav() {
  document.querySelector('[data-ui-standalone-module-nav]')?.remove();
}

function ensureStandaloneNav(visit) {
  if (document.querySelector('[data-ui-global-header]')) {
    removeStandaloneNav();
    return;
  }
  let root = document.querySelector('[data-ui-standalone-module-nav]');
  if (!(root instanceof HTMLElement)) {
    root = document.createElement('section');
    root.className = 'ui-mobile-module-nav ui-module-navigation--standalone';
    root.dataset.uiStandaloneModuleNav = VERSION;
    root.setAttribute('aria-label', '模块切换');
    root.innerHTML = '<div class="ui-mobile-module-nav__head"><strong>模块</strong><span>去哪里</span></div><div class="ui-mobile-module-nav__roots"></div><a class="ui-mobile-module-nav__back" data-ui-module-back></a>';
    const anchor = document.querySelector('main,.page,.wrap') || document.body.firstElementChild;
    anchor?.before(root);
  }
  const roots = root.querySelector('.ui-mobile-module-nav__roots');
  if (roots) roots.replaceChildren(...buildModuleRoots(visit.currentKey).map(item => makeRootLink(item, visit.currentKey)));
  setReturnLink(root.querySelector('.ui-mobile-module-nav__back'), visit);
  return root;
}

function applyNavigation() {
  const visit = rememberModuleVisit();
  enhanceGlobalNav(visit);
  ensureMobileNav(visit);
  ensureStandaloneNav(visit);
  for (const link of document.querySelectorAll('[data-ui-module-back]')) setReturnLink(link, visit);
  document.body?.setAttribute('data-ui-module-navigation', VERSION);
}

function boot() {
  applyNavigation();
  if (document.querySelector('[data-ui-global-header]')) return;
  const observer = new MutationObserver(() => {
    if (enhanceGlobalNav(rememberModuleVisit())) {
      removeStandaloneNav();
      ensureMobileNav(rememberModuleVisit());
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
