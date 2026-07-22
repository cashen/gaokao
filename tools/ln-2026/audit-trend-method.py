from __future__ import annotations

import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'analysis/2026/canonical-three-year-records.json'
TARGET = ROOT / 'analysis/2026/trend-method-audit.json'


def pct(values, q):
    values = sorted(values)
    if not values:
        return None
    pos = (len(values) - 1) * q
    lo = int(pos)
    hi = min(len(values) - 1, lo + 1)
    frac = pos - lo
    return values[lo] * (1 - frac) + values[hi] * frac


def describe(values):
    values = [float(x) for x in values if x is not None]
    if not values:
        return {'count': 0}
    return {
        'count': len(values),
        'min': min(values),
        'q1': pct(values, .25),
        'median': statistics.median(values),
        'q3': pct(values, .75),
        'max': max(values),
        'mean': statistics.fmean(values),
    }


def main():
    raw = json.loads(SOURCE.read_text(encoding='utf-8'))
    records = raw if isinstance(raw, list) else raw.get('records', [])
    complete = [r for r in records if r.get('rank2024') and r.get('rank2025') and r.get('rank2026')]
    d26 = [r.get('rankPctPoint26vs25') for r in complete if r.get('rankPctPoint26vs25') is not None]
    d25 = [r.get('rankPctPoint25vs24') for r in complete if r.get('rankPctPoint25vs24') is not None]
    raw26 = [r.get('rankDelta26vs25') for r in complete if r.get('rankDelta26vs25') is not None]
    raw25 = [r.get('rankDelta25vs24') for r in complete if r.get('rankDelta25vs24') is not None]
    median26 = statistics.median(d26)
    median25 = statistics.median(d25)
    centered26 = [x - median26 for x in d26]
    centered25 = [x - median25 for x in d25]
    output = {
        'recordContainerType': type(raw).__name__,
        'sourceCount': len(records),
        'completeCount': len(complete),
        'sampleKeys': sorted(complete[0].keys()) if complete else [],
        'sampleRecords': complete[:3],
        'rankPctPoint26vs25': describe(d26),
        'rankPctPoint25vs24': describe(d25),
        'rawRankDelta26vs25': describe(raw26),
        'rawRankDelta25vs24': describe(raw25),
        'annualCommonShift': {
            'pctPoint26vs25Median': median26,
            'pctPoint25vs24Median': median25,
        },
        'centeredPctPoint26vs25': describe(centered26),
        'centeredPctPoint25vs24': describe(centered25),
        'interpretation': 'If the uncentered yearly median is materially different from zero, aggregate trend classifications should remove the common annual shift before labeling majors or score bands.'
    }
    TARGET.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: output[k] for k in ['sourceCount', 'completeCount', 'annualCommonShift']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
