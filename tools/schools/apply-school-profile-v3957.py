#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def p(rel: str) -> Path:
    return ROOT / rel


def read(rel: str) -> str:
    return p(rel).read_text(encoding='utf-8')


def write(rel: str, text: str) -> None:
    target = p(rel)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old, new, 1)


def update_json(rel: str, mutate) -> None:
    data = json.loads(read(rel))
    mutate(data)
    write(rel, json.dumps(data, ensure_ascii=False, indent=2) + '\n')


write('functions/_lib/school-tags.js', """import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';

export function getSchoolTags(school) {
  const profile = resolveSchoolProfile(school);
  return profile?.schoolTierTags ? [...profile.schoolTierTags] : [];
}
""")

write('functions/_lib/location-normalizer.js', """import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';
import { normalizeSchoolGeo } from './school-geo-normalizer.js';

function text(value) { return String(value == null ? '' : value).trim(); }
function normalizeProvince(value) { return text(value).replace(/省$|市$|自治区$|特别行政区$/g, ''); }
function normalizeCity(value) { return text(value).replace(/市$|地区$|自治州$|盟$/g, ''); }
function lnAreaFromProvinceCity(province, city, fallback = '') {
  if (province !== '辽宁') return province ? '省外' : fallback;
  if (city === '沈阳') return '沈阳';
  if (city === '大连') return '大连';
  return '辽宁其他';
}
function rawLocation(raw = {}) {
  return {
    province: normalizeProvince(raw.schoolProvince || raw.province || raw['省份'] || raw['学校省份']),
    city: normalizeCity(raw.schoolCity || raw.city || raw['城市'] || raw['学校城市'] || raw['所在地']),
    lnArea: text(raw.lnArea || raw['辽宁区域'] || raw['地域'])
  };
}
function fromProfile(profile, rawLoc) {
  const province = normalizeProvince(profile.province);
  const city = normalizeCity(profile.city);
  return {
    lnArea: lnAreaFromProvinceCity(province, city, rawLoc.lnArea),
    province,
    city,
    displayLocation: profile.displayLocation || (province && city ? `${province} · ${city}` : province || city || '地域待核验'),
    locationSource: 'school-profile-center',
    locationConfidence: profile.confidence || 'high',
    locationWarning: profile.entityType === 'official_school' ? '' : '地域按该分校或校区实际办学地显示；具体专业就读地点仍需核验当年招生计划。',
    geoEntity: profile.school || '',
    schoolCanonical: profile.standardSchoolName || profile.school || '',
    regionGroups: profile.regionGroups || [],
    geoSourceMethod: 'official-2026-school-profile',
    geoSourceName: profile.sourceName || '教育部全国普通高等学校名单',
    geoSourceUrl: profile.sourceUrl || '',
    geoSourceYear: 2026,
    geoMatchNote: profile.matchNote || '',
    schoolIdentifier: profile.schoolIdentifier || '',
    natureHint: profile.natureLabel || '',
    schoolProfile: profile
  };
}

export function normalizeLocation(raw, school, major = '') {
  const rawLoc = rawLocation(raw);
  const profile = resolveSchoolProfile(school, rawLoc);
  if (profile) return fromProfile(profile, rawLoc);

  const geo = normalizeSchoolGeo(school, major);
  if (geo) {
    return {
      lnArea: lnAreaFromProvinceCity(geo.province, geo.city, rawLoc.lnArea),
      province: geo.province,
      city: geo.city,
      displayLocation: geo.displayLocation,
      locationSource: geo.locationSource,
      locationConfidence: geo.locationConfidence,
      locationWarning: geo.locationWarning,
      geoEntity: geo.geoEntity,
      schoolCanonical: geo.schoolCanonical,
      regionGroups: geo.regionGroups,
      geoSourceMethod: geo.geoSourceMethod || '',
      geoSourceName: geo.geoSourceName || '',
      geoSourceUrl: geo.geoSourceUrl || '',
      geoSourceYear: geo.geoSourceYear || '',
      geoMatchNote: geo.geoMatchNote || '',
      schoolIdentifier: geo.schoolIdentifier || '',
      natureHint: geo.natureHint || ''
    };
  }
  if (rawLoc.province) {
    return {
      lnArea: rawLoc.lnArea || lnAreaFromProvinceCity(rawLoc.province, rawLoc.city),
      province: rawLoc.province,
      city: rawLoc.city,
      displayLocation: rawLoc.city ? `${rawLoc.province} · ${rawLoc.city}` : rawLoc.province,
      locationSource: 'record-fallback',
      locationConfidence: rawLoc.city ? 'medium' : 'low',
      locationWarning: rawLoc.city ? '学校未进入统一资料中心，地域来自记录字段。' : '城市字段待核验',
      geoEntity: '', schoolCanonical: '', regionGroups: []
    };
  }
  return {
    lnArea: rawLoc.lnArea,
    province: '', city: '',
    displayLocation: rawLoc.lnArea || '地域待核验',
    locationSource: rawLoc.lnArea ? 'ln-area' : 'missing',
    locationConfidence: 'low',
    locationWarning: '地域待核验',
    geoEntity: '', schoolCanonical: '', regionGroups: []
  };
}
""")

