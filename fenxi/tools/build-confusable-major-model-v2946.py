#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build V2.9.4.6 confusable-major model from V2.9.4.5/V2.9.4.4 data.
目标：识别同校/同主题/近分/专业代码或门类不同的易混专业，并生成前端可展示的数据包。
"""
from __future__ import annotations
import json, re, hashlib, itertools, datetime, math
from pathlib import Path
from collections import defaultdict, Counter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'confusable_major_model'
OUT.mkdir(parents=True, exist_ok=True)
NOW = datetime.datetime.now().isoformat(timespec='seconds')

def read_json(path):
    with open(ROOT/path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(path, obj):
    with open(OUT/path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def clean_major(raw: str) -> str:
    s = re.sub(r'\s+', '', str(raw or ''))
    s = re.sub(r'[（(][^（）()]*[）)]', '', s)
    aliases = {
        '电气工程及自动化': '电气工程及其自动化',
        '机械设计制造及自动化': '机械设计制造及其自动化',
        '计算机科学技术': '计算机科学与技术',
        '大数据管理和应用': '大数据管理与应用',
    }
    return aliases.get(s, s)

def stable_id(prefix, *parts, n=12):
    h = hashlib.sha1('|'.join(map(str, parts)).encode('utf-8')).hexdigest()[:n]
    return f'{prefix}_{h}'

def close_rank_threshold(score):
    try: score = float(score)
    except Exception: score = 0
    if score >= 620: return 1000
    if score >= 590: return 2000
    if score >= 550: return 3500
    if score >= 500: return 6000
    if score >= 450: return 9000
    return 12000

def is_close(a, b):
    sa, sb = a.get('score_2025'), b.get('score_2025')
    ra, rb = a.get('rank_2025'), b.get('rank_2025')
    if ra is None or rb is None: return False, 'no_rank'
    rank_diff = abs(int(ra) - int(rb))
    base_score = max(float(sa or 0), float(sb or 0))
    base_rank = min(abs(int(ra)), abs(int(rb))) or max(abs(int(ra)), abs(int(rb))) or 1
    threshold = close_rank_threshold(base_score)
    ratio = rank_diff / base_rank
    score_diff = abs(float(sa or 0) - float(sb or 0))
    close = (rank_diff <= threshold) or (ratio <= 0.08) or (score_diff <= 5)
    reason = []
    if rank_diff <= threshold: reason.append(f'位次差{rank_diff}≤分段阈值{threshold}')
    if ratio <= 0.08: reason.append(f'位次差比例{ratio:.1%}≤8%')
    if score_diff <= 5: reason.append(f'分差{score_diff:g}≤5')
    return close, '；'.join(reason) or f'位次差{rank_diff}，比例{ratio:.1%}'


def is_category_or_experimental_admission(name: str) -> bool:
    s = str(name or '')
    clean = clean_major(s)
    if re.search(r'试验班|实验班|拔尖|卓越|强基|基地班|英才班|预科|民族班|专项', s):
        return True
    # 招生大类/专业类：这里归入 V2.9.4.5 的大类分流风险，不进入 V2.9.4.6 相似名称专业对。
    if re.search(r'类(?:[（(]|$)', clean):
        return True
    return False

# 规则组：第一批 12 组高频易混，强调“家长期望路径错位”。
GROUPS = [
    {
        'group_id':'CONF_BIGDATA', 'group_name':'大数据/数据类易混', 'risk_level':'high',
        'trigger_keywords':['大数据','数据'],
        'parent_title':'都叫“大数据/数据”，但不一定是计算机路线',
        'parent_summary':'需要看本科代码、所属门类和专业大类。0809计算机类更偏技术；1201管理科学与工程类更偏管理应用；0701/0712更偏数学统计。',
        'expectation_path':'想学计算机/数据技术',
        'member_names':['数据科学与大数据技术','大数据管理与应用','数据计算及应用','数据科学','资源环境大数据工程','生物医药数据科学'],
        'contains':['大数据','数据'],
    },
    {
        'group_id':'CONF_DIGITAL_MEDIA', 'group_name':'数字媒体/新媒体类易混', 'risk_level':'high',
        'trigger_keywords':['数字媒体','新媒体','网络与新媒体'],
        'parent_title':'都像“媒体/互联网”，但技术、艺术、传播不是一条路',
        'parent_summary':'数字媒体技术偏工学计算机类；数字媒体艺术偏艺术设计；网络与新媒体偏文学新闻传播。',
        'expectation_path':'想学互联网/新媒体技术',
        'member_names':['数字媒体技术','数字媒体艺术','网络与新媒体'],
        'contains':['数字媒体','新媒体'],
    },
    {
        'group_id':'CONF_MEDICAL_IMAGE_TECH', 'group_name':'医学影像/医学技术类易混', 'risk_level':'high',
        'trigger_keywords':['医学影像','医学技术'],
        'parent_title':'带“医学影像”不等于同一种医生路径',
        'parent_summary':'医学影像学通常归入临床医学类路径；医学影像技术属于医学技术类，培养定位不同。',
        'expectation_path':'想当医生/医学临床路径',
        'member_names':['医学影像学','医学影像技术'],
        'contains':['医学影像'],
    },
    {
        'group_id':'CONF_STOMATOLOGY', 'group_name':'口腔医学/口腔医学技术类易混', 'risk_level':'high',
        'trigger_keywords':['口腔医学','口腔'],
        'parent_title':'口腔医学和口腔医学技术不是同一个培养方向',
        'parent_summary':'口腔医学是口腔医学类；口腔医学技术是医学技术类，不能按同一个医生路径理解。',
        'expectation_path':'想走口腔医生路径',
        'member_names':['口腔医学','口腔医学技术'],
        'contains':['口腔'],
    },
    {
        'group_id':'CONF_OPTOMETRY', 'group_name':'眼视光医学/眼视光学类易混', 'risk_level':'high',
        'trigger_keywords':['眼视光'],
        'parent_title':'眼视光医学和眼视光学不能只看名字判断',
        'parent_summary':'一个更接近医学路径，一个属于医学技术类口径，需看专业代码和学校培养方案。',
        'expectation_path':'想走医学/眼科相关路径',
        'member_names':['眼视光医学','眼视光学'],
        'contains':['眼视光'],
    },
    {
        'group_id':'CONF_INFO_COMPUTE_MIS', 'group_name':'信息/计算/信管类易混', 'risk_level':'high',
        'trigger_keywords':['信息','计算','信息管理','计算机'],
        'parent_title':'带“信息/计算”不一定是计算机类',
        'parent_summary':'信息与计算科学属于理学数学类；信息管理与信息系统属于管理学；计算机科学与技术才是0809计算机类主线。',
        'expectation_path':'想学计算机/代码路线',
        'member_names':['计算机科学与技术','信息与计算科学','信息管理与信息系统','电子信息工程','信息工程','信息安全','信息资源管理'],
        'contains':['信息','计算机','计算'],
    },
    {
        'group_id':'CONF_NETWORK', 'group_name':'网络/新媒体/网安类易混', 'risk_level':'medium_high',
        'trigger_keywords':['网络','网安','新媒体'],
        'parent_title':'都带“网络”，不一定都是计算机网络技术',
        'parent_summary':'网络工程、网络空间安全偏计算机/网安；网络与新媒体偏新闻传播；网络安全与执法偏公安技术。',
        'expectation_path':'想学计算机网络/网络安全',
        'member_names':['网络工程','网络空间安全','网络与新媒体','网络安全与执法'],
        'contains':['网络'],
    },
    {
        'group_id':'CONF_FINANCE', 'group_name':'金融/金融科技类易混', 'risk_level':'medium',
        'trigger_keywords':['金融','计算金融'],
        'parent_title':'都叫金融，但数学、技术、管理属性不同',
        'parent_summary':'金融学、金融工程、金融数学、金融科技、互联网金融、计算金融的课程底座和就业想象不同，不能只按“金融”理解。',
        'expectation_path':'想学金融/财经路线',
        'member_names':['金融学','金融工程','金融数学','金融科技','互联网金融','计算金融'],
        'contains':['金融'],
    },
    {
        'group_id':'CONF_EE_AUTO_GRID', 'group_name':'电气/自动化/电网类易混', 'risk_level':'high',
        'trigger_keywords':['电气','自动化','电网','测控','能源与动力'],
        'parent_title':'冲电网方向时，不能把自动化都当电气',
        'parent_summary':'电气工程及其自动化、智能电网信息工程属于电气类；自动化、测控、电子信息、能源动力不能直接等同电气主线。',
        'expectation_path':'想靠近电网/电力系统',
        'member_names':['电气工程及其自动化','智能电网信息工程','电气工程与智能控制','自动化','测控技术与仪器','能源与动力工程','电子信息工程'],
        'contains':['电气','自动化','电网','测控','能源与动力'],
    },
    {
        'group_id':'CONF_AI_MANUFACTURING_ROBOT', 'group_name':'智能制造/人工智能/机器人类易混', 'risk_level':'medium_high',
        'trigger_keywords':['智能','人工智能','机器人','智能制造'],
        'parent_title':'都带“智能”，但机械、计算机、自动化不是一回事',
        'parent_summary':'智能制造多为机械类底座；人工智能/智能科学与技术多为计算机类；机器人工程多涉及自动化/机械交叉。',
        'expectation_path':'想学AI/代码/智能技术',
        'member_names':['智能制造工程','人工智能','智能科学与技术','机器人工程','智能车辆工程','智能感知工程'],
        'contains':['智能制造','人工智能','智能科学','机器人','智能车辆','智能感知'],
    },
    {
        'group_id':'CONF_CHEM_MATERIAL', 'group_name':'化学/化工/材料类易混', 'risk_level':'medium',
        'trigger_keywords':['化学','化工','材料'],
        'parent_title':'理学化学、工学化工、材料不是一个口径',
        'parent_summary':'应用化学偏理学基础；化学工程与工艺偏工程过程；材料化学属于材料类方向。',
        'expectation_path':'想学化学/材料/化工路线',
        'member_names':['应用化学','化学工程与工艺','能源化学工程','化学工程与工业生物工程','材料化学','高分子材料与工程','材料科学与工程'],
        'contains':['化学','化工','材料'],
    },
    {
        'group_id':'CONF_CIVIL_ARCH_MGMT', 'group_name':'建筑/土木/工程管理类易混', 'risk_level':'medium_high',
        'trigger_keywords':['建筑','土木','工程管理','智能建造'],
        'parent_title':'建筑、土木、工程管理不是一回事',
        'parent_summary':'建筑学偏设计/空间；土木工程偏工程技术；工程管理属于管理科学与工程类，智能建造多为土木类数字化。',
        'expectation_path':'想学建筑设计/土木工程/工程管理',
        'member_names':['建筑学','土木工程','建筑环境与能源应用工程','建筑电气与智能化','智能建造','工程管理'],
        'contains':['建筑','土木','工程管理','智能建造'],
    },
    {
        'group_id':'CONF_BIO_MEDICAL_ENGINEERING', 'group_name':'生物/生物工程/生物医学类易混', 'risk_level':'medium_high',
        'trigger_keywords':['生物','医学工程','智能医学'],
        'parent_title':'生物医学工程、智能医学工程不等于临床医学',
        'parent_summary':'生物医学工程/智能医学工程多是工学或交叉方向，不能直接按医生路径理解。',
        'expectation_path':'想走医学/生物医药相关路径',
        'member_names':['生物医学工程','智能医学工程','医学信息工程','生物工程','生物技术','生物科学'],
        'contains':['生物','医学工程','智能医学','医学信息'],
    },
]

# 家长理解标签：用官方目录支撑，避免作为官方结论。
INTERPRET = {
    '080910T': ('偏技术、偏代码、偏计算机', ['代码接受度','数学逻辑','数据处理','计算机基础']),
    '120108T': ('偏管理、偏业务、偏数据应用', ['业务理解','管理分析','数据工具','沟通表达']),
    '070102': ('偏数学、计算方法，不是计算机类', ['数学基础','抽象能力','计算方法']),
    '120102': ('偏管理信息系统，不是纯计算机', ['管理理解','信息系统','流程分析']),
    '080901': ('计算机主线，偏代码和系统基础', ['代码接受度','计算机基础','算法逻辑']),
    '080906': ('偏技术、交互和数字内容开发', ['代码/工具','交互理解','技术应用']),
    '130508': ('偏艺术设计与创作', ['审美设计','作品表达','创意能力']),
    '050306T': ('偏传播、内容和媒体运营', ['表达能力','内容策划','传播理解']),
    '100301K': ('口腔医学类，医学路径属性更强', ['医学长期投入','动手能力','规培/资格意识']),
    '101006': ('医学技术类，不能当口腔医学理解', ['技术操作','工艺理解','医学技术路径']),
    '101003': ('医学技术类，偏影像检查技术', ['技术操作','设备理解','医学技术路径']),
    '080601': ('电气类主线，电力系统相关性更强', ['物理基础','电力系统','工程理解']),
    '080602T': ('电气类，偏电网信息化方向', ['电气基础','信息化','电网场景']),
    '080801': ('自动化类，偏控制系统', ['控制理论','系统思维','数学物理']),
    '080301': ('仪器类，偏测量、控制和仪器系统', ['仪器测量','控制基础','工程实验']),
    '080213T': ('机械类底座，偏制造智能化', ['机械基础','工程现场','自动化工具']),
    '080907T': ('计算机类，偏智能技术方向', ['代码接受度','算法逻辑','计算机基础']),
    '080717T': ('计算机类，偏人工智能方向', ['代码接受度','数学逻辑','算法基础']),
    '080803T': ('自动化类/机器人方向，偏控制与机电结合', ['控制系统','机电基础','工程实践']),
    '070302': ('偏理学化学基础', ['化学基础','实验能力','读研意愿']),
    '081301': ('偏工学化工过程', ['工程过程','化工安全','工厂场景']),
    '080403': ('材料类，偏材料与化学交叉', ['材料基础','实验能力','行业耐心']),
    '082801': ('偏建筑设计与空间表达', ['设计表达','空间想象','作品意识']),
    '081001': ('土木类，偏工程结构和施工技术', ['工程力学','现场接受度','项目理解']),
    '120103': ('管理学，偏工程项目管理', ['管理协调','项目理解','沟通表达']),
    '082803': ('建筑类，偏规划/设计路径', ['空间规划','设计表达','长期积累']),
    '082601': ('生物医学工程，工学交叉，不等于临床', ['工程基础','医学场景理解','交叉学习']),
    '101011T': ('医学技术/交叉应用，不等于临床医学', ['数据/工程','医学场景','交叉学习']),
}

def normalize_rule_groups():
    return [{k:v for k,v in g.items() if k not in ('member_names','contains')} for g in GROUPS]

def major_matches_group(name, group):
    n = clean_major(name)
    if n in group.get('member_names',[]): return True
    return any(k and k in n for k in group.get('contains',[]))

def member_meta(row):
    code = row.get('catalog_major_code') or ''
    label, abilities = INTERPRET.get(code, ('按本科目录口径理解，需结合培养方案复核', []))
    return {
        'plain_label': label,
        'ability_tags': abilities,
    }

entries = read_json(Path('data/major_name_model/admission_entry_major_index_v2944.json'))['items']
maps = read_json(Path('data/major_name_model/admission_to_catalog_map_v2944.json'))['items']
catalog = {x['catalog_major_code']:x for x in read_json(Path('data/major_name_model/undergraduate_catalog_major_v2944.json'))['items']}
tax_items = read_json(Path('data/taxonomy_runtime/major_taxonomy.json'))['items']
tax_by_clean = {x['cleanMajor']:x for x in tax_items}

maps_by_key = defaultdict(list)
for m in maps:
    maps_by_key[m['admission_major_key']].append(m)

def pick_mapping(entry):
    ms = maps_by_key.get(entry.get('admission_major_key'), [])
    with_code = [m for m in ms if m.get('catalog_major_code')]
    prim = [m for m in with_code if m.get('is_primary_match')]
    m = prim[0] if prim else (with_code[0] if with_code else (ms[0] if ms else None))
    raw = entry.get('admission_major_name_raw','')
    clean = clean_major(raw)
    # Use map if valid code.
    if m and m.get('catalog_major_code'):
        cat = catalog.get(m['catalog_major_code'], {})
        return {
            'admission_major_key': entry.get('admission_major_key'),
            'admission_major_name_raw': raw,
            'admission_major_name_clean': m.get('admission_major_name_clean') or clean,
            'catalog_major_code': m.get('catalog_major_code',''),
            'catalog_major_name': m.get('catalog_major_name',''),
            'discipline_category_code': cat.get('discipline_category_code') or (m.get('catalog_major_code','')[:2] if m.get('catalog_major_code') else ''),
            'discipline_category_name': cat.get('discipline_category_name') or '',
            'major_class_code': cat.get('major_class_code') or m.get('catalog_category_code',''),
            'major_class_name': cat.get('major_class_name') or m.get('catalog_category_name',''),
            'mapping_type': m.get('mapping_type',''),
            'mapping_confidence': m.get('mapping_confidence',''),
            'mapping_note': m.get('mapping_note',''),
            'official_source': 'admission_to_catalog_map_v2944'
        }
    # Fallback to taxonomy category/major.
    tx = tax_by_clean.get(clean)
    if tx:
        off = tx.get('officialUndergrad2026') or {}
        return {
            'admission_major_key': entry.get('admission_major_key'),
            'admission_major_name_raw': raw,
            'admission_major_name_clean': clean,
            'catalog_major_code': off.get('majorCode') or (tx.get('undergradMajor') or {}).get('code') or '',
            'catalog_major_name': off.get('majorName') or (tx.get('undergradMajor') or {}).get('name') or clean,
            'discipline_category_code': off.get('disciplineCode') or (tx.get('undergradDiscipline') or {}).get('code') or '',
            'discipline_category_name': off.get('disciplineName') or (tx.get('undergradDiscipline') or {}).get('name') or '',
            'major_class_code': off.get('categoryCode') or (tx.get('undergradCategory') or {}).get('code') or '',
            'major_class_name': off.get('categoryName') or (tx.get('undergradCategory') or {}).get('name') or '',
            'mapping_type': 'taxonomy_fallback',
            'mapping_confidence': off.get('confidence') or tx.get('overallConfidence','low'),
            'mapping_note': off.get('note') or tx.get('explain',''),
            'official_source': 'taxonomy_runtime_major_taxonomy'
        }
    return {
        'admission_major_key': entry.get('admission_major_key'),
        'admission_major_name_raw': raw,
        'admission_major_name_clean': clean,
        'catalog_major_code': '', 'catalog_major_name':'',
        'discipline_category_code':'', 'discipline_category_name':'',
        'major_class_code':'', 'major_class_name':'',
        'mapping_type':'unmatched','mapping_confidence':'low','mapping_note':'未稳定映射','official_source':'none'
    }

# Build enriched rows.
rows=[]
for e in entries:
    m = pick_mapping(e)
    groups=[]
    for g in GROUPS:
        if major_matches_group(m.get('catalog_major_name') or m.get('admission_major_name_clean') or e.get('admission_major_name_raw'), g) or major_matches_group(e.get('admission_major_name_raw'), g):
            groups.append(g['group_id'])
    if not groups: continue
    row = {
        'record_id': e.get('record_id'),
        'chunk_id': e.get('chunk_id'),
        'school': e.get('school'),
        'school_province': e.get('school_province') or '',
        'school_city': e.get('school_city') or '',
        'admission_major_key': e.get('admission_major_key'),
        'admission_major_name_raw': e.get('admission_major_name_raw'),
        'major_code_2025': e.get('major_code_2025'),
        'score_2025': e.get('score_2025'),
        'rank_2025': e.get('rank_2025'),
        'score_2024': e.get('score_2024'),
        'rank_2024': e.get('rank_2024'),
        'tuition_2025': e.get('tuition_2025'),
        'risk_flags': e.get('risk_flags') or [],
        'is_high_fee': e.get('is_high_fee'),
        **m,
        'confusable_group_ids': groups,
        **member_meta(m)
    }
    rows.append(row)

# Members: known by catalog code/name from rows plus group rules.
member_map = {}
for r in rows:
    for gid in r['confusable_group_ids']:
        key = (gid, r.get('catalog_major_code') or r.get('admission_major_name_clean'))
        if key not in member_map:
            member_map[key] = {
                'group_id': gid,
                'catalog_major_code': r.get('catalog_major_code',''),
                'catalog_major_name': r.get('catalog_major_name') or r.get('admission_major_name_clean') or r.get('admission_major_name_raw'),
                'discipline_category_code': r.get('discipline_category_code',''),
                'discipline_category_name': r.get('discipline_category_name',''),
                'major_class_code': r.get('major_class_code',''),
                'major_class_name': r.get('major_class_name',''),
                'plain_label': r.get('plain_label',''),
                'ability_tags': r.get('ability_tags',[]),
                'official_basis_note': '官方依据来自本科目录代码、学科门类和专业大类；家长理解标签为解释层，不是官方字段。',
                'seen_record_count': 0,
                'seen_school_count': 0,
            }
        member_map[key]['seen_record_count'] += 1

schools_for_member = defaultdict(set)
for r in rows:
    for gid in r['confusable_group_ids']:
        schools_for_member[(gid, r.get('catalog_major_code') or r.get('admission_major_name_clean'))].add(r.get('school'))
for k,v in member_map.items(): v['seen_school_count'] = len(schools_for_member[k])

# Pairs detection.
by_school_group = defaultdict(list)
for r in rows:
    for gid in r['confusable_group_ids']:
        by_school_group[(r['school'], gid)].append(r)

pairs=[]
school_index=defaultdict(list)
for (school,gid), rs in by_school_group.items():
    # Deduplicate rows by record_id but keep all admissions. Avoid comparing variants of same clean/catalog unless raw diff meaningful?
    if len(rs)<2: continue
    # unique by record id
    rs = list({r['record_id']:r for r in rs}.values())
    for a,b in itertools.combinations(rs,2):
        if a['record_id']==b['record_id']: continue
        if a.get('admission_major_name_raw') == b.get('admission_major_name_raw'): continue
        if is_category_or_experimental_admission(a.get('admission_major_name_raw')) or is_category_or_experimental_admission(b.get('admission_major_name_raw')):
            continue
        # Must show actual difference: catalog code/category/discipline differs, or one unmatched medical path
        diff_discipline = (a.get('discipline_category_code') or '') != (b.get('discipline_category_code') or '') and (a.get('discipline_category_code') or b.get('discipline_category_code'))
        diff_class = (a.get('major_class_code') or '') != (b.get('major_class_code') or '') and (a.get('major_class_code') or b.get('major_class_code'))
        diff_code = (a.get('catalog_major_code') or a.get('admission_major_name_clean')) != (b.get('catalog_major_code') or b.get('admission_major_name_clean'))
        if not diff_code: continue
        close, close_reason = is_close(a,b)
        # avoid endless broad keyword pairs unless same-school close or strong different discipline.
        base = 0
        group = next(g for g in GROUPS if g['group_id']==gid)
        if group['risk_level']=='high': base += 25
        elif group['risk_level']=='medium_high': base += 18
        else: base += 12
        if diff_discipline: base += 40
        elif diff_class: base += 25
        if close: base += 25
        # Strong medical/computer/electric expectation mismatch groups
        if gid in {'CONF_MEDICAL_IMAGE_TECH','CONF_STOMATOLOGY','CONF_OPTOMETRY','CONF_INFO_COMPUTE_MIS','CONF_EE_AUTO_GRID','CONF_BIGDATA'}: base += 18
        if a.get('mapping_confidence')=='high' and b.get('mapping_confidence')=='high': base += 5
        # Penalize very broad fuzzy groups if not close and same discipline/class.
        if not close and not diff_discipline and not diff_class: base -= 30
        if base < 45: continue
        risk = 'high' if base>=90 else ('medium_high' if base>=72 else ('medium' if base>=58 else 'low'))
        if risk=='low': continue
        score_diff = None
        try: score_diff = abs(float(a.get('score_2025') or 0)-float(b.get('score_2025') or 0))
        except Exception: pass
        rank_diff = None
        try: rank_diff = abs(int(a.get('rank_2025') or 0)-int(b.get('rank_2025') or 0))
        except Exception: pass
        basis=[]
        if diff_discipline: basis.append(f"门类不同：{a.get('discipline_category_name') or '-'} vs {b.get('discipline_category_name') or '-'}")
        if diff_class: basis.append(f"专业大类不同：{a.get('major_class_name') or '-'} vs {b.get('major_class_name') or '-'}")
        if a.get('catalog_major_code') or b.get('catalog_major_code'): basis.append(f"本科代码：{a.get('catalog_major_code') or '待复核'} vs {b.get('catalog_major_code') or '待复核'}")
        if close: basis.append(close_reason)
        parent_warning = f"{group['parent_title']}。{group['parent_summary']}"
        pair = {
            'pair_id': stable_id('CONF_PAIR', school, gid, a['record_id'], b['record_id']),
            'school': school,
            'group_id': gid,
            'group_name': group['group_name'],
            'risk_level': risk,
            'risk_score': base,
            'is_close_score_rank': bool(close),
            'distance_type': 'close_score_rank' if close else 'same_school_same_theme',
            'score_diff_2025': score_diff,
            'rank_diff_2025': rank_diff,
            'parent_warning': parent_warning,
            'expectation_path': group['expectation_path'],
            'basis': basis,
            'items': [
                {k:a.get(k) for k in ['record_id','admission_major_name_raw','catalog_major_code','catalog_major_name','discipline_category_code','discipline_category_name','major_class_code','major_class_name','score_2025','rank_2025','tuition_2025','plain_label','ability_tags','mapping_confidence','official_source']},
                {k:b.get(k) for k in ['record_id','admission_major_name_raw','catalog_major_code','catalog_major_name','discipline_category_code','discipline_category_name','major_class_code','major_class_name','score_2025','rank_2025','tuition_2025','plain_label','ability_tags','mapping_confidence','official_source']},
            ],
            'official_basis_note':'本提醒基于招生名称、本科目录代码、学科门类、专业大类、同校近分关系生成；不替代学校培养方案和招生章程。',
            'manual_review_status':'auto_detected',
            'front_display': True if (risk in {'high','medium_high'} or close) else False,
        }
        pairs.append(pair)
        school_index[school].append(pair['pair_id'])

# Deduplicate pair symmetry by pair id already stable but a/b order. Sort and limit display? Keep all.
pairs = sorted(pairs, key=lambda x: (-x['risk_score'], x['school'], x['group_id'], x.get('rank_diff_2025') or 999999999))
# record index: pair refs by record_id for front-end.
record_index=defaultdict(list)
for p in pairs:
    for it in p['items']:
        record_index[it['record_id']].append({
            'pair_id': p['pair_id'],
            'group_id': p['group_id'],
            'risk_level': p['risk_level'],
            'risk_score': p['risk_score'],
            'is_close_score_rank': p['is_close_score_rank'],
            'peer_major': p['items'][1]['admission_major_name_raw'] if it['record_id']==p['items'][0]['record_id'] else p['items'][0]['admission_major_name_raw'],
        })

# Quality report.
group_counts=Counter(p['group_id'] for p in pairs)
risk_counts=Counter(p['risk_level'] for p in pairs)
close_counts=sum(1 for p in pairs if p['is_close_score_rank'])
score_band_counts=Counter()
for p in pairs:
    scores=[it.get('score_2025') for it in p['items'] if it.get('score_2025') is not None]
    s=max(scores) if scores else 0
    band = '620+' if s>=620 else ('590-619' if s>=590 else ('550-589' if s>=550 else ('500-549' if s>=500 else ('450-499' if s>=450 else '367-449'))))
    score_band_counts[band]+=1

# Manual placeholders.
confirmed=[
    {'pair_key':'营口理工学院|CONF_BIGDATA|数据科学与大数据技术|大数据管理与应用','reason':'用户提出的代表案例，已人工确认属于同校近分、大数据关键词、工学计算机类 vs 管理学管理科学与工程类。'},
]
excluded=[]

manifest={
    'version':'V2.9.4.6',
    'base':'V2.9.4.5 parent-interest deploy root',
    'generated_at':NOW,
    'purpose':'易混专业筛选与辨析：识别同校/同主题/近分、但本科代码/门类/专业大类不同的专业。',
    'files':{
        'groups':'confusable_major_groups_v2946.json',
        'members':'confusable_major_members_v2946.json',
        'detectedPairs':'confusable_major_detected_pairs_v2946.json',
        'schoolIndex':'confusable_major_school_index_v2946.json',
        'recordIndex':'confusable_major_record_index_v2946.json',
        'parentExpectationPaths':'parent_expectation_paths_v2946.json',
        'manualConfirmed':'manual_confirmed_pairs_v2946.json',
        'manualExcluded':'manual_excluded_pairs_v2946.json',
        'qualityReport':'confusable_major_quality_report_v2946.json'
    }
}

parent_paths=[]
for g in GROUPS:
    parent_paths.append({
        'group_id':g['group_id'],
        'expectation_path':g['expectation_path'],
        'risk_question':f"家长如果是按“{g['expectation_path']}”理解，需要核对本科代码和专业大类。",
        'parent_title':g['parent_title'],
        'parent_summary':g['parent_summary'],
    })

school_index_items=[{'school':s,'pair_ids':ids,'pair_count':len(ids),'high_count':sum(1 for pid in ids if next((p for p in pairs if p['pair_id']==pid),{}).get('risk_level')=='high')} for s,ids in sorted(school_index.items())]
record_index_items=[{'record_id':rid,'pairs':items,'pair_count':len(items)} for rid,items in sorted(record_index.items())]

quality={
    'version':'V2.9.4.6',
    'generated_at':NOW,
    'input_counts':{
        'admission_entry_major_index':len(entries),
        'entries_entering_confusable_candidate_pool':len(rows),
        'schools_with_confusable_candidates':len(set(r['school'] for r in rows)),
    },
    'output_counts':{
        'groups':len(GROUPS),
        'members':len(member_map),
        'detected_pairs':len(pairs),
        'front_display_pairs':sum(1 for p in pairs if p['front_display']),
        'record_index_items':len(record_index_items),
        'school_index_items':len(school_index_items),
        'close_score_rank_pairs':close_counts,
    },
    'risk_counts':dict(risk_counts),
    'group_counts':dict(group_counts),
    'score_band_counts':dict(score_band_counts),
    'manual_confirmed_count':len(confirmed),
    'manual_excluded_count':len(excluded),
    'known_limitations':[
        '本科目录只能说明官方口径，不能完全代表学校实际培养方案。',
        '大类/试验班分流规则无法从投档数据直接得出，仍需查招生章程。',
        '方向班、校企合作、校区、体检、外语要求等如原始备注不完整，仍可能漏判。',
        '易混提醒不是专业好坏排序，只是提示家长不要按名字误判。'
    ]
}

write_json('v2946_manifest.json', manifest)
write_json('confusable_major_groups_v2946.json', {'version':'V2.9.4.6','count':len(GROUPS),'items':normalize_rule_groups()})
write_json('confusable_major_members_v2946.json', {'version':'V2.9.4.6','count':len(member_map),'items':list(member_map.values())})
write_json('confusable_major_detected_pairs_v2946.json', {'version':'V2.9.4.6','count':len(pairs),'items':pairs})
write_json('confusable_major_school_index_v2946.json', {'version':'V2.9.4.6','count':len(school_index_items),'items':school_index_items})
write_json('confusable_major_record_index_v2946.json', {'version':'V2.9.4.6','count':len(record_index_items),'items':record_index_items})
write_json('parent_expectation_paths_v2946.json', {'version':'V2.9.4.6','count':len(parent_paths),'items':parent_paths})
write_json('manual_confirmed_pairs_v2946.json', {'version':'V2.9.4.6','count':len(confirmed),'items':confirmed})
write_json('manual_excluded_pairs_v2946.json', {'version':'V2.9.4.6','count':len(excluded),'items':excluded})
write_json('confusable_major_quality_report_v2946.json', quality)

print(json.dumps(quality, ensure_ascii=False, indent=2))
# Print some examples including 营口理工学院 and top examples.
for p in pairs:
    if p['school']=='营口理工学院' and p['group_id']=='CONF_BIGDATA':
        print('\n营口理工学院例子：')
        print(json.dumps(p, ensure_ascii=False, indent=2)[:2000])
        break
