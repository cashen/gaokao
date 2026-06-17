import { getCareerPathReviewHints } from './career-path-accessor.js';
import { getPhysicalExamReviewHints } from './physical-exam-kb.generated.js';

function clean(value, max = 260) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function unique(list) {
  return [...new Set((list || []).map(x => clean(x)).filter(Boolean))];
}

function textOf(item = {}) {
  return `${item.school || ''} ${item.major || item.majorName || ''} ${(item.tags || item.schoolTags || []).join(' ')}`;
}

export function getCareerAndExamReviewHintsForItem(item = {}) {
  const majorName = item.major || item.majorName || textOf(item);
  const career = getCareerPathReviewHints(item).map(x => x.parentCopy || x.label).filter(Boolean);
  const exam = getPhysicalExamReviewHints({
    majorName,
    directionId: item.directionId || item.majorDirectionId,
    knownConditions: item.knownPhysicalConditions || []
  });
  return unique([...career, ...exam]);
}

export function buildCareerAndExamReviewHints(items = [], { limit = 4 } = {}) {
  const records = Array.isArray(items) ? items : [items];
  const hints = [];
  for (const item of records) hints.push(...getCareerAndExamReviewHintsForItem(item));
  if (!hints.length) return [];
  return unique(hints).slice(0, limit);
}
