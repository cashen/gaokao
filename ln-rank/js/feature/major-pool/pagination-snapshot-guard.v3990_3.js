export const MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION = 'major-bands-pagination-snapshot-guard-v3990_3';

const BAND_KEYS = Object.freeze(['upper', 'near', 'steady']);
const QUERY_FIELDS = Object.freeze([
  'candidateScore',
  'rangePreset',
  'region',
  'schoolKeyword',
  'schoolEntityId',
  'schoolQueryIntent',
  'majorKeyword',
  'bottomLineMode',
  'specialProjectMode'
]);

function asUrl(value) {
  if (value instanceof URL) return new URL(value.toString());
  return new URL(String(value || ''), 'https://snapshot-contract.invalid');
}

function snapshotKey(url, band) {
  return JSON.stringify({
    version: MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
    path: url.pathname,
    band,
    query: Object.fromEntries(QUERY_FIELDS.map(key => [key, url.searchParams.get(key) || '']))
  });
}

export function createMajorBandsPaginationSnapshotGuard(options = {}) {
  const maxEntries = Math.max(3, Math.floor(Number(options.maxEntries) || 12));
  const snapshots = new Map();

  function remember(key, snapshot) {
    const value = String(snapshot || '').trim();
    if (!key || !value) return;
    snapshots.delete(key);
    snapshots.set(key, value);
    while (snapshots.size > maxEntries) snapshots.delete(snapshots.keys().next().value);
  }

  function rewrite(input) {
    const url = asUrl(input);
    if (url.pathname !== '/api/major-bands') {
      return Object.freeze({ applies: false, url, band: '', expectedSnapshot: '', key: '' });
    }
    const band = BAND_KEYS.includes(url.searchParams.get('band'))
      ? url.searchParams.get('band')
      : '';
    const key = band ? snapshotKey(url, band) : '';
    const expectedSnapshot = key ? String(snapshots.get(key) || '') : '';
    if (expectedSnapshot) url.searchParams.set('snapshot', expectedSnapshot);
    return Object.freeze({ applies: true, url, band, expectedSnapshot, key });
  }

  function inspect(input, payload) {
    const url = asUrl(input);
    if (url.pathname !== '/api/major-bands' || payload?.ok !== true) {
      return Object.freeze({ applies: false, ok: true, expectedSnapshot: '', actualSnapshot: '', band: '' });
    }
    const requestedBand = BAND_KEYS.includes(url.searchParams.get('band'))
      ? url.searchParams.get('band')
      : '';
    const requestedKey = requestedBand ? snapshotKey(url, requestedBand) : '';
    const expectedSnapshot = String(
      url.searchParams.get('snapshot')
      || (requestedKey ? snapshots.get(requestedKey) : '')
      || ''
    );
    const actualSnapshot = requestedBand
      ? String(payload?.bands?.[requestedBand]?.pagination?.snapshot || '')
      : '';
    if (expectedSnapshot && actualSnapshot !== expectedSnapshot) {
      return Object.freeze({
        applies: true,
        ok: false,
        code: 'pagination_snapshot_mismatch',
        band: requestedBand,
        expectedSnapshot,
        actualSnapshot
      });
    }
    for (const band of BAND_KEYS) {
      const snapshot = String(payload?.bands?.[band]?.pagination?.snapshot || '');
      if (snapshot) remember(snapshotKey(url, band), snapshot);
    }
    return Object.freeze({
      applies: true,
      ok: true,
      band: requestedBand,
      expectedSnapshot,
      actualSnapshot
    });
  }

  function getState() {
    return Object.freeze({
      version: MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
      size: snapshots.size,
      maxEntries,
      bounded: snapshots.size <= maxEntries,
      snapshots: Object.freeze([...snapshots.values()])
    });
  }

  function clear() {
    snapshots.clear();
  }

  return Object.freeze({
    version: MAJOR_BANDS_PAGINATION_SNAPSHOT_GUARD_VERSION,
    rewrite,
    inspect,
    getState,
    clear
  });
}
