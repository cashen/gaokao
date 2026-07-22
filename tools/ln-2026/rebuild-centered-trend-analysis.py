from __future__ import annotations

import html
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
VERSION = 'v3.9.51.0'
DATA_VERSION = 'three-year-2024-2026-centered-v1.0.0'

LABELS = {
    'continuous_forward': '连续两年相对前移',
    'continuous_backward': '连续两年相对后移',
    'rebound_2026': '2026 相对反向前移',
    'pullback_2026': '2026 相对反向后移',
    'latest_forward': '2026 相对前移',
    'latest_backward': '2026 相对后移',
    'stable': '相对全体变化较小',
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
    if p == 'forward' and l == 'forward':
        return 'continuous_forward'
    if p == 'backward' and l == 'backward':
        return 'continuous_backward'
    if p == 'backward' and l == 'forward':
        return 'rebound_2026'
    if p == 'forward' and l == 'backward':
        return 'pullback_2026'
    if l == 'forward':
        return 'latest_forward'
    if l == 'backward':
        return 'latest_backward'
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
        forward = sum(counts[key] for key in ('continuous_forward', 'rebound_2026', 'latest_forward'))
        backward = sum(counts[key] for key in ('continuous_backward', 'pullback_2026', 'latest_backward'))
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
            'relativeForwardRate2026': round(forward / len(items) * 100, 1),
            'relativeBackwardRate2026': round(backward / len(items) * 100, 1),
            'stableRate2026': round(counts['stable'] / len(items) * 100, 1),
        })
    return sorted(rows, key=lambda row: (-row['sampleCount'], row['label']))


def movement_text(value):
    if value is None:
        return '待核验'
    if abs(value) < 0.05:
        return '接近全体共同变化'
    direction = '前移' if value < 0 else '后移'
    return f'相对全体{direction} {abs(value):.2f} 个百分点'


def trend_counts(records):
    counts = Counter(record['trendType'] for record in records)
    return {key: counts.get(key, 0) for key in LABELS}


def base_css():
    return """
:root{--ink:#172033;--muted:#5d6879;--line:#dbe2e8;--bg:#f4f7f8;--card:#fff;--navy:#183b5b;--teal:#167c7a;--orange:#b85e16;--soft:#eef4f6}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.page{max-width:1180px;margin:auto;padding:28px 22px 56px}.hero{background:linear-gradient(135deg,#173957,#176d70);color:#fff;border-radius:24px;padding:34px;box-shadow:0 18px 50px rgba(25,55,77,.16)}.hero h1{font-size:clamp(30px,5vw,52px);line-height:1.15;margin:8px 0 14px}.hero p{max-width:850px;margin:6px 0;color:#e9f4f4}.kicker{font-weight:800;letter-spacing:.08em}.nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.nav a{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:8px 14px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:20px 0}.stat,.panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px}.stat b{display:block;font-size:28px;color:var(--navy)}.stat span,.muted{color:var(--muted)}.panel{margin-top:18px}.panel h2{margin:0 0 8px;font-size:24px}.notice{background:#fff8ed;border-color:#f0c99e}.method{background:#eef7f7;border-color:#badbd9}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px}table{width:100%;border-collapse:collapse;background:#fff;min-width:760px}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}th{background:#edf3f5;color:#314254;position:sticky;top:0}.tag{display:inline-block;border-radius:999px;background:var(--soft);padding:3px 9px;font-size:13px;color:#365}.forward{color:#086d69}.backward{color:#a95016}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{border:1px solid var(--line);border-radius:16px;padding:18px;background:#fff}.card h3{margin:0 0 8px}.bar{height:8px;background:#e7ecef;border-radius:99px;overflow:hidden;margin:10px 0}.bar span{display:block;height:100%;background:linear-gradient(90deg,#1b7e7a,#335f84)}footer{margin-top:28px;color:var(--muted);font-size:14px;border-top:1px solid var(--line);padding-top:18px}@media(max-width:800px){.page{padding:16px 12px 40px}.hero{padding:24px 20px;border-radius:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cards{grid-template-columns:1fr}}@media(max-width:430px){.grid{grid-template-columns:1fr}.stat b{font-size:24px}}
"""


