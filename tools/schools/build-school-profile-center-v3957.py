#!/usr/bin/env python3
"""Generate the shared school profile data used by cards and Functions.

Authoritative sources:
- MOE nationwide ordinary higher-education school list, as of 2026-06-17.
- MOE 985/211 school lists, represented by the repository's audited tier input.

The 2026 XLS supplies official school name, identifier,主管部门, province/city,
level and official remark. 985/211 are historical fixed programmes; aliases and
campus names inherit the parent school's profile in school-profile-center.js.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

import xlrd

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_COUNT = 2952
EXPECTED_PROVINCES = 31
AS_OF_DATE = "2026-06-17"
PUBLISHED_DATE = "2026-06-18"
SOURCE_PAGE = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/t20260618_1441074.html"
SOURCE_XLS = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/W020260618307096078684.xls"
SOURCE_985 = "https://www.moe.gov.cn/srcsite/A22/s7065/200612/t20061206_128833.html"
SOURCE_211 = "https://www.moe.gov.cn/srcsite/A22/s7065/200512/t20051223_82762.html"
DEFAULT_OUTPUT = ROOT / "shared/resources/schools/school-profile-data.20260617-v3957.js"
TIER_INPUT = ROOT / "fenxi/data/school_tier_reference.json"
ALIAS_INPUT = ROOT / "fenxi/data/school_geo_model/school_name_alias_v29471.json"
PROVINCE_HEADER = re.compile(r"^(.+?)[（(](\d+)所[）)]$")
PROVINCE_FIX = {"广西回族自治区": "广西壮族自治区"}


def text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return re.sub(r"\s+", " ", str(value)).strip()


def norm(value: Any) -> str:
    value = unicodedata.normalize("NFKC", text(value)).lower()
    value = value.replace("（", "(").replace("）", ")")
    return re.sub(r"[\s·•,，。；;：:'\"“”‘’!！?？_—-]+", "", value).strip()


def strip_province(value: str) -> str:
    return re.sub(r"省$|市$|自治区$|特别行政区$", "", text(value))


def strip_city(value: str) -> str:
    return re.sub(r"市$|地区$|自治州$|盟$", "", text(value))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def nature_type(remark: str) -> str:
    value = text(remark)
    if "民办" in value or "独立学院" in value:
        return "private"
    if "中外合作办学" in value or "内地与港澳台地区合作办学" in value:
        return "cooperative"
    return "public"


def read_tiers() -> tuple[set[str], set[str]]:
    payload = json.loads(TIER_INPUT.read_text(encoding="utf-8"))
    aliases = json.loads(ALIAS_INPUT.read_text(encoding="utf-8")).get("items", [])
    alias_map = {norm(item.get("raw_school_name")): norm(item.get("standard_school_name")) for item in aliases}

    def expand(names: list[str]) -> set[str]:
        out: set[str] = set()
        for name in names:
            key = norm(name)
            if not key:
                continue
            out.add(key)
            if key in alias_map:
                out.add(alias_map[key])
        return out

    schools985 = expand(payload.get("schools985", []))
    schools211 = schools985 | expand(payload.get("schools211Non985", []))
    return schools985, schools211


def read_alias_rows() -> list[list[str]]:
    payload = json.loads(ALIAS_INPUT.read_text(encoding="utf-8"))
    rows = []
    for item in payload.get("items", []):
        raw = text(item.get("raw_school_name"))
        standard = text(item.get("standard_school_name"))
        if raw and standard and norm(raw) != norm(standard):
            rows.append([raw, standard, text(item.get("alias_type")), text(item.get("note"))])
    rows.sort(key=lambda row: norm(row[0]))
    return rows


def parse_xls(path: Path) -> tuple[list[list[Any]], dict[str, int]]:
    workbook = xlrd.open_workbook(str(path))
    schools: list[list[Any]] = []
    province_counts: dict[str, int] = {}
    current_province = ""
    header_seen = False
    schools985, schools211 = read_tiers()

    for sheet in workbook.sheets():
        for row_index in range(sheet.nrows):
            first = text(sheet.cell_value(row_index, 0))
            match = PROVINCE_HEADER.fullmatch(first)
            if match:
                current_province = PROVINCE_FIX.get(match.group(1), match.group(1))
                province_counts[current_province] = int(match.group(2))
                continue
            if not header_seen and first.replace(" ", "") == "序号":
                header_seen = True
                continue
            if not header_seen or not current_province or sheet.ncols < 6:
                continue

            name = text(sheet.cell_value(row_index, 1))
            if not name or name in {"学校名称", "合计"}:
                continue
            identifier = text(sheet.cell_value(row_index, 2)) if sheet.ncols > 2 else ""
            department = text(sheet.cell_value(row_index, 3)) if sheet.ncols > 3 else ""
            city = text(sheet.cell_value(row_index, 4)) if sheet.ncols > 4 else ""
            level = text(sheet.cell_value(row_index, 5)) if sheet.ncols > 5 else ""
            remark = text(sheet.cell_value(row_index, 6)) if sheet.ncols > 6 else ""
            if not identifier or not city or not level:
                raise RuntimeError(f"学校资料字段缺失：{name} / {identifier} / {current_province} / {city} / {level}")
            key = norm(name)
            schools.append([
                name,
                identifier,
                department,
                strip_province(current_province),
                strip_city(city),
                level,
                nature_type(remark),
                remark,
                1 if key in schools985 else 0,
                1 if key in schools211 else 0,
            ])
    return schools, province_counts


def validate(rows: list[list[Any]], province_counts: dict[str, int]) -> None:
    if len(rows) != EXPECTED_COUNT:
        raise RuntimeError(f"教育部普通高校数量应为 {EXPECTED_COUNT}，实际为 {len(rows)}")
    if len(province_counts) != EXPECTED_PROVINCES:
        raise RuntimeError(f"省级分组应为 {EXPECTED_PROVINCES}，实际为 {len(province_counts)}")
    if sum(province_counts.values()) != EXPECTED_COUNT:
        raise RuntimeError("省级数量之和与学校总数不一致")
    names = [row[0] for row in rows]
    if len(names) != len(set(names)):
        raise RuntimeError("学校正式名称存在重复")

    by_name = {row[0]: row for row in rows}
    expected = {
        "北京大学": ("北京", "北京", "public", 1, 1),
        "上海财经大学": ("上海", "上海", "public", 0, 1),
        "辽宁大学": ("辽宁", "沈阳", "public", 0, 1),
        "深圳大学": ("广东", "深圳", "public", 0, 0),
        "三亚学院": ("海南", "三亚", "private", 0, 0),
        "大连东软信息学院": ("辽宁", "大连", "private", 0, 0),
    }
    for name, target in expected.items():
        row = by_name.get(name)
        actual = tuple(row[i] for i in (3, 4, 6, 8, 9)) if row else None
        if actual != target:
            raise RuntimeError(f"学校资料校验失败：{name} / {actual} / {target}")

    if sum(1 for row in rows if row[8]) < 38:
        raise RuntimeError("985学校匹配数量异常")
    if sum(1 for row in rows if row[9]) < 100:
        raise RuntimeError("211学校匹配数量异常")
    if sum(1 for row in rows if row[6] == "private") < 500:
        raise RuntimeError("民办学校识别数量异常")


def js(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def write_module(output: Path, rows: list[list[Any]], province_counts: dict[str, int], xls_path: Path) -> None:
    meta = {
        "version": "v3957_0",
        "asOfDate": AS_OF_DATE,
        "publishedDate": PUBLISHED_DATE,
        "count": len(rows),
        "provinceCount": len(province_counts),
        "privateCount": sum(1 for row in rows if row[6] == "private"),
        "cooperativeCount": sum(1 for row in rows if row[6] == "cooperative"),
        "985MatchedCount": sum(1 for row in rows if row[8]),
        "211MatchedCount": sum(1 for row in rows if row[9]),
        "source": {
            "publisher": "中华人民共和国教育部",
            "schoolListPageUrl": SOURCE_PAGE,
            "schoolListXlsUrl": SOURCE_XLS,
            "schoolListSha256": sha256(xls_path),
            "source985Url": SOURCE_985,
            "source211Url": SOURCE_211,
        },
        "doubleNonDefinition": "非985且非211；不等同于非双一流",
    }
    aliases = read_alias_rows()
    content = (
        "// Generated by tools/schools/build-school-profile-center-v3957.py. Do not edit by hand.\n"
        f"export const SCHOOL_PROFILE_SOURCE_META=Object.freeze({js(meta)});\n"
        f"export const SCHOOL_PROFILE_ROWS=Object.freeze({js(rows)});\n"
        f"export const SCHOOL_PROFILE_ALIASES=Object.freeze({js(aliases)});\n"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xls", required=True)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()
    xls_path = Path(args.xls).resolve()
    output = Path(args.output).resolve()
    rows, province_counts = parse_xls(xls_path)
    validate(rows, province_counts)
    write_module(output, rows, province_counts, xls_path)
    print(json.dumps({
        "output": str(output),
        "count": len(rows),
        "privateCount": sum(1 for row in rows if row[6] == "private"),
        "985MatchedCount": sum(1 for row in rows if row[8]),
        "211MatchedCount": sum(1 for row in rows if row[9]),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
