#!/usr/bin/env python3
"""Download the official MOE 2026 national ordinary higher-education list and emit JSON indexes."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any

import xlrd

SOURCE_PAGE = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/t20260618_1441074.html"
SOURCE_XLS = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/W020260618307096078684.xls"
EXPECTED_COUNT = 2952
AS_OF_DATE = "2026-06-17"
PUBLISHED_DATE = "2026-06-18"
GENERATED_AT = "2026-06-18T00:00:00Z"
DEFAULT_SEARCH_OUTPUT = "school-search-index.20260617.json"

HEADER_ALIASES = {
    "序号": "sequence",
    "学校名称": "name",
    "学校标识码": "code",
    "主管部门": "authority",
    "所在地": "location",
    "办学层次": "level",
    "备注": "remark",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="school-name-index.generated.json")
    parser.add_argument("--search-output", default=DEFAULT_SEARCH_OUTPUT)
    parser.add_argument("--xls", default="")
    args = parser.parse_args()

    output = Path(args.output).resolve()
    search_output = Path(args.search_output).resolve()
    xls_path = Path(args.xls).resolve() if args.xls else output.with_suffix(".source.xls")
    if not args.xls:
        download_file(SOURCE_XLS, xls_path)

    schools = parse_workbook(xls_path)
    validate_schools(schools)
    source_hash = sha256_file(xls_path)

    exact_map = {school["name"]: school["code"] for school in schools}
    payload = {
        "version": "moe-2026-06-17",
        "generatedAt": GENERATED_AT,
        "asOfDate": AS_OF_DATE,
        "publishedDate": PUBLISHED_DATE,
        "source": {
            "publisher": "中华人民共和国教育部",
            "pageUrl": SOURCE_PAGE,
            "xlsUrl": SOURCE_XLS,
            "sha256": source_hash,
        },
        "scope": {
            "ordinaryHigherEducationInstitutions": EXPECTED_COUNT,
            "undergraduateInstitutions": 1412,
            "higherVocationalInstitutions": 1540,
            "excludesHongKongMacaoTaiwan": True,
        },
        "count": len(schools),
        "exactMap": exact_map,
        "schools": schools,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    search_payload = {
        "version": payload["version"],
        "asOfDate": AS_OF_DATE,
        "count": len(schools),
        "schools": [[school["name"], school["location"], school["level"]] for school in schools],
    }
    search_output.write_text(
        json.dumps(search_payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    print(json.dumps({
        "output": str(output),
        "searchOutput": str(search_output),
        "count": len(schools),
        "sha256": source_hash,
        "fullBytes": output.stat().st_size,
        "searchBytes": search_output.stat().st_size,
        "first": schools[0],
        "last": schools[-1],
    }, ensure_ascii=False))
    return 0


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; GaokaoOS-SchoolIndex/1.0; +https://gaokao.powers.org.cn/tongxue.html)",
            "Accept": "application/vnd.ms-excel,application/octet-stream;q=0.9,*/*;q=0.8",
            "Referer": SOURCE_PAGE,
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read()
    if len(data) < 20_000:
        raise RuntimeError(f"下载文件过小，疑似不是官方 XLS：{len(data)} bytes")
    destination.write_bytes(data)


def parse_workbook(path: Path) -> list[dict[str, Any]]:
    workbook = xlrd.open_workbook(str(path))
    schools: list[dict[str, Any]] = []
    for sheet in workbook.sheets():
        header_row, columns = locate_header(sheet)
        if header_row is None:
            continue
        for row_index in range(header_row + 1, sheet.nrows):
            values = {
                field: cell_text(sheet.cell_value(row_index, column_index))
                for field, column_index in columns.items()
            }
            name = normalize_name(values.get("name", ""))
            if not name or name in {"学校名称", "合计"} or not looks_like_school_name(name):
                continue
            schools.append({
                "sequence": normalize_integer(values.get("sequence", "")),
                "name": name,
                "code": normalize_code(values.get("code", "")),
                "authority": values.get("authority", ""),
                "location": values.get("location", ""),
                "level": values.get("level", ""),
                "remark": values.get("remark", ""),
            })

    deduplicated: dict[str, dict[str, Any]] = {}
    for school in schools:
        existing = deduplicated.get(school["name"])
        if existing and existing.get("code") != school.get("code"):
            raise RuntimeError(f"同名学校标识码冲突：{school['name']} {existing.get('code')} / {school.get('code')}")
        deduplicated[school["name"]] = school
    return list(deduplicated.values())


def locate_header(sheet: xlrd.sheet.Sheet) -> tuple[int | None, dict[str, int]]:
    for row_index in range(min(sheet.nrows, 30)):
        columns: dict[str, int] = {}
        for column_index in range(sheet.ncols):
            value = cell_text(sheet.cell_value(row_index, column_index)).replace(" ", "")
            for header, field in HEADER_ALIASES.items():
                if value == header:
                    columns[field] = column_index
        if "name" in columns and "code" in columns:
            return row_index, columns
    return None, {}


def validate_schools(schools: list[dict[str, Any]]) -> None:
    if len(schools) != EXPECTED_COUNT:
        raise RuntimeError(f"教育部普通高校数量应为 {EXPECTED_COUNT}，实际解析为 {len(schools)}")
    names = [school["name"] for school in schools]
    if len(names) != len(set(names)):
        raise RuntimeError("正式校名存在重复")
    required = {
        "北京大学", "清华大学", "吉林大学", "大连理工大学", "辽宁大学",
        "辽宁科技大学", "辽宁科技学院", "北京航空航天大学",
    }
    missing = sorted(required.difference(names))
    if missing:
        raise RuntimeError(f"官方名单缺少测试学校：{missing}")
    invalid_codes = [school for school in schools if not re.fullmatch(r"\d{10}", school["code"])]
    if invalid_codes:
        raise RuntimeError(f"学校标识码异常，示例：{invalid_codes[:3]}")
    undergraduate_count = sum(1 for school in schools if school["level"] == "本科")
    higher_vocational_count = sum(1 for school in schools if school["level"] == "专科")
    if undergraduate_count != 1412 or higher_vocational_count != 1540:
        raise RuntimeError(f"办学层次数量异常：本科 {undergraduate_count}，专科 {higher_vocational_count}")


def cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return re.sub(r"\s+", " ", str(value)).strip()


def normalize_name(value: str) -> str:
    return value.strip()


def normalize_code(value: str) -> str:
    return re.sub(r"\.0$", "", value).strip()


def normalize_integer(value: str) -> int | None:
    text = re.sub(r"\.0$", "", value).strip()
    return int(text) if text.isdigit() else None


def looks_like_school_name(value: str) -> bool:
    return bool(re.search(r"大学|学院|高等专科学校|职业技术大学|职业大学|职业学院|专科学校", value))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"BUILD_MOE_SCHOOL_INDEX_FAILED: {exc}", file=sys.stderr)
        raise
