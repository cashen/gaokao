from pathlib import Path
p=Path('functions/_lib/major-bands-static-provider.js')
s=p.read_text()
needle="    rows.push(row);\n\n  if (!ended)"
if needle not in s:
    raise SystemExit('native scanner close anchor missing')
p.write_text(s.replace(needle,"    rows.push(row);\n  }\n\n  if (!ended)",1))