def render_direction_table(rows, limit=14):
    body = []
    for row in sorted(rows, key=lambda x: (x['medianRelativePctPoint26vs25'], -x['sampleCount']))[:limit]:
        body.append(
            f"<tr><td><b>{html.escape(row['label'])}</b><br><span class='muted'>{row['sampleCount']:,} 条严格样本</span></td>"
            f"<td class='{'forward' if row['medianRelativePctPoint26vs25'] < 0 else 'backward'}'>{html.escape(movement_text(row['medianRelativePctPoint26vs25']))}</td>"
            f"<td>{row['relativeForwardRate2026']:.1f}%</td><td>{row['relativeBackwardRate2026']:.1f}%</td><td>{row['stableRate2026']:.1f}%</td></tr>"
        )
    return "<div class='table-wrap'><table><thead><tr><th>专业方向</th><th>2026 相对变化</th><th>相对前移</th><th>相对后移</th><th>稳定</th></tr></thead><tbody>" + ''.join(body) + "</tbody></table></div>"


def annual_html(summary, manifest):
    counts = summary['trendCounts']
    directions = summary['directionSummary']
    top_forward = sorted(directions, key=lambda x: x['medianRelativePctPoint26vs25'])[:5]
    top_backward = sorted(directions, key=lambda x: x['medianRelativePctPoint26vs25'], reverse=True)[:5]
    cards = ''.join(
        f"<article class='card'><h3>{html.escape(row['label'])}</h3><p>{html.escape(movement_text(row['medianRelativePctPoint26vs25']))}</p><p class='muted'>严格样本 {row['sampleCount']:,} 条；相对前移 {row['relativeForwardRate2026']:.1f}%，相对后移 {row['relativeBackwardRate2026']:.1f}%。</p></article>"
        for row in top_forward + top_backward
    )
    return f"""<!doctype html><html lang='zh-CN'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'><meta name='theme-color' content='#173957'><title>辽宁 2026 报考观察｜2024—2026 三年专业投档位置</title><meta name='description' content='基于辽宁物理类 2024—2026 三年严格同口径专业投档数据，观察相对全体项目的位置变化、连续变化和反转。'><style>{base_css()}</style></head><body><main class='page'><header class='hero'><div class='kicker'>辽宁物理类 · 2024—2026</div><h1>2026 报考观察</h1><p>从三年同校、同专业、同项目属性的投档记录中，看最新变化、连续变化和反转。这里观察的是历史投档位置，不是报名人数、就业质量或 2027 年录取预测。</p><nav class='nav'><a href='/'>返回首页</a><a href='/lngk2026.html'>按分数段看</a><a href='/ln-rank/'>带参考分数初选</a></nav></header><section class='grid'><div class='stat'><b>{manifest['totalRecords']:,}</b><span>2026 专业投档记录</span></div><div class='stat'><b>{manifest['historyMatch']['exact']:,}</b><span>严格历史匹配</span></div><div class='stat'><b>{summary['strictCompleteCount']:,}</b><span>三年完整样本</span></div><div class='stat'><b>{summary['policy']['neutralThresholdPctPoint']:.2f}</b><span>相对变化中性门槛（百分点）</span></div></section><section class='panel notice'><h2>先看一个重要修正</h2><p>2025→2026 全体严格样本的位次比例中位数整体移动 {summary['policy']['annualCommonShift']['pctPoint26vs25Median']:.2f} 个百分点；2024→2025 整体移动 {summary['policy']['annualCommonShift']['pctPoint25vs24Median']:.2f} 个百分点。新版先扣除这种全体共同位移，再判断某个专业方向相对全体是前移、后移还是稳定，避免把年度考生总量和整体结构变化误写成专业“升温”。</p></section><section class='panel'><h2>三年相对变化结构</h2><div class='grid'><div class='stat'><b>{counts['continuous_forward']:,}</b><span>连续两年相对前移</span></div><div class='stat'><b>{counts['continuous_backward']:,}</b><span>连续两年相对后移</span></div><div class='stat'><b>{counts['rebound_2026']:,}</b><span>2026 相对反向前移</span></div><div class='stat'><b>{counts['pullback_2026']:,}</b><span>2026 相对反向后移</span></div></div></section><section class='panel'><h2>专业方向：2026 相对全体的位置变化</h2><p class='muted'>负值表示相对全体更靠前，正值表示相对全体更靠后。它不等同于专业好坏，也不表示未来仍会延续。</p>{render_direction_table(directions)}</section><section class='panel'><h2>值得进一步核验的方向</h2><div class='cards'>{cards}</div></section><section class='panel method'><h2>家长怎么使用</h2><p>先用孩子能否接受的专业、城市、费用、校区和资格条件筛选，再看 2026 投档位置是否接近，最后把三年相对变化放在背景层。连续前移不等于必须选择，连续后移也不能据此确定录取。</p><p>2027 正式填报仍需重新核对当年一分一段、招生计划、招生章程、选科、体检、校区和学费。</p></section><footer>版本：{VERSION}｜数据口径：辽宁物理类 2024—2026 三年严格同口径专业投档位置｜趋势方法：扣除年度共同位移后的相对变化｜不承诺录取结果</footer></main></body></html>"""


