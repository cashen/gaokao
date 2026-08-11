from pathlib import Path
p=Path('functions/_lib/ai/command-interpreter.js')
s=p.read_text()
a="function inferSchoolHistoryMajor(source){if(!/(多少分|最低(?:录取|投档)?分|录取分|投档分|分数线|位次|排名|去年|往年|历年|202[3456])/.test(source)||/(所有|全部|全校|招生).{0,6}专业/.test(source))return'';"
b="function inferSchoolHistoryMajor(source){const historyFact=/(多少分|最低(?:录取|投档)?分|录取分|投档分|分数线|位次|排名|去年|往年|历年)/.test(source)||(/202[3456]/.test(source)&&!/(招生章程|章程|录取规则|宿舍|住宿|食堂|食宿|学费|收费|校区|主管部门|学校简介|学校介绍)/.test(source));if(!historyFact||/(所有|全部|全校|招生).{0,6}专业/.test(source))return'';"
if a not in s: raise SystemExit('anchor missing')
p.write_text(s.replace(a,b,1))
