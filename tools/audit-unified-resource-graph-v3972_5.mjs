// Compatibility entrypoint for workflows created during v3972_5.
// Unified resource ownership is current-version only; legacy workflow names
// delegate to the v3990_2 graph instead of maintaining a second active graph.
await import('./audit-unified-resource-graph-v3990_2.mjs');

