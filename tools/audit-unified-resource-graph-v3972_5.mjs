// Compatibility entrypoint for workflows created during v3972_5.
// Unified resource ownership is current-version only; legacy workflow names
// delegate to the v3972_6 graph instead of maintaining a second active graph.
await import('./audit-unified-resource-graph-v3972_6.mjs');
