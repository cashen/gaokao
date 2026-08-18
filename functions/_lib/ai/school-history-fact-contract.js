export const AI_SCHOOL_HISTORY_FACT_SOURCE_VERSION = 'ai-school-history-fact-source-v3992_3';
export const AI_SCHOOL_HISTORY_QUERY_CONTRACT_VERSION = 'ai-school-history-exact-v0.02';
export const AI_SCHOOL_HISTORY_MAX_RECORDS = 120;
export const AI_SCHOOL_HISTORY_SOURCE_INDEX_PATH = '/data/zy2026/school-index.json';
export const AI_SCHOOL_HISTORY_SOURCE_CHUNK_PREFIX = '/data/zy2026/chunks/';
export const AI_SCHOOL_HISTORY_SOURCE_TOTAL_RECORDS = 11628;

export const AI_SCHOOL_HISTORY_FACT_CONTRACT = Object.freeze({
  version: AI_SCHOOL_HISTORY_FACT_SOURCE_VERSION,
  queryContractVersion: AI_SCHOOL_HISTORY_QUERY_CONTRACT_VERSION,
  maxRecords: AI_SCHOOL_HISTORY_MAX_RECORDS,
  sourceIndexPath: AI_SCHOOL_HISTORY_SOURCE_INDEX_PATH,
  sourceChunkPrefix: AI_SCHOOL_HISTORY_SOURCE_CHUNK_PREFIX,
  sourceTotalRecords: AI_SCHOOL_HISTORY_SOURCE_TOTAL_RECORDS,
  sourcePolicy: 'same-11628-record-truth-set-via-canonical-school-runtime-provider',
  runtimeOwner: 'school-record-runtime-provider.vnext.js',
  cachePolicy: 'canonical-school-runtime-provider-bounded-index-and-four-shard-promise-cache'
});
