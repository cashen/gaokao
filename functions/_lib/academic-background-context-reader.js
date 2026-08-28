import {
  ACADEMIC_BACKGROUND_CONTEXT_RESOURCE,
  ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION,
  validateAcademicBackgroundContextSnapshot
} from '../../shared/resources/background/academic-background-context.v001.js';

export const ACADEMIC_BACKGROUND_CONTEXT_READER_VERSION = 'academic-background-context-reader-v0.01';
let cachedSnapshot = null;
let inFlight = null;

function requestOrigin(context = {}) {
  return new URL(context?.request?.url || 'https://example.invalid/').origin;
}

async function fetchSnapshot(context = {}) {
  const url = new URL(ACADEMIC_BACKGROUND_CONTEXT_RESOURCE, requestOrigin(context));
  let response = null;
  if (context?.env?.ASSETS?.fetch) {
    try {
      response = await context.env.ASSETS.fetch(new Request(url.toString(), { method: 'GET', headers: { accept: 'application/json' } }));
    } catch {
      response = null;
    }
  }
  if (!response || !response.ok) {
    response = await fetch(url.toString(), {
      method: 'GET', headers: { accept: 'application/json' }, cf: { cacheTtl: 300, cacheEverything: true }
    });
  }
  if (!response.ok) throw new Error(`academic background context fetch failed ${response.status}`);
  const payload = await response.json();
  if (!validateAcademicBackgroundContextSnapshot(payload)) {
    throw new Error(`academic background context version/shape mismatch: ${payload?.version || 'unknown'} != ${ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION}`);
  }
  return payload;
}

export async function loadAcademicBackgroundContextSnapshot(context = {}) {
  if (cachedSnapshot) return cachedSnapshot;
  if (!inFlight) {
    inFlight = fetchSnapshot(context)
      .then(snapshot => {
        cachedSnapshot = snapshot;
        return snapshot;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

export function clearAcademicBackgroundContextReaderCacheForTesting() {
  cachedSnapshot = null;
  inFlight = null;
}
