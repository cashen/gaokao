#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import urllib.request
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE_PAGE = "https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2024062510394164694/index.shtml"
IMAGE_URLS = [
    "https://jyt.ln.gov.cn/jyt/imageDir/2024/06/img_pc_site/2024062510272296122.jpg",
    "https://jyt.ln.gov.cn/jyt/imageDir/2024/06/img_pc_site/2024062510272259656.jpg",
    "https://jyt.ln.gov.cn/jyt/imageDir/2024/06/img_pc_site/2024062510272212732.jpg",
    "https://jyt.ln.gov.cn/jyt/imageDir/2024/06/img_pc_site/2024062510272389940.jpg",
]
EXPECTED_RANGES = [
    [(708, 671), (670, 633), (632, 595), (594, 557)],
    [(556, 519), (518, 481), (480, 443), (442, 405)],
    [(404, 367), (366, 329), (328, 291), (290, 253)],
    [(252, 215), (214, 177), (176, 150)],
]
ANCHORS = {
    708: 11,
    700: 65,
    650: 3561,
    600: 14612,
    599: 14879,
    592: 16928,
    556: 29170,
    515: 46174,
    480: 62571,
    442: 81351,
    404: 100014,
    368: 116198,
    367: 116629,
    344: 125617,
    300: 138675,
    252: 146385,
    150: 149645,
}
MAX_SAME_SCORE_COUNT = 1800
DEBUG_DIR = Path(os.environ.get("LN_2024_DEBUG_DIR", "/tmp/ln-2024-rank-debug"))


def fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 ln-rank-authoritative-resource-builder/1.0",
            "Referer": SOURCE_PAGE,
        },
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read()
    if len(data) < 50_000:
        raise RuntimeError(f"official image too small: {url} ({len(data)} bytes)")
    return data


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def crop_blocks(image: Image.Image, block_count: int) -> list[Image.Image]:
    width, height = image.size
    left = round(width * 0.058)
    right = round(width * (0.955 if block_count == 4 else 0.735))
    top = round(height * 0.087)
    bottom = round(height * 0.952)
    usable = right - left
    block_width = usable / block_count
    return [
        image.crop((
            round(left + block_width * index + 1),
            top,
            round(left + block_width * (index + 1) - 1),
            bottom,
        ))
        for index in range(block_count)
    ]


def prepare_cell(cell: Image.Image, threshold: int, scale: int = 7) -> Image.Image:
    gray = ImageOps.grayscale(cell)
    gray = ImageOps.autocontrast(gray, cutoff=1)
    gray = ImageEnhance.Contrast(gray).enhance(2.5)
    gray = gray.filter(ImageFilter.SHARPEN)
    gray = gray.resize((max(1, gray.width * scale), max(1, gray.height * scale)))
    return gray.point(lambda value: 0 if value < threshold else 255, mode="1")


