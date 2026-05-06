#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build V2.9.4.4 major-name model data package on top of V2.9.4.3 deploy root."""
from __future__ import annotations
import json, hashlib, glob, os, re, shutil, zipfile, textwrap, datetime
from pathlib import Path

ROOT = Path('/mnt/data/v2944_work/ln_physics_volunteer_tool_v2944_deploy_root')
OUT = ROOT / 'data' / 'major_name_model'
TOOLS = ROOT / 'tools'
DOCS = ROOT / 'docs'
ASSETS = ROOT / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
TOOLS.mkdir(exist_ok=True)
DOCS.mkdir(exist_ok=True)

VERSION = 'V2.9.4.4'
NOW = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def load(rel):
    with open(ROOT/rel, 'r', encoding='utf-8') as f:
        return json.load(f)

def dump(rel, obj):
    p = ROOT/rel
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    return p

def sha_id(prefix, text):
    return prefix + hashlib.sha1(str(text).encode('utf-8')).hexdigest()[:12]

def mapping_type(status):
    return {
        'official_exact_or_cleaned': 'exact_or_cleaned',
        'direction_name_cleaned': 'direction',
        'cooperation_name_cleaned': 'cooperative',
        'major_category_with_components': 'category_with_components',
        'mixed_category_cross_catalog': 'mixed_category_cross_catalog',
        'school_training_mode': 'school_training_mode',
        'major_category': 'category',
        'needs_manual_review': 'uncertain',
    }.get(status or '', 'uncertain')

def attrs_from_review(item):
    tags = item.get('tags') or []
    raw = item.get('rawMajor') or ''
    s = raw + ' ' + ' '.join(tags)
    attrs = []
    if '大类' in s or '专业类' in s or item.get('officialBase',{}).get('kind') == 'category': attrs.append('大类/专业类招生')
    if '试验' in s or '实验' in s or '拔尖' in s or '卓越' in s or '创新' in s or '本博' in s: attrs.append('试验班/培养模式')
    if '中外合作' in s or '合作办学' in s or '国际' in s: attrs.append('中外合作/国际项目')
    if '方向' in s or '特色' in s: attrs.append('方向/特色班')
    if '民族' in s or '预科' in s or '定向' in s: attrs.append('专项/民族/定向')
    if not attrs: attrs.append('普通招生名称')
    return list(dict.fromkeys(attrs))

# 1. Flatten official catalog
# Use official_undergraduate_catalog_2026.json as source, deduplicated by majorCode.
# The nested source may contain alias rows; V2.9.4.3 reports 850 official undergraduate majors.
cat = load('data/taxonomy_runtime/official_undergraduate_catalog_2026.json')
undergrad_items = []
by_code = {}
for disc in cat.get('disciplines', []):
    for c in disc.get('categories', []):
        for m in c.get('majors', []):
            code = m.get('majorCode','')
            if not code or code in by_code:
                continue
            item = {
                'catalog_major_code': code,
                'catalog_major_name': m.get('majorName',''),
                'discipline_category_code': m.get('disciplineCode',''),
                'discipline_category_name': m.get('disciplineName',''),
                'major_class_code': m.get('categoryCode',''),
                'major_class_name': m.get('categoryName',''),
                'degree_category': '',
                'duration_years': None,
                'flags': m.get('flags',''),
                'is_special_major_T': bool(m.get('isSpecial')),
                'is_state_controlled_K': bool(m.get('isNationalControlled')),
                'kt_label': ('特设专业 T / 国家控制布点 K' if (m.get('isSpecial') and m.get('isNationalControlled')) else ('特设专业 T' if m.get('isSpecial') else ('国家控制布点 K' if m.get('isNationalControlled') else '普通目录专业'))),
                'kt_explain': 'K/T 是本科目录专业代码属性，不是招生名称属性。K=国家控制布点；T=特设专业。',
                'catalog_version': cat.get('version','official_undergraduate_catalog_2026'),
                'source_note': cat.get('sourceNote','')
            }
            undergrad_items.append(item)
            by_code[code] = item
undergraduate_catalog_major = {
    'version': VERSION,
    'base': 'V2.9.4.3 taxonomy_runtime/official_undergraduate_catalog_2026.json，按 majorCode 去重',
    'generated_at': NOW,
    'purpose': '本科目录标准专业表。K/T 标识只挂在本表，不挂在招生名称上。',
    'count': len(undergrad_items),
    'stats': {
        'source_major_count': (cat.get('stats') or {}).get('majorCount'),
        'dedupe_by_major_code_count': len(undergrad_items),
        'special_T_count': sum(1 for x in undergrad_items if x['is_special_major_T']),
        'state_controlled_K_count': sum(1 for x in undergrad_items if x['is_state_controlled_K']),
        'normal_count': sum(1 for x in undergrad_items if not x['is_special_major_T'] and not x['is_state_controlled_K'])
    },
    'items': undergrad_items
}

