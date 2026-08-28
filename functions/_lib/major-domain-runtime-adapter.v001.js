import {
  createMajorDomainOwner,
  MAJOR_DOMAIN_OWNER_META
} from '../../shared/resources/majors/major-domain-owner.v001.js';
import {
  STANDARD_MAJOR_CATALOG_2026_FULL,
  STANDARD_MAJOR_CATEGORIES_2026_FULL
} from './kb/standard-major-catalog-2026-full.generated.js';
import { splitSearchKeywords } from './keyword-query.js';
import { createMajorIntentResolver } from '../../shared/resources/majors/major-intent-resolver.v001.js';

const INTENT_RESOLVER = createMajorIntentResolver(STANDARD_MAJOR_CATALOG_2026_FULL, [], { sourceVersion: 'standard-major-catalog-2026' });

const OWNER = createMajorDomainOwner({
  majorRows: STANDARD_MAJOR_CATALOG_2026_FULL,
  categories: STANDARD_MAJOR_CATEGORIES_2026_FULL
});

function text(value = '') {
  return String(value == null ? '' : value).trim();
}

function unique(values = []) {
  return [...new Set(values.map(text).filter(Boolean))];
}

export const MAJOR_DOMAIN_RUNTIME_ADAPTER_VERSION = 'major-domain-runtime-adapter-v001';

export function resolveMajorDomainQuery(input = '') {
  const rawInput = text(input);
  const terms = unique(splitSearchKeywords(rawInput));
  if (!rawInput) {
    return Object.freeze({
      version: MAJOR_DOMAIN_RUNTIME_ADAPTER_VERSION,
      ownerVersion: MAJOR_DOMAIN_OWNER_META.version,
      rawInput,
      terms: Object.freeze([]),
      status: 'missing',
      majorCodes: Object.freeze([]),
      majorNames: Object.freeze([]),
      unresolvedTerms: Object.freeze([]),
      ambiguousTerms: Object.freeze([]),
      queryMode: 'any',
      failClosed: true,
      searchPolicy: 'catalog-derived-major-intent'
    });
  }

  const intent = INTENT_RESOLVER.resolveMany(terms, { limit: 12 });
  const resolved = OWNER.resolveMany(terms);
  const results = Array.isArray(resolved.results) ? resolved.results : [];
  const unresolvedTerms = results
    .filter(item => item.status === 'unresolved' || item.status === 'missing')
    .map(item => item.query);
  const ambiguousTerms = results
    .filter(item => item.status === 'ambiguous')
    .map(item => ({
      query: item.query,
      candidates: (item.candidates || []).map(candidate => ({
        code: candidate.code,
        name: candidate.name
      }))
    }));

  return Object.freeze({
    version: MAJOR_DOMAIN_RUNTIME_ADAPTER_VERSION,
    ownerVersion: MAJOR_DOMAIN_OWNER_META.version,
    rawInput,
    terms: Object.freeze(terms),
    status: intent.status === 'ready'
      ? 'resolved'
      : (ambiguousTerms.length ? 'ambiguous' : 'partial'),
    majorCodes: Object.freeze(intent.majorCodes.length ? intent.majorCodes : (resolved.majors || []).map(item => item.code)),
    majorNames: Object.freeze((resolved.majors || []).map(item => item.name)),
    unresolvedTerms: Object.freeze(unresolvedTerms),
    ambiguousTerms: Object.freeze(ambiguousTerms),
    majorIntent: intent,
    intentStatus: intent.status,
    intentItems: Object.freeze(intent.items),
    queryMode: 'any',
    failClosed: true,
    searchPolicy: 'catalog-derived-major-intent'
  });
}
