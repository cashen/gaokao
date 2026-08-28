from pathlib import Path
import re, json, shutil, zipfile, os, datetime
root=Path('/mnt/data/lnrank_build_393313')
ln=root/'ln-rank'
VERSION='v3.9.33.13'
ASSET='v3933_13'
asset='3933_13'
release='v3.9.33.13-ln-rank-aux-background-entry-211-mainline-human-contract-no-fenxi'
md_path=Path('/mnt/data/all-211-school-background-kb-v0.1.md')
md=md_path.read_text(encoding='utf-8')

def clean(s):
    return re.sub(r'\s+', ' ', (s or '').replace('\u3000',' ')).strip()

def split_section(text, start_heading):
    # start_heading regex literal heading; return until next ### or ## S or #
    m=re.search(start_heading, text)
    if not m: return ''
    start=m.end()
    n=re.search(r'\n###\s+|\n##\s+S\d+\s+|\n#\s+', text[start:])
    end=start+n.start() if n else len(text)
    return text[start:end].strip()

def parse_table(block):
    rows=[]
    for line in block.splitlines():
        line=line.strip()
        if not (line.startswith('|') and line.endswith('|')): continue
        if re.match(r'^\|\s*-+', line): continue
        cells=[clean(c) for c in line.strip('|').split('|')]
        if cells and cells[0] in ('本科专业 / 专业类','本科专业','专业 / 项目'): continue
        if len(cells)>=2 and cells[0] and not cells[0].startswith('---'):
            rows.append(cells)
    return rows

def split_majors(s):
    s=clean(s)
    s=re.sub(r'等$', '', s)
    parts=re.split(r'[、,，;/；]|\s+和\s+|和', s)
    out=[]
    for p in parts:
        p=clean(p)
        if not p: continue
        # keep short valid names; remove explanatory suffix
        p=re.sub(r'相关$', '', p).strip()
        if p and p not in out: out.append(p)
    return out or ([s] if s else [])

def parse_dir_rows(rows, level, label):
    out=[]
    for cells in rows:
        majors=split_majors(cells[0])
        direction=clean(cells[1] if len(cells)>1 else cells[0])
        evidence=clean(cells[2] if len(cells)>2 else '')
        review=clean(cells[3] if len(cells)>3 else '')
        review_points=[x for x in re.split(r'[、,，;/；]', review) if clean(x)] or ['培养方案','招生章程','课程方向']
        out.append({
            'direction': direction or cells[0],
            'displayLabel': label,
            'level': level,
            'majors': majors,
            'evidenceText': evidence,
            'reviewPoints': [clean(x) for x in review_points][:4],
            'humanNote': f"这个方向和学校公开学科背景存在对应关系，建议再看{ '、'.join([clean(x) for x in review_points][:3]) or '培养方案、招生章程' }。",
            'canTriggerFrontend': level != 'pending'
        })
    return out

sections=re.split(r'\n(?=## S\d+\s+)', md)
schools=[]
for sec in sections:
    hm=re.match(r'##\s+(S\d+)\s+([^\n]+)', sec.strip())
    if not hm: continue
    sid,name=hm.group(1),clean(hm.group(2))
    batch=clean(re.search(r'所属批次：([^\n]+)', sec).group(1)) if re.search(r'所属批次：([^\n]+)', sec) else ''
    summary=clean(split_section(sec, r'###\s+这个学校可以先这样理解'))
    summary=re.sub(r'\n+', ' ', summary)
    evidence_block=split_section(sec, r'###\s+已确认的官方/准官方证据')
    primary=parse_dir_rows(parse_table(split_section(sec, r'###\s+可进入“本校方向”的本科专业')), 'primary', '本校方向')
    secondary=parse_dir_rows(parse_table(split_section(sec, r'###\s+可进入“本校相关”的本科专业')), 'secondary', '本校相关')
    trajectory=parse_dir_rows(parse_table(split_section(sec, r'###\s+只做“方向提醒”的专业')), 'trajectory', '方向提醒')
    pending=split_section(sec, r'###\s+暂不前台显示\s*/\s*待核验') or split_section(sec, r'###\s+待核验')
    pending_items=[clean(re.sub(r'^[-*]\s*','', l)) for l in pending.splitlines() if l.strip().startswith(('-', '*'))]
    is_military=bool(re.search(r'国防科技大学|海军军医大学|第二军医大学|空军军医大学|第四军医大学', name))
    schools.append({
        'id': sid,
        'school': name,
        'normalizedName': name.replace('（','(').replace('）',')'),
        'aliases': [name.replace('（','(').replace('）',')')],
        'batch': batch,
        'province': '',
        'city': '',
        'is211': True,
        'isOrdinaryEntry': not is_military,
        'isMilitarySpecial': is_military,
        'specialBoundary': '军事类院校涉及单独招生、体检、政审、培养管理和招生章程，本页不与普通本科招生混合判断。' if is_military else '',
        'summaryForParent': summary,
        'evidenceSummary': evidence_block[:1200],
        'directions': primary+secondary+trajectory,
        'primaryDirections': primary,
        'secondaryDirections': secondary,
        'trajectoryWarnings': trajectory,
        'pendingReview': pending_items[:8],
        'sourceIds': ['G001','G002','G003','G004']
    })

# generated indexes
major_map={}
for s in schools:
    for d in s['directions']:
        if not d.get('canTriggerFrontend'): continue
        for m in d['majors']:
            key=clean(m)
            if not key: continue
            major_map.setdefault(key, {'major':key,'schools':[]})
            major_map[key]['schools'].append({'school':s['school'],'label':d['displayLabel'],'level':d['level'],'direction':d['direction'],'reviewPoints':d['reviewPoints'],'isMilitarySpecial':s['isMilitarySpecial']})
majors=sorted(major_map.values(), key=lambda x:(-len(x['schools']), x['major']))
index={
    'meta': {
        'version': VERSION,
        'assetVersion': ASSET,
        'generatedAt': '2026-06-14',
        'source': 'all-211-school-background-kb-v0.1.md',
        'dataBoundary': '本页只帮助家庭理解 211 院校和本科专业之间的背景关系，不代表录取判断，也不代表专业推荐。',
        'totalEntries': len(schools),
        'ordinaryEntries': sum(1 for s in schools if s['isOrdinaryEntry']),
        'militarySpecialEntries': sum(1 for s in schools if s['isMilitarySpecial'])
    },
    'schools': schools,
    'majors': majors,
    'copy': {
        'allowedLabels': ['本校方向','本校相关','方向提醒','建议再看','待核验'],
        'boundary': '只用于家庭复核，不代表录取判断。',
        'scoreBoundary': '分数入口只按辽宁 2025 物理类历史记录做辅助查看，不代表 2026 录取结果。'
    },
    'sourceRegistry': [
        {'sourceId':'G001','sourceTitle':'教育部：“211工程”学校名单','sourceType':'官方','sourceYear':'2005','retrievedAt':'2026-06-14','isOfficial':True,'isVerified':True,'canTriggerFrontend':False},
        {'sourceId':'G002','sourceTitle':'阳光高考 / 学信网：“211”工程学校名单','sourceType':'准官方','sourceYear':'2008','retrievedAt':'2026-06-14','isOfficial':'quasi','isVerified':True,'canTriggerFrontend':False},
        {'sourceId':'G003','sourceTitle':'第二轮“双一流”建设高校及建设学科名单','sourceType':'官方转载 / 准官方','sourceYear':'2022','retrievedAt':'2026-06-14','isOfficial':'quasi','isVerified':True,'canTriggerFrontend':'学科背景证据，必须对应本科专业后使用'},
        {'sourceId':'G004','sourceTitle':'全国第四轮学科评估结果','sourceType':'官方','sourceYear':'2017','retrievedAt':'2026-06-14','isOfficial':True,'isVerified':True,'canTriggerFrontend':'学科背景证据，必须对应本科专业后使用'}
    ]
}
# dirs
for p in ['kb/211-mainline','data/211-mainline','js/211-mainline']:
    (ln/p).mkdir(parents=True, exist_ok=True)
( root/'functions/_lib').mkdir(parents=True, exist_ok=True)
( root/'functions/api').mkdir(parents=True, exist_ok=True)

def js_export_const(name, obj):
    return f"/* {VERSION} 211 院校专业背景字段化索引。由 all-211-school-background-kb-v0.1.md 转换。 */\nexport const {name} = {json.dumps(obj,ensure_ascii=False,indent=2)};\nexport default {name};\n"

