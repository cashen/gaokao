from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace(text: str, old: str, new: str, label: str, minimum: int = 1) -> str:
    count = text.count(old)
    if count < minimum:
        raise RuntimeError(f"{label}: expected at least {minimum} matches, got {count}")
    return text.replace(old, new)


def regex_replace(text: str, pattern: str, replacement: str, label: str, count: int = 1) -> str:
    result, changed = re.subn(pattern, replacement, text, count=count, flags=re.S)
    if changed != count:
        raise RuntimeError(f"{label}: expected {count} regex replacement, got {changed}")
    return result


def patch_render() -> None:
    path = "ln-rank/js/feature/major-pool/render.js"
    text = read(path)
    text = text.replace("?v=3949_3", "?v=3951_0")
    text = replace(
        text,
        "record.school, record.major, record.score2025, record.rank2025",
        "record.school, record.major, record.score2026 ?? record.score, record.rank2026 ?? record.rank",
        "render identity",
    )
    text = regex_replace(
        text,
        r"function compareYearText\(record = \{\}\) \{.*?\n\}\n\nfunction compareProgramVariant",
        """function compareYearText(record = {}) {
  const s2026 = record.score2026 ?? record.score;
  const r2026 = record.rank2026 ?? record.rank;
  const s2025 = record.score2025;
  const r2025 = record.rank2025;
  const s2024 = record.score2024 ?? record.historyScore2024 ?? record.lastYearScore;
  const r2024 = record.rank2024 ?? record.historyRank2024 ?? record.lastYearRank;
  const year2026 = (s2026 != null || r2026 != null) ? `2026 ${fmt(s2026)}分 / ${fmt(r2026)}位` : '2026投档数据待核验';
  const year2025 = (s2025 != null || r2025 != null) ? `2025 ${fmt(s2025)}分 / ${fmt(r2025)}位` : '2025同口径待核验';
  const year2024 = (s2024 != null || r2024 != null) ? `2024 ${fmt(s2024)}分 / ${fmt(r2024)}位` : '2024同口径待核验';
  return { year2026, year2025, year2024 };
}

function compareProgramVariant""",
        "render three-year formatter",
    )
    text = replace(
        text,
        "? years.year2025\n      : String(record.displayLocation || record.geoEntity || '地区待核验') + '｜' + years.year2025;",
        "? years.year2026\n      : String(record.displayLocation || record.geoEntity || '地区待核验') + '｜' + years.year2026;",
        "render compare primary year",
    )
    text = replace(
        text,
        "'<span>' + escapeHtml(second) + '</span>' +\n      '<span>' + escapeHtml(years.year2024) + '</span>' +",
        "'<span>' + escapeHtml(second) + '</span>' +\n      '<span>' + escapeHtml(years.year2025) + '</span>' +\n      '<span>' + escapeHtml(years.year2024) + '</span>' +",
        "render compare history rows",
    )
    text = replace(text, "2025最低位次：${fmt(record.rank2026 ?? record.rank)}", "2026对应累计位次约：${fmt(record.rank2026 ?? record.rank)}", "render rank label")
    text = text.replace("相对考生：${deltaText} 分", "相对参考分数：${deltaText} 分")
    write(path, text)


def patch_app() -> None:
    path = "ln-rank/js/app.v3951_0.js"
    text = read(path)
    text = text.replace("record.schoolCode2025, record.majorCode2025", "record.schoolCode2026, record.majorCode2026")
    anchor = """    state.bands.data = normalizeMajorBandsResponse(rawBandsResponse, {
      candidateScore: state.candidateScore,
      rangePreset: state.rangePreset
    });"""
    replacement = anchor + """
    try {
      const rankMeta = state.bands.data?.meta || {};
      const values = {
        'lnRank.selectionPool.candidateRank2026': rankMeta.candidateReferenceRank2026,
        'lnRank.selectionPool.candidateRankStart2026': rankMeta.candidateReferenceRankStart2026,
        'lnRank.selectionPool.candidateRankEnd2026': rankMeta.candidateReferenceRankEnd2026,
        'lnRank.selectionPool.candidateSameCount2026': rankMeta.candidateSameCount2026,
        'lnRank.selectionPool.candidateRankLabel2026': rankMeta.candidateRankLabel
      };
      Object.entries(values).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') localStorage.setItem(key, String(value));
        else localStorage.removeItem(key);
      });
    } catch {}"""
    text = replace(text, anchor, replacement, "app rank context persistence")
    write(path, text)


