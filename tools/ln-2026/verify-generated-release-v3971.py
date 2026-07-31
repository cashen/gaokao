#!/usr/bin/env python3
from pathlib import Path

source_path = Path(__file__).with_name('verify-generated-release-v3968.py')
source = source_path.read_text(encoding='utf-8')
old = """for page,scope in [('ln-rank/local-mainline.html','liaoning'),('ln-rank/211-mainline.html','211')]:
    text=(ROOT/page).read_text(encoding='utf-8')
    check('academic-background-app.v3968_0.js?v=3968_0' in text,f'{page} unified background runtime')
    check(f'data-background-scope=\"{scope}\"' in text,f'{page} scope')
    check('2025' in text and '2024' in text,f'{page} three-year history copy')
    check('背景证据' in text and '来源年份' in text,f'{page} evidence year copy')
    check('local-mainline-app.v3967_0.js' not in text and '211-mainline-app.v3951_0.js' not in text,f'{page} legacy runtime')
"""
new = """local_page=(ROOT/'ln-rank/local-mainline.html').read_text(encoding='utf-8')
local_runtime=(ROOT/'ln-rank/js/local-strength/local-strength-app.v3971_2.js').read_text(encoding='utf-8')
local_index=json.loads((ROOT/'ln-rank/data/local-strength/local-strength-index.v3971_2.json').read_text(encoding='utf-8'))
check('local-strength-app.v3971_2.js?v=3971_2' in local_page,'ln-rank/local-mainline.html static background runtime')
check('data-ui-page=\"background\"' in local_page,'ln-rank/local-mainline.html background page scope')
check('score2025' in local_runtime and 'score2024' in local_runtime,'ln-rank/local-mainline.html three-year history runtime')
check('背景证据' in local_page and '来源年份' in local_page,'ln-rank/local-mainline.html evidence year copy')
check('/api/local-strength' not in local_page and '/api/local-strength' not in local_runtime,'LocalStrength must not use production full-scan API')
check(local_index.get('version')=='local-strength-static-v3971_2','LocalStrength static index version')
check(local_index.get('meta',{}).get('completeEvaluation') is True,'LocalStrength complete evaluation')
check(local_index.get('meta',{}).get('evaluatedRecordCount')==local_index.get('meta',{}).get('localAdmissionRecordCount'),'LocalStrength evaluated record count')
check(local_index.get('providerVersion')=='academic-background-provider-v3968_0','LocalStrength evidence provider')
check('local-mainline-app.v3967_0.js' not in local_page,'ln-rank/local-mainline.html legacy runtime')

page='ln-rank/211-mainline.html'; scope='211'
text=(ROOT/page).read_text(encoding='utf-8')
check('academic-background-app.v3968_0.js?v=3968_0' in text,f'{page} unified background runtime')
check(f'data-background-scope=\"{scope}\"' in text,f'{page} scope')
check('2025' in text and '2024' in text,f'{page} three-year history copy')
check('背景证据' in text and '来源年份' in text,f'{page} evidence year copy')
check('211-mainline-app.v3951_0.js' not in text,f'{page} legacy runtime')
"""
if old not in source:
    raise SystemExit('verify-generated-release-v3968 page block changed unexpectedly')
source = source.replace(old, new)
exec(compile(source, str(source_path), 'exec'), {'__name__': '__main__', '__file__': str(source_path)})
