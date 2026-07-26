#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tempfile
import urllib.request
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


def preprocess(image: Image.Image) -> Image.Image:
    image = ImageOps.grayscale(image)
    image = ImageEnhance.Contrast(image).enhance(2.2)
    image = image.filter(ImageFilter.SHARPEN)
    image = image.resize((image.width * 3, image.height * 3))
    return image.point(lambda value: 0 if value < 205 else 255, mode="1")


def crop_blocks(image: Image.Image, block_count: int) -> list[Image.Image]:
    # The official four images use one stable table geometry. Crop away title,
    # footnote and grid borders, then split the 4-column (last page 3-column)
    # layout into score/count/cumulative blocks.
    width, height = image.size
    left = round(width * 0.058)
    right = round(width * (0.955 if block_count == 4 else 0.735))
    top = round(height * 0.087)
    bottom = round(height * 0.952)
    usable = right - left
    block_width = usable / block_count
    blocks = []
    for index in range(block_count):
        x0 = round(left + block_width * index + 2)
        x1 = round(left + block_width * (index + 1) - 2)
        blocks.append(image.crop((x0, top, x1, bottom)))
    return blocks


def tesseract_text(image: Image.Image, target: Path) -> str:
    image.save(target)
    result = subprocess.run(
        [
            "tesseract",
            str(target),
            "stdout",
            "--psm",
            "6",
            "-l",
            "eng",
            "-c",
            "tessedit_char_whitelist=0123456789,",
            "-c",
            "preserve_interword_spaces=1",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def parse_block(text: str, expected_start: int, expected_end: int) -> list[tuple[int, int, int]]:
    candidates: list[tuple[int, int, int]] = []
    for raw_line in text.splitlines():
        numbers = [int(token.replace(",", "")) for token in re.findall(r"\d[\d,]*", raw_line)]
        if len(numbers) < 3:
            continue
        # OCR can retain grid-line fragments. Select the first plausible score
        # and the next two values as count/cumulative.
        for index, value in enumerate(numbers[:-2]):
            if expected_end <= value <= expected_start:
                count, cumulative = numbers[index + 1], numbers[index + 2]
                if 0 <= count <= 2000 and cumulative >= count:
                    candidates.append((value, count, cumulative))
                    break
    dedup: dict[int, tuple[int, int, int]] = {}
    for row in candidates:
        dedup.setdefault(row[0], row)
    rows = [dedup[score] for score in sorted(dedup, reverse=True)]
    if not rows:
        raise RuntimeError(f"no OCR rows for {expected_start}-{expected_end}: {text[:500]}")
    if rows[0][0] != expected_start or rows[-1][0] != expected_end:
        raise RuntimeError(
            f"OCR range mismatch {expected_start}-{expected_end}: "
            f"got {rows[0][0]}-{rows[-1][0]} ({len(rows)} rows)\n{text}"
        )
    return rows


def validate(rows: list[tuple[int, int, int]]) -> None:
    if len(rows) < 500:
        raise RuntimeError(f"too few score rows: {len(rows)}")
    seen = set()
    previous_cumulative = 0
    previous_score = 1000
    for score, same_count, cumulative in rows:
        if score in seen:
            raise RuntimeError(f"duplicate score {score}")
        seen.add(score)
        if score >= previous_score:
            raise RuntimeError(f"score order error {score} after {previous_score}")
        if cumulative != previous_cumulative + same_count:
            raise RuntimeError(
                f"cumulative mismatch at {score}: {cumulative} != "
                f"{previous_cumulative} + {same_count}"
            )
        previous_score = score
        previous_cumulative = cumulative
    by_score = {score: cumulative for score, _, cumulative in rows}
    errors = [f"{score}: {by_score.get(score)} != {rank}" for score, rank in ANCHORS.items() if by_score.get(score) != rank]
    if errors:
        raise RuntimeError("anchor mismatch: " + "; ".join(errors))


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
        "undergraduateControlRank": next(c for s, _, c in rows if s == 368),
    }
    rows_json = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    meta_json = json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
    return f'''// Generated from the authoritative Liaoning 2024 physics score statistics images.\n// Do not edit rows manually; rebuild with tools/ln-2026/build-ln-2024-rank-table.py.\nexport const LN_2024_PHYSICS_SCORE_RANK_META={meta_json};\nconst ROWS={rows_json};\nconst MAP=new Map(ROWS.map(([score,sameCount,cumulative])=>[score,{{score,sameCount,cumulative,previousCumulative:Math.max(0,cumulative-sameCount),rankStart:sameCount?cumulative-sameCount+1:cumulative,rankEnd:cumulative,rankForGap:cumulative}}]));\nfunction toNumber(value){{const n=Number(String(value==null?'':value).replace(/[^0-9.]/g,''));return Number.isFinite(n)?Math.round(n):null}}\nfunction result(row,inputScore){{if(!row)return null;return{{...LN_2024_PHYSICS_SCORE_RANK_META,...row,inputScore:Number(inputScore),scoreLabel:row.score===708&&Number(inputScore)>=708?'708及以上':String(row.score),found:true,topBucket:row.score===708&&Number(inputScore)>=708}}}}\nexport function lookupLn2024PhysicsRank(score){{const n=toNumber(score);if(n==null)return null;if(n>=708)return result(MAP.get(708),n);if(MAP.has(n))return result(MAP.get(n),n);const higher=ROWS.map(row=>row[0]).filter(value=>value>n).sort((a,b)=>a-b)[0];return higher==null?null:result({{...MAP.get(higher),score:n,sameCount:0,rankStart:MAP.get(higher).rankEnd,rankEnd:MAP.get(higher).rankEnd,rankForGap:MAP.get(higher).rankEnd,emptyScore:true}},n)}}\nexport function findLn2024PhysicsScoreByRank(rank){{const n=toNumber(rank);if(n==null||n<1)return null;const tuple=ROWS.find(([, , cumulative])=>n<=cumulative);return tuple?result(MAP.get(tuple[0]),tuple[0]):null}}\nexport function getLn2024PhysicsRankRows(){{return ROWS.map(([score,sameCount,cumulative])=>({{score,sameCount,cumulative,previousCumulative:Math.max(0,cumulative-sameCount),rankStart:sameCount?cumulative-sameCount+1:cumulative,rankEnd:cumulative,rankForGap:cumulative}}))}}\n'''


def main() -> None:
    all_rows: list[tuple[int, int, int]] = []
    image_meta: list[dict] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        for page_index, (url, ranges) in enumerate(zip(IMAGE_URLS, EXPECTED_RANGES), start=1):
            data = fetch(url)
            image_path = temp / f"page-{page_index}.jpg"
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
                prepared = preprocess(block)
                text = tesseract_text(prepared, temp / f"page-{page_index}-block-{block_index}.png")
                all_rows.extend(parse_block(text, start, end))
    all_rows.sort(key=lambda row: row[0], reverse=True)
    validate(all_rows)
    module_path = ROOT / "functions/_lib/ln-2024-physics-score-rank.js"
    module_path.write_text(render_module(all_rows, image_meta), encoding="utf-8")
    audit = {
        "ok": True,
        "sourcePage": SOURCE_PAGE,
        "sourceImages": image_meta,
        "rowCount": len(all_rows),
        "topScore": all_rows[0][0],
        "bottomScore": all_rows[-1][0],
        "totalAt150": all_rows[-1][2],
        "undergraduateControlScore": 368,
        "undergraduateControlRank": next(c for s, _, c in all_rows if s == 368),
        "anchors": ANCHORS,
        "module": str(module_path.relative_to(ROOT)),
    }
    audit_path = ROOT / "analysis/2026/ln-2024-rank-source-audit.json"
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
