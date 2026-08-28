#!/usr/bin/env python3
"""Compatibility CLI for the shared MOE school resource builder."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCHOOLS_TOOLS = Path(__file__).resolve().parents[1] / "schools"
if str(SCHOOLS_TOOLS) not in sys.path:
    sys.path.insert(0, str(SCHOOLS_TOOLS))

from school_resource_bundle import DEFAULT_REGION_OUTPUT, parse_workbook, write_region_index  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xls", required=True)
    parser.add_argument("--output", default=str(DEFAULT_REGION_OUTPUT))
    args = parser.parse_args()
    xls_path = Path(args.xls).resolve()
    output = Path(args.output).resolve()
    records, province_counts = parse_workbook(xls_path)
    write_region_index(records, province_counts, xls_path, output)
    print(json.dumps({"output": str(output), "count": len(records), "provinceCount": len(province_counts)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
