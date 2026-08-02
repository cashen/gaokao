// Compatibility entrypoint for workflows created during v3972_5.
// Current release ownership is unique; legacy workflows must consume the
// canonical v3972_6 audit instead of preserving a second public version.
await import('./audit-canonical-release-version-v3972_6.mjs');
