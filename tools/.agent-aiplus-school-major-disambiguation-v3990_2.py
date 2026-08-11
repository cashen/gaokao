from pathlib import Path

# Prefer the complete free-form major phrase for school-history questions.
ci=Path('functions/_lib/ai/command-interpreter.js')
text=ci.read_text()
old="let majors=resolveReferenceMajors(source,positive0,workspace),schools=resolveReferenceSchools(source,schools0,workspace);if(schools.length&&!majors.length){const inferredMajor=inferSchoolHistoryMajor(source);if(inferredMajor)majors=[inferredMajor];}"
new="let majors=resolveReferenceMajors(source,positive0,workspace),schools=resolveReferenceSchools(source,schools0,workspace);if(schools.length){const inferredMajor=inferSchoolHistoryMajor(source);if(inferredMajor)majors=[inferredMajor];}"
if old not in text:
    raise SystemExit('dynamic major preference anchor missing')
ci.write_text(text.replace(old,new,1))

# A major word that also appears inside a school's official name is still explicit
# when the user repeats it outside that full name (or used a shorthand school name).
ak=Path('functions/_lib/ai/agent-task-kernel.js')
text=ak.read_text()
old="const explicitMajors=majors.filter(item=>item&&!schools.some(name=>String(name||'').includes(String(item||''))));"
new="const sourceWithoutSchoolNames=schools.reduce((value,name)=>value.split(String(name||'')).join(' '),source);\n  const explicitMajors=majors.filter(item=>item&&(!schools.some(name=>String(name||'').includes(String(item||'')))||sourceWithoutSchoolNames.includes(String(item||''))));"
if old not in text:
    raise SystemExit('explicit major school-name anchor missing')
ak.write_text(text.replace(old,new,1))
