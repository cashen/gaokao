#!/usr/bin/env python3
"""Compatibility CLI for the shared MOE school resource builder."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

SCHOOLS_TOOLS = Path(__file__).resolve().parents[1] / "schools"
if str(SCHOOLS_TOOLS) not in sys.path:
    sys.path.insert(0, str(SCHOOLS_TOOLS))

from school_resource_bundle import (  # noqa: E402
    DEFAULT_FULL_OUTPUT,
    DEFAULT_LEGACY_SEARCH_OUTPUT,
    SOURCE_PAGE,
    SOURCE_XLS,
    parse_workbook,
    write_full_tongxue_indexes,
)


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; GaokaoOS-SchoolIndex/2.0; +https://gaokao.powers.org.cn/tongxue/)",
            "Accept": "application/vnd.ms-excel,application/octet-stream;q=0.9,*/*;q=0.8",
            "Referer": SOURCE_PAGE,
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read()
    if len(data) < 20_000:
        raise RuntimeError(f"下载文件过小，疑似不是官方 XLS：{len(data)} bytes")
    destination.write_bytes(data)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_FULL_OUTPUT))
    parser.add_argument("--search-output", default=str(DEFAULT_LEGACY_SEARCH_OUTPUT))
    parser.add_argument("--xls", default="")
    args = parser.parse_args()
    output = Path(args.output).resolve()
    search_output = Path(args.search_output).resolve()
    xls_path = Path(args.xls).resolve() if args.xls else output.with_suffix(".source.xls")
    if not args.xls:
        download_file(SOURCE_XLS, xls_path)
    records, _province_counts = parse_workbook(xls_path)
    write_full_tongxue_indexes(records, xls_path, output, search_output)
    print(json.dumps({"output": str(output), "searchOutput": str(search_output), "count": len(records)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"BUILD_MOE_SCHOOL_INDEX_FAILED: {exc}", file=sys.stderr)
        raise
