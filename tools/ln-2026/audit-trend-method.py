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


def record_score(value):
    if not isinstance(value, list) or not value:
        return 0
    sample = next((x for x in value[:20] if isinstance(x, dict)), None)
    if not sample:
        return 0
    keys = set(sample)
    return len(value) * (1 + len(keys.intersection({'rank2024', 'rank2025', 'rank2026', 'score2026'})))


def find_records(raw):
    candidates = []
    if isinstance(raw, list):
        candidates.append(('root', raw))
    elif isinstance(raw, dict):
        for key, value in raw.items():
            if isinstance(value, list):
                candidates.append((key, value))
            elif isinstance(value, dict):
                for subkey, subvalue in value.items():
                    if isinstance(subvalue, list):
                        candidates.append((f'{key}.{subkey}', subvalue))
    candidates.sort(key=lambda item: record_score(item[1]), reverse=True)
    if not candidates or record_score(candidates[0][1]) == 0:
        raise RuntimeError(f'No record array found. Top-level type={type(raw).__name__}; keys={list(raw)[:30] if isinstance(raw, dict) else "n/a"}')
    return candidates[0]


def main():
    raw = json.loads(SOURCE.read_text(encoding='utf-8'))
    container_key, records = find_records(raw)
    complete = [r for r in records if isinstance(r, dict) and r.get('rank2024') and r.get('rank2025') and r.get('rank2026')]
    d26 = [r.get('rankPctPoint26vs25') for r in complete if r.get('rankPctPoint26vs25') is not None]
    d25 = [r.get('rankPctPoint25vs24') for r in complete if r.get('rankPctPoint25vs24') is not None]
    raw26 = [r.get('rankDelta26vs25') for r in complete if r.get('rankDelta26vs25') is not None]
    raw25 = [r.get('rankDelta25vs24') for r in complete if r.get('rankDelta25vs24') is not None]
    if not d26 or not d25:
        raise RuntimeError(f'Comparable percentile deltas missing. container={container_key}; complete={len(complete)}; sampleKeys={sorted(complete[0]) if complete else []}')
    median26 = statistics.median(d26)
    median25 = statistics.median(d25)
    centered26 = [x - median26 for x in d26]
    centered25 = [x - median25 for x in d25]
    output = {
        'recordContainerType': type(raw).__name__,
        'recordContainerKey': container_key,
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
        'interpretation': 'When a yearly median is materially different from zero, aggregate major and score-band labels should remove the common annual shift before classifying relative movement.'
    }
    TARGET.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: output[k] for k in ['recordContainerKey', 'sourceCount', 'completeCount', 'annualCommonShift']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
