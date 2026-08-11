from pathlib import Path
p=Path('functions/_lib/ai/agent-task-kernel.js')
s=p.read_text()
a="const officialSchoolOnly=Boolean(school&&looksOfficialSchoolInfo(source)&&!looksFit(source)&&!looksBackground(source)&&!/(多少分|最低分|最低录取分|最低投档分|录取分|投档分|分数线|位次|排名|去年|往年|历年)/.test(source)&&explicitMajors.length===0&&(schools.length||['school_major_history','school_history','school_official_qa','fit_assessment','school_background'].includes(priorTask)||/(这个学校|这所学校|那个学校|那所学校|该校)/.test(source)));"
b="const resolvedSchoolGeneralQuestion=Boolean(schools.length&&/(怎么样|如何|咋样)[？?]?$/.test(source));\n  const officialSchoolOnly=Boolean(school&&(looksOfficialSchoolInfo(source)||resolvedSchoolGeneralQuestion)&&!looksFit(source)&&!looksBackground(source)&&!/(多少分|最低分|最低录取分|最低投档分|录取分|投档分|分数线|位次|排名|去年|往年|历年)/.test(source)&&explicitMajors.length===0&&(schools.length||['school_major_history','school_history','school_official_qa','fit_assessment','school_background'].includes(priorTask)||/(这个学校|这所学校|那个学校|那所学校|该校)/.test(source)));"
if a not in s: raise SystemExit('official school shorthand anchor missing')
p.write_text(s.replace(a,b,1))
