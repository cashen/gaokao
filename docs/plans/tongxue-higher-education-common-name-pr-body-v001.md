# PR acceptance notes

This PR is the first implementation step for Tongxue's “高校民间称谓” layer.

Implemented:
- verified common-name resource with 8 public cross-checked names;
- canonical resolution through the existing school identity center;
- Tongxue thin presentation wrapper;
- source provenance and non-official wording;
- bounded handoff payload for later ln-rank integration;
- focused verifier.

Not implemented here:
- direct common-name query API;
- new router;
- direct ln-rank group-query behavior;
- major-strength inference;
- changes to Student Voice source ownership;
- changes to admissions/ranking data.