dump('data/major_name_model/undergraduate_catalog_major_v2944.json', undergraduate_catalog_major)

# 2. Admission major raw names from v2942 review
review = load('data/taxonomy_runtime/admission_major_review_v2942.json')
admission_items = []
for x in review.get('items', []):
    raw = x.get('rawMajor','')
    base = x.get('officialBase') or {}
    item = {
        'admission_major_key': sha_id('AMR_', raw),
        'admission_major_name_raw': raw,
        'admission_major_name_clean': x.get('cleanMajor',''),
        'record_count': x.get('recordCount',0),
        'review_status': x.get('status',''),
        'mapping_type_suggested': mapping_type(x.get('status')),
        'mapping_confidence': x.get('confidence','low'),
        'admission_attributes': attrs_from_review(x),
        'review_tags': x.get('tags') or [],
        'warnings': x.get('warnings') or [],
        'explanation': x.get('explanation',''),
        'removed_text': x.get('removedText') or [],
        'official_base_kind': base.get('kind',''),
        'official_base_category_code': base.get('categoryCode',''),
        'official_base_category_name': base.get('categoryName',''),
        'official_base_major_code': base.get('majorCode',''),
        'official_base_major_name': base.get('majorName',''),
        'official_base_flags': base.get('flags',''),
        'is_special_major_T': bool(base.get('isSpecial')),
        'is_state_controlled_K': bool(base.get('isNationalControlled')),
        'component_count': len(x.get('componentMajors') or []),
        'component_category_count': x.get('componentCategoryCount',0),
        'component_categories': x.get('componentCategories') or [],
        'source_basis': x.get('sourceBasis') or []
    }
    admission_items.append(item)
admission_major_raw = {
    'version': VERSION,
    'base': 'V2.9.4.3 taxonomy_runtime/admission_major_review_v2942.json',
    'generated_at': NOW,
    'purpose': '招生专业名原始/清洗/复核表。这里的名称是填报入口名称，不等于本科目录专业名。',
    'count': len(admission_items),
    'stats': review.get('stats',{}),
    'items': admission_items
}
dump('data/major_name_model/admission_major_raw_v2944.json', admission_major_raw)

# 3. Admission-to-catalog map
maps = []
for x in review.get('items', []):
    raw = x.get('rawMajor','')
    am_key = sha_id('AMR_', raw)
    base = x.get('officialBase') or {}
    mt = mapping_type(x.get('status'))
    base_major = base.get('majorCode') or ''
    base_category = base.get('categoryCode') or ''
    if base_major:
        maps.append({
            'map_id': sha_id('MAP_', raw + '|base|' + base_major),
            'admission_major_key': am_key,
            'admission_major_name_raw': raw,
            'admission_major_name_clean': x.get('cleanMajor',''),
            'target_type': 'catalog_major',
            'catalog_major_code': base_major,
            'catalog_major_name': base.get('majorName',''),
            'catalog_category_code': base.get('categoryCode',''),
            'catalog_category_name': base.get('categoryName',''),
            'mapping_type': mt,
            'mapping_confidence': x.get('confidence','low'),
            'is_primary_match': True,
            'mapping_note': x.get('explanation',''),
            'evidence_text': base.get('source','') or base.get('note',''),
            'review_status': x.get('status',''),
            'warning_text': '；'.join(x.get('warnings') or [])
        })
    elif base.get('kind') == 'category' and base_category:
        maps.append({
            'map_id': sha_id('MAP_', raw + '|category|' + base_category),
            'admission_major_key': am_key,
            'admission_major_name_raw': raw,
            'admission_major_name_clean': x.get('cleanMajor',''),
            'target_type': 'catalog_category',
            'catalog_major_code': '',
            'catalog_major_name': '',
            'catalog_category_code': base_category,
            'catalog_category_name': base.get('categoryName',''),
            'mapping_type': mt,
            'mapping_confidence': x.get('confidence','low'),
            'is_primary_match': True,
            'mapping_note': '招生名称映射到本科专业类/大类，不等于单一本科专业。',
            'evidence_text': base.get('source','') or base.get('note',''),
            'review_status': x.get('status',''),
            'warning_text': '；'.join(x.get('warnings') or [])
        })
    else:
        maps.append({
            'map_id': sha_id('MAP_', raw + '|unmatched'),
            'admission_major_key': am_key,
            'admission_major_name_raw': raw,
            'admission_major_name_clean': x.get('cleanMajor',''),
            'target_type': 'unmatched',
            'catalog_major_code': '',
            'catalog_major_name': '',
            'catalog_category_code': '',
            'catalog_category_name': '',
            'mapping_type': mt,
            'mapping_confidence': x.get('confidence','low'),
            'is_primary_match': False,
            'mapping_note': '未能稳定映射到本科目录专业或专业类，需人工复核。',
            'evidence_text': '',
            'review_status': x.get('status',''),
            'warning_text': '；'.join(x.get('warnings') or [])
        })
    # component majors from parentheses or listed included majors
    for i, cm in enumerate(x.get('componentMajors') or []):
        if not cm.get('matched') or not cm.get('majorCode'):
            continue
        maps.append({
            'map_id': sha_id('MAP_', raw + '|component|' + cm.get('majorCode','') + '|' + str(i)),
            'admission_major_key': am_key,
            'admission_major_name_raw': raw,
            'admission_major_name_clean': x.get('cleanMajor',''),
            'target_type': 'component_catalog_major',
            'catalog_major_code': cm.get('majorCode',''),
            'catalog_major_name': cm.get('majorName',''),
            'catalog_category_code': cm.get('categoryCode',''),
            'catalog_category_name': cm.get('categoryName',''),
            'mapping_type': 'component_major',
            'mapping_confidence': x.get('confidence','low'),
            'is_primary_match': False,
            'mapping_note': '从招生名称括号或备注中识别出的可能分流/包含专业。',
            'evidence_text': cm.get('name',''),
            'review_status': x.get('status',''),
            'warning_text': '；'.join(x.get('warnings') or [])
        })