write('functions/_lib/school-display-tags.js', """import { resolveSchoolProfile, getSchoolProfileDisplayTags } from '../../shared/resources/schools/school-profile-center.js';
import { enrichBottomLineFields } from './bottomline-policy.js';

function text(value) { return String(value || '').trim(); }
function fallbackNature(record = {}) {
  const value = [record.natureType, record.schoolNature, record.natureLabel, record.nature, record.natureRaw].map(text).join(' ');
  if (/民办|独立/.test(value)) return { natureType: 'private', natureLabel: '民办' };
  if (/合作办学/.test(value)) return { natureType: 'cooperative', natureLabel: '合作办学' };
  if (/公办/.test(value)) return { natureType: 'public', natureLabel: '公办' };
  return { natureType: 'unknown', natureLabel: '性质待核验' };
}

export function makeDisplayLocation(record = {}) {
  const profile = record.schoolProfile || resolveSchoolProfile(record.school, record);
  if (profile?.displayLocation) return profile.displayLocation;
  if (record.displayLocation) return record.displayLocation;
  const province = text(record.province);
  const city = text(record.city);
  return province && city ? `${province} · ${city}` : (city || province || text(record.lnArea || record.region) || '地域待核验');
}

export function buildDisplayTags(record = {}) {
  const profile = record.schoolProfile || resolveSchoolProfile(record.school, record);
  const nature = profile ? { natureType: profile.natureType, natureLabel: profile.natureLabel } : fallbackNature(record);
  const displayLocation = makeDisplayLocation({ ...record, schoolProfile: profile });
  const schoolTierTags = profile?.schoolTierTags ? [...profile.schoolTierTags] : (Array.isArray(record.schoolTierTags) ? record.schoolTierTags : []);
  const schoolTags = schoolTierTags.length ? schoolTierTags : (profile?.isNon985211 ? ['双非（非985/211）'] : []);
  const bottomLine = enrichBottomLineFields({ ...record, natureLabel: nature.natureLabel, natureType: nature.natureType, schoolTags });
  return {
    schoolProfile: profile || null,
    schoolTags,
    schoolTierTags: schoolTags,
    natureLabel: nature.natureLabel,
    natureType: nature.natureType,
    is985: Boolean(profile?.is985),
    is211: Boolean(profile?.is211),
    isNon985211: Boolean(profile?.isNon985211),
    schoolEntityType: profile?.entityType || 'official_school',
    schoolEntityTypeLabel: profile?.entityTypeLabel || '',
    parentSchoolName: profile?.parentSchoolName || '',
    schoolProfileDisplayTags: profile ? getSchoolProfileDisplayTags(profile) : [...new Set([...schoolTags, nature.natureLabel, displayLocation].filter(Boolean))],
    schoolProfileSource: profile?.sourceName || '',
    schoolProfileSourceUrl: profile?.sourceUrl || '',
    schoolProfileAsOfDate: profile?.sourceAsOfDate || '',
    doubleNonDefinition: profile?.doubleNonDefinition || '非985且非211；不等同于非双一流',
    ...bottomLine,
    displayLocation,
    province: profile?.province?.replace(/省$|市$|自治区$/g, '') || record.province || '',
    city: profile?.city?.replace(/市$|地区$|自治州$/g, '') || record.city || '',
    locationSource: profile ? 'school-profile-center' : (record.locationSource || ''),
    locationConfidence: profile?.confidence || record.locationConfidence || '',
    locationWarning: record.locationWarning || '',
    geoEntity: profile?.school || record.geoEntity || '',
    schoolCanonical: profile?.standardSchoolName || record.schoolCanonical || '',
    regionGroups: profile?.regionGroups || record.regionGroups || [],
    geoSourceMethod: profile ? 'official-2026-school-profile' : (record.geoSourceMethod || ''),
    geoSourceName: profile?.sourceName || record.geoSourceName || '',
    geoSourceUrl: profile?.sourceUrl || record.geoSourceUrl || '',
    geoSourceYear: profile ? 2026 : (record.geoSourceYear || ''),
    geoMatchNote: profile?.matchNote || record.geoMatchNote || '',
    schoolIdentifier: profile?.schoolIdentifier || record.schoolIdentifier || ''
  };
}
""")