(ln/'kb/211-mainline/211-school-background.generated.js').write_text(js_export_const('ALL_211_SCHOOL_BACKGROUND_INDEX', index), encoding='utf-8')
(ln/'kb/211-mainline/211-source-registry.generated.js').write_text(js_export_const('ALL_211_SOURCE_REGISTRY', index['sourceRegistry']), encoding='utf-8')
(ln/'kb/211-mainline/211-undergraduate-major-map.generated.js').write_text(js_export_const('ALL_211_UNDERGRADUATE_MAJOR_MAP', majors), encoding='utf-8')
(ln/'kb/211-mainline/211-school-alias-bridge.generated.js').write_text(js_export_const('ALL_211_SCHOOL_ALIAS_BRIDGE', [{'school':s['school'],'aliases':s['aliases']} for s in schools]), encoding='utf-8')
(ln/'kb/211-mainline/211-special-boundary.generated.js').write_text(js_export_const('ALL_211_SPECIAL_BOUNDARY', [s for s in schools if s['isMilitarySpecial']]), encoding='utf-8')
(ln/'kb/211-mainline/211-mainline-copy-contract.js').write_text("""/* v3.9.33.13 211 前台文案合同 */
export const ALL_211_COPY_CONTRACT = {
  boundary: '本页只帮助家庭理解 211 院校和本科专业之间的背景关系，不代表录取判断，也不代表专业推荐。',
  scoreBoundary: '分数入口只按辽宁 2025 物理类历史记录做辅助查看，不代表 2026 录取结果。',
  militaryBoundary: '军事类院校涉及单独招生、体检、政审、培养管理和招生章程，本页不与普通本科招生混合判断。',
  labels: ['本校方向','本校相关','方向提醒','建议再看','待核验']
};
export default ALL_211_COPY_CONTRACT;
""", encoding='utf-8')
# data JSON
(ln/'data/211-mainline/211-mainline-index.generated.json').write_text(json.dumps(index,ensure_ascii=False,indent=2), encoding='utf-8')
(ln/'data/211-mainline/school-211-index.generated.json').write_text(json.dumps({'schools':schools},ensure_ascii=False,indent=2), encoding='utf-8')
(ln/'data/211-mainline/major-211-index.generated.json').write_text(json.dumps({'majors':majors},ensure_ascii=False,indent=2), encoding='utf-8')
(ln/'data/211-mainline/score-211-index.generated.json').write_text(json.dumps({'boundary':index['copy']['scoreBoundary'],'requiresApi':True},ensure_ascii=False,indent=2), encoding='utf-8')
(ln/'data/211-mainline/211-mainline-meta.generated.json').write_text(json.dumps(index['meta'],ensure_ascii=False,indent=2), encoding='utf-8')
# docs include md and audit
(ln/'docs').mkdir(exist_ok=True)
shutil.copy2('/mnt/data/all-211-school-background-kb-v0.1.md', ln/'docs/all-211-school-background-kb-v0.1.md')
shutil.copy2('/mnt/data/all-211-school-background-kb-audit-v0.1.md', ln/'docs/all-211-school-background-kb-audit-v0.1.md')

# Helper JS for frontend knowledge hint
(ln/'js/knowledge/211-background-hint.js').write_text(r'''/* v3.9.33.13 全国 211 院校背景分层提示合同
 * 只在“学校 + 本科专业 + 已核验证据”同时命中时显示。
 */
import { candidateMajorNames, normalizeMajorName } from './major-match-contract.js?v=3933_13';
import { ALL_211_SCHOOL_BACKGROUND_INDEX } from '../../kb/211-mainline/211-school-background.generated.js?v=3933_13';

function clean(value, max = 160) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max); }
function normalizeSchoolStrict(value = '') { return clean(value, 160).replace(/\(/g, '（').replace(/\)/g, '）').replace(/\s+/g, ''); }
function normalizeMajorLoose(value = '') { return normalizeMajorName(value).replace(/专业类$/, '类').replace(/专业$/, ''); }
function levelRank(level) { return level === 'primary' ? 3 : level === 'secondary' ? 2 : level === 'trajectory' ? 1 : 0; }
function compact(value = '') { return clean(value, 80).replace(/方向$/, '') || '专业背景'; }
function reviewPoints(points = []) { const arr = (Array.isArray(points) ? points : []).map(x => clean(x, 30)).filter(Boolean); return (arr.length ? arr : ['培养方案','招生章程','课程方向']).slice(0,3); }
function sameSchool(school, recordSchool) {
  const target = normalizeSchoolStrict(recordSchool);
  if (!target) return false;
  const names = [school.school, ...(Array.isArray(school.aliases) ? school.aliases : [])].map(normalizeSchoolStrict).filter(Boolean);
  return names.some(n => target === n || target.startsWith(n + '（') || target.startsWith(n + '('));
}
function sameMajor(ruleMajor, candidateSet) {
  const rule = normalizeMajorLoose(ruleMajor);
  if (!rule) return false;
  for (const name of candidateSet || []) {
    const n = normalizeMajorLoose(name);
    if (!n) continue;
    if (n === rule) return true;
    if (rule.endsWith('类') && n.includes(rule.replace(/类$/, ''))) return true;
    if (n.endsWith('类') && rule.includes(n.replace(/类$/, ''))) return true;
    if (rule.length >= 4 && n.includes(rule)) return true;
    if (n.length >= 4 && rule.includes(n)) return true;
  }
  return false;
}
export function get211BackgroundHint(record = {}) {
  try {
    const schoolName = clean(record.school || record.schoolName || '', 120);
    const names = candidateMajorNames(record);
    if (!schoolName || !names.size) return { visible: false, reason: 'missing-school-or-major' };
    const school = ALL_211_SCHOOL_BACKGROUND_INDEX.schools.find(s => sameSchool(s, schoolName));
    if (!school) return { visible: false, reason: 'not-211-kb' };
    if (school.isMilitarySpecial) return { visible: false, reason: 'military-special-hidden', specialBoundary: school.specialBoundary };
    const hits = [];
    for (const line of Array.isArray(school.directions) ? school.directions : []) {
      if (!line?.canTriggerFrontend) continue;
      if ((Array.isArray(line.majors) ? line.majors : []).some(m => sameMajor(m, names))) hits.push(line);
    }
    if (!hits.length) return { visible: false, reason: 'no-major-evidence', school: school.school };
    hits.sort((a,b) => levelRank(b.level) - levelRank(a.level));
    const hit = hits[0];
    return {
      visible: true,
      source: '211-mainline-kb',
      school: school.school,
      level: hit.level || 'trajectory',
      label: hit.displayLabel || '方向提醒',
      direction: compact(hit.direction),
      text: `${hit.displayLabel || '方向提醒'}｜${compact(hit.direction)}`,
      reviewPoints: reviewPoints(hit.reviewPoints),
      canTriggerFrontend: true,
      boundary: ALL_211_SCHOOL_BACKGROUND_INDEX.copy.boundary
    };
  } catch (error) {
    console.warn('[ln-rank] 211 background hint failed', { school: record?.school, major: record?.major, message: error?.message || String(error) });
    return { visible: false, reason: 'resolver-error' };
  }
}
export function has211BackgroundHint(record = {}) { return get211BackgroundHint(record).visible === true; }
''', encoding='utf-8')