admission_to_catalog_map = {
    'version': VERSION,
    'base': 'V2.9.4.3 admission_major_review_v2942.json + official_undergraduate_catalog_2026.json',
    'generated_at': NOW,
    'purpose': '招生名称到本科目录的映射证据表。支持招生名→专业、招生名→专业类、招生名→多个分流专业、未匹配复核。',
    'count': len(maps),
    'stats': {
        'catalog_major_rows': sum(1 for x in maps if x['target_type']=='catalog_major'),
        'catalog_category_rows': sum(1 for x in maps if x['target_type']=='catalog_category'),
        'component_catalog_major_rows': sum(1 for x in maps if x['target_type']=='component_catalog_major'),
        'unmatched_rows': sum(1 for x in maps if x['target_type']=='unmatched'),
        'high_confidence_rows': sum(1 for x in maps if x['mapping_confidence']=='high'),
        'medium_confidence_rows': sum(1 for x in maps if x['mapping_confidence']=='medium'),
        'low_confidence_rows': sum(1 for x in maps if x['mapping_confidence']=='low')
    },
    'items': maps
}
dump('data/major_name_model/admission_to_catalog_map_v2944.json', admission_to_catalog_map)

# 4. Graduate subject reference from major taxonomy
mtax = load('data/taxonomy_runtime/major_taxonomy.json')
grad_rows = []
for item in mtax.get('items', []):
    off = item.get('officialUndergrad2026') or {}
    ug = item.get('undergradMajor') or {}
    code = off.get('majorCode') or ug.get('code') or ''
    name = off.get('majorName') or ug.get('name') or item.get('cleanMajor','')
    if not code:
        continue
    gr = item.get('graduateReference') or {}
    # academic primary
    for ref in gr.get('academicPrimary') or []:
        grad_rows.append({
            'grad_ref_id': sha_id('GR_', code+'|academic|'+ref.get('code','')+ref.get('name','')),
            'catalog_major_code': code,
            'catalog_major_name': name,
            'reference_kind': 'academic_primary',
            'grad_discipline_code': ref.get('code',''),
            'grad_discipline_name': ref.get('name',''),
            'grad_level': ref.get('level','一级学科'),
            'parent_code': '',
            'parent_name': '',
            'reference_type': '学术型参考',
            'relation': ref.get('relation',''),
            'reference_confidence': ref.get('confidence') or gr.get('confidence','low'),
            'reference_note': gr.get('note','研究生参考只作升学方向理解。'),
            'source_version': gr.get('basis','研究生教育学科专业目录（2022） + 2025研招代码册口径')
        })
    # professional degree
    for ref in gr.get('professionalDegree') or []:
        grad_rows.append({
            'grad_ref_id': sha_id('GR_', code+'|professional|'+(ref.get('fieldCode') or ref.get('categoryCode',''))),
            'catalog_major_code': code,
            'catalog_major_name': name,
            'reference_kind': 'professional_degree',
            'grad_discipline_code': ref.get('fieldCode') or ref.get('categoryCode',''),
            'grad_discipline_name': ref.get('fieldName') or ref.get('categoryName',''),
            'grad_level': ref.get('fieldLevel') or ref.get('categoryLevel','专业学位类别'),
            'parent_code': ref.get('categoryCode',''),
            'parent_name': ref.get('categoryName',''),
            'reference_type': '专业型参考',
            'relation': ref.get('relation',''),
            'reference_confidence': ref.get('confidence') or gr.get('confidence','low'),
            'reference_note': gr.get('note','研究生参考只作升学方向理解。'),
            'source_version': gr.get('basis','研究生教育学科专业目录（2022） + 2025研招代码册口径')
        })
    # secondary examples
    for ref in gr.get('secondaryExamples') or []:
        grad_rows.append({
            'grad_ref_id': sha_id('GR_', code+'|secondary|'+ref.get('code','')),
            'catalog_major_code': code,
            'catalog_major_name': name,
            'reference_kind': 'secondary_example',
            'grad_discipline_code': ref.get('code',''),
            'grad_discipline_name': ref.get('name',''),
            'grad_level': ref.get('level','二级学科示例'),
            'parent_code': ref.get('parentCode',''),
            'parent_name': ref.get('parentName',''),
            'reference_type': '二级学科示例',
            'relation': 'example',
            'reference_confidence': gr.get('confidence','low'),
            'reference_note': '二级学科示例仅用于理解方向，不代表学校一定招生或本科实力。',
            'source_version': gr.get('basis','研究生教育学科专业目录（2022） + 2025研招代码册口径')
        })
