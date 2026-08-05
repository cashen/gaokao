from pathlib import Path

path = Path('tools/audit-production-resource-verification-v3990_0.mjs')
text = path.read_text(encoding='utf-8')
old = """  'pull_request:',
  'branches: [main]',
  'source-contract:',"""
new = """  'pull_request:',
  'branches: [main]',
  'types: [opened, synchronize, reopened, ready_for_review]',
  'source-contract:',"""
if text.count(old) != 1:
    raise SystemExit(f'Ready deploy audit anchor count={text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
