#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
import html
import json
import math
import os
import re
import statistics
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("GITHUB_WORKSPACE", Path(__file__).resolve().parents[2]))
ADMISSION_XLSX_URL = "https://img.gaokaozhitongche.com/uploads/file/2026/0721/1784621062264342.xlsx"
PROVIDED_XML_SHA256 = "e195fc3a18cd9dc0ad7a0f80e4a57ffe4037e9e017ba231c23a2b8e33663608e"
RANK_PDF_URLS = [
    "https://www.lnzsks.com/lnzkbfiles/2026/lns2026gkcjtjb0624clhptll01.pdf",
]
RANK_ANCHORS = {708: 10, 700: 41, 680: 404, 650: 2867, 600: 14235, 570: 24127, 550: 31674, 508: 49824, 480: 62667, 450: 76652, 400: 98648, 344: 119069, 150: 141691}
VERSION = "v3.9.51.0"
DATA_VERSION = "three-year-2024-2026-v1.0.0"
ANNUAL_VERSION = "ln2026-analysis-v1.0.0"
HEAT_VERSION = "lngk2026-heat-v1.0.0"
GENERATED_AT = datetime.now(timezone.utc).isoformat()


def dump_json(path: Path, obj, *, pretty: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    if pretty:
        text = json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=False)
    else:
        text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text + ("\n" if pretty else ""), encoding="utf-8")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def norm(value: str) -> str:
    s = unicodedata.normalize("NFKC", str(value or ""))
    s = s.replace("（", "(").replace("）", ")").replace("【", "[").replace("】", "]")
    s = s.replace("，", ",").replace("、", ",").replace("：", ":").replace("；", ";")
    s = re.sub(r"\s+", "", s)
    return s.strip().lower()


def project_signature(major: str) -> str:
    s = norm(major)
    flags = []
    rules = [
        ("sino", r"中外合作|合作办学|国际合作|学术互认|联合培养|境外"),
        ("highfee", r"高收费|较高收费|学费.*万"),
        ("pre", r"预科|民族班|边防军人子女"),
        ("special", r"专项|定向|公费师范|优师|免费医学|订单定向|乡村医生"),
        ("elite", r"试验班|实验班|拔尖|英才|卓越|本博|八年制|九年制|长学制"),
        ("campus", r"校区|分校|办学地点"),
        ("class", r"专业类|工科试验班|理科试验班|大类"),
    ]
    for label, pat in rules:
        if re.search(pat, s):
            flags.append(label)
    return "+".join(flags) if flags else "regular"


def special_project(major: str) -> dict:
    s = norm(major)
    types = []
    checks = [
        ("中外合作", r"中外合作|合作办学|国际合作|学术互认|联合培养|境外"),
        ("高收费", r"高收费|较高收费"),
        ("预科", r"预科|民族班"),
        ("资格限制", r"边防军人子女|专项|定向|公费师范|优师|免费医学|订单定向|乡村医生"),
        ("特殊培养", r"试验班|实验班|拔尖|英才|卓越|本博|八年制|九年制|长学制"),
    ]
    for label, pat in checks:
        if re.search(pat, s):
            types.append(label)
    eligibility = any(x in types for x in ("预科", "资格限制"))
    return {
        "hasSpecialProject": bool(types),
        "types": types,
        "defaultHidden": eligibility,
        "eligibilityRestricted": eligibility,
        "reviewPoints": (["报考资格", "招生批次", "服务或身份条件"] if eligibility else (["学费与培养方式", "毕业证书与校区"] if "中外合作" in types else [])),
    }


def direction_of(major: str) -> tuple[str, str]:
    s = norm(major)
    catalog = [
        ("electrical_energy", "电气/自动化/能源", r"电气|自动化|能源|新能源|储能|电力"),
        ("mechanical_vehicle", "机械/装备/车辆", r"机械|车辆|汽车|机电|智能制造|过程装备|工业设计"),
        ("petro_material_safety", "石化/材料/资源安全", r"石油|油气|化工|材料|冶金|矿业|采矿|地质|安全工程|资源"),
        ("computer_ai_software", "计算机/AI/软件", r"计算机|软件|人工智能|数据科学|网络空间|信息安全|智能科学"),
        ("electronics_ic", "电子信息/集成电路", r"电子信息|通信|微电子|集成电路|光电|电磁|信息工程"),
        ("medical_core", "医学核心", r"临床医学|口腔医学|儿科学|麻醉学|医学影像学|眼视光医学|精神医学"),
        ("medical_applied", "医学应用", r"护理|药学|临床药学|医学检验|医学影像技术|康复|生物医学|预防医学|公共卫生"),
        ("teacher_law_public", "师范/法学/考公", r"师范|教育学|法学|公安|侦查|政治学|行政管理|公共事业"),
        ("finance_management", "财经管理", r"金融|经济学|会计|财务|工商管理|市场营销|电子商务|保险|税收|审计"),
        ("civil_arch_transport", "土木建筑交通", r"土木|建筑|城乡规划|风景园林|工程造价|交通|铁道|道路|航海|物流"),
        ("agri_food_env", "农林食品环境", r"农学|林学|园艺|动物|水产|食品|环境|生态|植物保护"),
        ("humanities_media_tourism", "文旅外语新闻", r"外语|英语|日语|俄语|新闻|传播|旅游|酒店|汉语言|广播电视|戏剧影视"),
        ("basic_science_math", "基础理科/数理", r"数学|物理学|化学|生物科学|统计学|应用统计|力学|天文学"),
    ]
    for did, label, pat in catalog:
        if re.search(pat, s):
            return did, label
    return "other", "其他"



def download_bytes(url: str, *, min_size: int = 1000) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ln-rank-build/1.0"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
    if len(data) < min_size:
        raise RuntimeError(f"download too small: {url} ({len(data)} bytes)")
    return data


