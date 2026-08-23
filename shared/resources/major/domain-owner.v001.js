import { resolveMajorIdentity } from './identity-resolver.v001.js';

export const MAJOR_DOMAIN_OWNER_VERSION = 'v002';

const knowledgeAdapters = new Map([
  ['080601', {
    source: './electrical-engineering-automation.v001.json'
  }]
]);

function createLayerAdapters(identity) {
  const knowledge = knowledgeAdapters.get(identity.id) || null;

  return {
    knowledge,
    admission: {
      owner: 'admission-data-layer',
      majorId: identity.id
    },
    schoolRelation: {
      owner: 'school-major-relation-layer',
      majorId: identity.id
    },
    experience: {
      owner: 'experience-layer',
      majorId: identity.id
    }
  };
}

export function resolveCanonicalMajorOwner(input) {
  const identity = resolveMajorIdentity(input);
  if (!identity) return null;

  return {
    ownerVersion: MAJOR_DOMAIN_OWNER_VERSION,
    identity,
    adapters: createLayerAdapters(identity)
  };
}
