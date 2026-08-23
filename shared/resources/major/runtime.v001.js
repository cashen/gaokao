import { resolveCanonicalMajorOwner } from './domain-owner.v001.js';

export const MAJOR_RUNTIME_VERSION = 'v002';

/**
 * Universal entry point for major questions.
 *
 * Runtime owns orchestration only. Major facts, admission data,
 * school relations and experience remain owned by their adapters.
 */
export function resolveMajorQuery(input) {
  const owner = resolveCanonicalMajorOwner(input);
  if (!owner) return null;

  return {
    version: MAJOR_RUNTIME_VERSION,
    identity: owner.identity,
    layers: {
      knowledge: owner.adapters?.knowledge || null,
      admission: owner.adapters?.admission || null,
      schoolRelation: owner.adapters?.schoolRelation || null,
      experience: owner.adapters?.experience || null
    }
  };
}