def _xlsx_col_index(ref: str) -> int:
    letters = re.match(r"[A-Z]+", ref or "")
    if not letters:
        return 0
    n = 0
    for ch in letters.group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def parse_admission_xlsx(data: bytes) -> dict:
    ns_main = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    ns_rel = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
    ns_pkg = "{http://schemas.openxmlformats.org/package/2006/relationships}"
    with tempfile.TemporaryDirectory() as td:
        xlsx = Path(td) / "admission.xlsx"
        xlsx.write_bytes(data)
        with zipfile.ZipFile(xlsx) as zf:
            shared = []
            if "xl/sharedStrings.xml" in zf.namelist():
                root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
                for si in root.findall(f"{ns_main}si"):
                    shared.append("".join(t.text or "" for t in si.iter(f"{ns_main}t")))
            wb = ET.fromstring(zf.read("xl/workbook.xml"))
            rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
            relmap = {r.attrib.get("Id"): r.attrib.get("Target") for r in rels.findall(f"{ns_pkg}Relationship")}
            parsed_sheets = []
            for sheet in wb.find(f"{ns_main}sheets"):
                name = sheet.attrib.get("name", "")
                target = relmap.get(sheet.attrib.get(f"{ns_rel}id"), "")
                if not target:
                    continue
                if target.startswith("/"):
                    path = target.lstrip("/")
                else:
                    path = "xl/" + target.lstrip("/")
                root = ET.fromstring(zf.read(path))
                rows = []
                for row in root.iter(f"{ns_main}row"):
                    vals = {}
                    for cell in row.findall(f"{ns_main}c"):
                        idx = _xlsx_col_index(cell.attrib.get("r", ""))
                        typ = cell.attrib.get("t", "")
                        v = cell.find(f"{ns_main}v")
                        if typ == "inlineStr":
                            isel = cell.find(f"{ns_main}is")
                            value = "" if isel is None else "".join(t.text or "" for t in isel.iter(f"{ns_main}t"))
                        elif v is None:
                            value = ""
                        elif typ == "s":
                            value = shared[int(v.text)] if v.text and int(v.text) < len(shared) else ""
                        else:
                            value = v.text or ""
                        vals[idx] = value.strip()
                    if vals:
                        rows.append([vals.get(i, "") for i in range(max(vals) + 1)])
                records = []
                for row in rows:
                    if len(row) < 12:
                        row += [""] * (12 - len(row))
                    score_text = str(row[4]).strip()
                    if not re.fullmatch(r"\d{3}", score_text):
                        continue
                    school_code, school, major_code, major = [str(x).strip() for x in row[:4]]
                    if not school or not major:
                        continue
                    nums = []
                    for x in row[4:12]:
                        try:
                            nums.append(int(float(str(x).strip())))
                        except Exception:
                            nums.append(0)
                    records.append({
                        "schoolCode": school_code.zfill(4) if school_code.isdigit() else school_code,
                        "school": school, "majorCode": major_code, "major": major,
                        "score": nums[0], "tieChineseMath": nums[1], "tieChineseMathMax": nums[2],
                        "tieForeign": nums[3], "tieFirstSubject": nums[4], "tieSecondMax": nums[5],
                        "tieSecondSecond": nums[6], "preferenceOrder": nums[7],
                    })
                if records:
                    parsed_sheets.append((name, records))
    if not parsed_sheets:
        raise RuntimeError("no valid admission records parsed from 2026 xlsx")
    parsed_sheets.sort(key=lambda x: len(x[1]), reverse=True)
    primary_name, records = parsed_sheets[0]
    duplicates = [name for name, recs in parsed_sheets[1:] if recs == records]
    if len(records) != 11628:
        raise RuntimeError(f"2026 admission record count mismatch: {len(records)}")
    schools = len({r["school"] for r in records})
    if schools != 956:
        raise RuntimeError(f"2026 admission school count mismatch: {schools}")
    return {
        "records": records,
        "sourceUrl": ADMISSION_XLSX_URL,
        "sourceSha256": hashlib.sha256(data).hexdigest(),
        "providedXmlSha256": PROVIDED_XML_SHA256,
        "primarySheet": primary_name,
        "duplicateSheets": duplicates,
    }

def download_rank_pdf(dest: Path):
    last = None
    for url in RANK_PDF_URLS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 ln-rank-build/1.0"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = resp.read()
            if len(data) < 50_000 or not data.startswith(b"%PDF"):
                raise RuntimeError(f"downloaded content is not a PDF ({len(data)} bytes)")
            dest.write_bytes(data)
            return url
        except Exception as exc:
            last = exc
    raise RuntimeError(f"cannot download official 2026 rank PDF: {last}")


def parse_rank_pdf(pdf: Path) -> tuple[dict[int, int], dict[int, int]]:
    txt = pdf.with_suffix(".txt")
    subprocess.run(["pdftotext", "-layout", str(pdf), str(txt)], check=True)
    text = txt.read_text(encoding="utf-8", errors="ignore")
    candidates: dict[int, list[tuple[int, int]]] = defaultdict(list)
    triple = re.compile(r"(?<!\d)(\d{3})(?:\s*及以上)?\s+(\d{1,5})\s+(\d{1,6})(?!\d)")
    for line in text.splitlines():
        for score_s, count_s, cum_s in triple.findall(line):
            score, count, cum = int(score_s), int(count_s), int(cum_s)
            if 100 <= score <= 750 and 0 <= count <= 5000 and count <= cum <= 250000:
                candidates[score].append((count, cum))
    rank = {}
    count = {}
    for score, vals in candidates.items():
        # In the physical-only PDF the correct row is unique. If headers create duplicates,
        # prefer the largest plausible cumulative value and later validate monotonicity/anchors.
        c, r = sorted(vals, key=lambda x: (x[1], x[0]))[-1]
        rank[score] = r
        count[score] = c
    if not rank:
        raise RuntimeError("no score rows parsed from official PDF")
    top = max(rank)
    # Fill explicit zero-person score rows if the PDF omitted them.
    for score in range(top, 149, -1):
        if score not in rank:
            higher = rank.get(score + 1)
            if higher is None:
                continue
            rank[score] = higher
            count[score] = 0
    errors = []
    for score, expected in RANK_ANCHORS.items():
        actual = rank.get(score)
        if actual != expected:
            errors.append(f"{score}: expected {expected}, got {actual}")
    ordered = sorted((s, r) for s, r in rank.items() if 150 <= s <= top)
    # As score rises, cumulative rank must not rise. Equivalently descending score is nondecreasing.
    prev = -1
    for score in sorted(rank, reverse=True):
        r = rank[score]
        if r < prev:
            errors.append(f"non-monotonic at score {score}: {r} < {prev}")
            break
        prev = r
    if errors:
        sample = "\n".join(text.splitlines()[:40])
        raise RuntimeError("rank PDF validation failed: " + "; ".join(errors) + "\nPDF text sample:\n" + sample)
    return rank, count