# Function lib 211 with helper
lib_code = """/* v3.9.33.13 211 mainline runtime KB */\nconst ALL_211_SCHOOL_BACKGROUND_INDEX = %s;\nfunction clean(v,max=160){return String(v??'').replace(/\\s+/g,' ').trim().slice(0,max)}\nfunction ns(v=''){return clean(v,160).replace(/\\(/g,'（').replace(/\\)/g,'）').replace(/\\s+/g,'')}\nfunction nm(v=''){return clean(v,220).replace(/[（(].*?[）)]/g,'').replace(/\\s+/g,'').replace(/专业类$/,'类').replace(/专业$/,'')}\nfunction splitNames(record={}){const arr=[record.major,record.majorName,record.rawMajorName,record.standardMajor?.name].filter(Boolean);const out=new Set();for(const x of arr){const base=nm(x); if(base) out.add(base); const ms=String(x).matchAll(/[（(]([^（）()]+)[）)]/g); for(const m of ms){for(const p of String(m[1]).split(/[、,，;；/]/)){const n=nm(p); if(n) out.add(n)}}}return out}\nfunction sameSchool(s, schoolName){const target=ns(schoolName); if(!target)return false; const names=[s.school,...(Array.isArray(s.aliases)?s.aliases:[])].map(ns).filter(Boolean); return names.some(n=>target===n||target.startsWith(n+'（'))}\nfunction sameMajor(rule,cands){const r=nm(rule); if(!r)return false; for(const x of cands||[]){const n=nm(x); if(!n)continue; if(n===r)return true; if(r.endsWith('类')&&n.includes(r.replace(/类$/,'')))return true; if(n.endsWith('类')&&r.includes(n.replace(/类$/,'')))return true; if(r.length>=4&&n.includes(r))return true; if(n.length>=4&&r.includes(n))return true;} return false}\nfunction rank(level){return level==='primary'?3:level==='secondary'?2:level==='trajectory'?1:0}\nexport function get211MainlineMeta(){return ALL_211_SCHOOL_BACKGROUND_INDEX}\nexport function get211SchoolSummaries(){return ALL_211_SCHOOL_BACKGROUND_INDEX.schools.map(s=>({school:s.school,batch:s.batch,summaryForParent:s.summaryForParent,primaryCount:s.primaryDirections?.length||0,secondaryCount:s.secondaryDirections?.length||0,trajectoryCount:s.trajectoryWarnings?.length||0,isMilitarySpecial:s.isMilitarySpecial,specialBoundary:s.specialBoundary}))}\nexport function get211MajorSummaries(){return ALL_211_SCHOOL_BACKGROUND_INDEX.majors}\nexport function match211Mainline(record={}){const schoolName=clean(record.school||record.schoolName||''); const cands=splitNames(record); if(!schoolName||!cands.size)return null; const school=ALL_211_SCHOOL_BACKGROUND_INDEX.schools.find(s=>sameSchool(s,schoolName)); if(!school||school.isMilitarySpecial)return null; const hits=[]; for(const line of school.directions||[]){if(line.canTriggerFrontend===false)continue; const matched=(line.majors||[]).find(m=>sameMajor(m,cands)); if(matched)hits.push({...line,matchedMajor:matched,school:school.school,schoolSummary:school.summaryForParent,batch:school.batch})} if(!hits.length)return null; hits.sort((a,b)=>rank(b.level)-rank(a.level)); const h=hits[0]; return {matched:true,school:h.school,level:h.level,displayLabel:h.displayLabel,direction:h.direction,matchedMajor:h.matchedMajor,reviewPoints:(h.reviewPoints||[]).slice(0,4),humanNote:h.humanNote||'',evidenceText:h.evidenceText||'',boundary:ALL_211_SCHOOL_BACKGROUND_INDEX.copy.boundary}}\nexport function present211Mainline(hit){if(!hit||!hit.matched)return null;return{label:hit.displayLabel,direction:hit.direction,short:`${hit.displayLabel}｜${hit.direction}`,reviewPoints:hit.reviewPoints||[],note:hit.humanNote||'',boundary:hit.boundary,evidenceText:hit.evidenceText||''}}\n""" % json.dumps(index, ensure_ascii=False)
(root/'functions/_lib/211-mainline-kb.js').write_text(lib_code, encoding='utf-8')

# API 211 mainline
(root/'functions/api/211-mainline.js').write_text(r'''import { loadAllRecords } from '../_lib/fenxi-manifest.js';
import { normalizeRecord } from '../_lib/fenxi-normalizer.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import { get211MainlineMeta, get211SchoolSummaries, get211MajorSummaries, match211Mainline, present211Mainline } from '../_lib/211-mainline-kb.js';
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function clean(value, max = 80) { return String(value || '').trim().slice(0, max); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function rankSort(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER; }
function normalizeKey(v) { return String(v || '').replace(/\s+/g, '').trim(); }
function includesText(a, b) { return normalizeKey(a).includes(normalizeKey(b)); }
function levelPass(level, filter) { if (filter === 'primary') return level === 'primary'; if (filter === 'primary_secondary') return level === 'primary' || level === 'secondary'; return true; }
function shapeRecord(record, hit, candidateScore = null) { const display = buildDisplayTags(record); const score2025 = record.score2025 ?? record.score; const rank2025 = record.rank2025 ?? record.rank; const delta = Number.isFinite(Number(candidateScore)) && Number.isFinite(Number(score2025)) ? Number(score2025) - Number(candidateScore) : null; const evidence = present211Mainline(hit); return { id: record.id, school: record.school, major: record.major, score2025, rank2025, score2024: record.score2024 ?? null, rank2024: record.rank2024 ?? null, scoreDelta: delta, displayLocation: record.displayLocation || display.displayLocation || '', natureLabel: display.natureLabel || record.nature || '', schoolTags: display.schoolTags || [], mainline211: evidence, mainline211Raw: hit, reviewPoints: evidence?.reviewPoints || [] }; }
async function loadMatchedRecords(request, env, filters = {}) { const { records } = await loadAllRecords(request, env || {}); const out = []; const schoolFilter = clean(filters.school || '', 80); const majorFilter = clean(filters.major || '', 80); const max = Math.max(20, Math.min(500, Number(filters.max || 220))); for (const raw of records) { const record = normalizeRecord(raw); if (!record.school || !record.major || !Number.isFinite(Number(record.score2025 ?? record.score))) continue; if (schoolFilter && !includesText(record.school, schoolFilter)) continue; if (majorFilter && !includesText(record.major, majorFilter)) continue; record.rawText = JSON.stringify(raw).slice(0, 1600); const hit = match211Mainline(record); if (!hit) continue; if (!levelPass(hit.level, filters.level || 'all')) continue; if (Number.isFinite(Number(filters.maxScore)) && Number(record.score2025 ?? record.score) > Number(filters.maxScore)) continue; if (Number.isFinite(Number(filters.minScore)) && Number(record.score2025 ?? record.score) < Number(filters.minScore)) continue; out.push(shapeRecord(record, hit, filters.candidateScore)); } const candidate = Number(filters.candidateScore); out.sort((a,b)=>{ const weight=x=>x?.mainline211Raw?.level === 'primary' ? 3 : x?.mainline211Raw?.level === 'secondary' ? 2 : 1; if(Number.isFinite(candidate)){ const da=Math.abs(Number(a.score2025||0)-candidate); const db=Math.abs(Number(b.score2025||0)-candidate); if(da!==db)return da-db; } return weight(b)-weight(a) || Number(b.score2025||0)-Number(a.score2025||0) || rankSort(a.rank2025)-rankSort(b.rank2025); }); return out.slice(0,max); }
function groupScore(records, score) { const candidate = Number(score); const sort = arr => [...arr].sort((a,b)=>Math.abs(Number(a.score2025)-candidate)-Math.abs(Number(b.score2025)-candidate)); return { near: sort(records.filter(r => Number(r.score2025) >= candidate - 10 && Number(r.score2025) <= candidate)), upper: sort(records.filter(r => Number(r.score2025) > candidate && Number(r.score2025) <= candidate + 10)), lower: sort(records.filter(r => Number(r.score2025) >= candidate - 25 && Number(r.score2025) < candidate - 10)) }; }
export async function onRequest(context) { if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405); try { const url = new URL(context.request.url); const mode = clean(url.searchParams.get('mode') || 'meta', 30); if (mode === 'meta') return json({ ok: true, mode, index: get211MainlineMeta(), schools: get211SchoolSummaries(), majors: get211MajorSummaries(), boundary: get211MainlineMeta().copy.boundary }); if (mode === 'school') { const school = clean(url.searchParams.get('school') || '', 80); if (!school) return json({ ok: false, message: '请选择学校。' }, 400); const records = await loadMatchedRecords(context.request, context.env || {}, { school, max: url.searchParams.get('max') || 240 }); return json({ ok: true, mode, school, records, count: records.length, boundary: '这些信息只用于家庭讨论和人工复核，不代表录取判断依据。' }); } if (mode === 'major') { const major = clean(url.searchParams.get('major') || '', 80); if (!major) return json({ ok: false, message: '请输入专业名称。' }, 400); const records = await loadMatchedRecords(context.request, context.env || {}, { major, max: url.searchParams.get('max') || 240 }); return json({ ok: true, mode, major, records, count: records.length, boundary: '同名专业在不同 211 院校的培养场景可能不同，需继续核验培养方案和招生章程。' }); } if (mode === 'score') { const score = num(url.searchParams.get('score')); if (!Number.isFinite(score) || score <= 0) return json({ ok: false, message: '请输入有效分数。' }, 400); const level = clean(url.searchParams.get('level') || 'primary_secondary', 30); const records = await loadMatchedRecords(context.request, context.env || {}, { candidateScore: score, maxScore: score + 10, minScore: score - 25, level, max: url.searchParams.get('max') || 320 }); const grouped = groupScore(records, score); return json({ ok: true, mode, score, level, records, grouped, count: records.length, boundary: `这里不是录取判断，也不代表 2026 可以直接填。它只是按 2025 年历史最低分和 211 院校背景，把接近 ${score} 分、稍高一点和低一些可讨论的专业分组列出来，方便家庭先讨论。` }); } return json({ ok: false, message: '未知查询方式。' }, 400); } catch (error) { return json({ ok: false, message: '211 背景数据暂时没有读取成功。', hint: '可以稍后重试；这不影响主页面专业初选。', engineerHint: error?.message || String(error) }, 500); } }
''', encoding='utf-8')