def patch_selection_page() -> None:
    path = "ln-rank/js/selection-pool.v3951_0.js"
    text = read(path)
    text = replace(text, "const SCORE_VERSION_KEY = 'lnRank.selectionPool.candidateScore.v3949_0';", "const SCORE_VERSION_KEY = 'lnRank.selectionPool.candidateScore.v3951_0';", "selection score version")
    text = replace(
        text,
        "const BOTTOMLINE_STORAGE_KEY = 'lnRank.bottomLineMode.current';",
        """const CANDIDATE_RANK_KEY = 'lnRank.selectionPool.candidateRank2026';
const CANDIDATE_RANK_START_KEY = 'lnRank.selectionPool.candidateRankStart2026';
const CANDIDATE_RANK_END_KEY = 'lnRank.selectionPool.candidateRankEnd2026';
const CANDIDATE_SAME_COUNT_KEY = 'lnRank.selectionPool.candidateSameCount2026';
const BOTTOMLINE_STORAGE_KEY = 'lnRank.bottomLineMode.current';""",
        "selection rank keys",
    )
    text = replace(
        text,
        "const LEGACY_SCORE_KEYS = [SCORE_VERSION_KEY,",
        "const LEGACY_SCORE_KEYS = [SCORE_VERSION_KEY, 'lnRank.selectionPool.candidateScore.v3949_0',",
        "selection legacy score key",
    )
    anchor = "\n\nfunction buildCurrentState({ persistScore = true } = {}) {"
    insertion = """

function loadRankContext() {
  try {
    const rank = parseNumText(localStorage.getItem(CANDIDATE_RANK_KEY));
    const rankStart = parseNumText(localStorage.getItem(CANDIDATE_RANK_START_KEY));
    const rankEnd = parseNumText(localStorage.getItem(CANDIDATE_RANK_END_KEY)) || rank;
    const sameCountRaw = Number(localStorage.getItem(CANDIDATE_SAME_COUNT_KEY));
    return {
      year: 2026,
      audienceYear: 2027,
      rank,
      rankStart,
      rankEnd,
      sameCount: Number.isFinite(sameCountRaw) && sameCountRaw >= 0 ? sameCountRaw : null,
      rangePreset: 'standard'
    };
  } catch {
    return { year: 2026, audienceYear: 2027, rangePreset: 'standard' };
  }
}

function buildCurrentState({ persistScore = true } = {}) {"""
    text = replace(text, anchor, insertion, "selection rank context loader")
    text = replace(text, "const candidateContext = buildCandidateContext(score);", "const candidateContext = buildCandidateContext(score, loadRankContext());", "selection context call")
    text = text.replace("考生分数", "模考 / 预估参考分数").replace("考生位次", "2026 历史参考位置")
    write(path, text)


def patch_local_app() -> None:
    path = "ln-rank/js/local-mainline/local-mainline-app.v3951_0.js"
    text = read(path)
    text = regex_replace(
        text,
        r"function historyLine\(r\) \{.*?\n\}",
        """function historyLine(r) {
  const rows = [];
  if (r.score2025 != null || r.rank2025 != null) rows.push(`2025：${r.score2025 != null ? `${fmt(r.score2025)}分` : '分数暂无'} / ${r.rank2025 != null ? `${fmt(r.rank2025)}位` : '位次暂无'}`);
  if (r.score2024 != null || r.rank2024 != null) rows.push(`2024：${r.score2024 != null ? `${fmt(r.score2024)}分` : '分数暂无'} / ${r.rank2024 != null ? `${fmt(r.rank2024)}位` : '位次暂无'}`);
  const trend = r.historyCompare?.rankTrendText ? `｜${esc(r.historyCompare.rankTrendText)}` : '';
  return rows.length ? `<div class="lm-history">历史同口径参考：${rows.join('；')}${trend}</div>` : '';
}""",
        "local app history",
    )
    text = text.replace("2025历史参考：<b>${fmt(r.score2026)}分</b>", "2026投档参考：<b>${fmt(r.score2026)}分</b>")
    text = text.replace("最低位次：<b>${fmt(r.rank2026)}</b>", "对应累计位次约：<b>${fmt(r.rank2026)}</b>")
    text = text.replace("相对孩子：", "相对参考分数：")
    write(path, text)


def patch_211_app() -> None:
    path = "ln-rank/js/211-mainline/211-mainline-app.v3951_0.js"
    text = read(path)
    text = text.replace("2025历史参考", "2026投档参考")
    text = text.replace("2025 历史参考", "2026 投档参考")
    text = text.replace("最低位次", "对应累计位次约")
    text = text.replace("相对孩子", "相对参考分数")
    text = text.replace("2024同口径参考", "2025、2024同口径参考")
    write(path, text)