# Create a versioned major-pool entry and render file so browsers never reuse the old card code.
render = read('ln-rank/js/feature/major-pool/render.js')
old_tags = """function tags(record) {
  const arr = [];
  if (Array.isArray(record.schoolTags)) arr.push(...record.schoolTags);
  if (record.natureLabel) arr.push(record.natureLabel);
  if (record.displayLocation) arr.push(record.displayLocation);
  if (record.geoEntity && record.geoEntity !== record.school) arr.push(record.geoEntity);
  if (record.locationWarning) arr.push(record.locationWarning);
  if (Array.isArray(record.bottomLineTags)) arr.push(...record.bottomLineTags.slice(0, 2));
  return [...new Set(arr.filter(Boolean))].slice(0, 6);
}
"""
new_tags = """function tags(record) {
  const arr = [];
  const tier = Array.isArray(record.schoolTierTags) && record.schoolTierTags.length ? record.schoolTierTags : record.schoolTags;
  if (Array.isArray(tier)) arr.push(...tier);
  else if (record.isNon985211) arr.push('双非（非985/211）');
  arr.push(record.natureLabel || '性质待核验');
  if (record.schoolEntityTypeLabel) arr.push(record.schoolEntityTypeLabel);
  arr.push(record.displayLocation || '地域待核验');
  if (Array.isArray(record.bottomLineTags)) arr.push(...record.bottomLineTags.filter(tag => !arr.includes(tag)));
  if (record.locationWarning) arr.push(record.locationWarning);
  return [...new Set(arr.filter(Boolean))];
}
"""
render = one(render, old_tags, new_tags, 'major card tags')
render = render.replace("if (tag.includes('民办') || tag.includes('独立')) return 'private';", "if (tag.includes('民办') || tag.includes('独立') || tag.includes('合作办学')) return 'private';")
write('ln-rank/js/feature/major-pool/render.v3957_0.js', render)
write('ln-rank/js/feature/major-pool/index.v3957_0.js', """export * from './bands-api.js?v=3951_0';
export * from './render.v3957_0.js?v=3957_0';
export * from './keyword-parser.js?v=3951_0';
export * from './chips.js?v=3951_0';
export * from './preset-policy.js?v=3951_0';
export * from './major-keyword-policy.js?v=3951_0';
export * from './project-keyword-policy.js?v=3951_0';
export * from './industry-keyword-policy.js?v=3951_0';
export * from './keyword-token-classifier.js?v=3951_0';
export * from './review-point-builder.js?v=3951_0';
export * from './local-strength-view.js?v=3951_0';
""")

app_core = read('ln-rank/js/app.v3951_0.js')
app_core = app_core.replace("./feature/major-pool/index.js?v=3951_0", "./feature/major-pool/index.v3957_0.js?v=3957_0")
app_core = app_core.replace("./feature/selection-pool/index.v3956_0.js?v=3956_0", "./feature/selection-pool/index.v3957_0.js?v=3957_0")
write('ln-rank/js/app.v3951_0.js', app_core)

app_wrapper = read('ln-rank/js/app.v3956_0.js').replace("./app.v3951_0.js?v=3956_0", "./app.v3951_0.js?v=3957_0")
app_wrapper = app_wrapper.replace("?v=3955_0'", "?v=3957_0'")
write('ln-rank/js/app.v3957_0.js', app_wrapper)

# Persist all school profile fields in the selected-professional store.
store = read('ln-rank/js/feature/selection-pool/store.js')
store_anchor = """    schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags.map(x => cleanText(x, 40)).filter(Boolean).slice(0, 8) : [],
"""
store_extra = """    schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags.map(x => cleanText(x, 40)).filter(Boolean).slice(0, 8) : [],
    schoolTierTags: Array.isArray(record.schoolTierTags) ? record.schoolTierTags.map(x => cleanText(x, 40)).filter(Boolean).slice(0, 8) : [],
    is985: Boolean(record.is985),
    is211: Boolean(record.is211),
    isNon985211: Boolean(record.isNon985211),
    schoolEntityType: cleanText(record.schoolEntityType, 40),
    schoolEntityTypeLabel: cleanText(record.schoolEntityTypeLabel, 40),
    parentSchoolName: cleanText(record.parentSchoolName, 120),
    doubleNonDefinition: cleanText(record.doubleNonDefinition, 100),
"""
store = one(store, store_anchor, store_extra, 'selection profile persistence')
write('ln-rank/js/feature/selection-pool/store.js', store)
write('ln-rank/js/feature/selection-pool/index.v3957_0.js', """export * from './store.js?v=3957_0';
export * from './analysis.js?v=3956_0';
export * from './path-analysis-api.js?v=3956_0';
export * from './candidate-context.js?v=3956_0';
export * from './recompute.js?v=3956_0';
export * from './health-lights.js?v=3956_0';
export * from './feishu-report-api.v3956_0.js?v=3956_0';
export * from './controller.js?v=3956_0';
""")