# 211 HTML
(ln/'211-mainline.html').write_text('''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>全国 211 院校专业背景怎么先看｜ln-rank</title>
  <link rel="stylesheet" href="/ln-rank/css/dist/211-mainline.v3933_13.css?v=3933_13" />
</head>
<body>
  <main class="lm-page jm-page">
    <header class="lm-hero jm-hero">
      <div>
        <p class="lm-eyebrow">辽宁物理类 · 全国 211 院校专业背景</p>
        <h1>全国 211 院校专业背景怎么先看？</h1>
        <p>可以按学校、专业或分数查看：哪些 211 院校专业和学科建设、本科专业对应、方向提醒有关。这里只帮助家庭复核，不代表录取判断。</p>
      </div>
    </header>

    <section class="lm-boundary lm-boundary-soft" aria-label="使用边界">
      <p><b>先说明：</b>本页只帮助家庭理解 211 院校和本科专业之间的背景关系，不代表录取判断，也不代表专业结论。</p>
      <details>
        <summary>为什么不能直接当结论？</summary>
        <div class="lm-boundary-detail">
          <p>博士点、重点学科、双一流建设学科和第四轮学科评估都是学校背景证据。只有能与本科招生专业明确对应时，才显示“本校方向 / 本校相关 / 方向提醒”。</p>
        </div>
      </details>
    </section>

    <section class="lm-start-guide jm-start-guide" aria-label="不知道从哪里开始">
      <h2>不知道从哪开始？</h2>
      <div class="lm-start-grid">
        <button type="button" class="lm-start-card" data-start-tab="school"><b>已经知道学校</b><span>按学校看：这所 211 院校主要和哪些本科专业方向有关。</span></button>
        <button type="button" class="lm-start-card" data-start-tab="major"><b>孩子有专业方向</b><span>按专业看：同一个专业在不同 211 院校里的学校背景差异。</span></button>
        <button type="button" class="lm-start-card" data-start-tab="score"><b>现在只知道分数</b><span>按辽宁 2025 物理类历史数据，看分数附近的 211 院校专业记录。</span></button>
      </div>
    </section>

    <nav class="lm-tabs" aria-label="查询入口">
      <button type="button" class="lm-tab is-active" data-tab="school">按学校看</button>
      <button type="button" class="lm-tab" data-tab="major">按专业看</button>
      <button type="button" class="lm-tab" data-tab="score">按分数看</button>
    </nav>

    <section class="lm-panel" data-panel="school">
      <div class="lm-panel-head"><div><h2>从学校看：这所 211 院校大概偏什么方向</h2><p>适合已经有目标学校的家庭。先看学校背景，再看本科专业对应和建议再看。</p></div><input id="schoolSearch" class="lm-input" type="search" placeholder="搜索学校，如 西安电子科技大学" /></div>
      <div id="schoolList" class="lm-grid"></div><div id="schoolDetail" class="lm-detail" hidden></div>
    </section>

    <section class="lm-panel" data-panel="major" hidden>
      <div class="lm-panel-head"><div><h2>从专业看：同名专业在不同 211 院校有什么差别</h2><p>适合孩子已有方向的家庭。这里不写专业结论，只提示学校背景和本科专业对应关系。</p></div><input id="majorSearch" class="lm-input" type="search" placeholder="搜索专业，如 通信工程、电气、法学" /></div>
      <div class="lm-quick-row" id="majorQuickRow"></div><div id="majorList" class="lm-grid"></div><div id="majorDetail" class="lm-detail" hidden></div>
    </section>

    <section class="lm-panel" data-panel="score" hidden>
      <div class="lm-panel-head"><div><h2>从分数看：这个分数附近有哪些 211 专业记录可以先讨论</h2><p>这里只按 2025 历史最低分/位次整理，不代表 2026 录取结果。军事类特殊院校不混入普通分数入口。</p></div></div>
      <div class="lm-score-console lm-score-console-human"><label>孩子分数 <input id="scoreInput" class="lm-score-input" inputmode="numeric" placeholder="如 580" /></label><label>查看方式 <select id="scoreLevel" class="lm-select"><option value="primary_secondary">先看本校方向和本校相关</option><option value="primary">只看本校方向</option><option value="all">连方向提醒也一起看</option></select></label><button id="scoreQuery" class="lm-primary" type="button">按分数查看</button></div>
      <div id="scoreResult" class="lm-detail"></div>
    </section>

    <section class="lm-howto lm-next-step"><h2>看完这页，可以这样用</h2><div class="lm-howto-grid"><div><b>先看学校背景</b><p>确认这所 211 院校与孩子想看的本科专业是否有可复核对应。</p></div><div><b>再看专业差异</b><p>同名专业在不同学校可能对应不同学院、课程和培养场景。</p></div><div><b>最后看章程</b><p>继续核验招生章程、培养方案、校区、学费、大类分流和体检要求。</p></div><div><b>分数只作辅助</b><p>分数入口只整理历史记录，不替家庭判断录取结果。</p></div></div></section>
    <footer class="lm-footer">版本：v3.9.33.13｜数据口径：211 KB v0.1 + 辽宁 2025 物理类历史数据｜本页用于家庭讨论和人工复核，不做录取预测。</footer>
  </main>
  <script type="module" src="/ln-rank/js/211-mainline/211-mainline-app.v3933_13.js?v=3933_13"></script>
</body>
</html>
''', encoding='utf-8')

