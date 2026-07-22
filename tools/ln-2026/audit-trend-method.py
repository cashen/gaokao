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


def iter_lists(value, path='root', depth=0):
    if depth > 8:
        return
    if isinstance(value, list):
        yield path, value
        for index, item in enumerate(value[:20]):
            if isinstance(item, (dict, list)):
                yield from iter_lists(item, f'{path}[{index}]', depth + 1)
    elif isinstance(value, dict):
        for key, item in value.items():
            if isinstance(item, (dict, list)):
                yield from iter_lists(item, f'{path}.{key}', depth + 1)


def record_score(value):
    if not isinstance(value, list) or not value:
        return 0
    samples = [x for x in value[:50] if isinstance(x, dict)]
    if not samples:
        return 0
    wanted = {'rank2024', 'rank2025', 'rank2026', 'score2026', 'rankPctPoint26vs25'}
    overlap = max(len(set(sample).intersection(wanted)) for sample in samples)
    return len(value) * (1 + overlap * 100)


def find_records(raw):
    candidates = [(path, value) for path, value in iter_lists(raw) if record_score(value) > 0]
    candidates.sort(key=lambda item: record_score(item[1]), reverse=True)
    if not candidates:
        top = list(raw)[:30] if isinstance(raw, dict) else f'list:{len(raw)}' if isinstance(raw, list) else type(raw).__name__
        raise RuntimeError(f'No record array found. Top-level={top}')
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
        sample_keys = sorted(complete[0]) if complete else sorted(records[0]) if records and isinstance(records[0], dict) else []
        raise RuntimeError(f'Comparable percentile deltas missing. container={container_key}; records={len(records)}; complete={len(complete)}; sampleKeys={sample_keys}')
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