selection = read('ln-rank/js/selection-pool.v3951_0.js')
selection = selection.replace("./feature/selection-pool/index.v3956_0.js?v=3956_0", "./feature/selection-pool/index.v3957_0.js?v=3957_0")
profile_helper = """
function itemSchoolProfileHtml(item = {}) {
  const tier = Array.isArray(item.schoolTierTags) && item.schoolTierTags.length ? item.schoolTierTags : item.schoolTags;
  const tags = [
    ...(Array.isArray(tier) ? tier : []),
    item.natureLabel || '性质待核验',
    item.schoolEntityTypeLabel || '',
    item.displayLocation || '地域待核验'
  ];
  const values = [...new Set(tags.filter(Boolean))];
  return values.map(value => `<span class=\"workspace-school-profile-tag\">${escapeHtml(value)}</span>`).join('');
}

"""
selection = one(selection, "function itemHtml(item, index, total) {", profile_helper + "function itemHtml(item, index, total) {", 'selection profile helper')
selection = selection.replace("${location}${campusTag}${itemCodeText(item)}", "${itemSchoolProfileHtml(item)}${campusTag}${itemCodeText(item)}")
write('ln-rank/js/selection-pool.v3951_0.js', selection)
write('ln-rank/js/selection-pool.v3957_0.js', "await import('./selection-pool.v3951_0.js?v=3957_0');\n")

# Activate versioned entry points.
for rel in ('ln-rank/index.html', 'ln-rank/selection-pool.html'):
    page = read(rel).replace('v3.9.56.0', 'v3.9.57.0').replace('?v=3956_0', '?v=3957_0')
    if rel.endswith('index.html'):
        page = page.replace('/ln-rank/js/app.v3956_0.js?v=3957_0', '/ln-rank/js/app.v3957_0.js?v=3957_0')
    else:
        page = page.replace('/ln-rank/js/selection-pool.v3956_0.js?v=3957_0', '/ln-rank/js/selection-pool.v3957_0.js?v=3957_0')
    write(rel, page)

# Register the server-oriented profile bundle separately from the lightweight browser link resolver.
registry = read('shared/resources/resource-registry.js').replace("'v3956_0'", "'v3957_0'", 1)
registry = registry.replace("fullDirectoryPolicy: 'lazy-single-flight'", "fullDirectoryPolicy: 'lazy-single-flight',\n    profileModule: '/shared/resources/schools/school-profile-center.js',\n    profilePolicy: 'server-sync-official-2026',\n    profileFields: Object.freeze(['officialName','campusEntity','province','city','nature','985','211','doubleNon'])")
write('shared/resources/resource-registry.js', registry)


def mutate_meta(data):
    data['version'] = 'v3.9.57.0'
    data['assetVersion'] = 'v3957_0'
    data['releaseName'] = 'v3.9.57.0-unified-school-profile-card-tags-no-fenxi'
    data['releaseGate'] = 'official-2026-school-profile, campus-inheritance, 985-211-double-non, public-private-card-tags, protected-fenxi-runtime-unchanged'
    data['runtimeCacheQueryVersion'] = 'v3957_0'
    data['sharedResourceCenterVersion'] = 'v3957_0'
    data['mainJs'] = 'js/app.v3957_0.js'
    data['selectionPoolJs'] = 'js/selection-pool.v3957_0.js'
    entries = data.get('jsEntry', [])
    entries = ['js/app.v3957_0.js' if item == 'js/app.v3956_0.js' else item for item in entries]
    entries = ['js/selection-pool.v3957_0.js' if item == 'js/selection-pool.v3956_0.js' else item for item in entries]
    for item in ['js/feature/major-pool/index.v3957_0.js','js/feature/major-pool/render.v3957_0.js','js/feature/selection-pool/index.v3957_0.js']:
        if item not in entries: entries.append(item)
    data['jsEntry'] = entries
    data.update({
        'sharedSchoolProfileContract': True,
        'schoolProfileOfficial2026Contract': True,
        'schoolProfileNatureContract': True,
        'schoolProfile985211Contract': True,
        'schoolProfileDoubleNonContract': True,
        'schoolProfileCampusInheritanceContract': True,
        'schoolProfileCardAlwaysVisibleContract': True,
        'schoolProfileSelectionPoolContract': True,
        'schoolProfileDoubleNonDefinition': '非985且非211；不等同于非双一流',
        'sharedSchoolProfileResource': '../shared/resources/schools/school-profile-center.js'
    })

update_json('ln-rank/active-assets.json', mutate_meta)
update_json('ln-rank/release-meta.json', mutate_meta)

print('school profile v3957 integration applied')