# 211 app
(ln/'js/211-mainline/211-mainline-app.v3933_13.js').write_text(r'''import { ALL_211_SCHOOL_BACKGROUND_INDEX } from '../../kb/211-mainline/211-school-background.generated.js?v=3933_13';
const $ = (id) => document.getElementById(id);
function esc(value=''){return String(value==null?'':value).replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));}
function fmt(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('zh-CN'):esc(value||'');}
const state={tab:'school',index:ALL_211_SCHOOL_BACKGROUND_INDEX};
function levelClass(level){return level==='primary'?'primary':level==='secondary'?'secondary':'trajectory'}
function stat(s){return {primary:s.primaryDirections?.length||0,secondary:s.secondaryDirections?.length||0,trajectory:s.trajectoryWarnings?.length||0}}
function schoolCard(s){const c=stat(s);const muted=s.isMilitarySpecial?' is-soft-muted':'';return `<article class="lm-card jm-school-card${muted}"><div class="lm-card-top"><div><h3>${esc(s.school)}</h3><p>${esc(s.batch||'211 院校')}</p></div><span class="lm-pill ${s.isMilitarySpecial?'muted':'primary'}">${s.isMilitarySpecial?'特殊边界':'211'}</span></div><p class="lm-card-note">${esc((s.summaryForParent||'该校已有 211 背景记录，建议结合本科专业再看。').slice(0,110))}</p><div class="lm-stat-row"><span>本校方向 ${fmt(c.primary)}</span><span>本校相关 ${fmt(c.secondary)}</span><span>方向提醒 ${fmt(c.trajectory)}</span></div>${s.isMilitarySpecial?`<p class="lm-card-note is-subtle">${esc(s.specialBoundary)}</p>`:`<button class="lm-card-action" data-school-detail="${esc(s.school)}">查看学校背景</button>`}</article>`}
function renderSchools(){const q=($('schoolSearch')?.value||'').trim();let arr=state.index.schools.filter(s=>!q||s.school.includes(q)||String(s.summaryForParent||'').includes(q));$('schoolList').innerHTML=arr.length?arr.slice(0,q?80:42).map(schoolCard).join(''):`<div class="lm-empty"><b>没有找到明确的 211 学校背景</b><p>可以换个学校名。未命中不代表学校不好，只说明当前 KB 没有前台可触发记录。</p></div>`;$('schoolList').querySelectorAll('[data-school-detail]').forEach(b=>b.addEventListener('click',()=>showSchool(b.dataset.schoolDetail)));}
function directionGroup(title, lines){if(!lines?.length)return '';return `<section class="lm-direction-group"><div class="lm-direction-head"><h3>${esc(title)}</h3><span>${fmt(lines.length)} 条</span></div>${lines.map(line=>`<div class="lm-record-card"><div class="lm-mainline-row"><span class="lm-pill ${levelClass(line.level)}">${esc(line.displayLabel)}</span> ${esc(line.direction)}</div><p class="lm-card-note">本科专业：${esc((line.majors||[]).join(' / '))}</p><p class="lm-review-row">建议再看：${esc((line.reviewPoints||['培养方案','招生章程']).slice(0,4).join(' / '))}</p>${line.evidenceText?`<p class="lm-card-note is-subtle">证据摘要：${esc(line.evidenceText.slice(0,120))}</p>`:''}</div>`).join('')}</section>`}
function showSchool(name){const s=state.index.schools.find(x=>x.school===name);if(!s)return;const root=$('schoolDetail');root.hidden=false;root.innerHTML=`<div class="lm-detail-head"><h2>${esc(s.school)}：先看学校背景，再看本科专业对应</h2><p>${esc(s.summaryForParent||state.index.copy.boundary)}</p>${s.isMilitarySpecial?`<p class="lm-card-note is-subtle">${esc(s.specialBoundary)}</p>`:''}</div>${directionGroup('本校方向',s.primaryDirections)}${directionGroup('本校相关',s.secondaryDirections)}${directionGroup('方向提醒',s.trajectoryWarnings)}${s.pendingReview?.length?`<section class="lm-direction-group"><h3>待核验</h3><ul>${s.pendingReview.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}`;root.scrollIntoView({behavior:'smooth',block:'nearest'});}
function majorCard(m){const primary=m.schools.filter(x=>x.level==='primary').length;const secondary=m.schools.filter(x=>x.level==='secondary').length;const trajectory=m.schools.filter(x=>x.level==='trajectory').length;return `<article class="lm-card"><div class="lm-card-top"><div><h3>${esc(m.major)}</h3><p>涉及 ${fmt(m.schools.length)} 所 211 院校</p></div><span class="lm-pill primary">专业</span></div><div class="lm-stat-row"><span>本校方向 ${fmt(primary)}</span><span>本校相关 ${fmt(secondary)}</span><span>方向提醒 ${fmt(trajectory)}</span></div><button class="lm-card-action" data-major-detail="${esc(m.major)}">查看相关学校</button></article>`}
function renderMajors(){const q=($('majorSearch')?.value||'').trim();let arr=state.index.majors.filter(m=>!q||m.major.includes(q)||m.schools.some(s=>s.school.includes(q)||s.direction.includes(q)));$('majorList').innerHTML=arr.length?arr.slice(0,q?80:45).map(majorCard).join(''):`<div class="lm-empty"><b>没有找到明确的专业背景提示</b><p>可以换个专业名。未命中不代表专业不好，只说明当前 KB 没有前台可触发记录。</p></div>`;$('majorList').querySelectorAll('[data-major-detail]').forEach(b=>b.addEventListener('click',()=>showMajor(b.dataset.majorDetail)));}
function showMajor(major){const m=state.index.majors.find(x=>x.major===major);if(!m)return;const groups=['primary','secondary','trajectory'].map(level=>({level,items:m.schools.filter(x=>x.level===level)}));const root=$('majorDetail');root.hidden=false;root.innerHTML=`<div class="lm-detail-head"><h2>${esc(major)}：不同 211 院校的背景提示</h2><p>同名专业在不同学校可能对应不同学科、学院和培养方向，建议继续看培养方案和招生章程。</p></div>${groups.map(g=>g.items.length?`<section class="lm-direction-group"><div class="lm-direction-head"><h3>${g.level==='primary'?'本校方向':g.level==='secondary'?'本校相关':'方向提醒'}</h3><span>${fmt(g.items.length)} 所</span></div><div class="lm-record-list">${g.items.map(x=>`<article class="lm-record-card"><div class="lm-record-top"><div><h3>${esc(x.school)}</h3><p>${esc(x.direction)}</p></div><span class="lm-pill ${levelClass(x.level)}">${esc(x.label)}</span></div><p class="lm-review-row">建议再看：${esc((x.reviewPoints||[]).join(' / ')||'培养方案 / 招生章程')}</p></article>`).join('')}</div></section>`:'').join('')}`;root.scrollIntoView({behavior:'smooth',block:'nearest'});}
function recordCard(r){const bg=r.mainline211||{};const delta=Number.isFinite(Number(r.scoreDelta))?(Number(r.scoreDelta)>0?`+${r.scoreDelta}`:`${r.scoreDelta}`):'';return `<article class="lm-record-card"><div class="lm-record-top"><div><h3>${esc(r.school)}</h3><p>${esc(r.major)}</p></div><span class="lm-pill ${levelClass(bg.label==='本校方向'?'primary':bg.label==='本校相关'?'secondary':'trajectory')}">${esc(bg.label||'背景提示')}</span></div><div class="lm-data-row"><span>2025最低分：${fmt(r.score2025)}</span><span>位次：${fmt(r.rank2025)}</span>${delta?`<span>相对分数：${esc(delta)}</span>`:''}</div><div class="lm-mainline-row">${esc(bg.short||'211 背景提示')}</div><p class="lm-review-row">建议再看：${esc((bg.reviewPoints||['培养方案','招生章程']).join(' / '))}</p></article>`}
function scoreSection(title, desc, records){return `<section class="lm-score-section"><h3>${esc(title)}</h3><p class="lm-score-section-desc">${esc(desc)}</p>${records?.length?records.slice(0,40).map(recordCard).join(''):`<div class="lm-empty"><b>这一段暂时没有可显示记录</b><p>可以调整查看方式，或先按学校 / 专业入口复核。</p></div>`}</section>`}
async function queryScore(){const score=Number($('scoreInput')?.value);const root=$('scoreResult');if(!Number.isFinite(score)||score<=0){root.innerHTML='<div class="lm-empty"><b>请先输入有效分数</b><p>例如 580。</p></div>';return;}root.innerHTML='<div class="lm-empty is-loading"><b>正在读取历史数据…</b><p>分数入口只做历史记录整理，不代表录取判断。</p></div>';try{const level=$('scoreLevel')?.value||'primary_secondary';const res=await fetch(`/api/211-mainline?mode=score&score=${encodeURIComponent(score)}&level=${encodeURIComponent(level)}`);const data=await res.json();if(!data.ok)throw new Error(data.message||'读取失败');root.innerHTML=`<div class="lm-detail-head"><h2>2025 历史数据中，接近 ${fmt(score)} 分的 211 专业记录</h2><p>${esc(data.boundary||state.index.copy.scoreBoundary)}</p></div>${scoreSection('接近孩子分数的历史记录','2025 最低分在孩子分数 -10 到孩子分数之间。',data.grouped?.near||[])}${scoreSection('稍高一些的历史记录','2025 最低分在孩子分数上方 10 分以内。',data.grouped?.upper||[])}${scoreSection('低一些可讨论的历史记录','2025 最低分在孩子分数下方 25 到 11 分之间。',data.grouped?.lower||[])}`;}catch(error){root.innerHTML=`<div class="lm-empty"><b>分数入口暂时没有读取到历史专业数据</b><p>这不影响按学校和按专业查看 211 背景。可以稍后重试。</p><details class="lm-tech-detail"><summary>展开排查信息</summary>${esc(error.message||String(error))}</details></div>`;}}
function switchTab(tab){state.tab=tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.tab===tab));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==tab);}
function mountQuick(){const q=['计算机','电气','通信工程','法学','金融学','临床医学','材料','交通运输'];const root=$('majorQuickRow'); if(root) root.innerHTML=q.map(x=>`<button type="button" data-quick-major="${esc(x)}">${esc(x)}</button>`).join(''); root?.querySelectorAll('[data-quick-major]').forEach(b=>b.addEventListener('click',()=>{ $('majorSearch').value=b.dataset.quickMajor; renderMajors(); }));}
function boot(){document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));document.querySelectorAll('[data-start-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.startTab)));$('schoolSearch')?.addEventListener('input',renderSchools);$('majorSearch')?.addEventListener('input',renderMajors);$('scoreQuery')?.addEventListener('click',queryScore);mountQuick();renderSchools();renderMajors();const params=new URLSearchParams(location.search);if(params.get('major')){switchTab('major');$('majorSearch').value=params.get('major');renderMajors();}else if(params.get('school')){switchTab('school');$('schoolSearch').value=params.get('school');renderSchools();const s=state.index.schools.find(x=>x.school.includes(params.get('school')));if(s)showSchool(s.school);} }
boot();
''', encoding='utf-8')

# Update index.html: remove big card after header, insert aux section after resultsPanel
idx=ln/'index.html'
html=idx.read_text(encoding='utf-8')
html=re.sub(r'\n    <section class="mainline-entry panel" aria-label="辽宁省内专业背景入口">.*?</section>\n', '\n', html, flags=re.S)
aux='''

    <section class="aux-background-entry panel" aria-label="资料与背景复核">
      <div class="aux-background-head">
        <div>
          <p class="aux-background-kicker">资料与背景复核</p>
          <h2>学校和专业背景，放在查完结果后再看</h2>
          <p>这些页面只帮助家庭理解学校与专业背景，不代表录取判断。先完成专业初选，再把有兴趣的学校和专业拿来复核。</p>
        </div>
      </div>
      <div class="aux-background-grid">
        <a class="aux-background-card" href="/ln-rank/local-mainline.html"><b>省内学校专业背景</b><span>看辽宁省内院校与本科专业、博士点、学科评估和办学方向的对应关系。</span><em>查看省内背景</em></a>
        <a class="aux-background-card" href="/ln-rank/211-mainline.html"><b>全国 211 院校专业背景</b><span>看 211 院校的学科建设、本科专业对应和方向提醒。</span><em>查看 211 背景</em></a>
      </div>
    </section>
'''
html=html.replace('''    <section class="data-note">''', aux+'\n    <section class="data-note">')
html=html.replace('/ln-rank/css/dist/ln-rank-main.v3933_12.css?v=3933_12','/ln-rank/css/dist/ln-rank-main.v3933_13.css?v=3933_13')
html=html.replace('/ln-rank/js/app.v3933_12.js?v=3933_12','/ln-rank/js/app.v3933_13.js?v=3933_13')
html=html.replace('版本：v3.9.33.12','版本：v3.9.33.13')
idx.write_text(html, encoding='utf-8')