graduate_subject_reference = {
    'version': VERSION,
    'base': 'V2.9.4.3 taxonomy_runtime/major_taxonomy.json graduateReference',
    'generated_at': NOW,
    'purpose': '本科目录专业到研究生一级学科/专硕类别/二级学科示例的参考表。仅作升学方向参考，不能反推本科专业实力。',
    'count': len(grad_rows),
    'stats': {
        'academic_primary_rows': sum(1 for x in grad_rows if x['reference_kind']=='academic_primary'),
        'professional_degree_rows': sum(1 for x in grad_rows if x['reference_kind']=='professional_degree'),
        'secondary_example_rows': sum(1 for x in grad_rows if x['reference_kind']=='secondary_example'),
        'unique_catalog_major_count': len(set(x['catalog_major_code'] for x in grad_rows))
    },
    'items': grad_rows
}
dump('data/major_name_model/graduate_subject_reference_v2944.json', graduate_subject_reference)

# 5. Entry index from chunks
chunk_files = sorted(glob.glob(str(ROOT/'data/chunks/*.json')))
entries = []
missing_review = []
review_keys = {x['admission_major_name_raw']: x['admission_major_key'] for x in admission_items}
for p in chunk_files:
    obj = json.load(open(p, encoding='utf-8'))
    chunk_id = Path(p).stem
    for r in obj.get('records', []):
        raw = r.get('major','')
        key = review_keys.get(raw) or sha_id('AMR_', raw)
        if raw and raw not in review_keys:
            missing_review.append(raw)
        entries.append({
            'record_id': r.get('id',''),
            'chunk_id': chunk_id,
            'school': r.get('school',''),
            'school_province': r.get('schoolProvince',''),
            'school_city': r.get('schoolCity',''),
            'school_nature_label': r.get('schoolNatureLabel',''),
            'school_tier_hint': r.get('schoolTierLabel','') or r.get('schoolTier',''),
            'admission_major_key': key,
            'admission_major_name_raw': raw,
            'major_code_2025': r.get('majorCode2025',''),
            'major_code_2024': r.get('majorCode2024',''),
            'score_2025': r.get('score2025'),
            'rank_2025': r.get('rank2025'),
            'score_2024': r.get('score2024'),
            'rank_2024': r.get('rank2024'),
            'rank_diff': r.get('rankDiff'),
            'rank_change_label': r.get('rankChangeLabel',''),
            'tuition_2025': r.get('tuition2025'),
            'risk_flags': r.get('riskFlags') or [],
            'is_high_fee': bool(r.get('isHighFee')),
            'is_medical': bool(r.get('isMedical')),
            'is_grid': bool(r.get('isGrid')),
            'is_computer': bool(r.get('isComputer'))
        })
admission_entry_major_index = {
    'version': VERSION,
    'base': 'V2.9.4.3 data/chunks/*.json',
    'generated_at': NOW,
    'purpose': '投档记录到招生专业名复核表的索引。用于让原筛选结果关联 V2.9.4.4 专业名三层模型。',
    'count': len(entries),
    'stats': {
        'chunk_file_count': len(chunk_files),
        'unique_raw_major_count_in_chunks': len(set(x['admission_major_name_raw'] for x in entries)),
        'missing_review_unique_count': len(set(missing_review)),
        'missing_review_examples': sorted(set(missing_review))[:20]
    },
    'items': entries
}
dump('data/major_name_model/admission_entry_major_index_v2944.json', admission_entry_major_index)