def heat_html(summary):
    band_cards = []
    for band in summary['scoreBandSummary']:
        direction_rows = sorted(band['directions'], key=lambda x: abs(x['medianRelativePctPoint26vs25']), reverse=True)[:6]
        rows = ''.join(
            f"<tr><td>{html.escape(row['label'])}</td><td>{row['sampleCount']:,}</td><td class='{'forward' if row['medianRelativePctPoint26vs25'] < 0 else 'backward'}'>{html.escape(movement_text(row['medianRelativePctPoint26vs25']))}</td><td>{row['relativeForwardRate2026']:.1f}% / {row['relativeBackwardRate2026']:.1f}%</td></tr>"
            for row in direction_rows
        )
        band_cards.append(f"<section class='panel'><h2>{html.escape(band['label'])}</h2><p>严格三年样本 {band['sampleCount']:,} 条；中位变化：<b>{html.escape(movement_text(band['medianRelativePctPoint26vs25']))}</b>。相对前移 {band['relativeForwardRate2026']:.1f}%，相对后移 {band['relativeBackwardRate2026']:.1f}%，稳定 {band['stableRate2026']:.1f}%。</p><div class='table-wrap'><table><thead><tr><th>方向</th><th>样本</th><th>相对变化</th><th>前移 / 后移</th></tr></thead><tbody>{rows}</tbody></table></div></section>")
    return f"""<!doctype html><html lang='zh-CN'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'><meta name='theme-color' content='#173957'><title>辽宁 2026 分数段专业投档热度观察｜三年相对位置</title><meta name='description' content='按辽宁 2026 投档分数段查看 2024—2026 三年专业投档位置相对全体项目的变化。'><style>{base_css()}</style></head><body><main class='page'><header class='hero'><div class='kicker'>辽宁物理类 · 分数段观察</div><h1>2026 分数段专业投档热度观察</h1><p>这里的“热度”只指历史投档位置相对全体同口径项目的变化，不是报名人数、搜索量、就业热度或专业质量。分数段按 2026 投档最低分归组。</p><nav class='nav'><a href='/'>返回首页</a><a href='/ln2026.html'>查看年度观察</a><a href='/ln-rank/'>带参考分数初选</a></nav></header><section class='panel notice'><h2>为什么不直接比较位次涨跌</h2><p>三年考生累计人数不同，而且全体专业在年份之间存在共同移动。新版先扣除年度共同位移，再看同一分数段、同一方向相对全体的变化，因此不会把整体位移误写成某个方向单独“变热”。</p></section>{''.join(band_cards)}<section class='panel method'><h2>使用边界</h2><p>同一方向内部不同学校、校区、专业大类和项目属性差异很大。分数段结果用于发现值得进一步核验的结构，不替代对具体专业记录的逐条查看。</p></section><footer>版本：{VERSION}｜数据口径：辽宁物理类 2024—2026 三年严格同口径专业投档位置｜“热度”仅为相对投档位置观察｜不承诺录取结果</footer></main></body></html>"""


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
    score_band_base = aggregate(records, 'scoreBandLabel')
    score_band_summary = []
    for band in score_band_base:
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
        'interpretationBoundary': '相对前移或后移仅说明相对于全体同口径项目的历史位置变化，不代表专业质量、就业、报名人数或未来录取结果。'
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
        'productVersion': VERSION,
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
    (ROOT / 'ln2026.html').write_text(annual_html(summary, manifest), encoding='utf-8')
    (ROOT / 'lngk2026.html').write_text(heat_html(summary), encoding='utf-8')
    print(json.dumps({'threshold': threshold, 'trendCounts': summary['trendCounts']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
