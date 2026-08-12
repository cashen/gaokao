from pathlib import Path

root = Path(__file__).resolve().parents[1]
source_path = root / 'tools/tmp_apply_ai_major_history_v3992_3.py'
source = source_path.read_text(encoding='utf-8')
replacements = [
    (
        '''t=replace_once(t,"'school_major_history','school_history','school_official_qa'","'school_major_history','school_history','major_region_history','school_official_qa'",'kernel task list')''',
        '''t=replace_once(t,"  'school_major_history','school_history','school_official_qa','fit_assessment',","  'school_major_history','school_history','major_region_history','school_official_qa','fit_assessment',",'kernel task list')'''
    ),
    (
        '''t=replace_once(t,"'school_major_history','school_history','school_official_qa','fit_assessment'","'school_major_history','school_history','major_region_history','school_official_qa','fit_assessment'",'task lock major history')''',
        '''t=replace_once(t,"if(['fact_rank_lookup','school_major_history','school_history','school_official_qa','fit_assessment','school_comparison'","if(['fact_rank_lookup','school_major_history','school_history','major_region_history','school_official_qa','fit_assessment','school_comparison'",'task lock major history')'''
    )
]
for old, new in replacements:
    if source.count(old) != 1:
        raise SystemExit(f'v3 patch-source anchor mismatch: {source.count(old)} for {old[:80]}')
    source = source.replace(old, new, 1)
exec(compile(source, str(source_path), 'exec'))
