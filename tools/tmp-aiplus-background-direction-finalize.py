from pathlib import Path

ROOT=Path('.')
def load(path): return (ROOT/path).read_text(encoding='utf-8')
def save(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    return text.replace(old,new,1)

# Parent-facing copy: never repeat fake-zero phrases while correcting a background direction.
p=Path('functions/_lib/ai/tool-registry.js'); t=load(p)
t=replace_once(t,
"const directionMessage=directionRedirect?`“${directionRedirect.direction}”是${schoolName}背景证据中的专业方向/专业群，不是当前招生专业名；没有把它解释成“0分专业”。可继续查：${(directionRedirect.admissionMajors||[]).slice(0,8).join('、')||'该方向下的实际招生专业'}。`:'';",
"const directionMessage=directionRedirect?`“${directionRedirect.direction}”是${schoolName}背景证据中的专业方向/专业群，不是当前招生专业名，不能直接用这个方向名查询招生分数。可继续查：${(directionRedirect.admissionMajors||[]).slice(0,8).join('、')||'该方向下的实际招生专业'}。`:'';",
'registry direction copy')
save(p,t)

p=Path('functions/_lib/ai/answer-composer.js'); t=load(p)
t=replace_once(t,
"if(result.history?.directionRedirect){const direction=result.history.directionRedirect,majors=(direction.admissionMajors||[]).slice(0,8);return{status:'answered',text:`“${direction.direction||result.history.majorKeyword}”是${result.history.school||focus.school}背景证据里的专业方向/专业群，不是当前招生专业名，所以不能把它当成一个“0分专业”。这个方向下可继续查的实际招生专业包括：${majors.join('、')||'暂未形成可安全列出的招生专业'}。`};}",
"if(result.history?.directionRedirect){const direction=result.history.directionRedirect,majors=(direction.admissionMajors||[]).slice(0,8);return{status:'answered',text:`“${direction.direction||result.history.majorKeyword}”是${result.history.school||focus.school}背景证据里的专业方向/专业群，不是当前招生专业名，不能直接用这个方向名查询招生分数。这个方向下可继续查的实际招生专业包括：${majors.join('、')||'暂未形成可安全列出的招生专业'}。`};}",
'answer direction copy')
save(p,t)

p=Path('functions/_lib/ai/advisor-presentation.js'); t=load(p)
t=replace_once(t,
"if(history.directionRedirect){const majors=(history.directionRedirect.admissionMajors||[]).slice(0,8);return`“${history.directionRedirect.direction||history.majorKeyword}”是${history.school}背景证据中的专业方向/专业群，不是招生专业名，因此这轮不把 0 条结果写成“最低0分/最高0分”。这个方向下可继续查的实际招生专业包括：${majors.join('、')||'暂未形成可安全列出的招生专业'}。`;}",
"if(history.directionRedirect){const majors=(history.directionRedirect.admissionMajors||[]).slice(0,8);return`“${history.directionRedirect.direction||history.majorKeyword}”是${history.school}背景证据中的专业方向/专业群，不是招生专业名，不能直接拿这个方向名查询招生分数。这个方向下可继续查的实际招生专业包括：${majors.join('、')||'暂未形成可安全列出的招生专业'}。`;}",
'presentation direction copy')
save(p,t)

# Permanent AEK regression: neither primary answer nor presentation is allowed to contain fake-zero wording.
p=Path('tools/verify-aiplus-aek-v001.mjs'); t=load(p)
t=replace_once(t,
"assert.doesNotMatch(directionAnswer.text,/最低0分|最高0分|0分专业.*实际投档/);",
"assert.doesNotMatch(directionAnswer.text,/最低0分|最高0分|0分专业/,'direction correction must not repeat fake-zero wording');",
'AEK fake-zero invariant')
save(p,t)

# Full presentation regression belongs to the existing parent semantics verifier.
p=Path('tools/verify-aiplus-parent-semantics-v003.mjs'); t=load(p)
t=replace_once(t,
"import {composePrimaryAnswer} from '../functions/_lib/ai/answer-composer.js';",
"import {composePrimaryAnswer} from '../functions/_lib/ai/answer-composer.js';\nimport {buildBlocks} from '../functions/_lib/ai/advisor-presentation.js';",
'parent presentation import')
marker="\nconsole.log(JSON.stringify({ok:true,version:'aiplus-parent-semantics-v0.03'"
insert="""

const directionPresentationHistory={ok:true,allFailed:false,school:'沈阳工业大学',majorKeyword:'电机电器与装备制造',majorKeywords:['电机电器与装备制造'],records:[],total:0,summary:{total:0,minScore:null,maxScore:null},directionRedirect:{kind:'background_direction',direction:'电机电器与装备制造',admissionMajors:['电气工程及其自动化','自动化'],queryable:false}};
const directionPresentationBlocks=buildBlocks({command:{agentTask:'school_major_history'},view:base.activeView,result:{history:directionPresentationHistory},workspace:base,changeText:'',stage:'history_lookup',focus:{school:'沈阳工业大学',major:'电机电器与装备制造'}});
const directionPresentationText=JSON.stringify(directionPresentationBlocks);
assert.match(directionPresentationText,/不是招生专业名|不是当前招生专业名/,'full presentation must correct the background-direction premise');
assert.match(directionPresentationText,/电气工程及其自动化/,'full presentation must offer a real admissions major');
assert.doesNotMatch(directionPresentationText,/最低0分|最高0分|0分专业/,'full presentation must not repeat fake-zero wording');
"""
if t.count(marker)!=1: raise SystemExit(f'parent marker: expected 1, got {t.count(marker)}')
t=t.replace(marker,insert+marker,1)
save(p,t)

# Exact Preview readiness: bounded retries must also cover transient HTTP 404/5xx during Functions propagation.
p=Path('.github/workflows/verify-aiplus-parent-decision-v003.yml'); t=load(p)
old="curl -fsSL --retry 3 --retry-delay 3 --max-time 120 \\\n"
new="curl -fsSL --retry 3 --retry-all-errors --retry-delay 3 --max-time 120 \\\n"
if t.count(old)!=2: raise SystemExit(f'preview POST retry helpers: expected 2, got {t.count(old)}')
t=t.replace(old,new)
old2="curl -fsSL --retry 3 --retry-delay 2 --max-time 60 -H 'Cache-Control: no-cache' \\\n"
new2="curl -fsSL --retry 3 --retry-all-errors --retry-delay 2 --max-time 60 -H 'Cache-Control: no-cache' \\\n"
if t.count(old2)!=1: raise SystemExit(f'preview major-history retry: expected 1, got {t.count(old2)}')
t=t.replace(old2,new2,1)
save(p,t)

print('patched final background direction safeguards')
