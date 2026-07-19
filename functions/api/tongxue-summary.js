const PARSER_VERSION = 'v1.0.5';
const SOURCE_ORIGIN = 'https://srgaoxiao.com';
const READER_ORIGIN = 'https://r.jina.ai';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ error: 'method_not_allowed', message: '只支持 GET 请求。', version: PARSER_VERSION }, 405);
  }

  const requestUrl = new URL(context.request.url);
  const school = normalizeSchool(requestUrl.searchParams.get('school'));

  if (!school) {
    return json({ error: 'missing_school', message: '请输入学校名称。', version: PARSER_VERSION }, 400);
  }

  if (school.length > 40 || /[\/?#@:&=]/.test(school)) {
    return json({ error: 'invalid_school', message: '学校名称格式不正确。', version: PARSER_VERSION }, 400);
  }

  const sourceUrl = `${SOURCE_ORIGIN}/school/${encodeURIComponent(school)}`;
  const attempts = [
    { kind: 'source-html', url: sourceUrl },
    { kind: 'rendered-reader-http', url: `${READER_ORIGIN}/http://srgaoxiao.com/school/${encodeURIComponent(school)}` },
    { kind: 'rendered-reader-https', url: `${READER_ORIGIN}/https://srgaoxiao.com/school/${encodeURIComponent(school)}` }
  ];

  const diagnostics = [];

  for (const attempt of attempts) {
    try {
      const result = await fetchText(attempt.url, attempt.kind);
      diagnostics.push({ kind: attempt.kind, status: result.status, contentType: result.contentType, length: result.text.length });

      if (!result.ok) continue;

      const summary = extractSummary(result.text, school);
      if (!summary) continue;

      return json({
        ok: true,
        school,
        summary,
        source: {
          name: 'srgaoxiao.com',
          url: sourceUrl
        },
        fetchedAt: new Date().toISOString(),
        transport: attempt.kind,
        version: PARSER_VERSION
      });
    } catch (error) {
      diagnostics.push({ kind: attempt.kind, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return json({
    ok: false,
    error: 'summary_not_found',
    message: '已连接来源页面，但没有识别到“同学们普遍认为”的 AI 摘要。来源页可能临时限制访问或调整了内容结构。',
    school,
    source: {
      name: 'srgaoxiao.com',
      url: sourceUrl
    },
    version: PARSER_VERSION,
    diagnostics
  }, 502);
}

async function fetchText(url, kind) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), kind.startsWith('rendered-reader') ? 20000 : 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        'Accept': kind.startsWith('rendered-reader') ? 'text/plain,text/markdown;q=0.9,*/*;q=0.8' : 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text: await response.text()
    };
  } finally {
    clearTimeout(timeout);
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-tongxue-version': PARSER_VERSION
    }
  });
}

