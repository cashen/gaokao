import { DIRECTION_EXPLORER_STORAGE_KEY, DIRECTION_EXPLORER_VERSION } from './direction-explorer-data.js?v=3949_0';

function safeParse(raw) { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function fallbackState() { return { version: DIRECTION_EXPLORER_VERSION, answers: {}, result: null, applied: null, uiStep: 0, updatedAt: 0 }; }
export function loadDirectionExplorerState() {
  try {
    const parsed = safeParse(sessionStorage.getItem(DIRECTION_EXPLORER_STORAGE_KEY));
    return parsed && parsed.version === DIRECTION_EXPLORER_VERSION ? { ...fallbackState(), ...parsed } : fallbackState();
  } catch { return fallbackState(); }
}
export function saveDirectionExplorerState(next = {}) {
  const state = { ...fallbackState(), ...next, version: DIRECTION_EXPLORER_VERSION, updatedAt: Date.now() };
  try { sessionStorage.setItem(DIRECTION_EXPLORER_STORAGE_KEY, JSON.stringify(state)); } catch {}
  return state;
}
export function updateDirectionExplorerState(patch = {}) {
  return saveDirectionExplorerState({ ...loadDirectionExplorerState(), ...patch });
}
export function clearDirectionExplorerApplied() {
  const state = loadDirectionExplorerState();
  return saveDirectionExplorerState({ ...state, applied: null });
}
export function clearDirectionExplorerAll() {
  try { sessionStorage.removeItem(DIRECTION_EXPLORER_STORAGE_KEY); } catch {}
  return fallbackState();
}
export function getDirectionExplorerResult() { return loadDirectionExplorerState().result || null; }
export function getDirectionExplorerApplied() { return loadDirectionExplorerState().applied || null; }
