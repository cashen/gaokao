#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = "v3.9.53.0"
ASSET_VERSION = "v3953_0"
DATA_VERSION = "zy2026-structure-2025-2026-v1.0.0"
GENERATED_AT = "2026-07-22T14:30:00+08:00"

OLD_MANIFEST = ROOT / "fenxi/data/manifest.json"
NEW_MANIFEST = ROOT / "fenxi/data/ln-rank-2026/manifest.json"
OUT = ROOT / "data/zy2026"
ANALYSIS = ROOT / "analysis/2026"

KNOWN_SCHOOL_ALIASES = {
    "吉林化工学院": "吉林化工大学",
    "桂林医学院": "桂林医科大学",
    "新乡医学院": "河南医药大学",
    "天水师范学院": "天水师范大学",
    "北京师范大学香港浸会大学联合国际学院": "北师香港浸会大学",
    "南昌工程学院": "江西水利电力大学",
}

PROJECT_RULES = [
    ("sino", "中外合作", r"中外合作|合作办学|国际合作|学术互认|联合培养|境外学习"),
    ("highfee", "高收费", r"高收费|较高收费|学费.{0,8}[万千]"),
    ("pre", "预科或民族班", r"预科|民族班"),
    ("eligibility", "资格或定向限制", r"边防军人子女|专项|定向|公费师范|优师|免费医学|订单定向|乡村医生"),
    ("elite", "实验班或特殊培养", r"试验班|实验班|拔尖|英才|卓越|创新班|本博|八年制|九年制|长学制"),
    ("campus", "校区或办学地点", r"校区|分校|办学地点|异地培养"),
    ("joint", "联合培养", r"联合培养|协同培养|联合学院"),
    ("industry", "产业学院", r"产业学院|现代产业学院|特色学院"),
    ("double", "双学位或双学士", r"双学位|双学士|辅修"),
]

DIRECTION_RULES = [
    ("electrical_energy", "电气/自动化/能源", r"电气|自动化|能源|新能源|储能|电力"),
    ("mechanical_vehicle", "机械/装备/车辆", r"机械|车辆|汽车|机电|智能制造|过程装备|工业设计"),
    ("petro_material_safety", "石化/材料/资源安全", r"石油|油气|化工|材料|冶金|矿业|采矿|地质|安全工程|资源"),
    ("computer_ai_software", "计算机/人工智能/软件", r"计算机|软件|人工智能|数据科学|网络空间|信息安全|智能科学|大数据"),
    ("electronics_ic", "电子信息/集成电路", r"电子信息|通信|微电子|集成电路|光电|电磁|信息工程"),
    ("medical_core", "医学核心", r"临床医学|口腔医学|儿科学|麻醉学|医学影像学|眼视光医学|精神医学"),
    ("medical_applied", "医学应用", r"护理|药学|临床药学|医学检验|医学影像技术|康复|生物医学|预防医学|公共卫生"),
    ("teacher_law_public", "师范/法学/公共服务", r"师范|教育学|法学|公安|侦查|政治学|行政管理|公共事业"),
    ("finance_management", "财经管理", r"金融|经济学|会计|财务|工商管理|市场营销|电子商务|保险|税收|审计"),
    ("civil_arch_transport", "土木建筑交通", r"土木|建筑|城乡规划|风景园林|工程造价|交通|铁道|道路|航海|物流"),
    ("agri_food_env", "农林食品环境", r"农学|林学|园艺|动物|水产|食品|环境|生态|植物保护"),
    ("humanities_media_tourism", "文旅外语新闻", r"外语|英语|日语|俄语|新闻|传播|旅游|酒店|汉语言|广播电视|戏剧影视"),
    ("basic_science_math", "基础理科/数理", r"数学|物理学|化学|生物科学|统计学|应用统计|力学|天文学"),
]

RELATION_META = {
    "continued": ("名称和项目基本没变", "high"),
    "name_adjustment": ("更像名称调整，不像全新专业", "medium"),
    "project_change": ("专业还在，但培养项目发生变化", "high"),
    "class_split": ("原来的专业大类拆成了更具体的专业", "high"),
    "class_merge": ("2026改成按专业大类招生", "high"),
    "reappeared": ("2025没有单列，2026重新出现", "medium"),
    "first_seen": ("2026首次出现在近三年投档表中", "medium"),
    "not_listed": ("2025有，2026没有再单独看到", "medium"),
    "needs_review": ("名称或结构有变化，暂时无法确认", "low"),
}

PROJECT_WORDS = re.compile(
    r"中外合作办学|中外合作|合作办学|国际合作|学术互认|联合培养|高收费|较高收费|"
    r"试验班|实验班|拔尖|英才|卓越|创新班|本博贯通|本博|八年制|九年制|长学制|"
    r"主校区|分校区|校区|办学地点|产业学院|现代产业学院|双学位|双学士|预科|民族班"
)


def dump(path: Path, obj, *, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, indent=2 if pretty else None, separators=None if pretty else (",", ":"))
    path.write_text(text + ("\n" if pretty else ""), encoding="utf-8")


