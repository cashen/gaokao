// v3971 compatibility entry. The 211 page moved to the v3972 static runtime;
// retain this filename for existing verification workflows and delegate to the real static journeys.
process.env.ALL211_BASE ||= process.env.V3968_BASE_URL || 'http://127.0.0.1:8765';
await import('./browser-all211-static-v3972.mjs');
