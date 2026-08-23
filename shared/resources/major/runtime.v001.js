import { resolveCanonicalMajorOwner } from './domain-owner.v001.js';

export const MAJOR_RUNTIME_VERSION = 'v001';

/**
 * Universal entry point for major questions.
 *
 * This layer intentionally does not own admission, school or experience data.
 * It only creates the canonical boundary between products and major domains.
 */
export function resolveMajorQuery(input) {
  const owner = resolveCanonicalMajorOwner(input);
  if (!owner) return null;

  return {
    version: MAJOR_RUNTIME_VERSION,
    identity: owner.identity,
    knowledgeOwner: owner.knowledgeSource,
    adapters: {
      admission: 'admission-data-adapter',
      schoolRelation: 'school-major-relation-adapter',
      experience: 'student-experience-adapter'
    }
  };
}