def load_rows(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    for key in ("records", "rows", "data"):
        if isinstance(payload.get(key), list):
            return payload[key]
    return []


def load_manifest_rows(manifest_path: Path, prefix: Path) -> list[dict]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    out: list[dict] = []
    for chunk in manifest.get("chunks", []):
        raw = str(chunk.get("file") or chunk.get("path") or "")
        if not raw:
            continue
        candidates = [prefix / raw, prefix / Path(raw).name]
        path = next((p for p in candidates if p.exists()), None)
        if path is None:
            raise RuntimeError(f"missing data chunk: {raw}")
        out.extend(load_rows(path))
    return out


def nv(value) -> str:
    return "" if value is None else str(value).strip()


def number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)) and math.isfinite(value):
        return int(value)
    m = re.search(r"-?\d+(?:\.\d+)?", str(value).replace(",", "").replace("，", ""))
    return int(float(m.group(0))) if m else None


def first(record: dict, keys: list[str]):
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return None


def year_value(record: dict, stem: str, year: int):
    y = str(year)
    yy = y[-2:]
    names = [
        f"{stem}{y}", f"{stem}_{y}", f"{y}{stem.title()}", f"{y}_{stem}",
        f"{y}{'最低分' if stem == 'score' else '位次'}", f"{yy}{'分' if stem == 'score' else '位次'}",
    ]
    return number(first(record, names))


def normalize(value: str) -> str:
    s = unicodedata.normalize("NFKC", nv(value))
    table = str.maketrans({"（": "(", "）": ")", "【": "[", "】": "]", "，": ",", "、": ",", "：": ":", "；": ";", "—": "-", "–": "-"})
    s = s.translate(table).lower()
    s = re.sub(r"\s+", "", s)
    return s.strip("-_,;:()[]")


def school_alias(name: str) -> str:
    clean = re.sub(r"[-·—（）()\s]", "", unicodedata.normalize("NFKC", nv(name)))
    return KNOWN_SCHOOL_ALIASES.get(clean, clean)


def project_flags(major: str) -> tuple[str, ...]:
    n = normalize(major)
    return tuple(code for code, _, pattern in PROJECT_RULES if re.search(pattern, n))


def project_labels(flags: tuple[str, ...]) -> list[str]:
    mapping = {code: label for code, label, _ in PROJECT_RULES}
    return [mapping[x] for x in flags]


def direction_of(major: str) -> tuple[str, str]:
    n = normalize(major)
    for code, label, pattern in DIRECTION_RULES:
        if re.search(pattern, n):
            return code, label
    return "other", "其他"


def split_members(major: str) -> tuple[str, ...]:
    name = unicodedata.normalize("NFKC", nv(major)).replace("（", "(").replace("）", ")")
    groups = re.findall(r"\(([^()]*)\)", name)
    if not groups:
        return ()
    base = re.sub(r"\([^()]*\)", "", name)
    likely_class = "类" in base or "试验班" in base or "实验班" in base
    parts: list[str] = []
    for group in groups:
        if not likely_class and not re.search(r"[,、，]", group):
            continue
        for part in re.split(r"[,、，;；/]", group):
            p = normalize(PROJECT_WORDS.sub("", part))
            p = re.sub(r"(专业|方向|培养)$", "", p)
            if len(p) >= 2 and not re.search(r"学费|校区|英语|外语|不招|色盲|色弱|只招|要求", p):
                parts.append(p)
    return tuple(dict.fromkeys(parts))


def major_base(major: str) -> str:
    name = unicodedata.normalize("NFKC", nv(major)).replace("（", "(").replace("）", ")")
    base = re.sub(r"\([^()]*\)", "", name)
    base = PROJECT_WORDS.sub("", base)
    base = re.sub(r"(专业|方向|培养)$", "", base)
    return normalize(base)


def bigrams(text: str) -> set[str]:
    t = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", text)
    return {t[i:i+2] for i in range(max(0, len(t)-1))} or ({t} if t else set())


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    seq = SequenceMatcher(None, a, b).ratio()
    aa, bb = bigrams(a), bigrams(b)
    jac = len(aa & bb) / len(aa | bb) if aa and bb else 0.0
    return 0.58 * seq + 0.42 * jac


def score_band(score: int | None) -> str:
    if score is None:
        return "未提供"
    for lo, hi, label in [
        (625, 750, "625分及以上"), (590, 624, "590—624分"), (550, 589, "550—589分"),
        (500, 549, "500—549分"), (450, 499, "450—499分"), (344, 449, "344—449分"),
        (0, 343, "本科线以下特殊项目"),
    ]:
        if lo <= score <= hi:
            return label
    return "未提供"


def stable_id(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:16]


def chunk_id(key: str, count: int = 16) -> str:
    return f"{int(hashlib.sha1(key.encode('utf-8')).hexdigest()[:8], 16) % count:02d}"


