from pathlib import Path
p=Path('functions/_lib/ai/command-interpreter.js')
text=p.read_text()
old="if(/公办优先/.test(s))return'public_first';"
new="if(/(公办优先|优先公办|尽量公办|最好公办|能公办.{0,4}公办)/.test(s))return'public_first';"
if old not in text:
    raise SystemExit('public-first generated anchor missing')
p.write_text(text.replace(old,new,1))
