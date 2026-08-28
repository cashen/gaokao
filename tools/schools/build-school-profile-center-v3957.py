#!/usr/bin/env python3
"""Compatibility CLI for the shared MOE school resource builder."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from school_resource_bundle import DEFAULT_PROFILE_OUTPUT, ROOT, parse_workbook, write_profile_module


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xls", required=True)
    parser.add_argument("--output", default=str(DEFAULT_PROFILE_OUTPUT))
    args = parser.parse_args()
    xls_path = Path(args.xls).resolve()
    output = Path(args.output).resolve()
    records, province_counts = parse_workbook(xls_path)
    write_profile_module(records, province_counts, xls_path, output, ROOT)
    print(json.dumps({"output": str(output), "count": len(records)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