def patch_pages() -> None:
    replacements = {
        "ln-rank/index.html": [
            ("正式填报仍要看 2026 位次、招生计划和院校章程。", "正式填报仍要看 2027 年一分一段、招生计划和院校章程。"),
            ("输入孩子分数和专业方向后", "输入参考分数和专业方向后"),
        ],
        "ln-rank/local-mainline.html": [
            ("博士点和学科评估是学科证据，2025 分数是历史参考。正式填报仍要看 2026 位次、招生计划、招生章程、体检要求、校区和学费等信息。", "博士点和学科评估是学校背景证据，2026 专业投档分和位次是历史参考。正式填报仍要看 2027 年一分一段、招生计划、招生章程、体检要求、校区和学费等信息。"),
            ("先看学校办学方向，再看 2025 历史数据中有哪些专业能对应。", "先看学校办学方向，再看 2026 投档记录中有哪些专业能对应，并用 2025、2024 作历史对照。"),
            ("当前对照2026专业投档记录；2026 一分一段接入后，会统一按位次/等位参考查看。", "当前对照 2026 专业投档记录；位次来自 2026 一分一段，只用于解释历史位置。"),
        ],
        "ln-rank/211-mainline.html": [
            ("先按当前输入分数对照历史记录；当前已接入2026一分一段，位次用于解释历史位置 211 背景。", "先用模考或预估参考分数对照 2026 投档记录；位次来自 2026 一分一段，只用于解释历史位置。"),
            ("当前按输入参考分数对照辽宁2026专业投档记录", "当前按输入参考分数对照辽宁 2026 专业投档记录"),
            ("数据口径：211 KB v0.1 + 统一背景位置口径", "数据口径：辽宁 2026 物理类专业投档 + 211 KB v0.1"),
        ],
    }
    for path, pairs in replacements.items():
        text = read(path)
        for old, new in pairs:
            text = replace(text, old, new, f"{path}: {old[:25]}")
        write(path, text)


def patch_report_builder() -> None:
    path = "functions/_lib/feishu-selection-pool-report-builder.js"
    text = read(path)
    text = regex_replace(
        text,
        r"function classify\(item = \{\}\) \{.*?\n\}",
        """function classify(item = {}) {
  if (item.historicalOnly) return { key: 'unknown', group: 'unknown', detail: '历史自选', position: '尚未匹配到 2026 同口径记录' };
  const existing = item.poolBand || {};
  const key = existing.key || item.bandKey || item.band || '';
  if (['upper', 'near', 'steady'].includes(key)) return {
    ...existing,
    key,
    group: key === 'upper' ? 'rush' : key === 'near' ? 'stable' : 'safe',
    detail: key === 'upper' ? '稍高目标' : key === 'near' ? '主要参考' : '低分侧补充',
    position: existing.position || (key === 'upper' ? '稍高目标区' : key === 'near' ? '主要参考区' : '低分侧补充区')
  };
  const delta = num(item.scoreDelta2026 ?? item.scoreDelta, null);
  if (delta == null) return { key: 'unknown', group: 'unknown', detail: '待核验', position: '分差待核验' };
  if (delta >= 1 && delta <= 10) return { key: 'upper', group: 'rush', detail: '稍高目标', position: '稍高目标区' };
  if (delta >= -10 && delta <= 0) return { key: 'near', group: 'stable', detail: '主要参考', position: '主要参考区' };
  if (delta >= -25 && delta <= -11) return { key: 'steady', group: 'safe', detail: '低分侧补充', position: '低分侧补充区' };
  return { key: 'outside', group: 'unknown', detail: '当前范围外', position: '不在当前查看范围内' };
}""",
        "report classification",
    )
    text = replace(text, "scoreDelta: num(item.scoreDelta, null),", "scoreDelta2026: num(item.scoreDelta2026 ?? item.scoreDelta, null),\n      scoreDelta: num(item.scoreDelta2026 ?? item.scoreDelta, null),\n      rankGap2026: num(item.rankGap2026 ?? item.rankGap, null),\n      rankGap: num(item.rankGap2026 ?? item.rankGap, null),\n      historicalOnly: Boolean(item.historicalOnly),", "report normalized deltas")
    text = replace(text, ").filter(x => x.school || x.major);", ").filter(x => (x.school || x.major) && !x.historicalOnly);", "report historical-only filter")
    text = text.replace("- 两年位次变化：只反映 2024/2025 两年同校同专业普通项目位次变化，不代表 2026 年录取结果。", "- 三年位置变化：只反映 2024—2026 同校同专业同项目属性的历史投档位置变化，不代表 2027 年录取结果。")
    text = text.replace("## 两年位次变化参考", "## 近三年投档位置变化参考")
    text = text.replace("以上只反映 2024/2025 两年同校同专业录取位次变化，不代表 2026 年录取结果。", "以上只反映 2024—2026 同校同专业同项目属性的历史投档位置变化，不代表 2027 年录取结果。")
    text = text.replace("考生分数：", "模考 / 预估参考分数：")
    text = text.replace("考生位次：", "2026 历史参考位置：")
    text = text.replace("考生：${summary.candidateScore", "参考分数：${summary.candidateScore")
    write(path, text)


def patch_styled_builder() -> None:
    path = "functions/_lib/feishu-selection-pool-styled-builder.js"
    text = read(path)
    text = text.replace("相对孩子 ", "相对参考分数 ")
    text = text.replace("item.scoreDelta)", "item.scoreDelta2026 ?? item.scoreDelta)")
    text = text.replace("item.rankGap)", "item.rankGap2026 ?? item.rankGap)")
    text = text.replace("rankGapText(item.rankGap)", "rankGapText(item.rankGap2026 ?? item.rankGap)")
    write(path, text)


def main() -> None:
    patch_render()
    patch_app()
    patch_selection_page()
    patch_local_app()
    patch_211_app()
    patch_pages()
    patch_report_builder()
    patch_styled_builder()
    print("LN 2026 runtime corrections applied")


if __name__ == "__main__":
    main()
