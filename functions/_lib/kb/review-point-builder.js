import { buildCatalogReviewPoint } from './catalog-accessor.js';
import { buildProjectReviewPoints } from './project-attribute-accessor.js';
import { buildCareerPathReviewPoints } from './career-path-accessor.js';

function clean(x, max = 180) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, max); }

export function buildReviewPointsForRecord(record = {}, options = {}) {
  const text = [record.major, record.school, record.matchReason, ...(Array.isArray(record.flags) ? record.flags : [])].filter(Boolean).join(' ');
  const points = [];
  const catalog = buildCatalogReviewPoint(record.standardMajor || {}, record.major || '');
  if (catalog) points.push(catalog);
  points.push(...buildProjectReviewPoints(text));
  points.push(...buildCareerPathReviewPoints(text));
  if (Array.isArray(record.flags)) points.push(...record.flags);
  return [...new Set(points.map(x => clean(x)).filter(Boolean))].slice(0, options.limit || 6);
}

export function buildReviewPointsForItems(items = [], options = {}) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) out.push(...buildReviewPointsForRecord(item, { limit: 3 }));
  return [...new Set(out)].slice(0, options.limit || 8);
}