# update local-mainline html remove hero link and wording/version/css/js
lm=ln/'local-mainline.html'
text=lm.read_text(encoding='utf-8')
text=text.replace('<link rel="stylesheet" href="/ln-rank/css/dist/local-mainline.v3933_12.css?v=3933_12" />','<link rel="stylesheet" href="/ln-rank/css/dist/local-mainline.v3933_13.css?v=3933_13" />')
text=re.sub(r'\n      <div class="lm-hero-actions">\n        <a href="/ln-rank/" class="lm-link-button">返回专业初选</a>\n      </div>', '', text)
text=text.replace('<div><b>看到合适的学校专业</b><p>回到初选工具查看它在孩子分数附近的位置。</p></div>','<div><b>看到合适的学校专业</b><p>把学校和专业记下来，再结合分数结果、招生章程和培养方案复核。</p></div>')
text=text.replace('版本：v3.9.33.12','版本：v3.9.33.13')
text=text.replace('/ln-rank/js/local-mainline/local-mainline-app.v3933_12.js?v=3933_12','/ln-rank/js/local-mainline/local-mainline-app.v3933_13.js?v=3933_13')
lm.write_text(text, encoding='utf-8')

# Copy top-level JS entries and update query versions within copies
copy_pairs=[('js/app.v3933_12.js','js/app.v3933_13.js'),('js/selection-pool.v3933_12.js','js/selection-pool.v3933_13.js'),('js/major-trend-render.v3933_12.js','js/major-trend-render.v3933_13.js'),('js/self-check.v3933_12.js','js/self-check.v3933_13.js'),('js/local-mainline/local-mainline-app.v3933_12.js','js/local-mainline/local-mainline-app.v3933_13.js')]
for src,dst in copy_pairs:
    data=(ln/src).read_text(encoding='utf-8').replace('3933_12','3933_13').replace('v3.9.33.12','v3.9.33.13')
    (ln/dst).write_text(data, encoding='utf-8')
# update other HTML CSS/JS entries
for fname, css, js in [
    ('selection-pool.html','ln-rank-selection','selection-pool'),
    ('major-trend-2025.html','ln-rank-trend','major-trend-render'),
    ('self-check.html','ln-rank-self-check','self-check')]:
    p=ln/fname
    s=p.read_text(encoding='utf-8').replace('3933_12','3933_13').replace('v3.9.33.12','v3.9.33.13')
    p.write_text(s,encoding='utf-8')

# update local app copy remove backlinks text
local_app=ln/'js/local-mainline/local-mainline-app.v3933_13.js'
s=local_app.read_text(encoding='utf-8')
s=s.replace("    ${hasMainline ? `<button class=\"lm-card-action\" data-school-detail=\"${esc(school.name)}\">查看该校专业背景</button>` : `<a class=\"lm-card-text-link\" href=\"/ln-rank/?school=${encodeURIComponent(school.name)}&source=local-mainline\">回到专业初选继续看</a>`}", "    ${hasMainline ? `<button class=\"lm-card-action\" data-school-detail=\"${esc(school.name)}\">查看该校专业背景</button>` : `<p class=\"lm-card-note is-subtle\">暂无可触发的省内背景提示，建议直接看招生章程和培养方案。</p>`}")
s=s.replace("这不代表学校不好。可以换个学校名，或回到专业初选工具按分数和专业继续看。", "这不代表学校不好。可以换个学校名，或直接查看招生章程和培养方案。")
s=s.replace('<div class="lm-card-links"><a href="${link}">回到初选工具查看</a></div>', '')
s=s.replace('如果网络较慢，可以稍后重试，或返回专业初选继续查询。', '如果网络较慢，可以稍后重试。')
s=s.replace("可以调整查看方式，或回到专业初选工具扩大范围。", "可以调整查看方式，或先按学校 / 专业入口复核。")
s=s.replace("请稍后重试，或返回专业初选工具。", "请稍后重试；这不影响主页面专业初选。")
s=s.replace('返回专业初选', '辽宁物理类专业初选参考')
s=s.replace('回到初选工具查看', '查看背景依据')
s=s.replace('回到专业初选', '继续家庭复核')
local_app.write_text(s, encoding='utf-8')

# Modify major-pool render copy and original for future? We'll modify original and then regenerate copy too.
render=ln/'js/feature/major-pool/render.js'
r=render.read_text(encoding='utf-8').replace("import { getLocalBackgroundHint } from '../../knowledge/local-background-hint.js?v=3933_12';", "import { getLocalBackgroundHint } from '../../knowledge/local-background-hint.js?v=3933_13';\nimport { get211BackgroundHint } from '../../knowledge/211-background-hint.js?v=3933_13';")
# ensure other imports v3933_13 in render for app.v3933_13 transitively
r=r.replace('v=3933_12','v=3933_13')
old="""function renderLocalContextInline(record) {
  const hint = getLocalBackgroundHint(record);
  if (!hint?.visible) return '';
  const review = Array.isArray(hint.reviewPoints) && hint.reviewPoints.length ? `再看：${hint.reviewPoints.slice(0, 3).join(' / ')}` : '再看：课程方向 / 招生章程';
  const title = `${hint.text}。${review}。该提示不是录取判断，只说明专业和学校办学背景有关。`;
  return `<div class=\"local-context-inline local-background-hint is-${escapeHtml(hint.level || 'trajectory')}\" title=\"${escapeHtml(title)}\"><span class=\"local-context-chip\">${escapeHtml(hint.label)}</span><span class=\"local-context-name\">${escapeHtml(hint.direction)}</span><span class=\"local-context-review\">${escapeHtml(review)}</span></div>`;
}
"""
new="""function renderBackgroundHints(record) {
  const local = getLocalBackgroundHint(record);
  const national211 = get211BackgroundHint(record);
  const hints = [];
  if (local?.visible) hints.push({ ...local, kind: 'local', link: `/ln-rank/local-mainline.html?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}`, linkText: '省内背景' });
  if (national211?.visible) hints.push({ ...national211, kind: '211', link: `/ln-rank/211-mainline.html?school=${encodeURIComponent(record.school)}&major=${encodeURIComponent(record.major)}`, linkText: '211背景' });
  if (!hints.length) return '';
  return `<div class=\"background-hint-stack\" aria-label=\"学校专业背景提示\">${hints.slice(0, 2).map(hint => {
    const review = Array.isArray(hint.reviewPoints) && hint.reviewPoints.length ? `再看：${hint.reviewPoints.slice(0, 3).join(' / ')}` : '再看：课程方向 / 招生章程';
    const title = `${hint.text}。${review}。该提示不是录取判断，只说明专业和学校背景有可复核对应。`;
    const extra = hint.kind === '211' ? ' national-211-hint' : '';
    return `<div class=\"local-context-inline local-background-hint${extra} is-${escapeHtml(hint.level || 'trajectory')}\" title=\"${escapeHtml(title)}\"><span class=\"local-context-chip\">${escapeHtml(hint.label)}</span><span class=\"local-context-name\">${escapeHtml(hint.direction)}</span><span class=\"local-context-review\">${escapeHtml(review)}</span><a class=\"mainline-card-link\" href=\"${hint.link}\">${escapeHtml(hint.linkText)}</a></div>`;
  }).join('')}</div>`;
}
function renderLocalContextInline(record) { return renderBackgroundHints(record); }
"""
if old not in r:
    print('old local inline not found')
else:
    r=r.replace(old,new)
# Replace action localMainlineLink to avoid duplicate link
r=re.sub(r"\n      \$\{localMainlineLink\(record\)\}", "", r)
render.write_text(r, encoding='utf-8')
# recopy app after render change already imports v13. Need top-level app imports feature render with v13 unchanged in app copy? Let's replace all v=3933_12 in app copy again.
for p in [ln/'js/app.v3933_13.js', ln/'js/selection-pool.v3933_13.js', ln/'js/major-trend-render.v3933_13.js', ln/'js/self-check.v3933_13.js']:
    if p.exists(): p.write_text(p.read_text(encoding='utf-8').replace('v=3933_12','v=3933_13'),encoding='utf-8')

