export const RETURN_SNAPSHOT_VERSION = 'return-snapshot-v001';
export const RETURN_SNAPSHOT_STORAGE_KEY = 'gaokao.return-snapshot.v001';
export const RETURN_SNAPSHOT_MAX_ENTRIES = 8;
export const RETURN_SNAPSHOT_TTL_MS = 30 * 60 * 1000;

function text(value = '', limit = 160) {
  return String(value ?? '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function finite(value, min = 0, max = 100000000) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function cleanPath(value = '') {
  const raw = text(value, 900);
  if (!raw.startsWith('/') || raw.startsWith('//')) return '';
  try {
    const url = new URL(raw, 'https://gaokao.same-origin.invalid');
    if (url.origin !== 'https://gaokao.same-origin.invalid') return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}

function normalizeSnapshot(input = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const contextId = text(raw.contextId, 80);
  const returnTo = cleanPath(raw.returnTo);
  if (!contextId || !returnTo) return null;
  return {
    version: RETURN_SNAPSHOT_VERSION,
    contextId,
    returnTo,
    sourceSurface: text(raw.sourceSurface, 40),
    resultMode: text(raw.resultMode, 40),
    anchorId: text(raw.anchorId, 100),
    recordKey: text(raw.recordKey, 180),
    focusId: text(raw.focusId, 100),
    scrollY: finite(raw.scrollY, 0, 100000000) ?? 0,
    createdAt: Number.isFinite(new Date(raw.createdAt).getTime())
      ? new Date(raw.createdAt).toISOString()
      : new Date().toISOString()
  };
}

function readAll(now = Date.now()) {
  try {
    const parsed = JSON.parse(globalThis.sessionStorage?.getItem(RETURN_SNAPSHOT_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => normalizeSnapshot(item))
      .filter(Boolean)
      .filter(item => now - new Date(item.createdAt).getTime() <= RETURN_SNAPSHOT_TTL_MS)
      .slice(0, RETURN_SNAPSHOT_MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeAll(items) {
  try {
    globalThis.sessionStorage?.setItem(RETURN_SNAPSHOT_STORAGE_KEY, JSON.stringify(items.slice(0, RETURN_SNAPSHOT_MAX_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}

export function rememberReturnSnapshot(input = {}) {
  const snapshot = normalizeSnapshot(input);
  if (!snapshot) return null;
  const next = [snapshot, ...readAll().filter(item => item.contextId !== snapshot.contextId)];
  writeAll(next);
  return Object.freeze(snapshot);
}

export function readReturnSnapshot(contextId = '') {
  const id = text(contextId, 80);
  if (!id) return null;
  return readAll().find(item => item.contextId === id) || null;
}

export function readReturnSnapshotForLocation(locationLike = globalThis.location) {
  const current = locationLike?.pathname
    ? `${locationLike.pathname}${locationLike.search || ''}${locationLike.hash || ''}`
    : locationLike?.href
      ? (() => {
        try {
          const url = new URL(locationLike.href, 'https://gaokao.same-origin.invalid');
          return `${url.pathname}${url.search}${url.hash}`;
        } catch {
          return '';
        }
      })()
    : cleanPath(locationLike);
  if (!current) return null;
  return readAll().find(item => item.returnTo === current || item.returnTo.split('#')[0] === current.split('#')[0]) || null;
}

export function forgetReturnSnapshot(contextId = '') {
  const id = text(contextId, 80);
  if (!id) return false;
  return writeAll(readAll().filter(item => item.contextId !== id));
}

export function captureCurrentReturnSnapshot({
  contextId,
  returnTo,
  sourceSurface = '',
  resultMode = '',
  anchorId = '',
  recordKey = '',
  focusId = '',
  scrollY = globalThis.scrollY
} = {}) {
  return rememberReturnSnapshot({
    contextId,
    returnTo,
    sourceSurface,
    resultMode,
    anchorId,
    recordKey,
    focusId,
    scrollY
  });
}

export function restoreReturnSnapshot(snapshot, {
  documentLike = globalThis.document,
  windowLike = globalThis,
  onMissing = null
} = {}) {
  const normalized = normalizeSnapshot(snapshot);
  if (!normalized) return false;
  const anchor = normalized.anchorId ? documentLike?.getElementById(normalized.anchorId) : null;
  const target = anchor || (normalized.focusId ? documentLike?.getElementById(normalized.focusId) : null);
  try {
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
      return true;
    }
    if (windowLike?.scrollTo) {
      windowLike.scrollTo({ top: normalized.scrollY, left: 0, behavior: 'auto' });
      return true;
    }
  } catch {}
  if (typeof onMissing === 'function') onMissing(normalized);
  return false;
}
