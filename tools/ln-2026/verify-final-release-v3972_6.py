#!/usr/bin/env python3
"""Run the preserved full LN verifier against the v3972_6 resource graph.

The historical verifier remains the source of the broad data, algorithm,
report, school, page and Worker-budget assertions.  This adapter upgrades only
public/current-generation identities, then explicitly restores resources that
are declared stable dependencies in the v3972_6 site contract.  A version bump
must never fabricate copies of stable business modules merely to align file
names.
"""
from pathlib import Path

source_path = Path(__file__).with_name("verify-final-release-v3970.py")
source = source_path.read_text(encoding="utf-8")

# Upgrade the historical verifier's current/public identity first.
for old, new in (
    ("v3.9.72.5", "v3.9.72.6"),
    ("v3972_5", "v3972_6"),
    ("3972_5", "3972_6"),
):
    source = source.replace(old, new)

# Restore explicitly declared stable active dependencies.  These resources did
# not change business semantics in this release and must not be copied into a
# fake v3972_6 implementation.
for current_token, stable_token in (
    ("family-action-v3972_6", "family-action-v3972_5"),
    ("family-home-runtime-v3972_6", "family-home-runtime-v3972_5"),
    ("family-home.v3972_6", "family-home.v3972_5"),
    ("family-shell.v3972_6", "family-shell.v3972_5"),
    ("family-plan-entry.v3972_6", "family-plan-entry.v3972_5"),
    ("selection-pool.v3972_6", "selection-pool.v3972_5"),
    ("selection-pool-runtime.v3972_6", "selection-pool-runtime.v3972_5"),
    ("selection-runtime-v3972_6", "selection-runtime-v3972_5"),
    ("tools/browser-interaction-transaction-v3972_6.mjs", "tools/browser-native-chooser-activation-v3972_6.mjs"),
):
    source = source.replace(current_token, stable_token)

required_current = (
    "v3.9.72.6",
    "site-runtime-coherence-v3972_6",
    "resource-execution-v3972_6",
    "runtime-cache-coherence-v3972_6",
    "interaction-transaction-v3972_6",
    "selection-workspace-orchestration-v3972_6",
    "ui-resource-registry-v3972_6",
    "site-resource-graph-v3972_6",
)
required_stable = (
    "family-action-v3972_5",
    "family-home.v3972_5",
    "family-shell.v3972_5",
    "family-plan-entry.v3972_5",
    "selection-pool.v3972_5",
    "selection-pool-runtime.v3972_5",
)
missing = [token for token in (*required_current, *required_stable) if token not in source]
if missing:
    raise SystemExit(f"v3972_6 verifier mapping incomplete: {missing}")

namespace = {
    "__name__": "__main__",
    "__file__": str(source_path),
    "__package__": None,
}
exec(compile(source, str(source_path), "exec"), namespace)