# CSS auxiliary component
(ln/'css/components/auxiliary-background-entry.css').write_text(r'''/* v3.9.33.13 auxiliary background entry and result-card background hint contract */
.aux-background-entry{margin-top:18px;background:#fbfcff;border-color:#dbe6f1}.aux-background-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.aux-background-kicker{margin:0 0 6px;color:#526277;font-weight:800;font-size:13px}.aux-background-entry h2{margin:0 0 8px;font-size:20px;color:#172033}.aux-background-entry p{margin:0;line-height:1.65;color:#526277}.aux-background-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.aux-background-card{display:block;text-decoration:none;color:#24324a;background:#fff;border:1px solid #dbe6f1;border-radius:16px;padding:14px;min-height:116px;transition:background .15s ease,border-color .15s ease}.aux-background-card:hover{background:#f7fbff;border-color:#bfd3ea}.aux-background-card b{display:block;font-size:16px;line-height:1.35;margin-bottom:6px}.aux-background-card span{display:block;color:#667085;font-size:13px;line-height:1.55}.aux-background-card em{display:inline-flex;margin-top:10px;font-style:normal;color:#365f8f;font-weight:800;font-size:13px;border:1px solid #d8e2f0;border-radius:999px;padding:6px 10px;background:#fff}.background-hint-stack{display:grid;gap:6px;margin-top:8px}.background-hint-stack .local-context-inline{margin:0}.national-211-hint .local-context-chip{background:#f2f7ff;color:#365f8f}.mainline-card-link{margin-left:auto;color:#365f8f;text-decoration:none;font-weight:800;font-size:12px;border:1px solid #d8e2f0;border-radius:999px;padding:4px 8px;background:#fff;white-space:nowrap}@media(max-width:720px){.aux-background-grid{grid-template-columns:1fr}.aux-background-entry{margin-top:14px}.aux-background-card{min-height:0}.background-hint-stack .local-context-inline{align-items:flex-start}.mainline-card-link{width:100%;text-align:center;justify-content:center;display:inline-flex;min-height:34px;align-items:center;margin-left:0}}
''', encoding='utf-8')
# 211 CSS can reuse local page rules plus additions by listing both? We'll make imports by concatenation via sources.
(ln/'css/pages/211-mainline.css').write_text(r'''/* v3.9.33.13 211 mainline independent page */
.jm-page{max-width:1180px}.jm-hero{background:linear-gradient(135deg,#fff,#f5f8ff)}.jm-start-guide .lm-start-card{min-height:118px}.jm-school-card .lm-card-note{min-height:70px}.jm-school-card.is-soft-muted{border-style:dashed;background:#fbfcff}.jm-school-card .lm-card-action{margin-top:4px}.jm-page .lm-direction-group ul{margin:8px 0 0;padding-left:18px;color:#526277;line-height:1.65}.jm-page .lm-record-list{grid-template-columns:repeat(2,minmax(0,1fr))}.jm-page .lm-record-card h3,.jm-page .lm-card h3{word-break:normal;overflow-wrap:anywhere}.jm-page .lm-card-note,.jm-page .lm-review-row{overflow-wrap:anywhere}.jm-page .lm-tech-detail{word-break:break-word}@media(max-width:960px){.jm-page .lm-record-list{grid-template-columns:1fr}.jm-school-card .lm-card-note{min-height:0}}@media(max-width:640px){.jm-start-guide .lm-start-card{min-height:0}.jm-page .lm-tabs{position:sticky;top:0}.jm-page .lm-input{width:100%}.jm-page .lm-panel-head{display:block}.jm-page .lm-panel-head .lm-input{margin-top:12px}.jm-page .lm-record-card,.jm-page .lm-card{padding:13px}.jm-page .lm-card-action{width:100%;min-height:42px}.jm-page .lm-score-console .lm-primary{width:100%}}
''', encoding='utf-8')

# Update css-bundle-sources.json
mf_path=ln/'css/css-bundle-sources.json'
mf=json.loads(mf_path.read_text(encoding='utf-8'))
mf['version']=VERSION; mf['assetVersion']=ASSET
# Add auxiliary to main/selection/trend/self maybe only main needed, but result cards on main only. Add to main.
for b in ['main']:
    if 'css/components/auxiliary-background-entry.css' not in mf['bundles'][b]:
        # insert before page css
        mf['bundles'][b].insert(-1,'css/components/auxiliary-background-entry.css')
# LocalMainline include source plus can leave
mf['bundles']['main211']=['css/pages/local-mainline.css','css/pages/211-mainline.css']
mf['minimums']['main211']={'sourceCount':2,'bytes':8000}
mf['requiredSelectors']['main']=[s for s in mf['requiredSelectors']['main'] if s != '.mainline-entry']+['.aux-background-entry','.background-hint-stack']
mf['requiredSelectors']['main211']=['.lm-page','.lm-hero','.lm-tabs','.lm-card','.lm-record-card','.lm-start-guide','.lm-start-card','.lm-boundary-soft','.jm-page','.jm-hero','.jm-school-card']
mf_path.write_text(json.dumps(mf,ensure_ascii=False,indent=2),encoding='utf-8')
# Update build-css-dist.mjs outputs
build=root/'tools/build-css-dist.mjs'
bs=build.read_text(encoding='utf-8')
bs=bs.replace("  localMainline: `css/dist/local-mainline.v${assetVersion}.css`\n};", "  localMainline: `css/dist/local-mainline.v${assetVersion}.css`,\n  main211: `css/dist/211-mainline.v${assetVersion}.css`\n};")
build.write_text(bs,encoding='utf-8')

# Run CSS build
os.system(f"cd {root} && node tools/build-css-dist.mjs ln-rank {asset} > /tmp/cssbuild.log")
# If failed, print
print(Path('/tmp/cssbuild.log').read_text(encoding='utf-8')[:500])
# replace version strings in generated CSS? build uses new version file names but source comments may old. Okay.

# update active assets/release/module
active=json.loads((ln/'active-assets.json').read_text(encoding='utf-8'))
active['version']=VERSION; active['assetVersion']=ASSET
active['html']=['index.html','selection-pool.html','major-trend-2025.html','self-check.html','local-mainline.html','211-mainline.html']
active['jsEntry']=['js/app.v3933_13.js','js/selection-pool.v3933_13.js','js/major-trend-render.v3933_13.js','js/self-check.v3933_13.js','js/local-mainline/local-mainline-app.v3933_13.js','js/211-mainline/211-mainline-app.v3933_13.js']
active['cssEntry']=['css/dist/ln-rank-main.v3933_13.css','css/dist/ln-rank-selection.v3933_13.css','css/dist/ln-rank-trend.v3933_13.css','css/dist/ln-rank-self-check.v3933_13.css','css/dist/local-mainline.v3933_13.css','css/dist/211-mainline.v3933_13.css']
active['cssDist']={'main':'css/dist/ln-rank-main.v3933_13.css','selection':'css/dist/ln-rank-selection.v3933_13.css','trend':'css/dist/ln-rank-trend.v3933_13.css','selfCheck':'css/dist/ln-rank-self-check.v3933_13.css','localMainline':'css/dist/local-mainline.v3933_13.css','main211':'css/dist/211-mainline.v3933_13.css'}
for item in ['211-mainline.html','js/211-mainline/211-mainline-app.v3933_13.js','kb/211-mainline/211-school-background.generated.js','js/knowledge/211-background-hint.js','functions/api/211-mainline.js','functions/_lib/211-mainline-kb.js','css/pages/211-mainline.css','css/components/auxiliary-background-entry.css','tools/audit-211-mainline-contract.mjs','tools/audit-auxiliary-entry-weight.mjs','tools/audit-auxiliary-backlink-noise.mjs']:
    if item not in active['stableModules']: active['stableModules'].append(item)
(ln/'active-assets.json').write_text(json.dumps(active,ensure_ascii=False,indent=2),encoding='utf-8')
release_meta={'version':VERSION,'assetVersion':ASSET,'release':release,'name':release,'label':'aux-background-entry-211-mainline-human-contract','notes':['首页首屏移除省内专业背景大卡片，改为结果区后的低权重资料与背景复核入口。','新增 /ln-rank/211-mainline.html，提供学校 / 专业 / 分数三个入口，但分数入口只做历史记录辅助复核。','结果卡片新增 211 背景轻提示：只在学校 + 本科专业 + 已核验证据同时命中时显示。','清理 local-mainline 多处回到初选工具的重复回跳噪音。','保持 no-fenxi 包边界，不新增 AI 顾问、不新增录取概率。'],'noFenxiIncluded':True}
(ln/'release-meta.json').write_text(json.dumps(release_meta,ensure_ascii=False,indent=2),encoding='utf-8')
(ln/'VERSION.txt').write_text(release+'\n',encoding='utf-8')
module={'version':VERSION,'assetVersion':ASSET,'entries':{'search':'js/app.v3933_13.js','selectionPool':'js/selection-pool.v3933_13.js','majorTrend':'js/major-trend-render.v3933_13.js','selfCheck':'js/self-check.v3933_13.js','localMainline':'js/local-mainline/local-mainline-app.v3933_13.js','main211':'js/211-mainline/211-mainline-app.v3933_13.js'},'entrypoints':{},'cssDist':active['cssDist']}
module['entrypoints']=module['entries']
(ln/'module-manifest.json').write_text(json.dumps(module,ensure_ascii=False,indent=2),encoding='utf-8')

