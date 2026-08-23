import { resolveMajorIdentity } from './identity-resolver.v001.js';

export const MAJOR_DOMAIN_OWNER_VERSION = 'v001';

const knowledgeRegistry = new Map([
  ['080601', './electrical-engineering-automation.v001.json']
]);

export function resolveCanonicalMajorOwner(input) {
  const identity = resolveMajorIdentity(input);
  if (!identity) return null;

  return {
    ownerVersion: MAJOR_DOMAIN_OWNER_VERSION,
    identity,
    knowledgeSource: knowledgeRegistry.get(identity.id) || null,
    layers: {
      knowledge: true,
      admission: true,
      schoolRelation: true,
      experience: true
    }
  };
}