# 6. Schemas and manifest
schema = {
    'version': VERSION,
    'note': '字段名采用 snake_case；本包是 V2.9.4.3 的增量数据模型，不替换原分块引擎。',
    'tables': {
        'admission_major_raw_v2944': list(admission_items[0].keys()) if admission_items else [],
        'undergraduate_catalog_major_v2944': list(undergrad_items[0].keys()) if undergrad_items else [],
        'admission_to_catalog_map_v2944': list(maps[0].keys()) if maps else [],
        'graduate_subject_reference_v2944': list(grad_rows[0].keys()) if grad_rows else [],
        'admission_entry_major_index_v2944': list(entries[0].keys()) if entries else []
    },
    'stable_fields': [
        'admission_major_key','admission_major_name_raw','admission_major_name_clean',
        'catalog_major_code','catalog_major_name','catalog_category_code','catalog_category_name',
        'mapping_type','mapping_confidence','target_type',
        'is_special_major_T','is_state_controlled_K',
        'grad_discipline_code','grad_discipline_name','reference_kind'
    ],
    '口径': {
        '招生名称': '投档/招生计划入口名称，可能是大类、试验班、方向、中外合作或备注混入。',
        '本科目录': '标准化校准基准，K/T 标识归属本科目录专业代码。',
        '研究生参考': '升学方向理解，不代表本科实力，不参与投档判断。'
    }
}
dump('data/major_name_model/schema_v2944.json', schema)

manifest = {
    'version': VERSION,
    'base': 'V2.9.4.3 deploy root',
    'generated_at': NOW,
    'package_role': 'major-name-model add-on data package',
    'files': {
        'admission_major_raw': 'data/major_name_model/admission_major_raw_v2944.json',
        'undergraduate_catalog_major': 'data/major_name_model/undergraduate_catalog_major_v2944.json',
        'admission_to_catalog_map': 'data/major_name_model/admission_to_catalog_map_v2944.json',
        'graduate_subject_reference': 'data/major_name_model/graduate_subject_reference_v2944.json',
        'admission_entry_major_index': 'data/major_name_model/admission_entry_major_index_v2944.json',
        'schema': 'data/major_name_model/schema_v2944.json',
        'quality_report': 'data/major_name_model/quality_report_v2944.json'
    },
    'counts': {
        'chunk_records': len(entries),
        'unique_admission_major_names': len(admission_items),
        'undergraduate_catalog_majors': len(undergrad_items),
        'admission_to_catalog_map_rows': len(maps),
        'graduate_reference_rows': len(grad_rows)
    },
    'compatibility': {
        'keeps_v2943_app_js': True,
        'keeps_v2943_chunk_engine': True,
        'new_loader': 'assets/major-name-model.v2944.js'
    }
}
# quality report uses manifest-like refs
quality = {
    'version': VERSION,
    'generated_at': NOW,
    'checks': [],
    'stats': {
        'manifest_total_records_v2943': load('data/manifest.json').get('totalRecords'),
        'chunk_records_indexed_v2944': len(entries),
        'admission_review_items_v2942': len(review.get('items',[])),
        'admission_major_raw_items_v2944': len(admission_items),
        'official_catalog_major_count': len(undergrad_items),
        'map_rows': len(maps),
        'graduate_reference_rows': len(grad_rows),
        'unmatched_admission_names': admission_to_catalog_map['stats']['unmatched_rows'],
        'K_major_count': undergraduate_catalog_major['stats']['state_controlled_K_count'],
        'T_major_count': undergraduate_catalog_major['stats']['special_T_count']
    },
    'important_findings': [
        'V2.9.4.4 数据包从 V2.9.4.3 的 taxonomy_runtime 与 chunks 生成，没有替换原筛选主引擎。',
        '招生名称、本科目录、研究生参考三层已经拆表；K/T 标识仅在本科目录表与映射结果中引用。',
        '研究生参考表来自 V2.9.4.3 graduateReference，仅作升学方向参考。'
    ],
    'known_limits': [
        '招生大类对应的具体分流专业仍需学校当年招生章程核验。',
        '未匹配/低置信记录不会被强行解释为本科目录专业。',
        '本包新增数据与加载器，不强制修改原 UI 卡片逻辑；后续可在 V2.9.4.5 再做 UI 深度接入。'
    ]
}

def add_check(name, passed, detail):
    quality['checks'].append({'name': name, 'passed': bool(passed), 'detail': detail})

