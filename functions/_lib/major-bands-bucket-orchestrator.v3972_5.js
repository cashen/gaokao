export const MAJOR_BANDS_BUCKET_ORCHESTRATION = Object.freeze({
  version: 'major-bands-bounded-fanout-v3972_5',
  maxConcurrency: 1,
  maxAttempts: 3,
  baseDelayMs: 250
});

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const RETRYABLE_MARKERS = [
  'worker exceeded resource limits',
  '<title>error 1102',
  'error code: 1102',
  'http 503',
  'temporarily unavailable'
];

function clampInteger(value, fallback, min, max) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class MajorBandsBucketWorkerError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'MajorBandsBucketWorkerError';
    this.status = Number(options.status || 0);
    this.retryable = Boolean(options.retryable);
    this.bucketFile = String(options.bucketFile || '');
  }
}

export function isRetryableBucketWorkerFailure(error) {
  if (error?.retryable === true) return true;
  if (RETRYABLE_STATUS.has(Number(error?.status || 0))) return true;
  const text = String(error?.message || error || '').toLowerCase();
  return RETRYABLE_MARKERS.some(marker => text.includes(marker));
}

export async function runMajorBandsBucketWorkers(buckets, execute, options = {}) {
  if (!Array.isArray(buckets)) throw new TypeError('buckets must be an array');
  if (typeof execute !== 'function') throw new TypeError('execute must be a function');
  if (buckets.length === 0) {
    return {
      results: [],
      stats: {
        version: MAJOR_BANDS_BUCKET_ORCHESTRATION.version,
        concurrency: 0,
        peakConcurrency: 0,
        maxAttempts: 0,
        retryCount: 0,
        workerCount: 0
      }
    };
  }

  const concurrency = clampInteger(
    options.concurrency,
    MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency,
    1,
    MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency
  );
  const maxAttempts = clampInteger(
    options.maxAttempts,
    MAJOR_BANDS_BUCKET_ORCHESTRATION.maxAttempts,
    1,
    MAJOR_BANDS_BUCKET_ORCHESTRATION.maxAttempts
  );
  const baseDelayMs = clampInteger(
    options.baseDelayMs,
    MAJOR_BANDS_BUCKET_ORCHESTRATION.baseDelayMs,
    0,
    250
  );

  const results = new Array(buckets.length);
  let nextIndex = 0;
  let active = 0;
  let peakConcurrency = 0;
  let retryCount = 0;

  async function consume() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= buckets.length) return;

      const bucket = buckets[index];
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        let failure = null;
        active += 1;
        peakConcurrency = Math.max(peakConcurrency, active);
        try {
          results[index] = await execute(bucket, { attempt, index });
        } catch (error) {
          failure = error;
        } finally {
          active -= 1;
        }

        if (!failure) break;
        const retryable = isRetryableBucketWorkerFailure(failure);
        if (!retryable || attempt >= maxAttempts) throw failure;

        retryCount += 1;
        const jitterMs = (index % 5) * 7;
        await delay(baseDelayMs * attempt + jitterMs);
      }
    }
  }

  const consumerCount = Math.min(concurrency, buckets.length);
  await Promise.all(Array.from({ length: consumerCount }, () => consume()));

  return {
    results,
    stats: {
      version: MAJOR_BANDS_BUCKET_ORCHESTRATION.version,
      concurrency: consumerCount,
      peakConcurrency,
      maxAttempts,
      retryCount,
      workerCount: buckets.length
    }
  };
}
