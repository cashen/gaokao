from pathlib import Path
p=Path('functions/_lib/ai/command-interpreter.js')
s=p.read_text()
old="function schoolNamesFromText(text,resolvedSchoolNames=[]){const source=String(text||''),resolved=unique(resolvedSchoolNames||[],4),matches=source.match(/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)||[],full=matches.map(v=>stripSchoolEntityLeadingAction(v,120)).filter(candidate=>candidate&&!resolved.some(name=>candidate!==name&&candidate.endsWith(name)));return unique([...resolved,...full],4);}"
new="function schoolNamesFromText(text,resolvedSchoolNames=[]){const source=String(text||''),resolved=unique(resolvedSchoolNames||[],4),matches=source.match(/[\\u4e00-\\u9fa5]{2,30}?(?:高等专科学校|专科学校|大学|学院)/g)||[],full=matches.map(v=>{let candidate=stripSchoolEntityLeadingAction(v,120);const parts=candidate.split(/(?:和|跟|与|、|以及)/),tail=parts[parts.length-1]||'';if(parts.length>1&&/[\\u4e00-\\u9fa5]{2,30}(?:高等专科学校|专科学校|大学|学院)$/.test(tail))candidate=tail;return candidate;}).filter(candidate=>candidate&&!resolved.some(name=>candidate!==name&&candidate.endsWith(name)));return unique([...resolved,...full],4);}"
if s.count(old)!=1: raise SystemExit(f'school boundary anchor count={s.count(old)}')
p.write_text(s.replace(old,new))
