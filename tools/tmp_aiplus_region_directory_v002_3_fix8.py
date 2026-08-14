from pathlib import Path
p=Path('functions/_lib/ai/agent-task-kernel.js')
s=p.read_text()
old="if(!score&&!schools.length&&explicitMajors.length&&hasRegionScope&&!looksFit(source)&&(looksHistory(source)||looksMajorRegionSchoolList(source)||priorTask==='region_school_directory'))return'major_region_history';"
new="if(!score&&!schools.length&&explicitMajors.length&&hasRegionScope&&!looksFit(source)&&!looksBackground(source)&&(looksHistory(source)||looksMajorRegionSchoolList(source)||priorTask==='region_school_directory'))return'major_region_history';"
if s.count(old)!=1: raise SystemExit(f'major region precedence occurrence {s.count(old)}')
p.write_text(s.replace(old,new,1))
