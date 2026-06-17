import { PROJECT_ATTRIBUTE_KB } from './project-attribute-kb.generated.js';

function entries() { return Object.entries(PROJECT_ATTRIBUTE_KB?.items || {}); }

export function detectProjectAttributes(text = '') {
  const raw = String(text || '');
  const found = [];
  for (const [id, item] of entries()) {
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    if (aliases.some(a => a && raw.includes(a))) {
      found.push({ id, label: item.label || id, mustCheck: Array.isArray(item.mustCheck) ? item.mustCheck : [] });
    }
  }
  return found;
}

export function buildProjectReviewPoints(text = '') {
  return detectProjectAttributes(text).map(p => `${p.label}属于项目或招生属性，需要核验${p.mustCheck.slice(0, 6).join('、')}。`);
}

export function getProjectAttributeDiagnostics() {
  return { ok: entries().length > 0, count: entries().length, labels: entries().map(([,v]) => v.label) };
}