base_manifest = load('data/manifest.json')
add_check('chunk_count_equals_manifest_totalRecords', len(entries)==base_manifest.get('totalRecords'), f"chunk={len(entries)}, manifest={base_manifest.get('totalRecords')}")
add_check('review_items_match_unique_chunk_majors', len(admission_items)==len(set(e['admission_major_name_raw'] for e in entries)), f"review={len(admission_items)}, chunk_unique={len(set(e['admission_major_name_raw'] for e in entries))}")
add_check('all_entry_majors_have_review_key', admission_entry_major_index['stats']['missing_review_unique_count']==0, f"missing={admission_entry_major_index['stats']['missing_review_unique_count']}")
add_check('official_catalog_has_850_items', len(undergrad_items)==850, f"catalog={len(undergrad_items)}")
add_check('map_rows_not_empty', len(maps)>len(admission_items), f"maps={len(maps)}, admissions={len(admission_items)}")
add_check('graduate_reference_not_empty', len(grad_rows)>0, f"grad_rows={len(grad_rows)}")
add_check('all_catalog_major_map_codes_exist', all((not x['catalog_major_code']) or x['catalog_major_code'] in by_code for x in maps), 'map catalog_major_code exists in undergraduate table or blank')
quality['overall_passed'] = all(c['passed'] for c in quality['checks'])

dump('data/major_name_model/quality_report_v2944.json', quality)
dump('data/major_name_model/v2944_manifest.json', manifest)

# 7. Loader JS
loader_js = r'''/* V2.9.4.4 major-name model optional loader. Keeps V2.9.4.3 main app unchanged. */
(function(){
  const FILES = {
    manifest: 'data/major_name_model/v2944_manifest.json',
    admissionMajorRaw: 'data/major_name_model/admission_major_raw_v2944.json',
    undergraduateCatalogMajor: 'data/major_name_model/undergraduate_catalog_major_v2944.json',
    admissionToCatalogMap: 'data/major_name_model/admission_to_catalog_map_v2944.json',
    graduateSubjectReference: 'data/major_name_model/graduate_subject_reference_v2944.json',
    admissionEntryMajorIndex: 'data/major_name_model/admission_entry_major_index_v2944.json',
    qualityReport: 'data/major_name_model/quality_report_v2944.json'
  };
  function baseUrl(){
    const u = new URL(window.location.href); u.hash=''; u.search='';
    if(u.pathname.endsWith('/')) return u.href;
    if(/\.html?$/i.test(u.pathname)){ u.pathname = u.pathname.replace(/[^/]+$/, ''); return u.href; }
    u.pathname += '/'; return u.href;
  }
  function dataUrl(file){ const u = new URL(file, baseUrl()); u.searchParams.set('v','2944'); return u.href; }
  async function getJson(file){ const r = await fetch(dataUrl(file), {cache:'no-store'}); if(!r.ok) throw new Error(file+' '+r.status); return r.json(); }
  async function loadMajorNameModelV2944(options){
    const opt = Object.assign({withEntryIndex:false}, options||{});
    const [manifest, admissionMajorRaw, undergraduateCatalogMajor, admissionToCatalogMap, graduateSubjectReference, qualityReport] = await Promise.all([
      getJson(FILES.manifest), getJson(FILES.admissionMajorRaw), getJson(FILES.undergraduateCatalogMajor), getJson(FILES.admissionToCatalogMap), getJson(FILES.graduateSubjectReference), getJson(FILES.qualityReport)
    ]);
    const model = {manifest, admissionMajorRaw, undergraduateCatalogMajor, admissionToCatalogMap, graduateSubjectReference, qualityReport};
    if(opt.withEntryIndex) model.admissionEntryMajorIndex = await getJson(FILES.admissionEntryMajorIndex);
    const byRaw = new Map((admissionMajorRaw.items||[]).map(x=>[x.admission_major_name_raw,x]));
    const mapsByKey = new Map();
    (admissionToCatalogMap.items||[]).forEach(x=>{
      if(!mapsByKey.has(x.admission_major_key)) mapsByKey.set(x.admission_major_key,[]);
      mapsByKey.get(x.admission_major_key).push(x);
    });
    const catalogByCode = new Map((undergraduateCatalogMajor.items||[]).map(x=>[x.catalog_major_code,x]));
    const gradByMajorCode = new Map();
    (graduateSubjectReference.items||[]).forEach(x=>{
      if(!gradByMajorCode.has(x.catalog_major_code)) gradByMajorCode.set(x.catalog_major_code,[]);
      gradByMajorCode.get(x.catalog_major_code).push(x);
    });
    Object.assign(model, {byRaw, mapsByKey, catalogByCode, gradByMajorCode});
    window.LN_MAJOR_NAME_MODEL_2944 = model;
    window.LN_MAJOR_NAME_MODEL_2944_READY = true;
    return model;
  }
  window.loadMajorNameModelV2944 = loadMajorNameModelV2944;
  window.LN_MAJOR_NAME_MODEL_2944_FILES = FILES;
  window.LN_MAJOR_NAME_MODEL_2944_READY = false;
  // Optional lightweight preload: no entry index, so it will not affect the chunk engine.
  loadMajorNameModelV2944({withEntryIndex:false}).catch(err=>{
    window.LN_MAJOR_NAME_MODEL_2944_ERROR = String(err && err.message || err);
    console.warn('[V2.9.4.4] major-name model preload failed:', err);
  });
})();
'''
(ASSETS/'major-name-model.v2944.js').write_text(loader_js, encoding='utf-8')

