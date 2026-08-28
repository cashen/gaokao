#!/usr/bin/env python3
"""Single owner for all official MOE 2026 school-derived resources.

The workbook is parsed and validated once. Multiple runtime formats are then emitted
from the same in-memory catalog. Compatibility scripts call the functions in this
module rather than keeping their own parser or source constants.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import xlrd

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_COUNT = 2952
EXPECTED_PROVINCES = 31
EXPECTED_UNDERGRADUATE = 1412
EXPECTED_VOCATIONAL = 1540
AS_OF_DATE = "2026-06-17"
PUBLISHED_DATE = "2026-06-18"
GENERATED_AT = "2026-06-18T00:00:00Z"
SOURCE_PAGE = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/t20260618_1441074.html"
SOURCE_XLS = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/202606/W020260618307096078684.xls"
SOURCE_985 = "https://www.moe.gov.cn/srcsite/A22/s7065/200612/t20061206_128833.html"
SOURCE_211 = "https://www.moe.gov.cn/srcsite/A22/s7065/200512/t20051223_82762.html"
PROVINCE_HEADER = re.compile(r"^(.+?)[（(](\d+)所[）)]$")
PROVINCE_FIX = {"广西回族自治区": "广西壮族自治区"}
HEADER_ALIASES = {
    "序号": "sequence",
    "学校名称": "name",
    "学校标识码": "code",
    "主管部门": "authority",
    "所在地": "location",
    "办学层次": "level",
    "备注": "remark",
}

DEFAULT_PROFILE_OUTPUT = ROOT / "shared/resources/schools/school-profile-data.20260617-v3957.js"
DEFAULT_FULL_OUTPUT = ROOT / "tongxue/data/school-name-index.generated.json"
DEFAULT_LEGACY_SEARCH_OUTPUT = ROOT / "tongxue/data/school-search-index.20260617.json"
DEFAULT_REGION_OUTPUT = ROOT / "tongxue/data/school-search-index.20260617-v150.json"
TIER_INPUT = ROOT / "fenxi/data/school_tier_reference.json"
ALIAS_INPUT = ROOT / "fenxi/data/school_geo_model/school_name_alias_v29471.json"


@dataclass(frozen=True)
class SchoolRecord:
    sequence: int | None
    name: str
    code: str
    authority: str
    province: str
    location: str
    level: str
    remark: str


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


def normalize_code(value: Any) -> str:
    return re.sub(r"\.0$", "", text(value)).strip()


def normalize_integer(value: Any) -> int | None:
    value = re.sub(r"\.0$", "", text(value)).strip()
    return int(value) if value.isdigit() else None


def strip_province(value: str) -> str:
    return re.sub(r"省$|市$|自治区$|特别行政区$", "", text(value))


def strip_city(value: str) -> str:
    return re.sub(r"市$|地区$|自治州$|盟$", "", text(value))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_workbook(path: Path) -> tuple[list[SchoolRecord], dict[str, int]]:
    workbook = xlrd.open_workbook(str(path))
    records: list[SchoolRecord] = []
    province_counts: dict[str, int] = {}

    for sheet in workbook.sheets():
        current_province = ""
        columns: dict[str, int] = {}
        for row_index in range(sheet.nrows):
            first = text(sheet.cell_value(row_index, 0))
            province_match = PROVINCE_HEADER.fullmatch(first)
            if province_match:
                current_province = PROVINCE_FIX.get(province_match.group(1), province_match.group(1))
                province_counts[current_province] = int(province_match.group(2))
                continue

            possible_columns: dict[str, int] = {}
            for column_index in range(sheet.ncols):
                value = text(sheet.cell_value(row_index, column_index)).replace(" ", "")
                if value in HEADER_ALIASES:
                    possible_columns[HEADER_ALIASES[value]] = column_index
            if "name" in possible_columns and "code" in possible_columns:
                columns = possible_columns
                continue
            if not columns or not current_province:
                continue

            values = {
                field: text(sheet.cell_value(row_index, column_index))
                for field, column_index in columns.items()
                if column_index < sheet.ncols
            }
            name = values.get("name", "").strip()
            if not name or name in {"学校名称", "合计"} or not looks_like_school_name(name):
                continue
            records.append(SchoolRecord(
                sequence=normalize_integer(values.get("sequence", "")),
                name=name,
                code=normalize_code(values.get("code", "")),
                authority=values.get("authority", ""),
                province=current_province,
                location=values.get("location", ""),
                level=values.get("level", ""),
                remark=values.get("remark", ""),
            ))

    deduplicated: dict[str, SchoolRecord] = {}
    for record in records:
        existing = deduplicated.get(record.name)
        if existing and existing.code != record.code:
            raise RuntimeError(f"同名学校标识码冲突：{record.name} {existing.code} / {record.code}")
        deduplicated[record.name] = record
    catalog = list(deduplicated.values())
    validate_catalog(catalog, province_counts)
    return catalog, province_counts


def validate_catalog(records: list[SchoolRecord], province_counts: dict[str, int]) -> None:
    if len(records) != EXPECTED_COUNT:
        raise RuntimeError(f"教育部普通高校数量应为 {EXPECTED_COUNT}，实际为 {len(records)}")
    if len(province_counts) != EXPECTED_PROVINCES:
        raise RuntimeError(f"省级分组应为 {EXPECTED_PROVINCES}，实际为 {len(province_counts)}")
    if sum(province_counts.values()) != EXPECTED_COUNT:
        raise RuntimeError("省级分组数量之和与学校总数不一致")
    names = [record.name for record in records]
    if len(names) != len(set(names)):
        raise RuntimeError("学校正式名称存在重复")
    invalid_codes = [record for record in records if not re.fullmatch(r"\d{10}", record.code)]
    if invalid_codes:
        raise RuntimeError(f"学校标识码异常，示例：{invalid_codes[:3]}")
    undergraduate = sum(1 for record in records if record.level == "本科")
    vocational = sum(1 for record in records if record.level == "专科")
    if undergraduate != EXPECTED_UNDERGRADUATE or vocational != EXPECTED_VOCATIONAL:
        raise RuntimeError(f"办学层次数量异常：本科 {undergraduate}，专科 {vocational}")
    required = {
        "北京大学": ("北京市", "本科"),
        "吉林大学": ("长春市", "本科"),
        "大连理工大学": ("大连市", "本科"),
        "辽宁大学": ("沈阳市", "本科"),
        "辽宁科技大学": ("鞍山市", "本科"),
        "深圳大学": ("深圳市", "本科"),
        "三亚学院": ("三亚市", "本科"),
    }
    by_name = {record.name: record for record in records}
    for name, expected in required.items():
        record = by_name.get(name)
        actual = (record.location, record.level) if record else None
        if actual != expected:
            raise RuntimeError(f"学校目录校验失败：{name} / {actual} / {expected}")
    if "广西壮族自治区" not in province_counts or "广西回族自治区" in province_counts:
        raise RuntimeError("广西省级名称没有标准化")


def looks_like_school_name(value: str) -> bool:
    return bool(re.search(r"大学|学院|高等专科学校|职业技术大学|职业大学|职业学院|专科学校", value))


def nature_type(remark: str) -> str:
    value = text(remark)
    if "民办" in value or "独立学院" in value:
        return "private"
    if "中外合作办学" in value or "内地与港澳台地区合作办学" in value:
        return "cooperative"
    return "public"


def read_tiers(root: Path = ROOT) -> tuple[set[str], set[str]]:
    tier_input = root / TIER_INPUT.relative_to(ROOT)
    alias_input = root / ALIAS_INPUT.relative_to(ROOT)
    payload = json.loads(tier_input.read_text(encoding="utf-8"))
    aliases = json.loads(alias_input.read_text(encoding="utf-8")).get("items", [])
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


def read_alias_rows(root: Path = ROOT) -> list[list[str]]:
    alias_input = root / ALIAS_INPUT.relative_to(ROOT)
    payload = json.loads(alias_input.read_text(encoding="utf-8"))
    rows: list[list[str]] = []
    for item in payload.get("items", []):
        raw = text(item.get("raw_school_name"))
        standard = text(item.get("standard_school_name"))
        if raw and standard and norm(raw) != norm(standard):
            rows.append([raw, standard, text(item.get("alias_type")), text(item.get("note"))])
    rows.sort(key=lambda row: norm(row[0]))
    return rows


def write_full_tongxue_indexes(
    records: list[SchoolRecord],
    xls_path: Path,
    full_output: Path = DEFAULT_FULL_OUTPUT,
    search_output: Path = DEFAULT_LEGACY_SEARCH_OUTPUT,
) -> None:
    source_hash = sha256_file(xls_path)
    schools = [{
        "sequence": record.sequence,
        "name": record.name,
        "code": record.code,
        "authority": record.authority,
        "location": record.location,
        "level": record.level,
        "remark": record.remark,
    } for record in records]
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
            "undergraduateInstitutions": EXPECTED_UNDERGRADUATE,
            "higherVocationalInstitutions": EXPECTED_VOCATIONAL,
            "excludesHongKongMacaoTaiwan": True,
        },
        "count": len(schools),
        "exactMap": {record.name: record.code for record in records},
        "schools": schools,
    }
    full_output.parent.mkdir(parents=True, exist_ok=True)
    full_output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    search_payload = {
        "version": payload["version"],
        "asOfDate": AS_OF_DATE,
        "count": len(records),
        "schools": [[record.name, record.location, record.level] for record in records],
    }
    search_output.parent.mkdir(parents=True, exist_ok=True)
    search_output.write_text(json.dumps(search_payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def write_region_index(
    records: list[SchoolRecord],
    province_counts: dict[str, int],
    xls_path: Path,
    output: Path = DEFAULT_REGION_OUTPUT,
) -> None:
    rows = [[record.name, record.province, record.location, record.level, []] for record in records]
    payload = {
        "version": "moe-2026-06-17-region-v150",
        "buildId": "tongxue-v150-region-20260617",
        "asOfDate": AS_OF_DATE,
        "publishedDate": PUBLISHED_DATE,
        "count": len(rows),
        "source": {
            "publisher": "中华人民共和国教育部",
            "pageUrl": SOURCE_PAGE,
            "xlsUrl": SOURCE_XLS,
            "sha256": sha256_file(xls_path),
        },
        "region": {
            "provinceCount": len(province_counts),
            "cityCount": len({record.location for record in records}),
            "provinceCounts": province_counts,
            "canonicalCorrections": PROVINCE_FIX,
        },
        "schools": rows,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def write_profile_module(
    records: list[SchoolRecord],
    province_counts: dict[str, int],
    xls_path: Path,
    output: Path = DEFAULT_PROFILE_OUTPUT,
    root: Path = ROOT,
) -> None:
    schools985, schools211 = read_tiers(root)
    rows: list[list[Any]] = []
    for record in records:
        key = norm(record.name)
        rows.append([
            record.name,
            record.code,
            record.authority,
            strip_province(record.province),
            strip_city(record.location),
            record.level,
            nature_type(record.remark),
            record.remark,
            1 if key in schools985 else 0,
            1 if key in schools211 else 0,
        ])
    if sum(1 for row in rows if row[8]) < 38:
        raise RuntimeError("985学校匹配数量异常")
    if sum(1 for row in rows if row[9]) < 100:
        raise RuntimeError("211学校匹配数量异常")
    if sum(1 for row in rows if row[6] == "private") < 500:
        raise RuntimeError("民办学校识别数量异常")
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
            "schoolListSha256": sha256_file(xls_path),
            "source985Url": SOURCE_985,
            "source211Url": SOURCE_211,
        },
        "doubleNonDefinition": "非985且非211；不等同于非双一流",
    }
    aliases = read_alias_rows(root)
    content = (
        "// Generated by tools/schools/school_resource_bundle.py. Do not edit by hand.\n"
        f"export const SCHOOL_PROFILE_SOURCE_META=Object.freeze({json.dumps(meta, ensure_ascii=False, separators=(',', ':'))});\n"
        f"export const SCHOOL_PROFILE_ROWS=Object.freeze({json.dumps(rows, ensure_ascii=False, separators=(',', ':'))});\n"
        f"export const SCHOOL_PROFILE_ALIASES=Object.freeze({json.dumps(aliases, ensure_ascii=False, separators=(',', ':'))});\n"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding="utf-8")


def build_all(
    xls_path: Path,
    *,
    root: Path = ROOT,
    profile_output: Path = DEFAULT_PROFILE_OUTPUT,
    full_output: Path = DEFAULT_FULL_OUTPUT,
    legacy_search_output: Path = DEFAULT_LEGACY_SEARCH_OUTPUT,
    region_output: Path = DEFAULT_REGION_OUTPUT,
) -> dict[str, Any]:
    records, province_counts = parse_workbook(xls_path)
    write_profile_module(records, province_counts, xls_path, profile_output, root)
    write_full_tongxue_indexes(records, xls_path, full_output, legacy_search_output)
    write_region_index(records, province_counts, xls_path, region_output)
    return {
        "count": len(records),
        "provinceCount": len(province_counts),
        "sha256": sha256_file(xls_path),
        "outputs": [str(profile_output), str(full_output), str(legacy_search_output), str(region_output)],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xls", required=True)
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--profile-output", default=str(DEFAULT_PROFILE_OUTPUT))
    parser.add_argument("--full-output", default=str(DEFAULT_FULL_OUTPUT))
    parser.add_argument("--legacy-search-output", default=str(DEFAULT_LEGACY_SEARCH_OUTPUT))
    parser.add_argument("--region-output", default=str(DEFAULT_REGION_OUTPUT))
    args = parser.parse_args()
    result = build_all(
        Path(args.xls).resolve(),
        root=Path(args.root).resolve(),
        profile_output=Path(args.profile_output).resolve(),
        full_output=Path(args.full_output).resolve(),
        legacy_search_output=Path(args.legacy_search_output).resolve(),
        region_output=Path(args.region_output).resolve(),
    )
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
