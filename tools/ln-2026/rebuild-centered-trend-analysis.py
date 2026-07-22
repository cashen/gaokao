from __future__ import annotations

import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ANALYSIS = ROOT / 'analysis/2026'
CANONICAL = ANALYSIS / 'canonical-three-year-records.json'
POLICY = ANALYSIS / 'comparison-policy.json'
MANIFEST = ROOT / 'fenxi/data/ln-rank-2026/manifest.json'
AUDIT = ANALYSIS / 'trend-method-audit.json'
DATA_VERSION = 'three-year-2024-2026-centered-v1.0.0'

LABELS = {
    'continuous_forward': '连续两年相比多数专业更难报',
    'continuous_backward': '连续两年相比多数专业更容易报',
    'rebound_2026': '2026年由容易转为更难',
    'pullback_2026': '2026年由难转为更容易',
    'latest_forward': '2026年相比多数专业更难报',
    'latest_backward': '2026年相比多数专业更容易报',
    'stable': '和多数专业变化接近',
}


def dump(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def median(values):
    values = [float(v) for v in values if v is not None]
    return statistics.median(values) if values else None


def quantile(values, q):
    values = sorted(float(v) for v in values)
    if not values:
        return None
    pos = (len(values) - 1) * q
    lo = int(pos)
    hi = min(len(values) - 1, lo + 1)
    frac = pos - lo
    return values[lo] * (1 - frac) + values[hi] * frac


def classify(previous, latest, threshold):
    def state(value):
        if value < -threshold:
            return 'forward'
        if value > threshold:
            return 'backward'
        return 'stable'
    p, l = state(previous), state(latest)
    if p == 'forward' and l == 'forward': return 'continuous_forward'
    if p == 'backward' and l == 'backward': return 'continuous_backward'
    if p == 'backward' and l == 'forward': return 'rebound_2026'
    if p == 'forward' and l == 'backward': return 'pullback_2026'
    if l == 'forward': return 'latest_forward'
    if l == 'backward': return 'latest_backward'
    return 'stable'


def aggregate(records, label_key):
    grouped = defaultdict(list)
    for record in records:
        grouped[str(record.get(label_key) or '其他')].append(record)
    rows = []
    for label, items in grouped.items():
        counts = Counter(item['trendType'] for item in items)
        latest_values = [item['relativePctPoint26vs25'] for item in items]
        previous_values = [item['relativePctPoint25vs24'] for item in items]
        raw_rank = [item['rankDelta26vs25'] for item in items]
        harder = sum(counts[key] for key in ('continuous_forward', 'rebound_2026', 'latest_forward'))
        easier = sum(counts[key] for key in ('continuous_backward', 'pullback_2026', 'latest_backward'))
        rows.append({
            'label': label,
            'sampleCount': len(items),
            'continuousForward': counts['continuous_forward'],
            'continuousBackward': counts['continuous_backward'],
            'rebound2026': counts['rebound_2026'],
            'pullback2026': counts['pullback_2026'],
            'latestForward': counts['latest_forward'],
            'latestBackward': counts['latest_backward'],
            'stable': counts['stable'],
            'medianRelativePctPoint26vs25': round(median(latest_values), 3),
            'medianRelativePctPoint25vs24': round(median(previous_values), 3),
            'medianRawRankDelta26vs25': round(median(raw_rank)),
            'relativeForwardRate2026': round(harder / len(items) * 100, 1),
            'relativeBackwardRate2026': round(easier / len(items) * 100, 1),
            'stableRate2026': round(counts['stable'] / len(items) * 100, 1),
        })
    return sorted(rows, key=lambda row: (-row['sampleCount'], row['label']))


def trend_counts(records):
    counts = Counter(record['trendType'] for record in records)
    return {key: counts.get(key, 0) for key in LABELS}


def verify_presentation_shells():
    unified = ROOT / 'ln2026.html'
    score_redirect = ROOT / 'lngk2026.html'
    trend_redirect = ROOT / 'ln-rank/major-trend-2026.html'
    required = {
        unified: 'major-difficulty-2026.v3952_0.js',
        score_redirect: '/ln2026.html#score-band',
        trend_redirect: '/ln2026.html#overview',
    }
    for path, marker in required.items():
        if not path.exists() or marker not in path.read_text(encoding='utf-8'):
            raise RuntimeError(f'human-facing presentation shell missing or stale: {path}')


def main():
    canonical = json.loads(CANONICAL.read_text(encoding='utf-8'))
    policy = json.loads(POLICY.read_text(encoding='utf-8'))
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    audit = json.loads(AUDIT.read_text(encoding='utf-8'))
    records = canonical['records']
    totals = {int(k): int(v) for k, v in policy['candidateTotals'].items()}
    base26 = float(audit['annualCommonShift']['pctPoint26vs25Median'])
    base25 = float(audit['annualCommonShift']['pctPoint25vs24Median'])

    for record in records:
        p26 = (record['rank2026'] / totals[2026] - record['rank2025'] / totals[2025]) * 100
        p25 = (record['rank2025'] / totals[2025] - record['rank2024'] / totals[2024]) * 100
        record['rankPctPoint26vs25'] = round(p26, 6)
        record['rankPctPoint25vs24'] = round(p25, 6)
        record['relativePctPoint26vs25'] = round(p26 - base26, 6)
        record['relativePctPoint25vs24'] = round(p25 - base25, 6)

    abs_centered = [abs(r['relativePctPoint26vs25']) for r in records] + [abs(r['relativePctPoint25vs24']) for r in records]
    threshold = round(max(0.5, min(1.5, quantile(abs_centered, .25))), 3)
    for record in records:
        record['trendType'] = classify(record['relativePctPoint25vs24'], record['relativePctPoint26vs25'], threshold)
        record['trendLabel'] = LABELS[record['trendType']]
        record['trendMethod'] = 'annual_common_shift_centered_rank_percentile'

    direction_summary = aggregate(records, 'majorDirectionLabel')
    score_band_summary = []
    for band in aggregate(records, 'scoreBandLabel'):
        items = [r for r in records if str(r.get('scoreBandLabel') or '其他') == band['label']]
        band['directions'] = aggregate(items, 'majorDirectionLabel')
        score_band_summary.append(band)

    updated_policy = {
        **policy,
        'version': DATA_VERSION,
        'rankComparison': '累计位次比例扣除年度共同位移后的相对变化',
        'neutralThresholdPctPoint': threshold,
        'thresholdMethod': '两段年度相对变化绝对值的第一四分位，限制在 0.50—1.50 个百分点',
        'annualCommonShift': {
            'pctPoint26vs25Median': base26,
            'pctPoint25vs24Median': base25,
            'method': '所有严格三年同口径项目的年度位次比例变化中位数'
        },
        'interpretationBoundary': '相对变化只说明历史投档位置，不代表专业质量、就业、报名人数或未来录取结果。'
    }
    summary = {
        'version': DATA_VERSION,
        'generatedAt': policy.get('generatedAt'),
        'strictCompleteCount': len(records),
        'trendCounts': trend_counts(records),
        'policy': updated_policy,
        'directionSummary': direction_summary,
        'scoreBandSummary': score_band_summary,
    }

    canonical['version'] = DATA_VERSION
    canonical['policy'] = updated_policy
    dump(CANONICAL, canonical)
    dump(POLICY, updated_policy)
    dump(ANALYSIS / 'overall-summary.json', summary)
    dump(ANALYSIS / 'major-direction-summary.json', {'version': DATA_VERSION, 'directions': direction_summary})
    dump(ANALYSIS / 'score-band-summary.json', {'version': DATA_VERSION, 'scoreBands': score_band_summary})
    trend_payload = {
        'version': 'major-trend-2026-centered-v1.0.0',
        'productVersion': 'v3.9.52.0',
        'province': '辽宁',
        'subject': '物理类',
        'batch': '普通类本科批',
        'baseYears': [2024, 2025, 2026],
        'compareScope': '三年均有的同校同专业同项目属性严格可比记录',
        'policy': updated_policy,
        'summary': {'strictCompleteCount': len(records), 'trendCounts': summary['trendCounts']},
        'directions': direction_summary,
        'segments': score_band_summary,
    }
    dump(ROOT / 'ln-rank/data/major-trend-2026.json', trend_payload)
    (ROOT / 'functions/_lib/kb/major-trend-2026.generated.js').write_text(
        'export const MAJOR_TREND_2026_KB=' + json.dumps(trend_payload, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8'
    )
    verify_presentation_shells()
    print(json.dumps({'threshold': threshold, 'trendCounts': summary['trendCounts'], 'presentation': 'human-shell-v3952'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