# 8. Validation JS tool
validator = r'''#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function load(rel){ return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); }
function assert(ok, msg){ if(!ok){ throw new Error(msg); } }
const manifest = load('data/major_name_model/v2944_manifest.json');
const admission = load('data/major_name_model/admission_major_raw_v2944.json');
const catalog = load('data/major_name_model/undergraduate_catalog_major_v2944.json');
const maps = load('data/major_name_model/admission_to_catalog_map_v2944.json');
const grad = load('data/major_name_model/graduate_subject_reference_v2944.json');
const entry = load('data/major_name_model/admission_entry_major_index_v2944.json');
const quality = load('data/major_name_model/quality_report_v2944.json');
const baseManifest = load('data/manifest.json');
assert(manifest.version === 'V2.9.4.4', 'manifest version should be V2.9.4.4');
assert(entry.count === baseManifest.totalRecords, `entry count ${entry.count} != base manifest ${baseManifest.totalRecords}`);
assert(admission.count === 3003, `admission raw count expected 3003 got ${admission.count}`);
assert(catalog.count === 850, `catalog count expected 850 got ${catalog.count}`);
assert(maps.count > admission.count, 'map rows should be greater than admission name rows because components expand');
assert(grad.count > 0, 'graduate reference should not be empty');
assert(quality.overall_passed === true, 'quality report overall_passed should be true');
const catalogCodes = new Set(catalog.items.map(x=>x.catalog_major_code));
for(const m of maps.items){
  if(m.catalog_major_code) assert(catalogCodes.has(m.catalog_major_code), `map code missing in catalog: ${m.catalog_major_code}`);
}
const admissionKeys = new Set(admission.items.map(x=>x.admission_major_key));
for(const e of entry.items){
  assert(admissionKeys.has(e.admission_major_key), `entry admission key missing: ${e.admission_major_key}`);
}
console.log(JSON.stringify({
  ok: true,
  version: manifest.version,
  entryCount: entry.count,
  admissionMajorNames: admission.count,
  catalogMajors: catalog.count,
  mapRows: maps.count,
  graduateReferenceRows: grad.count,
  checks: quality.checks.length
}, null, 2));
'''
(TOOLS/'validate-major-name-model-v2944.js').write_text(validator, encoding='utf-8')
os.chmod(TOOLS/'validate-major-name-model-v2944.js', 0o755)

# 9. Docs
(DOCS/'V2.9.4.4_数据包说明.md').write_text(f'''# V2.9.4.4 数据包说明｜招生专业名三层口径增强版

生成时间：{NOW}

## 定位

本包基于 V2.9.4.3 deploy root 增量生成，不替换原来的分块加载引擎、不删除原投档数据、不改变原筛选逻辑。

V2.9.4.4 只新增一层“专业名建模数据包”：

1. 招生名称层：还原辽宁投档/招生计划入口名称。
2. 本科目录层：以本科目录标准专业/专业类做校准，K/T 标识只挂在本科目录代码上。
3. 研究生参考层：仅用于理解升学方向，不代表本科专业实力。

## 新增文件

```text
data/major_name_model/
  v2944_manifest.json
  admission_major_raw_v2944.json
  undergraduate_catalog_major_v2944.json
  admission_to_catalog_map_v2944.json
  graduate_subject_reference_v2944.json
  admission_entry_major_index_v2944.json
  schema_v2944.json
  quality_report_v2944.json
assets/major-name-model.v2944.js
tools/validate-major-name-model-v2944.js
```

## 为什么不直接改原 UI

V2.9.4.3 的筛选主链路已经稳定，包括 chunks、rank、school_nature、school_tier、taxonomy_runtime。V2.9.4.4 先做数据包增强，避免为了专业名表达把原筛选工具改坏。

后续如果继续开发 UI，可在卡片、Debug、PNG 导出中读取 `window.LN_MAJOR_NAME_MODEL_2944`。
''', encoding='utf-8')

