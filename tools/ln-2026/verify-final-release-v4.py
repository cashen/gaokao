from __future__ import annotations

import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('ln2026_verify_v3', HERE / 'verify-final-release-v3.py')
v3 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(v3)
base = v3.base


def verify_v3958_protected_paths() -> None:
    protected = [
        'fenxi/index.html',
        'fenxi/assets',
        'functions/fenxi',
        'functions/_middleware.js'
    ]
    changed = base.git('diff', '--name-only', f'{base.BASE_SHA}...HEAD', '--', *protected)
    base.check(not changed, f'protected paths changed:\n{changed}')

    release_contract = base.text('functions/_lib/release-contract.js')
    base.check("shared/resources/release/current-release.js" in release_contract, 'release contract must read shared current release')
    base.check('export const LN_RANK_RELEASE_CONTRACT' in release_contract, 'LN_RANK_RELEASE_CONTRACT export missing')
    base.check('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT' in release_contract, 'RELEASE_CONTRACT compatibility export missing')


base.verify_protected_paths = verify_v3958_protected_paths


if __name__ == '__main__':
    v3.main()