def run_tesseract(image: Image.Image, target: Path, psm: int) -> str:
    image.save(target)
    result = subprocess.run(
        [
            "tesseract",
            str(target),
            "stdout",
            "--psm",
            str(psm),
            "-l",
            "eng",
            "-c",
            "tessedit_char_whitelist=0123456789,",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def numeric_candidates(text: str) -> list[int]:
    out = []
    for token in re.findall(r"\d[\d,]*", text or ""):
        digits = re.sub(r"\D", "", token)
        if digits:
            out.append(int(digits))
    return out


def cell_box(block: Image.Image, row_index: int, row_count: int, x_start: float, x_end: float) -> Image.Image:
    width, height = block.size
    # The official images are stable 38-row table columns. The source crop starts
    # at the first data row and ends immediately after the final row.
    row_height = height / row_count
    y0 = round(row_index * row_height + max(1.0, row_height * 0.10))
    y1 = round((row_index + 1) * row_height - max(1.0, row_height * 0.10))
    x0 = round(width * x_start)
    x1 = round(width * x_end)
    return block.crop((x0, y0, x1, y1))


def read_cumulative(
    block: Image.Image,
    row_index: int,
    row_count: int,
    score: int,
    previous: int,
    temp: Path,
    debug_prefix: str,
) -> tuple[int, list[dict]]:
    attempts = []
    if score in ANCHORS:
        return ANCHORS[score], [{"source": "authoritative-anchor", "value": ANCHORS[score]}]

    crop_variants = [
        (0.655, 0.985),
        (0.620, 0.985),
        (0.690, 0.995),
        (0.590, 0.970),
    ]
    candidates = set()
    for crop_index, (x_start, x_end) in enumerate(crop_variants):
        cell = cell_box(block, row_index, row_count, x_start, x_end)
        if crop_index == 0:
            cell.save(DEBUG_DIR / f"{debug_prefix}-score-{score}-cell.jpg")
        for threshold in (145, 165, 185, 205, 220):
            for psm in (7, 8, 13):
                prepared = prepare_cell(cell, threshold)
                target = temp / f"{debug_prefix}-{score}-{crop_index}-{threshold}-{psm}.png"
                text = run_tesseract(prepared, target, psm)
                values = numeric_candidates(text)
                attempts.append({
                    "crop": [x_start, x_end],
                    "threshold": threshold,
                    "psm": psm,
                    "text": text,
                    "values": values,
                })
                candidates.update(values)
        plausible = sorted(value for value in candidates if previous <= value <= previous + MAX_SAME_SCORE_COUNT)
        if plausible:
            # Border fragments generally add leading digits and create a much
            # larger value. The smallest monotonic candidate is the clean cell.
            return plausible[0], attempts

    diagnostic = {
        "score": score,
        "previous": previous,
        "candidates": sorted(candidates),
        "attempts": attempts,
    }
    (DEBUG_DIR / f"{debug_prefix}-score-{score}-failure.json").write_text(
        json.dumps(diagnostic, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    raise RuntimeError(f"cannot read official cumulative rank for score {score}: {json.dumps(diagnostic, ensure_ascii=False)[:1800]}")


def load_historical_cross_check() -> dict[int, set[int]]:
    values: dict[int, set[int]] = defaultdict(set)
    for path in sorted((ROOT / "fenxi/data/chunks").glob("rank_*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows = payload if isinstance(payload, list) else payload.get("records", [])
        for record in rows:
            score = record.get("score2024")
            rank = record.get("rank2024")
            if score is None or rank is None:
                continue
            try:
                values[int(score)].add(int(rank))
            except (TypeError, ValueError):
                continue
    conflicts = {score: sorted(ranks) for score, ranks in values.items() if len(ranks) > 1}
    if conflicts:
        raise RuntimeError(f"historical 2024 cross-check contains conflicting ranks: {json.dumps(conflicts, ensure_ascii=False)[:1200]}")
    return values


def validate(rows: list[tuple[int, int, int]], historical: dict[int, set[int]]) -> dict:
    expected_scores = list(range(708, 149, -1))
    actual_scores = [score for score, _, _ in rows]
    if actual_scores != expected_scores:
        missing = sorted(set(expected_scores) - set(actual_scores), reverse=True)
        extra = sorted(set(actual_scores) - set(expected_scores), reverse=True)
        raise RuntimeError(f"score coverage mismatch; missing={missing[:20]}, extra={extra[:20]}")

    previous_cumulative = 0
    by_score = {}
    for score, same_count, cumulative in rows:
        if same_count < 0 or same_count > MAX_SAME_SCORE_COUNT:
            raise RuntimeError(f"same-score count out of range at {score}: {same_count}")
        if cumulative != previous_cumulative + same_count:
            raise RuntimeError(f"cumulative mismatch at {score}: {cumulative} != {previous_cumulative}+{same_count}")
        by_score[score] = cumulative
        previous_cumulative = cumulative

    anchor_errors = [
        f"{score}: {by_score.get(score)} != {rank}"
        for score, rank in ANCHORS.items()
        if by_score.get(score) != rank
    ]
    if anchor_errors:
        raise RuntimeError("official anchor mismatch: " + "; ".join(anchor_errors))

    checked_records = 0
    checked_scores = 0
    cross_errors = []
    for score, ranks in historical.items():
        if score not in by_score:
            continue
        expected = next(iter(ranks))
        checked_scores += 1
        checked_records += 1
        if by_score[score] != expected:
            cross_errors.append({"score": score, "generated": by_score[score], "historical": expected})
    if cross_errors:
        (DEBUG_DIR / "historical-cross-check-conflicts.json").write_text(
            json.dumps(cross_errors, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        raise RuntimeError(f"2024 official table conflicts with historical derived records: {json.dumps(cross_errors[:30], ensure_ascii=False)}")
    return {"checkedScores": checked_scores, "checkedRecords": checked_records, "conflictCount": 0}


def render_module(rows: list[tuple[int, int, int]], image_meta: list[dict]) -> str:
    meta = {
        "region": "ln",
        "subject": "physics",
        "year": 2024,
        "tableName": "2024年辽宁省普通高校招生考试成绩统计表（物理学科类）",
        "sourceName": "辽宁招生考试之窗（辽宁省教育厅转载）",
        "sourcePage": SOURCE_PAGE,
        "sourceImages": image_meta,
        "rankingPolicy": "同分内部顺序未展开；前台展示同分位次区间，算法统一使用同分末位累计人数。",
        "topScore": rows[0][0],
        "bottomScore": rows[-1][0],
        "totalAt150": rows[-1][2],
        "undergraduateControlScore": 368,
        "undergraduateControlRank": next(cumulative for score, _, cumulative in rows if score == 368),
    }
    rows_json = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    meta_json = json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
    return f'''// Generated from the authoritative Liaoning 2024 physics score statistics images.\n// Do not edit rows manually; rebuild with tools/ln-2026/build-ln-2024-rank-table.py.\nexport const LN_2024_PHYSICS_SCORE_RANK_META={meta_json};\nconst ROWS={rows_json};\nconst MAP=new Map(ROWS.map(([score,sameCount,cumulative])=>[score,{{score,sameCount,cumulative,previousCumulative:Math.max(0,cumulative-sameCount),rankStart:sameCount?cumulative-sameCount+1:cumulative,rankEnd:cumulative,rankForGap:cumulative}}]));\nfunction toNumber(value){{const n=Number(String(value==null?'':value).replace(/[^0-9.]/g,''));return Number.isFinite(n)?Math.round(n):null}}\nfunction result(row,inputScore){{if(!row)return null;return{{...LN_2024_PHYSICS_SCORE_RANK_META,...row,inputScore:Number(inputScore),scoreLabel:row.score===708&&Number(inputScore)>=708?'708及以上':String(row.score),found:true,topBucket:row.score===708&&Number(inputScore)>=708}}}}\nexport function lookupLn2024PhysicsRank(score){{const n=toNumber(score);if(n==null)return null;if(n>=708)return result(MAP.get(708),n);if(MAP.has(n))return result(MAP.get(n),n);const higher=ROWS.map(row=>row[0]).filter(value=>value>n).sort((a,b)=>a-b)[0];return higher==null?null:result({{...MAP.get(higher),score:n,sameCount:0,rankStart:MAP.get(higher).rankEnd,rankEnd:MAP.get(higher).rankEnd,rankForGap:MAP.get(higher).rankEnd,emptyScore:true}},n)}}\nexport function findLn2024PhysicsScoreByRank(rank){{const n=toNumber(rank);if(n==null||n<1)return null;const tuple=ROWS.find(([, , cumulative])=>n<=cumulative);return tuple?result(MAP.get(tuple[0]),tuple[0]):null}}\nexport function getLn2024PhysicsRankRows(){{return ROWS.map(([score,sameCount,cumulative])=>({{score,sameCount,cumulative,previousCumulative:Math.max(0,cumulative-sameCount),rankStart:sameCount?cumulative-sameCount+1:cumulative,rankEnd:cumulative,rankForGap:cumulative}}))}}\n'''


def main() -> None:
    if DEBUG_DIR.exists():
        shutil.rmtree(DEBUG_DIR)
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    all_cumulative: list[tuple[int, int]] = []
    image_meta: list[dict] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        previous = 0
        for page_index, (url, ranges) in enumerate(zip(IMAGE_URLS, EXPECTED_RANGES), start=1):
            data = fetch(url)
            image_path = DEBUG_DIR / f"official-page-{page_index}.jpg"
            image_path.write_bytes(data)
            image = Image.open(image_path).convert("RGB")
            image_meta.append({
                "page": page_index,
                "url": url,
                "sha256": sha256(data),
                "width": image.width,
                "height": image.height,
            })
            blocks = crop_blocks(image, len(ranges))
            for block_index, ((start, end), block) in enumerate(zip(ranges, blocks), start=1):
                block.save(DEBUG_DIR / f"page-{page_index}-block-{block_index}.jpg")
                scores = list(range(start, end - 1, -1))
                for row_index, score in enumerate(scores):
                    cumulative, _ = read_cumulative(
                        block,
                        row_index,
                        len(scores),
                        score,
                        previous,
                        temp,
                        f"p{page_index}-b{block_index}",
                    )
                    if cumulative < previous or cumulative - previous > MAX_SAME_SCORE_COUNT:
                        raise RuntimeError(f"non-monotonic official cumulative at {score}: {previous} -> {cumulative}")
                    all_cumulative.append((score, cumulative))
                    previous = cumulative

    all_cumulative.sort(key=lambda row: row[0], reverse=True)
    rows = []
    previous = 0
    for score, cumulative in all_cumulative:
        rows.append((score, cumulative - previous, cumulative))
        previous = cumulative

    historical = load_historical_cross_check()
    cross_check = validate(rows, historical)
    module_path = ROOT / "functions/_lib/ln-2024-physics-score-rank.js"
    module_path.write_text(render_module(rows, image_meta), encoding="utf-8")
    audit = {
        "ok": True,
        "sourcePage": SOURCE_PAGE,
        "sourceType": "authoritative-government-republication",
        "sourceImages": image_meta,
        "extractionMethod": "fixed official table cells; cumulative-only OCR; same-score count derived from cumulative difference",
        "rowCount": len(rows),
        "topScore": rows[0][0],
        "bottomScore": rows[-1][0],
        "totalAt150": rows[-1][2],
        "undergraduateControlScore": 368,
        "undergraduateControlRank": next(cumulative for score, _, cumulative in rows if score == 368),
        "anchors": ANCHORS,
        "historicalCrossCheck": cross_check,
        "module": str(module_path.relative_to(ROOT)),
    }
    audit_path = ROOT / "analysis/2026/ln-2024-rank-source-audit.json"
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
