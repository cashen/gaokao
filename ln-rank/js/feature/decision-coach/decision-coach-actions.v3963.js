export function normalizeCoachActions(actions = []) {
  return (Array.isArray(actions) ? actions : []).map(x => String(x || '').replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, '').trim()).filter(Boolean);
}
