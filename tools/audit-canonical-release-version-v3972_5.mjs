// Compatibility entrypoint for workflows created during v3972_5.
// Current release ownership is unique; legacy workflows must consume the
// canonical v3990_2 audit instead of preserving a second public version.
await import('./audit-canonical-release-version-v3990_2.mjs');

