from pathlib import Path
p=Path('functions/_lib/ai/command-interpreter.js')
s=p.read_text()
a="value=value.replace(/(最低录取分|最低投档分|最低分|投档分|录取分|多少分|分数线|位次|排名|去年|往年|历年|202[3456]|这个学校|这所学校|那个学校|那所学校|该校|刚才这个学校|刚才那所学校|我不是问|不是问|我问|问一下|问下|看看|看下|多少|几分|几名|最低|录取|投档|分数|的|呢|吗|呀|啊|吧)/g,' ');"
b="value=value.replace(/(最低录取分|最低投档分|最低分|投档分|录取分|多少分|分数线|位次|排名|去年|往年|历年|202[3456]|这个学校|这所学校|那个学校|那所学校|该校|刚才这个学校|刚才那所学校|我不是问|不是问|我问|问一下|问下|看看|看下|等一下|等下|等等|算了|然后|顺便|换成|换|改成|改看|再看|再|先|多少|几分|几名|最低|录取|投档|分数|的|呢|吗|呀|啊|吧)/g,' ');"
if a not in s: raise SystemExit('dialog control cleanup anchor missing')
p.write_text(s.replace(a,b,1))
