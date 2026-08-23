export const MAJOR_RESOURCE_ROOT = 'shared/resources/major';

/**
 * Canonical major knowledge loader contract.
 *
 * Product modules must consume this boundary instead of embedding
 * major explanations inside AIPLuS, Tongxue, or ln-rank.
 */
export function normalizeMajorKnowledge(record) {
  if (!record || !record.knowledge) return null;

  return {
    id: record.id,
    name: record.name,
    version: record.version,
    knowledge: record.knowledge
  };
}