(DOCS/'V2.9.4.4_字段字典.md').write_text('''# V2.9.4.4 字段字典

## admission_major_raw_v2944

招生专业名复核表。它不是本科标准专业表。

- `admission_major_key`：招生名称稳定键。
- `admission_major_name_raw`：原始招生专业名。
- `admission_major_name_clean`：清洗后的招生名。
- `review_status`：复核状态。
- `mapping_type_suggested`：建议映射类型。
- `mapping_confidence`：映射置信度。
- `admission_attributes`：大类/试验班/中外合作/方向等招生属性。
- `warnings`：页面应提示给家长的风险说明。

## undergraduate_catalog_major_v2944

本科目录标准专业表。

- `catalog_major_code`：本科目录专业代码。
- `catalog_major_name`：本科目录专业名称。
- `major_class_code` / `major_class_name`：本科专业类。
- `discipline_category_code` / `discipline_category_name`：学科门类。
- `is_special_major_T`：是否特设专业。
- `is_state_controlled_K`：是否国家控制布点专业。
- `kt_label`：面向页面展示的 K/T 标签。

## admission_to_catalog_map_v2944

招生名称 → 本科目录映射证据表。

- `target_type= catalog_major`：映射到单一本科目录专业。
- `target_type= catalog_category`：映射到本科专业类/大类，不能等同单一专业。
- `target_type= component_catalog_major`：从括号或备注中识别出的可能分流专业。
- `target_type= unmatched`：不稳定，需人工复核。

## graduate_subject_reference_v2944

本科目录专业 → 研究生学科参考表。

- `reference_kind=academic_primary`：学硕一级学科参考。
- `reference_kind=professional_degree`：专硕类别/领域参考。
- `reference_kind=secondary_example`：二级学科示例。

注意：研究生参考不能反推本科专业实力。
''', encoding='utf-8')

(DOCS/'V2.9.4.4_核验报告.md').write_text(f'''# V2.9.4.4 核验报告

## 核验结论

`quality_report_v2944.json` 的 overall_passed 为：`{quality['overall_passed']}`。

## 关键统计

| 项目 | 数量 |
|---|---:|
| 原分块投档记录 | {len(entries)} |
| 招生专业名复核项 | {len(admission_items)} |
| 本科目录专业 | {len(undergrad_items)} |
| 招生名 → 本科目录映射行 | {len(maps)} |
| 研究生参考行 | {len(grad_rows)} |
| K 国家控制布点专业 | {undergraduate_catalog_major['stats']['state_controlled_K_count']} |
| T 特设专业 | {undergraduate_catalog_major['stats']['special_T_count']} |

## 通过项

{chr(10).join('- ' + c['name'] + '：' + ('通过' if c['passed'] else '失败') + '（' + c['detail'] + '）' for c in quality['checks'])}

## 重要口径

- 招生名称不是本科目录专业名。
- 本科目录专业是校准基准。
- K/T 标识只属于本科目录专业代码。
- 研究生参考只做升学方向理解，不能反推本科专业实力。
''', encoding='utf-8')

# 10. Update top docs and index title minimally
(ROOT/'VERSION.txt').write_text('V2.9.4.4｜基于 V2.9.4.3 的招生专业名三层口径增强数据包\n', encoding='utf-8')
readme = ROOT/'README.md'
old = readme.read_text(encoding='utf-8')
prepend = f'''# V2.9.4.4｜招生专业名三层口径增强数据包\n\n本版本以 V2.9.4.3 为底包增量生成，保留原分块加载、投档数据、学校性质、院校层级、本科目录校准、招生名复核、研究生参考与 PNG 导出。\n\n新增内容详见：`docs/V2.9.4.4_数据包说明.md`、`data/major_name_model/v2944_manifest.json`。\n\n---\n\n'''
if 'V2.9.4.4｜招生专业名三层口径增强数据包' not in old:
    readme.write_text(prepend + old, encoding='utf-8')

idx = ROOT/'index.html'
html = idx.read_text(encoding='utf-8')
html = html.replace('辽宁物理类高考志愿初选工具 V2.9.4.3｜研究生学科参考校准版', '辽宁物理类高考志愿初选工具 V2.9.4.4｜招生专业名三层口径增强数据包')
html = html.replace('<script src="./assets/app.v2943.js"></script>', '<script src="./assets/major-name-model.v2944.js"></script>\n<script src="./assets/app.v2943.js"></script>')
idx.write_text(html, encoding='utf-8')

print(json.dumps({
    'version': VERSION,
    'root': str(ROOT),
    'entry_records': len(entries),
    'admission_names': len(admission_items),
    'catalog_majors': len(undergrad_items),
    'map_rows': len(maps),
    'grad_rows': len(grad_rows),
    'quality_passed': quality['overall_passed']
}, ensure_ascii=False, indent=2))
