// Compatibility entrypoint for workflows created during v3972_5.
// The current site generation is owned by the v3972_6 contract; keeping
// independent assertions here would create two competing active generations.
await import('./audit-site-runtime-generation-v3972_6.mjs');