@dataclass
class Record:
    uid: str
    year: int
    school: str
    school_code: str
    school_key: str
    major: str
    major_code: str
    norm_major: str
    base: str
    members: tuple[str, ...]
    flags: tuple[str, ...]
    direction_id: str
    direction: str
    score: int | None
    rank: int | None
    score2024: int | None
    rank2024: int | None
    nature: str
    province: str
    city: str
    raw: dict = field(repr=False)

    @property
    def is_class(self):
        return self.base.endswith("类") or "试验班" in self.norm_major or "实验班" in self.norm_major or len(self.members) >= 2

    @property
    def ordinary(self):
        return not any(x in self.flags for x in ("sino", "highfee", "pre", "eligibility", "elite", "joint", "industry", "double"))

    def compact(self):
        return {
            "uid": self.uid,
            "year": self.year,
            "school": self.school,
            "schoolCode": self.school_code,
            "major": self.major,
            "majorCode": self.major_code,
            "score": self.score,
            "rank": self.rank,
            "scoreBand": score_band(self.score),
            "projectLabels": project_labels(self.flags),
            "isClass": self.is_class,
        }


def make_records(rows: list[dict], year: int, code_name_map: dict[str, str]) -> list[Record]:
    records: list[Record] = []
    seen: set[str] = set()
    for index, row in enumerate(rows):
        score = year_value(row, "score", year)
        if year == 2026:
            score = score if score is not None else number(row.get("score"))
        if score is None:
            continue
        school = nv(first(row, ["school", "schoolName", "院校名称", "学校名称"]))
        major = nv(first(row, ["major", "majorName", "专业名称"]))
        if not school or not major:
            continue
        school_code = nv(first(row, [f"schoolCode{year}", "schoolCode", "院校代码", "学校代码"]))
        major_code = nv(first(row, [f"majorCode{year}", "majorCode", "专业代码"]))
        alias = school_alias(school)
        canonical_name = code_name_map.get(school_code, alias) if school_code else alias
        school_key = f"code:{school_code}" if school_code else f"name:{normalize(canonical_name)}"
        base = major_base(major)
        flags = project_flags(major)
        did, direction = direction_of(major)
        rank = year_value(row, "rank", year)
        if year == 2026:
            rank = rank if rank is not None else number(row.get("rank"))
        uid = nv(row.get("id")) or stable_id(str(year), school_key, normalize(major), major_code, str(score), str(index))
        dedupe = f"{year}|{school_key}|{normalize(major)}|{major_code}|{score}|{rank}"
        if dedupe in seen:
            continue
        seen.add(dedupe)
        records.append(Record(
            uid=uid, year=year, school=school, school_code=school_code, school_key=school_key,
            major=major, major_code=major_code, norm_major=normalize(major), base=base,
            members=split_members(major), flags=flags, direction_id=did, direction=direction,
            score=score, rank=rank, score2024=year_value(row, "score", 2024), rank2024=year_value(row, "rank", 2024),
            nature=nv(first(row, ["schoolNatureLabel", "nature", "natureRaw", "学校性质"])),
            province=nv(first(row, ["schoolProvince", "province", "省份"])), city=nv(first(row, ["schoolCity", "city", "城市"])), raw=row,
        ))
    return records


def relation_text(kind: str, old: list[Record], new: list[Record], reasons: list[str]) -> tuple[str, str, list[str]]:
    old_names = "、".join(dict.fromkeys(r.major for r in old)) or "2025未单列"
    new_names = "、".join(dict.fromkeys(r.major for r in new)) or "2026未单列"
    if kind == "continued":
        family = "2025和2026都能直接对应，专业名称和培养项目基本没有变化。"
        pro = "同校、同专业名称、同项目属性直接对应。"
        review = ["继续核对2027招生计划和院校章程"]
    elif kind == "name_adjustment":
        family = f"2025的“{old_names}”与2026的“{new_names}”更像同一专业的名称调整，不宜当成全新专业。"
        pro = "专业主体、方向或代码存在连续证据，但公开名称发生变化。"
        review = ["确认2026培养方案是否同步调整", "确认专业代码和所属学院"]
    elif kind == "project_change":
        family = f"专业主体仍能对应，但2026的培养方式、校区或项目属性与2025不同。"
        pro = "专业主体一致，项目标签发生变化。"
        review = ["确认学费", "确认校区与培养方式", "确认证书、出国或转专业限制"]
    elif kind == "class_split":
        family = f"2025的“{old_names}”在2026更像拆成了“{new_names}”等具体专业。项目条数增加不等于招生人数增加。"
        pro = "旧年度专业大类成员与新年度多个具体专业形成一对多关系。"
        review = ["确认是否取消入校后二次分流", "逐项核对各专业招生计划人数"]
    elif kind == "class_merge":
        family = f"2025的“{old_names}”在2026更像合并为“{new_names}”进行大类招生。"
        pro = "多个具体专业与新年度专业大类形成多对一关系。"
        review = ["确认入校后的分流时间和规则", "确认能否自主选择括号内专业"]
    elif kind == "reappeared":
        family = f"“{new_names}”2025没有单列，但2024有历史痕迹，2026属于重新出现，不是近三年首次出现。"
        pro = "2026记录未匹配2025，但与同校2024-only记录存在保守对应。"
        review = ["确认2026是否恢复招生", "查看2026招生计划和培养学院"]
    elif kind == "first_seen":
        family = f"“{new_names}”是2026首次出现在近三年投档表中的记录，目前不能仅凭这一点判断是新设专业或扩招。"
        pro = "在2025主记录和可用2024记录中未找到可靠对应。"
        review = ["确认是否为新设专业、改名或新项目", "查看2026招生计划人数、学费和培养方案"]
    elif kind == "not_listed":
        years = "2024和2025都出现过" if old and old[0].score2024 is not None else "2025出现过"
        family = f"“{old_names}”{years}，但2026没有再单独看到。可能是停招、并入大类或名称调整，不能直接说专业被撤销。"
        pro = "2025记录未找到可靠2026对应。"
        review = ["查看2026招生计划是否并入其他专业", "核对学校官网专业名称和招生章程"]
    else:
        family = f"“{old_names}”与“{new_names}”之间存在相似线索，但仅凭投档表还不能确定是改名、拆分还是独立变化。"
        pro = "候选关系接近或证据不足，保留人工核验。"
        review = ["人工核对2025和2026招生计划", "确认专业代码、学院和培养方案"]
    return family, pro, review


