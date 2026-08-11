from pathlib import Path
p=Path('functions/_lib/ai/command-interpreter.js')
s=p.read_text()
a="value=value.replace(/(最低录取分|最低投档分|最低分|投档分|录取分|多少分|分数线|位次|排名|去年|往年|历年|202[3456]|这个学校|这所学校|那个学校|那所学校|该校|刚才这个学校|刚才那所学校|我不是问|不是问|我问|问一下|问下|看看|看下|的|呢|吗|呀|啊|吧)/g,' ');"
b="value=value.replace(/(最低录取分|最低投档分|最低分|投档分|录取分|多少分|分数线|位次|排名|去年|往年|历年|202[3456]|这个学校|这所学校|那个学校|那所学校|该校|刚才这个学校|刚才那所学校|我不是问|不是问|我问|问一下|问下|看看|看下|多少|几分|几名|最低|录取|投档|分数|的|呢|吗|呀|啊|吧)/g,' ');"
if a not in s: raise SystemExit('major cleanup anchor missing')
s=s.replace(a,b,1)
a2="if(!value||value.length<2||value.length>24||/(能不能上|能不能报|够不够|学校|所有专业|全部专业|全校专业|招生专业)/.test(value))return'';"
b2="if(!value||value.length<2||value.length>24||/(能不能上|能不能报|够不够|学校|所有专业|全部专业|全校专业|招生专业|^(?:多少|几分|几名|最低|录取|投档|分数|位次|排名)$)/.test(value))return'';"
if a2 not in s: raise SystemExit('major residue reject anchor missing')
p.write_text(s.replace(a2,b2,1))
