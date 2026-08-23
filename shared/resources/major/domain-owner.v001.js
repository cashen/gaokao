import { resolveMajorIdentity } from './identity-resolver.v001.js';

export const MAJOR_DOMAIN_OWNER_VERSION = 'v001.1';

const knowledgeAdapters = new Map([
  ['080601', {
    source: './electrical-engineering-automation.v001.json'
  }]
]);

function createLayerAdapters(identity) {
  return {
    knowledge: knowledgeAdapters.get(identity.id) || null,
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