def build_relation(kind: str, old: list[Record], new: list[Record], reasons: list[str], score_value: float | None = None):
    family_label, evidence = RELATION_META[kind]
    family, professional, review = relation_text(kind, old, new, reasons)
    source = new[0] if new else old[0]
    return {
        "relationId": stable_id(kind, *(r.uid for r in old), *(r.uid for r in new)),
        "relationType": kind,
        "familyLabel": family_label,
        "evidenceLevel": evidence,
        "schoolKey": source.school_key,
        "school": source.school,
        "nature": source.nature,
        "province": source.province,
        "city": source.city,
        "directionId": source.direction_id,
        "direction": source.direction,
        "records2025": [r.compact() for r in old],
        "records2026": [r.compact() for r in new],
        "has2024Evidence": any(r.score2024 is not None for r in old),
        "evidenceReasons": reasons,
        "familySummary": family,
        "professionalSummary": professional,
        "reviewPoints": review,
        "matchScore": round(score_value, 3) if score_value is not None else None,
    }


def candidate_score(a: Record, b: Record) -> float:
    score = similarity(a.base, b.base)
    if a.major_code and a.major_code == b.major_code:
        score += 0.16
    if a.direction_id == b.direction_id and a.direction_id != "other":
        score += 0.08
    if a.flags == b.flags:
        score += 0.05
    if a.members and b.base in a.members:
        score += 0.24
    if b.members and a.base in b.members:
        score += 0.24
    if a.members and b.members:
        overlap = len(set(a.members) & set(b.members)) / max(1, len(set(a.members) | set(b.members)))
        score += 0.24 * overlap
    conflicting = ("sino" in a.flags) != ("sino" in b.flags) or ("pre" in a.flags) != ("pre" in b.flags)
    if conflicting:
        score -= 0.12
    return max(0.0, min(1.0, score))


def insight_for(delta_projects: int, delta_schools: int, delta_ordinary: int, delta_special: int, delta_classes: int, delta_specific: int) -> str:
    if delta_projects > 0 and delta_schools > 0 and delta_ordinary > 0:
        return "项目条数和提供该方向的学校数都增加，普通项目也同步增加，可见选择范围有所扩大；仍不能据此判断招生计划人数增加。"
    if delta_projects > 0 and abs(delta_schools) <= 1:
        if delta_special > max(0, delta_ordinary):
            return "项目条数增加，但提供该方向的学校数变化不大，新增主要来自中外合作、高收费或特殊培养项目。"
        if delta_specific > 0 and delta_classes < 0:
            return "项目条数增加主要来自原有学校把专业大类拆得更具体，不等于招生规模同步扩大。"
        return "项目名称变多，但学校覆盖没有明显扩大，变化更可能来自同一批学校的项目拆分或名称调整。"
    if delta_classes > 0 and delta_specific < 0:
        return "更多项目改成专业大类招生，填报时方向变得不那么确定，需要重点核对入校后的分流规则。"
    if delta_projects < 0 and delta_schools < 0:
        return "项目条数和提供该方向的学校数都减少，需要进一步查看是学校退出、专业并入大类，还是名称口径变化。"
    if delta_projects == 0 and delta_schools == 0:
        return "项目条数和学校覆盖整体接近，主要变化集中在个别学校的名称或培养项目调整。"
    return "项目条数与学校覆盖变化方向并不完全一致，应结合大类拆分、特殊项目和具体学校逐条判断。"


def aggregate(records: list[Record], key_fn):
    out = defaultdict(list)
    for r in records:
        out[key_fn(r)].append(r)
    return out


