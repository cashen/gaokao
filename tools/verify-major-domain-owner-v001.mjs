import { resolveCanonicalMajorOwner } from '../shared/resources/major/domain-owner.v001.js';
import { verifyHumanCopy, verifyStateBoundary } from '../shared/resources/major/human-copy-runtime-guard.v001.js';

const owner = resolveCanonicalMajorOwner('电气工程及其自动化');

if (!owner || owner.identity.id !== '080601') {
  throw new Error('major owner resolver failed');
}

if (!owner.knowledgeSource) {
  throw new Error('major knowledge owner missing');
}

if (!verifyHumanCopy('专业介绍').pass) {
  throw new Error('human copy guard failed');
}

for (const state of ['loading', 'empty', 'error', 'retry', 'success']) {
  if (!verifyStateBoundary(state)) {
    throw new Error(`state guard failed: ${state}`);
  }
}

console.log('PR192 major domain owner verification passed');
