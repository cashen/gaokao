import { resolveMajorIdentity } from './identity-resolver.v001.js';

export const MAJOR_DOMAIN_OWNER_VERSION = 'v002';

// Knowledge ownership stays behind the adapter boundary.
// Missing knowledge records must not create fallback product explanations.
const knowledgeRegistry = {
  '080601': {
    source: './electrical-engineering-automation.v001.json'
  }
};

function createKnowledgeAdapter(identity) {
  return knowledgeRegistry[identity.id] || null;
}

function createLayerAdapters(identity) {
  return {
    knowledge: createKnowledgeAdapter(identity),
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