def load_old_records() -> list[dict]:
    out = []
    for path in sorted((ROOT / "fenxi/data/chunks").glob("rank_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        rows = data if isinstance(data, list) else data.get("records", [])
        out.extend(rows)
    if len(out) < 10_000:
        raise RuntimeError(f"historical chunk load incomplete: {len(out)} records")
    return out


def majority_profile(rows: list[dict]) -> dict:
    keys = ["schoolProvince", "schoolCity", "lnArea", "schoolNatureLabel", "schoolNatureCls", "nature", "natureRaw"]
    out = {}
    for key in keys:
        vals = [str(r.get(key) or "").strip() for r in rows if str(r.get(key) or "").strip()]
        if vals:
            out[key] = Counter(vals).most_common(1)[0][0]
    tags = []
    for r in rows:
        tags.extend(r.get("schoolTags") or [])
    if tags:
        out["schoolTags"] = list(dict.fromkeys(tags))[:8]
    for key in ["isMedical", "isTeacher", "isLiberal", "isChem", "isPhys", "isGrid", "isComputer", "isFinance"]:
        vals = [bool(r.get(key)) for r in rows]
        if vals:
            out[key] = sum(vals) >= len(vals) / 2
    return out


def rank_row(rank_map: dict[int, int], count_map: dict[int, int], score: int) -> dict:
    end = rank_map.get(score)
    if end is None:
        return {"rankStart": None, "rankEnd": None, "sameCount": None, "rank": None}
    same = count_map.get(score, max(0, end - rank_map.get(score + 1, 0)))
    start = end - same + 1 if same else end
    return {"rankStart": start, "rankEnd": end, "sameCount": same, "rank": end}


def classify_trend(d1: float, d2: float, threshold: float) -> str:
    def side(x):
        if x < -threshold:
            return -1
        if x > threshold:
            return 1
        return 0
    a, b = side(d1), side(d2)
    if a == -1 and b == -1:
        return "continuous_forward"
    if a == 1 and b == 1:
        return "continuous_backward"
    if a == 1 and b == -1:
        return "rebound_2026"
    if a == -1 and b == 1:
        return "pullback_2026"
    if a == 0 and b == 0:
        return "stable"
    if a == 0 or b == 0:
        return "latest_forward" if b == -1 else ("latest_backward" if b == 1 else "stable")
    return "volatile"


TREND_LABELS = {
    "continuous_forward": "连续两年对应投档位置前移",
    "continuous_backward": "连续两年对应投档位置后移",
    "rebound_2026": "2026 出现反向前移",
    "pullback_2026": "2026 出现反向后移",
    "latest_forward": "2026 对应位置有所前移",
    "latest_backward": "2026 对应位置有所后移",
    "stable": "三年对应位置变化较小",
    "volatile": "三年对应位置波动较大",
}


def score_band(score: int) -> tuple[str, str]:
    bands = [
        (625, 750, "625_plus", "625 分及以上"),
        (590, 624, "590_624", "590—624 分"),
        (550, 589, "550_589", "550—589 分"),
        (500, 549, "500_549", "500—549 分"),
        (450, 499, "450_499", "450—499 分"),
        (344, 449, "344_449", "344—449 分"),
    ]
    for lo, hi, bid, label in bands:
        if lo <= score <= hi:
            return bid, label
    return "other", "其他"


def pct(n: int, d: int) -> float:
    return round((n / d * 100), 1) if d else 0.0


def median(values):
    vals = [v for v in values if isinstance(v, (int, float)) and math.isfinite(v)]
    return statistics.median(vals) if vals else 0.0


def esc(x):
    return html.escape(str(x or ""), quote=True)


def report_css() -> str:
    return """
:root{--bg:#f6f8f7;--card:#fff;--text:#172033;--muted:#667085;--line:#dde5e1;--primary:#155e75;--soft:#e8f3f5;--action:#c65f25;--warn:#fff7e8;--shadow:0 16px 42px rgba(23,32,51,.07)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:linear-gradient(180deg,#f8faf9,var(--bg));color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.72}.wrap{max-width:1160px;margin:auto;padding:26px 16px 72px}.hero,.section{background:rgba(255,255,255,.96);border:1px solid var(--line);border-radius:26px;box-shadow:var(--shadow)}.hero{padding:34px;margin-bottom:16px;background:linear-gradient(135deg,#fff,var(--soft))}.eyebrow{display:inline-flex;padding:6px 11px;border-radius:999px;background:var(--soft);color:var(--primary);font-weight:900;font-size:13px}h1{font-size:clamp(30px,4vw,48px);line-height:1.12;margin:14px 0 10px;letter-spacing:-.04em}.lead{font-size:17px;color:var(--muted);max-width:960px}.boundary{margin-top:16px;padding:14px 16px;border:1px solid #efd5b7;border-left:5px solid var(--action);border-radius:16px;background:var(--warn);color:#60410f}.nav{position:sticky;top:0;z-index:4;display:flex;gap:8px;overflow:auto;padding:10px;margin:0 0 16px;border:1px solid var(--line);border-radius:18px;background:rgba(246,248,247,.94);backdrop-filter:blur(12px)}.nav a{flex:none;padding:8px 12px;border-radius:999px;background:#fff;border:1px solid var(--line);color:var(--primary);text-decoration:none;font-size:13px;font-weight:850}.section{padding:26px;margin:16px 0;scroll-margin-top:78px}.section h2{margin:0 0 8px;font-size:clamp(22px,2.6vw,31px);line-height:1.25}.section h3{margin:22px 0 8px;font-size:19px}.muted{color:var(--muted)}.metrics,.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.metric,.card{border:1px solid var(--line);border-radius:18px;background:#fff;padding:16px}.metric strong{display:block;font-size:28px;line-height:1.1}.metric span{display:block;margin-top:6px;color:var(--muted);font-size:13px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.card h3{margin:0 0 8px}.tag{display:inline-flex;padding:4px 8px;border-radius:999px;background:var(--soft);color:var(--primary);font-size:12px;font-weight:900}.table-wrap{overflow:auto}table{width:100%;border-collapse:separate;border-spacing:0 7px;font-size:13px}th{text-align:left;color:var(--muted);padding:5px 9px}td{padding:9px;background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);vertical-align:top}td:first-child{border-left:1px solid var(--line);border-radius:12px 0 0 12px;font-weight:850}td:last-child{border-right:1px solid var(--line);border-radius:0 12px 12px 0}.forward{color:#155e75;font-weight:900}.backward{color:#a94f1e;font-weight:900}.footer{text-align:center;color:var(--muted);font-size:12px;margin-top:24px}.cta{display:inline-flex;margin-top:12px;padding:11px 16px;border-radius:14px;background:var(--primary);color:#fff;text-decoration:none;font-weight:900}
@media(max-width:760px){.wrap{padding:12px 10px 48px}.hero,.section{border-radius:20px;padding:19px 15px}.metrics{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.nav{border-radius:14px}.table-wrap table{min-width:720px}}
@media print{.nav{display:none}.wrap{max-width:none}.hero,.section{box-shadow:none;break-inside:avoid}}
"""


def build_report_html(title: str, subtitle: str, version: str, nav_items: list[tuple[str, str]], sections: list[str], boundary: str) -> str:
    nav = "".join(f'<a href="#{esc(i)}">{esc(t)}</a>' for i, t in nav_items)
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f6f8f7"><title>{esc(title)}</title><style>{report_css()}</style></head><body><div class="wrap"><header class="hero"><span class="eyebrow">辽宁物理类 · 2024—2026 三年数据</span><h1>{esc(title)}</h1><p class="lead">{esc(subtitle)}</p><div class="boundary">{esc(boundary)}</div></header><nav class="nav" aria-label="报告目录">{nav}</nav>{''.join(sections)}<footer class="footer">版本：{esc(version)}｜数据底座：{esc(DATA_VERSION)}｜生成时间：{esc(GENERATED_AT[:10])}<br>本报告只解释公开投档位置变化，不代表报名人数、专业价值、就业质量或 2027 录取结果。</footer></div></body></html>'''


def section_html(sid: str, title: str, body: str) -> str:
    return f'<section id="{esc(sid)}" class="section"><h2>{esc(title)}</h2>{body}</section>'


def load_rank_population_from_module(year: int, score: int) -> int:
    """Read cumulative rank at a score from the canonical yearly JS module."""
    module = ROOT / f"functions/_lib/ln-{year}-physics-score-rank.js"
    text = module.read_text(encoding="utf-8")
    rows = []
    rows_match = re.search(r"const ROWS=(\[.*?\]);", text, re.S)
    if rows_match:
        rows = json.loads(rows_match.group(1))
    else:
        raw_match = re.search(r"const RAW_ROWS = `([\s\S]*?)`;", text)
        if raw_match:
            for line in raw_match.group(1).strip().splitlines():
                parts = [part.strip() for part in line.split(',')]
                if len(parts) == 3 and all(re.fullmatch(r"\d+", part) for part in parts):
                    rows.append([int(parts[0]), int(parts[1]), int(parts[2])])
    for row in rows:
        if int(row[0]) == int(score):
            return int(row[2])
    raise RuntimeError(f"rank population missing: {year} score {score}")


def build_all():
    admission_bytes = download_bytes(ADMISSION_XLSX_URL, min_size=100_000)
    admission = parse_admission_xlsx(admission_bytes)
    raw2026 = admission["records"]
    old = load_old_records()

    with tempfile.TemporaryDirectory() as td:
        pdf = Path(td) / "rank2026.pdf"
        source_url = download_rank_pdf(pdf)
        rank_map, count_map = parse_rank_pdf(pdf)
        pdf_sha = sha256_file(pdf)

    old_by_school = defaultdict(list)
    old_index = defaultdict(list)
    for r in old:
        sn = norm(r.get("school"))
        mn = norm(r.get("major"))
        sig = project_signature(r.get("major"))
        old_by_school[sn].append(r)
        old_index[(sn, mn, sig)].append(r)
    school_profiles = {k: majority_profile(v) for k, v in old_by_school.items()}

    enriched = []
    match_stats = Counter()
    collisions = []
    unmatched = []
    for src in raw2026:
        school = src["school"]
        major = src["major"]
        sn, mn = norm(school), norm(major)
        sig = project_signature(major)
        candidates = old_index.get((sn, mn, sig), [])
        match = None
        level = "unmatched"
        if len(candidates) == 1:
            match = candidates[0]
            level = "exact"
        elif len(candidates) > 1:
            same_code = [x for x in candidates if str(x.get("majorCode2025") or "") == str(src.get("majorCode2026") or "")]
            if len(same_code) == 1:
                match = same_code[0]
                level = "exact_code"
            else:
                collisions.append({"school": school, "major": major, "candidateCount": len(candidates)})
                level = "ambiguous"
        else:
            unmatched.append({"school": school, "major": major, "schoolCode2026": src["schoolCode2026"], "majorCode2026": src["majorCode2026"]})
        match_stats[level] += 1

        rr = rank_row(rank_map, count_map, int(src["score2026"]))
        profile = school_profiles.get(sn, {})
        sp = special_project(major)
        did, dlabel = direction_of(major)
        rec = {
            **src,
            **profile,
            "dataYear": 2026,
            "primaryYear": 2026,
            "score": src["score2026"],
            "rank": rr["rank"],
            "rank2026": rr["rank"],
            "rankStart2026": rr["rankStart"],
            "rankEnd2026": rr["rankEnd"],
            "sameCount2026": rr["sameCount"],
            "score2025": match.get("score2025") if match else None,
            "rank2025": match.get("rank2025") if match else None,
            "score2024": match.get("score2024") if match else None,
            "rank2024": match.get("rank2024") if match else None,
            "historyMatchLevel": level,
            "projectSignature": sig,
            "specialProject": sp,
            "majorDirectionId": did,
            "majorDirectionLabel": dlabel,
            "sourceType": "辽宁2026普通类本科批物理类专业投档最低分",
            "sourceYear": 2026,
            "historyYears": {
                "2026": {"score": src["score2026"], "rank": rr["rank"], "rankStart": rr["rankStart"], "rankEnd": rr["rankEnd"]},
                "2025": {"score": match.get("score2025") if match else None, "rank": match.get("rank2025") if match else None},
                "2024": {"score": match.get("score2024") if match else None, "rank": match.get("rank2024") if match else None},
            },
            "riskFlags": list(dict.fromkeys((match.get("riskFlags") if match else []) or []))[:6],
        }
        enriched.append(rec)

    # Chunk by 2026 cumulative rank.
    chunk_defs = [
        ("rank_00000_10000", 0, 10000),
        ("rank_10000_20000", 10000, 20000),
        ("rank_20000_30000", 20000, 30000),
        ("rank_30000_50000", 30000, 50000),
        ("rank_50000_80000", 50000, 80000),
        ("rank_80000_plus", 80000, 10**9),
    ]
    manifest_chunks = []
    data_dir = ROOT / "fenxi/data/ln-rank-2026"
    for cid, lo, hi in chunk_defs:
        rows = [r for r in enriched if r["rank2026"] is not None and lo <= r["rank2026"] < hi]
        rows.sort(key=lambda r: (r["rank2026"], -r["score2026"], r["school"], r["major"]))
        path = data_dir / "chunks" / f"{cid}.json"
        dump_json(path, {"records": rows})
        manifest_chunks.append({
            "id": cid,
            "file": f"data/ln-rank-2026/chunks/{cid}.json",
            "minRank": lo,
            "maxRank": hi,
            "recordCount": len(rows),
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
            "minScore": min((r["score2026"] for r in rows), default=None),
            "maxScore": max((r["score2026"] for r in rows), default=None),
        })

    manifest = {
        "version": "ln-rank-2026-manifest-v1.0.0",
        "productVersion": VERSION,
        "generatedAt": GENERATED_AT,
        "dataYear": 2026,
        "audienceYear": 2027,
        "totalRecords": len(enriched),
        "schoolCount": len({r["school"] for r in enriched}),
        "scoreMin": min(r["score2026"] for r in enriched),
        "scoreMax": max(r["score2026"] for r in enriched),
        "historyMatch": dict(match_stats),
        "chunks": manifest_chunks,
        "entryFiles": {"rank": "data/rank_2026_physics.json", "schoolNature": "data/school_nature.json"},
        "source": {"admissionSha256": admission.get("sourceSha256"), "rankPdfUrl": source_url, "rankPdfSha256": pdf_sha},
    }
    dump_json(data_dir / "manifest.json", manifest, pretty=True)
    dump_json(data_dir / "source-meta.json", manifest["source"], pretty=True)
    dump_json(data_dir / "audit/import-summary.json", {
        "recordCount": len(enriched), "schoolCount": len({r["school"] for r in enriched}), "scoreMin": min(r["score2026"] for r in enriched), "scoreMax": max(r["score2026"] for r in enriched), "matchStats": dict(match_stats), "generatedAt": GENERATED_AT
    }, pretty=True)
    dump_json(data_dir / "audit/history-match-collisions.json", collisions, pretty=True)
    dump_json(data_dir / "audit/history-unmatched-2026.json", unmatched, pretty=True)

    rank_json = {str(s): rank_map[s] for s in sorted(rank_map, reverse=True) if 150 <= s <= max(rank_map)}
    dump_json(ROOT / "fenxi/data/rank_2026_physics.json", rank_json, pretty=True)
    rows_js = [[s, count_map.get(s, 0), rank_map[s]] for s in sorted(rank_map, reverse=True) if 150 <= s <= max(rank_map)]
    js = f'''// Generated from the official Liaoning 2026 physics score statistics PDF.\nexport const LN_2026_PHYSICS_SCORE_RANK_META={json.dumps({"year":2026,"region":"辽宁","subject":"物理类","sourceUrl":source_url,"sourceSha256":pdf_sha,"generatedAt":GENERATED_AT,"topScore":max(rank_map),"bottomScore":150,"totalAt150":rank_map[150]},ensure_ascii=False,separators=(",",":"))};\nconst ROWS={json.dumps(rows_js,ensure_ascii=False,separators=(",",":"))};\nconst MAP=new Map(ROWS.map(([score,same,cumulative])=>[score,{{score,sameCount:same,cumulative,rankStart:same?cumulative-same+1:cumulative,rankEnd:cumulative,rankForGap:cumulative}}]));\nexport function lookupLn2026PhysicsScore(score){{const n=Math.round(Number(score));if(!Number.isFinite(n))return null;if(MAP.has(n))return MAP.get(n);const higher=[...MAP.keys()].filter(x=>x>n).sort((a,b)=>a-b)[0];if(higher!=null){{const r=MAP.get(higher);return{{score:n,sameCount:0,cumulative:r.cumulative,rankStart:r.cumulative,rankEnd:r.cumulative,rankForGap:r.cumulative,emptyScore:true}}}}return null}}\nexport function lookupLn2026PhysicsRank(rank){{const n=Math.round(Number(rank));if(!Number.isFinite(n)||n<1)return null;for(const row of ROWS){{const r=MAP.get(row[0]);if(n<=r.rankEnd)return r}}return MAP.get(150)||null}}\nexport function getLn2026PhysicsRows(){{return ROWS.map(([score,sameCount,cumulative])=>({{score,sameCount,cumulative,rankStart:sameCount?cumulative-sameCount+1:cumulative,rankEnd:cumulative,rankForGap:cumulative}}))}}\n'''
    (ROOT / "functions/_lib/ln-2026-physics-score-rank.js").write_text(js, encoding="utf-8")

    # Three-year canonical comparison.
    # One cross-year population definition: official cumulative position at
    # each year's undergraduate control line. Admission-record maximum rank is
    # never a population source.
    total2024 = load_rank_population_from_module(2024, 368)
    total2025 = load_rank_population_from_module(2025, 367)
    total2026 = rank_map[344]
    complete = []
    abs_changes = []
    for r in enriched:
        if r["historyMatchLevel"] not in ("exact", "exact_code"):
            continue
        if r["specialProject"]["hasSpecialProject"]:
            continue
        if not all(r.get(k) for k in ("rank2026", "rank2025", "rank2024")):
            continue
        p24 = r["rank2024"] / total2024
        p25 = r["rank2025"] / total2025
        p26 = r["rank2026"] / total2026
        d1, d2 = p25 - p24, p26 - p25
        abs_changes.extend([abs(d1), abs(d2)])
        complete.append({**r, "rankPct2024": p24, "rankPct2025": p25, "rankPct2026": p26, "change25vs24": d1, "change26vs25": d2, "change26vs24": p26 - p24})
    if len(complete) < 1000:
        raise RuntimeError(f"three-year strict sample unexpectedly small: {len(complete)}")
    abs_changes_sorted = sorted(abs_changes)
    q25 = abs_changes_sorted[int(len(abs_changes_sorted) * .25)]
    threshold = max(.001, min(.004, q25))
    for r in complete:
        r["trendType"] = classify_trend(r["change25vs24"], r["change26vs25"], threshold)
        r["trendLabel"] = TREND_LABELS[r["trendType"]]
        r["rankDelta26vs25"] = int(r["rank2026"] - r["rank2025"])
        r["rankDelta25vs24"] = int(r["rank2025"] - r["rank2024"])
        r["rankPctPoint26vs25"] = round(r["change26vs25"] * 100, 3)
        r["rankPctPoint25vs24"] = round(r["change25vs24"] * 100, 3)
        r["scoreBandId"], r["scoreBandLabel"] = score_band(r["score2026"])

    trend_counts = Counter(r["trendType"] for r in complete)
    by_direction = defaultdict(list)
    by_band = defaultdict(list)
    by_school = defaultdict(list)
    for r in complete:
        by_direction[r["majorDirectionLabel"]].append(r)
        by_band[r["scoreBandLabel"]].append(r)
        if r.get("lnArea") == "省内" or r.get("schoolProvince") == "辽宁":
            by_school[r["school"]].append(r)

    def agg(rows):
        c = Counter(r["trendType"] for r in rows)
        return {
            "sampleCount": len(rows),
            "continuousForward": c["continuous_forward"],
            "continuousBackward": c["continuous_backward"],
            "rebound2026": c["rebound_2026"],
            "pullback2026": c["pullback_2026"],
            "latestForward": c["latest_forward"],
            "latestBackward": c["latest_backward"],
            "stable": c["stable"],
            "medianPctPoint26vs25": round(median([r["change26vs25"] * 100 for r in rows]), 3),
            "medianRankDelta26vs25": round(median([r["rankDelta26vs25"] for r in rows])),
            "forwardRate2026": pct(sum(1 for r in rows if r["change26vs25"] < -threshold), len(rows)),
            "backwardRate2026": pct(sum(1 for r in rows if r["change26vs25"] > threshold), len(rows)),
        }

    direction_summary = [{"direction": k, **agg(v)} for k, v in by_direction.items() if len(v) >= 15]
    direction_summary.sort(key=lambda x: (x["medianPctPoint26vs25"], -x["sampleCount"]))
    band_order = ["625 分及以上", "590—624 分", "550—589 分", "500—549 分", "450—499 分", "344—449 分"]
    band_summary = []
    for label in band_order:
        rows = by_band.get(label, [])
        dirs = defaultdict(list)
        for r in rows:
            dirs[r["majorDirectionLabel"]].append(r)
        dsum = [{"direction": k, **agg(v)} for k, v in dirs.items() if len(v) >= 10]
        dsum.sort(key=lambda x: (x["medianPctPoint26vs25"], -x["sampleCount"]))
        band_summary.append({"label": label, **agg(rows), "directions": dsum})
    school_summary = [{"school": k, **agg(v)} for k, v in by_school.items() if len(v) >= 8]
    school_summary.sort(key=lambda x: (x["medianPctPoint26vs25"], -x["sampleCount"]))

    examples = sorted(complete, key=lambda r: abs(r["change26vs25"]), reverse=True)[:100]
    canonical_compact = [{
        "id": r["id"], "school": r["school"], "major": r["major"], "score2026": r["score2026"], "rank2026": r["rank2026"], "score2025": r["score2025"], "rank2025": r["rank2025"], "score2024": r["score2024"], "rank2024": r["rank2024"], "trendType": r["trendType"], "trendLabel": r["trendLabel"], "rankDelta26vs25": r["rankDelta26vs25"], "rankDelta25vs24": r["rankDelta25vs24"], "rankPctPoint26vs25": r["rankPctPoint26vs25"], "majorDirectionLabel": r["majorDirectionLabel"], "scoreBandLabel": r["scoreBandLabel"]
    } for r in complete]

    analysis_dir = ROOT / "analysis/2026"
    policy = {
        "version": DATA_VERSION,
        "generatedAt": GENERATED_AT,
        "primaryYear": 2026,
        "historyYears": [2025, 2024],
        "rankComparison": "累计位次比例",
        "neutralThresholdPctPoint": round(threshold * 100, 3),
        "thresholdMethod": "严格可比普通项目两次年度变化绝对值的第一四分位，限制在0.10—0.40个百分点",
        "minimumAggregateSample": 15,
        "strictMatchOnly": True,
        "specialProjectsExcludedFromMainTrend": True,
        "candidateTotals": {"2024": total2024, "2025": total2025, "2026": total2026},
    }
    dump_json(analysis_dir / "comparison-policy.json", policy, pretty=True)
    dump_json(analysis_dir / "canonical-three-year-records.json", {"version": DATA_VERSION, "records": canonical_compact})
    overall = {"version": DATA_VERSION, "generatedAt": GENERATED_AT, "strictCompleteCount": len(complete), "trendCounts": dict(trend_counts), "directionSummary": direction_summary, "schoolSummary": school_summary, "examples": [{k: r[k] for k in ("id", "school", "major", "score2026", "rank2026", "score2025", "rank2025", "score2024", "rank2024", "trendType", "trendLabel", "rankDelta26vs25", "rankDelta25vs24", "rankPctPoint26vs25", "majorDirectionLabel")} for r in examples]}
    dump_json(analysis_dir / "overall-summary.json", overall, pretty=True)
    dump_json(analysis_dir / "score-band-summary.json", {"version": DATA_VERSION, "bands": band_summary}, pretty=True)
    dump_json(analysis_dir / "local-school-summary.json", {"version": DATA_VERSION, "schools": school_summary}, pretty=True)

    trend_data = {
        "version": "major-trend-2026-v1.0.0",
        "productVersion": VERSION,
        "province": "辽宁",
        "subject": "物理类",
        "batch": "本科批",
        "baseYears": [2024, 2025, 2026],
        "compareScope": "2024—2026三年均有的同校同专业普通项目",
        "policy": policy,
        "summary": {"strictCompleteCount": len(complete), "trendCounts": dict(trend_counts)},
        "directions": direction_summary,
        "segments": band_summary,
        "disclaimer": "投档位置变化不代表报名人数、就业质量、专业价值或2027录取结果；正式填报以当年一分一段、招生计划和院校章程为准。",
    }
    dump_json(ROOT / "ln-rank/data/major-trend-2026.json", trend_data, pretty=True)
    kb_js = "export const MAJOR_TREND_2026_KB=" + json.dumps(trend_data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "functions/_lib/kb/major-trend-2026.generated.js").write_text(kb_js, encoding="utf-8")

    # Annual report HTML.
    metrics = f'''<div class="metrics"><div class="metric"><strong>{len(enriched):,}</strong><span>2026 专业投档记录</span></div><div class="metric"><strong>{len(complete):,}</strong><span>三年严格可比普通项目</span></div><div class="metric"><strong>{len({r['school'] for r in enriched}):,}</strong><span>2026 招生院校</span></div><div class="metric"><strong>{threshold*100:.2f}</strong><span>中性阈值（百分点）</span></div></div>'''
    trend_cards = "".join(f'<div class="card"><span class="tag">{esc(TREND_LABELS.get(k,k))}</span><h3>{v:,} 条</h3><p class="muted">占严格可比样本 {pct(v,len(complete))}%</p></div>' for k, v in trend_counts.most_common())
    top_dir_rows = "".join(f'<tr><td>{esc(x["direction"])}</td><td>{x["sampleCount"]}</td><td class="{("forward" if x["medianPctPoint26vs25"]<0 else "backward")}">{x["medianPctPoint26vs25"]:+.3f} 个百分点</td><td>{x["forwardRate2026"]}% / {x["backwardRate2026"]}%</td></tr>' for x in direction_summary)
    top_school_rows = "".join(f'<tr><td>{esc(x["school"])}</td><td>{x["sampleCount"]}</td><td class="{("forward" if x["medianPctPoint26vs25"]<0 else "backward")}">{x["medianPctPoint26vs25"]:+.3f} 个百分点</td><td>{x["forwardRate2026"]}% / {x["backwardRate2026"]}%</td></tr>' for x in school_summary[:30])
    example_rows = "".join(f'<tr><td>{esc(r["school"])}</td><td>{esc(r["major"])}</td><td>{r["score2026"]} / {r["rank2026"]:,}</td><td>{r["score2025"]} / {r["rank2025"]:,}</td><td>{r["score2024"]} / {r["rank2024"]:,}</td><td>{esc(r["trendLabel"])}</td></tr>' for r in examples[:30])
    annual_sections = [
        section_html("scope", "01 数据范围与边界", metrics + '<p class="muted">只将学校、专业名称和项目属性严格一致的记录用于三年趋势。中外合作、预科、专项、试验班等不进入普通项目主趋势。</p>'),
        section_html("overview", "02 三年先看结构", f'<div class="grid">{trend_cards}</div><p class="muted">这里展示的是投档位置变化形态，不把前移解释为专业更好，也不把后移解释为可以捡漏。</p>'),
        section_html("method", "03 三年比较方法", '<p>每年先把专业投档最低分映射成对应累计位次，再除以当年物理类统计表累计人数，形成可跨年比较的位置比例。分别计算 2024→2025 和 2025→2026 两次变化，最后区分连续、反转、最新变化和基本稳定。</p>'),
        section_html("latest", "04 2026 相对 2025 的最新变化", f'<div class="table-wrap"><table><thead><tr><th>专业方向</th><th>样本</th><th>中位位置比例变化</th><th>前移 / 后移比例</th></tr></thead><tbody>{top_dir_rows}</tbody></table></div>'),
        section_html("continuous", "05 连续变化与反转", '<p>连续前移说明三年中的两次年度变化方向一致；连续后移同理。反弹或回落说明 2026 与上一年度方向相反，不能把单一年份直接延长成未来趋势。</p>'),
        section_html("national", "06 全国高校在辽宁招生的专业方向", f'<div class="table-wrap"><table><thead><tr><th>方向</th><th>三年样本</th><th>2026中位变化</th><th>前移 / 后移</th></tr></thead><tbody>{top_dir_rows}</tbody></table></div>'),
        section_html("local", "07 辽宁省内学校整体观察", f'<div class="table-wrap"><table><thead><tr><th>学校</th><th>可比普通项目</th><th>2026中位变化</th><th>前移 / 后移</th></tr></thead><tbody>{top_school_rows}</tbody></table></div><p class="muted">学校整体使用校内可比专业的中位变化，不代表校内所有专业同步变化。</p>'),
        section_html("bands", "08 各分数段结构", ''.join(f'<div class="card"><h3>{esc(b["label"])}</h3><p>严格可比 {b["sampleCount"]} 条；2026 前移 {b["forwardRate2026"]}%、后移 {b["backwardRate2026"]}%；中位变化 {b["medianPctPoint26vs25"]:+.3f} 个百分点。</p></div>' for b in band_summary)),
        section_html("samples", "09 代表性项目核对", f'<div class="table-wrap"><table><thead><tr><th>学校</th><th>专业</th><th>2026分/位次</th><th>2025分/位次</th><th>2024分/位次</th><th>三年状态</th></tr></thead><tbody>{example_rows}</tbody></table></div>'),
        section_html("special", "10 特殊项目为什么单独看", '<p>中外合作、高收费、预科、专项、定向、长学制和特殊培养项目的资格、学费、校区及培养方式不同。它们保留在查询数据中，但不混入普通项目主趋势。</p>'),
        section_html("family", "11 家长如何使用", '<p>先用孩子的模考或预估分数在专业初选工具中查看 2026 投档位置附近的专业，再确认地区、学费、校区、体检和项目资格。三年趋势只放在这些硬条件之后，用来解释 2026 是延续、反转还是波动。</p><a class="cta" href="/ln-rank/">进入辽宁专业初选工具</a>'),
    ]
    annual_nav = [(x, t) for x, t in [("scope","数据范围"),("overview","结构总览"),("method","比较方法"),("latest","最新变化"),("local","省内学校"),("bands","分数段"),("family","家长使用")]]
    annual_html = build_report_html("辽宁物理类 2026 报考观察", "基于 2024、2025、2026 三年专业投档记录和对应位次，对连续变化、最新变化、反转与波动进行可复核观察。", ANNUAL_VERSION, annual_nav, annual_sections, "这不是热门专业榜，也不是就业价值排名。投档位置前移或后移只说明历史选择结果发生变化，不能单独用于决定孩子的专业。")
    (ROOT / "ln2026.html").write_text(annual_html, encoding="utf-8")

    heat_sections = [section_html("method", "热度口径", '<p>本页中的“热度”只指同校同专业普通项目对应投档位置的三年变化。它不等于报名人数、搜索量、就业热度或专业质量。</p>')]
    for idx, b in enumerate(band_summary, 1):
        rows = "".join(f'<tr><td>{esc(x["direction"])}</td><td>{x["sampleCount"]}</td><td>{x["continuousForward"]}</td><td>{x["continuousBackward"]}</td><td>{x["rebound2026"] + x["pullback2026"]}</td><td class="{("forward" if x["medianPctPoint26vs25"]<0 else "backward")}">{x["medianPctPoint26vs25"]:+.3f}</td></tr>' for x in b["directions"])
        body = f'<div class="metrics"><div class="metric"><strong>{b["sampleCount"]}</strong><span>三年严格可比项目</span></div><div class="metric"><strong>{b["forwardRate2026"]}%</strong><span>2026位置前移</span></div><div class="metric"><strong>{b["backwardRate2026"]}%</strong><span>2026位置后移</span></div><div class="metric"><strong>{b["medianPctPoint26vs25"]:+.3f}</strong><span>中位变化百分点</span></div></div><div class="table-wrap"><table><thead><tr><th>专业方向</th><th>样本</th><th>连续前移</th><th>连续后移</th><th>2026反转</th><th>2026中位变化</th></tr></thead><tbody>{rows}</tbody></table></div>'
        heat_sections.append(section_html(f"band{idx}", b["label"], body))
    heat_sections.append(section_html("use", "怎么和孩子的方案结合", '<p>分数段报告先帮助家庭了解结构，但不能直接生成孩子的推荐。真正的优先讨论方案仍然要先通过选科、地区、学费、校区、体检和项目资格，再看 2026 位置与三年变化。</p><a class="cta" href="/ln-rank/">按孩子参考分数查看专业</a>'))
    heat_nav = [("method","热度口径")] + [(f"band{i+1}", b["label"]) for i,b in enumerate(band_summary)] + [("use","结合孩子方案")]
    heat_html = build_report_html("辽宁物理类 2026 分数段专业热度观察", "按 2026 投档分所在区间，结合 2024—2026 三年位次变化，观察各专业方向是连续变化、最新变化还是单年反转。", HEAT_VERSION, heat_nav, heat_sections, "“热度”仅指历史投档位置变化。页面不会把前移写成专业更好，也不会把后移写成稳录或捡漏。")
    (ROOT / "lngk2026.html").write_text(heat_html, encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "version": VERSION,
        "records2026": len(enriched),
        "strictThreeYear": len(complete),
        "rankAnchors": {str(k): rank_map[k] for k in RANK_ANCHORS},
        "historyMatch": dict(match_stats),
        "thresholdPctPoint": round(threshold * 100, 3),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        build_all()
    except Exception as exc:
        print(f"BUILD FAILED: {exc}", file=sys.stderr)
        raise
