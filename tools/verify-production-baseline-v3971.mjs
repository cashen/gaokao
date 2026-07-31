process.env.EXPECTED_RELEASE = 'v3.9.72.2';
process.env.PRODUCTION_VERIFY_ATTEMPTS = '30';
process.env.PRODUCTION_VERIFY_WAIT_MS = '10000';
process.env.PRODUCTION_STRESS_CYCLES = '40';
process.env.PRODUCTION_STRESS_WAIT_MS = '1000';
await import('./verify-production-v3971.mjs');
