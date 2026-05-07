#!/usr/bin/env python3
import json, glob, os, sys
from pathlib import Path
BASE = Path(__file__).resolve().parents[1] / 'data'

def load(p):
    with open(BASE / p, encoding='utf-8') as f:
        return json.load(f)

def count_raw(year):
    total = 0; rows = []
    for fp in sorted((BASE/'raw'/str(year)).glob('*.json')):
        data = json.load(open(fp, encoding='utf-8'))
        total += len(data)
        rows += [r['source_row'] for r in data]
    return total, min(rows), max(rows), len(rows) == len(set(rows))

m = load('manifest.json')
loc = load('index/record_locator.json')
for y, expected in [(2024, 24973), (2025, 23508)]:
    total, rmin, rmax, uniq = count_raw(y)
    assert total == expected, (y, total, expected)
    assert uniq, f'{y} source_row duplicated'
    print(y, total, rmin, rmax, 'OK')
assert len(loc) == 24973 + 23508
print('record_locator', len(loc), 'OK')
print('PASS')
