#!/usr/bin/env python3
"""Build the Tongxue v1.5.0 province/city school index from the official MOE 2026 XLS."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

import xlrd

EXPECTED_COUNT = 2952
EXPECTED_PROVINCES = 31
AS_OF_DATE = "2026-06-17"
PUBLISHED_DATE = "2026-06-18"
BUILD_ID = "tongxue-v150-region-20260617"
SOURCE_PAGE = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/A03/202606/t20260618_1441074.html"
SOURCE_XLS = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/W020260618307096078684.xls"
DEFAULT_OUTPUT = "tongxue/data/school-search-index.20260617-v150.json"
PROVINCE_HEADER = re.compile(r"^(.+?)[（(](\d+)所[）)]$")
CANONICAL_PROVINCE_CORRECTIONS = {"广西回族自治区": "广西壮族自治区"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xls", required=True)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    xls_path = Path(args.xls).resolve()
    output = Path(args.output).resolve()
    schools, province_counts = parse_workbook(xls_path)
    validate(schools, province_counts)

    payload = {
        "version": "moe-2026-06-17-region-v150",
        "buildId": BUILD_ID,
        "asOfDate": AS_OF_DATE,
        "publishedDate": PUBLISHED_DATE,
        "count": len(schools),
        "source": {
            "publisher": "中华人民共和国教育部",
            "pageUrl": SOURCE_PAGE,
            "xlsUrl": SOURCE_XLS,
            "sha256": sha256_file(xls_path),
        },
        "region": {
            "provinceCount": len(province_counts),
            "cityCount": len({school[2] for school in schools}),
            "provinceCounts": province_counts,
            "canonicalCorrections": CANONICAL_PROVINCE_CORRECTIONS,
        },
        "schools": schools,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "count": len(schools),
        "provinceCount": len(province_counts),
        "cityCount": payload["region"]["cityCount"],
        "bytes": output.stat().st_size,
        "sha256": payload["source"]["sha256"],
    }, ensure_ascii=False))
    return 0


def parse_workbook(path: Path) -> tuple[list[list[Any]], dict[str, int]]:
    workbook = xlrd.open_workbook(str(path))
    schools: list[list[Any]] = []
    province_counts: dict[str, int] = {}
    current_province = ""
    header_seen = False

    for sheet in workbook.sheets():
        for row_index in range(sheet.nrows):
            first = cell_text(sheet.cell_value(row_index, 0))
            province_match = PROVINCE_HEADER.fullmatch(first)
            if province_match:
                current_province = CANONICAL_PROVINCE_CORRECTIONS.get(province_match.group(1), province_match.group(1))
                province_counts[current_province] = int(province_match.group(2))
                continue

            if not header_seen and first.replace(" ", "") == "序号":
                header_seen = True
                continue
            if not header_seen or not current_province or sheet.ncols < 6:
                continue

            name = cell_text(sheet.cell_value(row_index, 1))
            if not name or name in {"学校名称", "合计"}:
                continue
            city = cell_text(sheet.cell_value(row_index, 4))
            level = cell_text(sheet.cell_value(row_index, 5))
            if not city or not level:
                raise RuntimeError(f"学校地域字段缺失：{name} / {current_province} / {city} / {level}")
            schools.append([name, current_province, city, level, []])

    return schools, province_counts


def validate(schools: list[list[Any]], province_counts: dict[str, int]) -> None:
    if len(schools) != EXPECTED_COUNT:
        raise RuntimeError(f"教育部普通高校数量应为 {EXPECTED_COUNT}，实际为 {len(schools)}")
    if len(province_counts) != EXPECTED_PROVINCES:
        raise RuntimeError(f"省级分组应为 {EXPECTED_PROVINCES}，实际为 {len(province_counts)}")
    if sum(province_counts.values()) != EXPECTED_COUNT:
        raise RuntimeError("省级分组数量之和与学校总数不一致")
    names = [row[0] for row in schools]
    if len(names) != len(set(names)):
        raise RuntimeError("学校名称存在重复")
    required = {
        "深圳大学": ("广东省", "深圳市"),
        "南方科技大学": ("广东省", "深圳市"),
        "河北工业大学": ("河北省", "天津市"),
        "西藏民族大学": ("西藏自治区", "咸阳市"),
        "辽宁科技大学": ("辽宁省", "鞍山市"),
    }
    by_name = {row[0]: row for row in schools}
    for name, expected in required.items():
        row = by_name.get(name)
        if not row or (row[1], row[2]) != expected:
            raise RuntimeError(f"学校地域校验失败：{name} / {row} / {expected}")
    if "广西壮族自治区" not in province_counts or "广西回族自治区" in province_counts:
        raise RuntimeError("广西省级名称没有标准化")


def cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return re.sub(r"\s+", " ", str(value)).strip()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    raise SystemExit(main())