# Create audit scripts
(root/'tools/audit-auxiliary-entry-weight.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/index.html','utf8');
const failures=[];
const heroEnd=html.indexOf('<section class="ln-console');
const aux=html.indexOf('aux-background-entry');
if(aux<0)failures.push('missing low-weight auxiliary background entry');
if(aux>=0 && heroEnd>=0 && aux<heroEnd)failures.push('auxiliary background entry appears before search console');
if(/mainline-entry panel/.test(html))failures.push('old high-weight mainline-entry panel still exists');
for(const s of ['资料与背景复核','省内学校专业背景','全国 211 院校专业背景']) if(!html.includes(s)) failures.push(`missing copy: ${s}`);
if(!/查看省内背景/.test(html)||!/查看 211 背景/.test(html))failures.push('missing two weak auxiliary links');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-auxiliary-backlink-noise.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const files=['ln-rank/local-mainline.html','ln-rank/js/local-mainline/local-mainline-app.v3933_13.js','ln-rank/211-mainline.html','ln-rank/js/211-mainline/211-mainline-app.v3933_13.js'];
const banned=['返回专业初选','回到初选工具查看','回到专业初选继续看','回到专业初选工具','返回专业初选继续查询'];
const failures=[];
for(const file of files){const s=fs.readFileSync(file,'utf8');for(const b of banned){if(s.includes(b))failures.push(`${file} contains noisy backlink: ${b}`)}}
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-211-mainline-contract.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/211-mainline.html','utf8');
const data=JSON.parse(fs.readFileSync('ln-rank/data/211-mainline/211-mainline-index.generated.json','utf8'));
const failures=[];
for(const s of ['按学校看','按专业看','按分数看','本校方向','本校相关','方向提醒','不代表录取判断']) if(!html.includes(s)) failures.push(`missing 211 page copy: ${s}`);
if(data.meta.totalEntries!==115) failures.push(`expected 115 entries, got ${data.meta.totalEntries}`);
if(data.meta.militarySpecialEntries!==3) failures.push('military special entry count is not 3');
if(!fs.existsSync('functions/api/211-mainline.js')) failures.push('missing 211 api');
if(!fs.existsSync('ln-rank/js/knowledge/211-background-hint.js')) failures.push('missing result card 211 hint resolver');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-211-copy-contract.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const files=['ln-rank/211-mainline.html','ln-rank/js/211-mainline/211-mainline-app.v3933_13.js','ln-rank/kb/211-mainline/211-school-background.generated.js'];
const banned=['录取概率','就业保证','一级命中','二级命中','强链','主线命中'];
const failures=[];
for(const file of files){const s=fs.readFileSync(file,'utf8');for(const b of banned){if(s.includes(b))failures.push(`${file} contains forbidden frontend copy: ${b}`)}}
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-211-special-boundary.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('ln-rank/data/211-mainline/211-mainline-index.generated.json','utf8'));
const military=data.schools.filter(s=>s.isMilitarySpecial);
const failures=[];
if(military.length!==3)failures.push(`expected 3 military special schools, got ${military.length}`);
for(const s of military){if(!s.specialBoundary)failures.push(`${s.school} missing special boundary`);}
const api=fs.readFileSync('functions/api/211-mainline.js','utf8');
if(!api.includes('match211Mainline'))failures.push('211 score api does not use match211Mainline boundary matcher');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-211-mobile-long-text.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const css=fs.readFileSync('ln-rank/css/dist/211-mainline.v3933_13.css','utf8');
const failures=[];
for(const s of ['overflow-wrap:anywhere','@media(max-width:640px)','grid-template-columns:1fr','width:100%']) if(!css.includes(s))failures.push(`missing mobile resilience css: ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-211-css-dist-source-coverage.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('ln-rank/css/css-bundle-sources.json','utf8'));
const css=fs.readFileSync('ln-rank/css/dist/211-mainline.v3933_13.css','utf8');
const failures=[];
if(!manifest.bundles.main211) failures.push('missing main211 css bundle');
for(const s of ['css/pages/local-mainline.css','css/pages/211-mainline.css']) if(!manifest.bundles.main211?.includes(s)) failures.push(`main211 missing source ${s}`);
for(const s of ['.jm-page','.jm-hero','.jm-school-card','.lm-start-card']) if(!css.includes(s)) failures.push(`211 dist missing selector ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
# update old audits that expected backlink / mainline-entry
(root/'tools/audit-auxiliary-entry-surface.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/index.html','utf8');
const failures=[];
if(!html.includes('资料与背景复核'))failures.push('missing low weight auxiliary entry title');
if(html.includes('mainline-entry panel'))failures.push('old high weight provincial background panel still exists');
if(!html.includes('/ln-rank/local-mainline.html')||!html.includes('/ln-rank/211-mainline.html'))failures.push('missing local or 211 auxiliary link');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-local-mainline-parent-first-copy.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/local-mainline.html','utf8');
const failures=[];
const required=['辽宁省内专业背景怎么先看','不知道从哪开始','家庭讨论报告','招生章程'];
for(const s of required) if(!html.includes(s)) failures.push(`missing parent-first copy: ${s}`);
for(const s of ['返回专业初选','回到初选工具查看']) if(html.includes(s)) failures.push(`noisy backlink remains: ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
(root/'tools/audit-local-mainline-empty-error-human.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
const js=fs.readFileSync('ln-rank/js/local-mainline/local-mainline-app.v3933_13.js','utf8');
const failures=[];
for(const s of ['这不代表学校不好','数据暂时没有读取成功','展开排查信息']) if(!js.includes(s)) failures.push(`missing empty/error human copy: ${s}`);
for(const s of ['回到专业初选工具','返回专业初选','回到初选工具查看']) if(js.includes(s)) failures.push(`noisy backlink remains in local app: ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
# no-fenxi scope audit new report
(root/'tools/audit-release-package-scope.mjs').write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const failures=[];
function walk(dir){const out=[]; if(!fs.existsSync(dir))return out; for(const name of fs.readdirSync(dir)){const p=path.join(dir,name); const st=fs.statSync(p); if(st.isDirectory()) out.push(...walk(p)); else out.push(p.replace(/\\/g,'/'));} return out;}
const files=walk('.');
for(const f of files){ if(f.startsWith('ln-rank/fenxi/')) failures.push(`contains /ln-rank/fenxi/: ${f}`); if(f.startsWith('functions/fenxi/')) failures.push(`contains functions/fenxi/: ${f}`); if(f==='functions/_middleware.js') failures.push('contains functions/_middleware.js'); }
if(!fs.existsSync('functions/_lib/fenxi-session.js')) failures.push('missing functions/_lib/fenxi-session.js');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);
''', encoding='utf-8')
# create release plan summary
(ln/'release-plan-v3933_13.md').write_text(f'''# {release}\n\n## 本版主线\n\n- 首页专业初选仍是主线；省内背景和 211 背景降级为“资料与背景复核”。\n- 新增 `/ln-rank/211-mainline.html` 独立页：学校 / 专业 / 分数三个入口。\n- 结果卡片只在“学校 + 本科专业 + 已核验证据”同时命中时显示省内或 211 背景轻提示。\n- 清理 local-mainline 多处“回到初选工具查看”噪音。\n- 保持 no-fenxi 包边界。\n\n## 不做\n\n不新增 AI 顾问；不新增录取概率；不把 211 页面做成排名页；不把军事类混入普通分数入口。\n''', encoding='utf-8')

# Run key audits and save outputs
import subprocess
key_audits=['audit-auxiliary-entry-weight.mjs','audit-auxiliary-backlink-noise.mjs','audit-211-mainline-contract.mjs','audit-211-copy-contract.mjs','audit-211-special-boundary.mjs','audit-211-mobile-long-text.mjs','audit-211-css-dist-source-coverage.mjs','audit-auxiliary-entry-surface.mjs','audit-local-mainline-parent-first-copy.mjs','audit-local-mainline-empty-error-human.mjs','audit-release-package-scope.mjs','audit-css-dist-source-coverage.mjs','audit-active-asset-graph.mjs','audit-main-page-style-smoke.mjs']
reports=[]
for a in key_audits:
    p=root/'tools'/a
    if not p.exists(): continue
    res=subprocess.run(['node',str(p)],cwd=root,capture_output=True,text=True)
    name=a.replace('.mjs','')+'-audit.3933_13.json'
    (ln/name).write_text(res.stdout or json.dumps({'ok':False,'error':res.stderr},ensure_ascii=False),encoding='utf-8')
    reports.append({'audit':a,'returncode':res.returncode,'stdout':res.stdout[:500],'stderr':res.stderr[:500]})
# consolidated audit
(ln/'release-audit-summary.3933_13.json').write_text(json.dumps({'version':VERSION,'assetVersion':ASSET,'audits':reports},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'schools':len(schools),'majors':len(majors),'audits':reports},ensure_ascii=False,indent=2)[:2000])
