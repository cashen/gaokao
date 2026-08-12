from pathlib import Path

root = Path(__file__).resolve().parents[1]
source_path = root / 'tools/tmp_apply_ai_major_history_v3992_3.py'
source = source_path.read_text(encoding='utf-8')
old = '''t=replace_once(t,"'school_major_history','school_history','school_official_qa'","'school_major_history','school_history','major_region_history','school_official_qa'",'kernel task list')'''
new = '''t=replace_once(t,"  'school_major_history','school_history','school_official_qa','fit_assessment',","  'school_major_history','school_history','major_region_history','school_official_qa','fit_assessment',",'kernel task list')'''
if source.count(old) != 1:
    raise SystemExit(f'v2 anchor mismatch: {source.count(old)}')
source = source.replace(old, new, 1)
exec(compile(source, str(source_path), 'exec'))