function normalizeSchool(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractSummary(payload, school) {
  const sources = buildCandidateSources(payload);

  for (const source of sources) {
    const bySection = extractSection(source, school);
    if (isUsefulSummary(bySection, school)) return tidySummary(bySection);
  }

  for (const source of sources) {
    const bySentence = extractSentence(source, school);
    if (isUsefulSummary(bySentence, school)) return tidySummary(bySentence);
  }

  return '';
}

function buildCandidateSources(payload) {
  const raw = String(payload || '');
  const decoded = decodeEntities(decodeEscapedPayload(raw));
  return unique([
    normalizeDocument(raw),
    normalizeDocument(decoded),
    normalizeDocument(htmlToText(decoded)),
    normalizeDocument(markdownToText(decoded))
  ]).filter(Boolean);
}

function extractSection(source, school) {
  const anchors = ['同学们普遍认为', '同学们认为'];

  for (const anchor of anchors) {
    let cursor = source.indexOf(anchor);
    while (cursor !== -1) {
      const tail = source.slice(cursor + anchor.length, cursor + anchor.length + 2600);
      const candidate = cleanCandidate(stopAtBoundary(tail), school);
      if (isUsefulSummary(candidate, school)) return candidate;
      cursor = source.indexOf(anchor, cursor + anchor.length);
    }
  }

  const aiPatterns = [
    /AI\s*摘要\s*[:：]?\s*([\s\S]{35,1600}?)(?=\n\s*(?:#{1,6}\s*)?(?:基于学生评价自动生成|仅供参考|写评价|热门评价|全部评价|学校评价|院校评价)|$)/i,
    /(?:summary|aiSummary|ai_summary)["'\s:=]+([\s\S]{35,1600}?)(?=["'}\],]|$)/i
  ];

  for (const pattern of aiPatterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const candidate = cleanCandidate(match[1], school);
    if (isUsefulSummary(candidate, school)) return candidate;
  }

  return '';
}

function stopAtBoundary(value) {
  const stopMarkers = [
    '\n# ', '\n## ', '\n### ', '\n#### ',
    '基于学生评价自动生成', '仅供参考', '查看完整', '详细评价',
    '热门评价', '全部评价', '写评价', '学校简介', '院校简介',
    '对比', '收藏', '攻略'
  ];

  let stop = Math.min(value.length, 1800);
  for (const marker of stopMarkers) {
    const index = value.indexOf(marker);
    if (index > 20) stop = Math.min(stop, index);
  }
  return value.slice(0, stop);
}

function extractSentence(source, school) {
  const oneLine = source.replace(/\s+/g, ' ');
  const escapedSchool = escapeRegExp(school);
  const patterns = [
    new RegExp(`学生对${escapedSchool}[^。！？]{20,900}[。！？](?:[^。！？]{0,500}[。！？])?`),
    new RegExp(`(?:学生|同学)[^。！？]{0,40}${escapedSchool}[^。！？]{20,900}[。！？](?:[^。！？]{0,500}[。！？])?`),
    /学生对[^。！？]{2,24}(?:大学|学院)[^。！？]{20,900}[。！？](?:[^。！？]{0,500}[。！？])?/
  ];

  for (const pattern of patterns) {
    const match = oneLine.match(pattern);
    if (match) return cleanCandidate(match[0], school);
  }
  return '';
}

function cleanCandidate(value, school) {
  let text = decodeEntities(decodeEscapedPayload(String(value || '')))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[#>*\-\s]+/gm, '')
    .replace(/[{}\[\]"]/g, ' ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

  text = text
    .replace(/^(?:AI\s*摘要|[:：\-—|·\s])+/i, '')
    .replace(/基于学生评价自动生成[\s\S]*$/i, '')
    .replace(/仅供参考[\s\S]*$/i, '')
    .replace(/(?:查看完整|详细评价|热门评价|全部评价|写评价)[\s\S]*$/i, '')
    .trim();

  const starts = [`学生对${school}`, '学生对', '同学们'];
  let bestStart = -1;
  for (const marker of starts) {
    const index = text.indexOf(marker);
    if (index >= 0 && (bestStart === -1 || index < bestStart)) bestStart = index;
  }
  if (bestStart > 0 && bestStart < 500) text = text.slice(bestStart);

  return text.slice(0, 1400).trim();
}

function tidySummary(value) {
  return String(value || '')
    .replace(/\s*([，。！？；：、])\s*/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[：:，,。\s]+/, '')
    .trim();
}

function isUsefulSummary(value, school) {
  const text = String(value || '').trim();
  if (text.length < 35 || text.length > 1500) return false;
  if (/暂未定位|摘要解析器|已连接来源页面|DOCTYPE|javascript required/i.test(text)) return false;
  if (/登录\/注册|搜学校|排行榜|投稿|更多/.test(text) && text.length < 180) return false;

  const signals = ['学生', '同学', '宿舍', '食堂', '就业', '管理', '校区', '师资', '学习', '校园', '性价比', '转专业'];
  const score = signals.filter((word) => text.includes(word)).length;
  return score >= 2 || (text.includes(school) && score >= 1);
}

function normalizeDocument(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, (script) => `\n${script}\n`)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h1|h2|h3|h4|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
}

function markdownToText(markdown) {
  return String(markdown || '')
    .replace(/^Title:.*$/gim, '')
    .replace(/^URL Source:.*$/gim, '')
    .replace(/^Published Time:.*$/gim, '')
    .replace(/^Markdown Content:.*$/gim, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '');
}

function decodeEscapedPayload(value) {
  return String(value || '')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/\\n/g, '\n');
}

function decodeEntities(value) {
  const entities = {
    '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&amp;': '&',
    '&lt;': '<', '&gt;': '>', '&mdash;': '—', '&middot;': '·'
  };
  return String(value || '')
    .replace(/&(nbsp|quot|amp|lt|gt|mdash|middot);/g, (match) => entities[match] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function unique(values) {
  return [...new Set(values)];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
