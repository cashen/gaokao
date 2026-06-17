# v3.9.33.14 release plan summary

- 211 score API no longer imports fenxi runtime loaders.
- Auxiliary pages now have page-level, low-weight navigation back to the main tool and between local/211 background pages.
- User-visible example score copy uses 666.
- 211 frontend uses shared API JSON client to avoid exposing HTML/503 as `Unexpected token <`.
- This package keeps the no-fenxi boundary: no /fenxi/, no functions/fenxi/, no functions/_middleware.js.