def build():
    old_rows = load_manifest_rows(OLD_MANIFEST, ROOT / "fenxi")
    new_rows = load_manifest_rows(NEW_MANIFEST, ROOT / "fenxi/data/ln-rank-2026")

    # Prefer 2026 name when a school code maps to several names.
    code_names: dict[str, str] = {}
    for row in new_rows:
        code = nv(first(row, ["schoolCode2026", "schoolCode", "院校代码"]))
        school = nv(first(row, ["school", "schoolName", "院校名称"]))
        if code and school:
            code_names[code] = school_alias(school)
    for row in old_rows:
        code = nv(first(row, ["schoolCode2025", "schoolCode", "院校代码"]))
        school = nv(first(row, ["school", "schoolName", "院校名称"]))
        if code and school and code not in code_names:
            code_names[code] = school_alias(school)

    records2025 = make_records(old_rows, 2025, code_names)
    records2024 = make_records(old_rows, 2024, code_names)
    records2026 = make_records(new_rows, 2026, code_names)
    if not (10000 <= len(records2025) <= 12000):
        raise RuntimeError(f"unexpected 2025 comparable count: {len(records2025)}")
    if len(records2026) != 11628:
        raise RuntimeError(f"unexpected 2026 count: {len(records2026)}")

    by_school25 = aggregate(records2025, lambda r: r.school_key)
    by_school24 = aggregate(records2024, lambda r: r.school_key)
    by_school26 = aggregate(records2026, lambda r: r.school_key)

    assigned25: set[str] = set()
    assigned26: set[str] = set()
    relations: list[dict] = []

    def available(rows, assigned):
        return [r for r in rows if r.uid not in assigned]

    def add(kind, old, new, reasons, score_value=None):
        relations.append(build_relation(kind, old, new, reasons, score_value))
        assigned25.update(r.uid for r in old)
        assigned26.update(r.uid for r in new)

    # 1. Exact full-name and project continuity.
    for school_key, new_group in by_school26.items():
        old_group = by_school25.get(school_key, [])
        index = defaultdict(list)
        for old in old_group:
            index[(old.norm_major, old.flags)].append(old)
        for new in new_group:
            candidates = [x for x in index.get((new.norm_major, new.flags), []) if x.uid not in assigned25]
            if new.uid not in assigned26 and len(candidates) == 1:
                add("continued", [candidates[0]], [new], ["学校、专业名称和项目属性一致"])

    # 2. Same professional core; distinguish copy and project changes.
    for school_key, new_group in by_school26.items():
        old_group = by_school25.get(school_key, [])
        old_index = defaultdict(list)
        for old in available(old_group, assigned25):
            old_index[old.base].append(old)
        for new in available(new_group, assigned26):
            candidates = old_index.get(new.base, [])
            candidates = [x for x in candidates if x.uid not in assigned25]
            if len(candidates) == 1:
                old = candidates[0]
                if old.flags == new.flags:
                    add("name_adjustment", [old], [new], ["专业主体一致", "项目属性一致", "公开名称或括号说明发生变化"])
                else:
                    add("project_change", [old], [new], ["专业主体一致", "项目属性标签发生变化"])

    # 3. One class to multiple specific majors.
    for school_key, old_group in by_school25.items():
        new_group = by_school26.get(school_key, [])
        for old in available(old_group, assigned25):
            if not old.is_class or not old.members:
                continue
            candidates = []
            for new in available(new_group, assigned26):
                member_hit = new.base in old.members or any(similarity(new.base, m) >= .82 for m in old.members)
                if member_hit:
                    candidates.append(new)
            if len(candidates) >= 2:
                add("class_split", [old], candidates, ["2025为专业大类", "2026多个具体专业与大类成员相符"])

    # 4. Multiple specific majors to one class.
    for school_key, new_group in by_school26.items():
        old_group = by_school25.get(school_key, [])
        for new in available(new_group, assigned26):
            if not new.is_class or not new.members:
                continue
            candidates = []
            for old in available(old_group, assigned25):
                member_hit = old.base in new.members or any(similarity(old.base, m) >= .82 for m in new.members)
                if member_hit:
                    candidates.append(old)
            if len(candidates) >= 2:
                add("class_merge", candidates, [new], ["2026为专业大类", "2025多个具体专业与大类成员相符"])

    # 5. Conservative one-to-one name relation, with ambiguity kept visible.
    for school_key, new_group in by_school26.items():
        old_group = by_school25.get(school_key, [])
        for new in list(available(new_group, assigned26)):
            ranked = sorted(
                ((candidate_score(old, new), old) for old in available(old_group, assigned25)),
                key=lambda x: x[0], reverse=True,
            )
            if not ranked:
                continue
            best_score, best = ranked[0]
            second = ranked[1][0] if len(ranked) > 1 else 0.0
            if best_score >= .76 and best_score - second >= .08:
                kind = "project_change" if best.flags != new.flags else "name_adjustment"
                add(kind, [best], [new], ["同校专业主体高度接近", "专业方向一致" if best.direction_id == new.direction_id else "专业代码或名称提供连续证据"], best_score)
            elif best_score >= .62 and best_score - second < .08:
                add("needs_review", [best], [new], ["存在多个接近候选", "仅凭投档表不能可靠确定关系"], best_score)

    # 6. 2024-only evidence for reappearance.
    only24_by_school = {
        key: [r for r in rows if year_value(r.raw, "score", 2025) is None]
        for key, rows in by_school24.items()
    }
    for school_key, new_group in by_school26.items():
        old24 = only24_by_school.get(school_key, [])
        for new in list(available(new_group, assigned26)):
            ranked = sorted(((candidate_score(old, new), old) for old in old24), key=lambda x: x[0], reverse=True)
            if ranked and ranked[0][0] >= .76:
                score_value, old = ranked[0]
                # 2024 record is represented in records2025 slot only for a consistent relation shape, but year stays 2024.
                rel = build_relation("reappeared", [], [new], ["2025未单列", "同校2024记录提供可靠对应"], score_value)
                rel["records2024"] = [old.compact()]
                relations.append(rel)
                assigned26.add(new.uid)

    # 7. Remaining 2026 and 2025 records.
    for new in records2026:
        if new.uid not in assigned26:
            add("first_seen", [], [new], ["2025主记录未找到可靠对应", "可用2024记录也未形成可靠对应"])
    for old in records2025:
        if old.uid not in assigned25:
            add("not_listed", [old], [], ["2026未找到可靠对应", "不能仅凭投档表确认停招或撤销"])

    # Coverage audit.
    used25 = sum(len(r["records2025"]) for r in relations)
    used26 = sum(len(r["records2026"]) for r in relations)
    if used25 != len(records2025) or used26 != len(records2026):
        raise RuntimeError(f"relation coverage mismatch: 2025 {used25}/{len(records2025)}, 2026 {used26}/{len(records2026)}")

    relation_counts = Counter(r["relationType"] for r in relations)
    relation_record_counts26 = Counter()
    relation_record_counts25 = Counter()
    for rel in relations:
        relation_record_counts26[rel["relationType"]] += len(rel["records2026"])
        relation_record_counts25[rel["relationType"]] += len(rel["records2025"])

    # Direction statistics use source records, not relation rows, to avoid split/merge distortion.
    dir25 = aggregate(records2025, lambda r: (r.direction_id, r.direction))
    dir26 = aggregate(records2026, lambda r: (r.direction_id, r.direction))
    directions = []
    for key in sorted(set(dir25) | set(dir26), key=lambda x: x[1]):
        a, b = dir25.get(key, []), dir26.get(key, [])
        schools25, schools26 = {r.school_key for r in a}, {r.school_key for r in b}
        ordinary25, ordinary26 = sum(r.ordinary for r in a), sum(r.ordinary for r in b)
        special25, special26 = len(a) - ordinary25, len(b) - ordinary26
        classes25, classes26 = sum(r.is_class for r in a), sum(r.is_class for r in b)
        specific25, specific26 = len(a) - classes25, len(b) - classes26
        delta_projects = len(b) - len(a)
        delta_schools = len(schools26) - len(schools25)
        directions.append({
            "id": key[0], "label": key[1],
            "projects2025": len(a), "projects2026": len(b), "projectDelta": delta_projects,
            "schools2025": len(schools25), "schools2026": len(schools26), "schoolDelta": delta_schools,
            "ordinary2025": ordinary25, "ordinary2026": ordinary26, "ordinaryDelta": ordinary26 - ordinary25,
            "special2025": special25, "special2026": special26, "specialDelta": special26 - special25,
            "classes2025": classes25, "classes2026": classes26, "classDelta": classes26 - classes25,
            "specific2025": specific25, "specific2026": specific26, "specificDelta": specific26 - specific25,
            "insight": insight_for(delta_projects, delta_schools, ordinary26 - ordinary25, special26 - special25, classes26 - classes25, specific26 - specific25),
        })
    directions.sort(key=lambda x: (abs(x["projectDelta"]) + abs(x["schoolDelta"]), x["projects2026"]), reverse=True)

    # School summaries.
    relations_by_school = defaultdict(list)
    for rel in relations:
        relations_by_school[rel["schoolKey"]].append(rel)
    school_index = []
    school_chunks = defaultdict(dict)
    all_school_keys = sorted(set(by_school25) | set(by_school26))
    for key in all_school_keys:
        a, b = by_school25.get(key, []), by_school26.get(key, [])
        rels = relations_by_school.get(key, [])
        source = b[0] if b else a[0]
        counts = Counter(r["relationType"] for r in rels)
        delta = len(b) - len(a)
        if counts["class_split"]:
            summary = f"2026可见项目较2025{'增加' if delta >= 0 else '减少'}{abs(delta)}条，主要变化包含专业大类拆分。"
        elif counts["class_merge"]:
            summary = f"2026可见项目较2025{'增加' if delta >= 0 else '减少'}{abs(delta)}条，部分具体专业改为大类招生。"
        elif counts["project_change"]:
            summary = f"2026可见项目较2025{'增加' if delta >= 0 else '减少'}{abs(delta)}条，变化中包含培养项目或校区调整。"
        elif delta:
            summary = f"2026可见项目较2025{'增加' if delta > 0 else '减少'}{abs(delta)}条，需要结合新增、未再单列和名称变化逐条看。"
        else:
            summary = "2025和2026可见项目条数相同，变化主要来自个别专业名称或项目调整。"
        chunk = chunk_id(key)
        item = {
            "key": key, "name": source.school, "nature": source.nature, "province": source.province, "city": source.city,
            "projects2025": len(a), "projects2026": len(b), "delta": delta,
            "relationCounts": dict(counts), "summary": summary, "chunk": f"school-{chunk}.json",
        }
        school_index.append(item)
        school_chunks[chunk][key] = {"summary": item, "relations": rels}
    school_index.sort(key=lambda x: (abs(x["delta"]), x["projects2026"]), reverse=True)

    # Major-base summaries and major detail chunks.
    major25 = aggregate(records2025, lambda r: (r.base, r.direction_id, r.direction))
    major26 = aggregate(records2026, lambda r: (r.base, r.direction_id, r.direction))
    rels_by_major = defaultdict(list)
    for rel in relations:
        bases = set()
        for row in rel["records2025"] + rel["records2026"]:
            bases.add(major_base(row["major"]))
        for base in bases:
            if base:
                rels_by_major[base].append(rel)
    major_index = []
    major_chunks = defaultdict(dict)
    for key in set(major25) | set(major26):
        base, did, direction = key
        if not base:
            continue
        a, b = major25.get(key, []), major26.get(key, [])
        schools25, schools26 = {r.school_key for r in a}, {r.school_key for r in b}
        if len(a) + len(b) < 2:
            continue
        delta = len(b) - len(a)
        school_delta = len(schools26) - len(schools25)
        insight = insight_for(delta, school_delta, sum(r.ordinary for r in b)-sum(r.ordinary for r in a), sum(not r.ordinary for r in b)-sum(not r.ordinary for r in a), sum(r.is_class for r in b)-sum(r.is_class for r in a), sum(not r.is_class for r in b)-sum(not r.is_class for r in a))
        chunk = chunk_id(base)
        label_source = (b or a)[0].major
        item = {
            "key": base, "label": re.sub(r"\([^()]*\)", "", label_source).strip(), "directionId": did, "direction": direction,
            "projects2025": len(a), "projects2026": len(b), "delta": delta,
            "schools2025": len(schools25), "schools2026": len(schools26), "schoolDelta": school_delta,
            "summary": insight, "chunk": f"major-{chunk}.json",
        }
        major_index.append(item)
        major_chunks[chunk][base] = {"summary": item, "relations": rels_by_major.get(base, [])}
    major_index.sort(key=lambda x: (abs(x["delta"]) + abs(x["schoolDelta"]), x["projects2026"]), reverse=True)

    summary = {
        "version": DATA_VERSION,
        "productVersion": VERSION,
        "assetVersion": ASSET_VERSION,
        "generatedAt": GENERATED_AT,
        "scope": "辽宁普通类本科批物理类投档记录；主要比较2025与2026，2024仅用于防止把重新出现误判为首次出现。",
        "records2025": len(records2025),
        "records2026": len(records2026),
        "recordDelta": len(records2026) - len(records2025),
        "schools2025": len({r.school_key for r in records2025}),
        "schools2026": len({r.school_key for r in records2026}),
        "relations": len(relations),
        "relationCounts": dict(relation_counts),
        "relationRecordCounts2025": dict(relation_record_counts25),
        "relationRecordCounts2026": dict(relation_record_counts26),
        "directions": directions,
        "featuredSchools": school_index[:24],
        "reviewQueue": {
            "needsReviewRelations": relation_counts["needs_review"],
            "projectChangeRelations": relation_counts["project_change"],
            "splitMergeRelations": relation_counts["class_split"] + relation_counts["class_merge"],
            "firstSeen2026Records": relation_record_counts26["first_seen"],
            "notListed2025Records": relation_record_counts25["not_listed"],
        },
        "boundaries": [
            "投档记录条数不是招生计划人数。",
            "2026首次可见不等于教育部新设专业，也不等于学校扩招。",
            "2026未再单列不等于专业被撤销，可能是停招、改名或并入大类。",
            "分数和位次用于说明项目所处层级，不能证明两个专业一定是同一个专业。",
        ],
    }

    OUT.mkdir(parents=True, exist_ok=True)
    dump(OUT / "summary.json", summary, pretty=True)
    dump(OUT / "school-index.json", {"version": DATA_VERSION, "schools": school_index})
    dump(OUT / "major-index.json", {"version": DATA_VERSION, "majors": major_index})
    chunks_dir = OUT / "chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    for chunk, payload in school_chunks.items():
        dump(chunks_dir / f"school-{chunk}.json", {"version": DATA_VERSION, "schools": payload})
    for chunk, payload in major_chunks.items():
        dump(chunks_dir / f"major-{chunk}.json", {"version": DATA_VERSION, "majors": payload})

    audit = {
        "version": DATA_VERSION,
        "source": {
            "oldManifest": str(OLD_MANIFEST.relative_to(ROOT)),
            "newManifest": str(NEW_MANIFEST.relative_to(ROOT)),
            "oldUnionRows": len(old_rows),
            "newRows": len(new_rows),
        },
        "coverage": {
            "records2025": len(records2025), "assigned2025": used25,
            "records2026": len(records2026), "assigned2026": used26,
        },
        "relationCounts": dict(relation_counts),
        "relationRecordCounts2025": dict(relation_record_counts25),
        "relationRecordCounts2026": dict(relation_record_counts26),
        "schoolCount": len(school_index),
        "majorBaseCount": len(major_index),
        "schoolChunkCount": len(school_chunks),
        "majorChunkCount": len(major_chunks),
        "rules": {
            "primaryComparison": "2025→2026",
            "year2024Role": "only-for-reappearance-and-continuity-evidence",
            "automaticClaims": ["continued", "name_adjustment", "project_change", "class_split", "class_merge", "reappeared", "first_seen", "not_listed", "needs_review"],
            "forbiddenInference": ["record-count-as-plan-count", "first-seen-as-new-major", "not-listed-as-abolished-major"],
        },
    }
    dump(ANALYSIS / "zy2026-audit.json", audit, pretty=True)
    dump(ANALYSIS / "zy2026-summary.json", summary, pretty=True)
    dump(ANALYSIS / "zy2026-relations.json", {"version": DATA_VERSION, "relations": relations})

    release_path = ROOT / "ln-rank/release-meta.json"
    active_path = ROOT / "ln-rank/active-assets.json"
    release = json.loads(release_path.read_text(encoding="utf-8"))
    release.update({
        "version": VERSION,
        "assetVersion": ASSET_VERSION,
        "releaseName": "v3.9.53.0-zy2026-human-structure-analysis-no-fenxi",
        "generatedAt": GENERATED_AT,
        "releaseGate": "zy2026-2025-2026-structure-relations, human-language, family-and-adviser-progressive-disclosure, route-migration, multi-terminal, protected-fenxi-runtime-unchanged",
        "zy2026StructureContract": True,
        "zy2026PrimaryComparison": "2025-2026",
        "zy2026Year2024Role": "reappearance-and-continuity-evidence-only",
        "zy2026HumanCopyContract": True,
        "zy2026AdviserEvidenceContract": True,
        "zy2026RouteMigrationContract": True,
        "zy2026Page": "/zy2026/",
        "zy2026DataVersion": DATA_VERSION,
    })
    dump(release_path, release, pretty=True)
    active = json.loads(active_path.read_text(encoding="utf-8"))
    active.update({
        "version": VERSION,
        "assetVersion": ASSET_VERSION,
        "releaseGate": "zy2026-structure-analysis, human-language, progressive-evidence, 320-430-ipad-desktop, protected-fenxi-runtime-unchanged",
        "zy2026StructureContract": True,
        "zy2026RouteMigrationContract": True,
        "structure2026": {
            "page": "../zy2026/index.html",
            "css": "../zy2026/assets/zy2026.v3953_0.css",
            "js": "../zy2026/assets/zy2026.v3953_0.js",
            "summary": "../data/zy2026/summary.json",
            "schoolIndex": "../data/zy2026/school-index.json",
            "majorIndex": "../data/zy2026/major-index.json",
        },
    })
    dump(active_path, active, pretty=True)

    root_index = ROOT / "index.html"
    root_html = root_index.read_text(encoding="utf-8")
    old_link = '<a class="link" href="/zy.html"><em>原始数据</em><strong>辽宁投档数据</strong><span>查具体学校和专业的历年投档记录。</span></a>'
    new_link = '<a class="link" href="/zy2026"><em>招生结构变化</em><strong>辽宁2026招生专业结构变化</strong><span>看2025到2026学校、专业大类和培养项目发生了什么。</span></a>'
    if old_link not in root_html and new_link not in root_html:
        raise RuntimeError("root zy entry pattern not found")
    root_html = root_html.replace(old_link, new_link).replace("首页版本：v3.9.52.0", "首页版本：v3.9.53.0")
    root_index.write_text(root_html, encoding="utf-8")

    e_path = ROOT / "e.html"
    e_path.write_text(e_path.read_text(encoding="utf-8").replace("v3.9.52.0", "v3.9.53.0"), encoding="utf-8")
    redirect = (
        '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta http-equiv="refresh" content="0;url=/zy2026"><title>正在前往辽宁2026招生专业结构变化</title></head>'
        '<body><main><p>旧版2024/2025幻灯片已经由新版结构分析替代。<a href="/zy2026">查看辽宁2026招生专业结构变化</a></p>'
        '<p>版本：v3.9.53.0</p></main><script>location.replace(\'/zy2026\');</script></body></html>\n'
    )
    (ROOT / "zy.html").write_text(redirect, encoding="utf-8")
    (ROOT / "zy2026.html").write_text(redirect, encoding="utf-8")
    print(json.dumps({"records2025": len(records2025), "records2026": len(records2026), "relations": len(relations), "counts": dict(relation_counts)}, ensure_ascii=False))


if __name__ == "__main__":
    build()
