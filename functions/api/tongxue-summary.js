const PARSER_VERSION = 'v1.0.6';
const SOURCE_HOSTS = ['https://srgaoxiao.com', 'https://eo.srgaoxiao.com'];
const READER_ORIGIN = 'https://r.jina.ai';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed', message: '只支持 GET 请求。', version: PARSER_VERSION }, 405);
  }

  const requestUrl = new URL(context.request.url);
  const school = normalizeSchool(requestUrl.searchParams.get('school'));
  const env = context.env || {};

  if (!school) {
    return json({ ok: false, error: 'missing_school', message: '请输入学校名称。', version: PARSER_VERSION }, 400);
  }

  if (school.length > 40 || /[\/?#@:&=]/.test(school)) {
    return json({ ok: false, error: 'invalid_school', message: '学校名称格式不正确。', version: PARSER_VERSION }, 400);
  }

  const canonicalSourceUrl = buildSourceUrl(SOURCE_HOSTS[0], school);
  const attempts = buildAttempts(school);
  const diagnostics = [];
  let sourcePageSeen = false;
  let sourceHasSchool = false;
  let readerAuthLimited = false;

  for (const attempt of attempts) {
    try {
      const result = await fetchText(attempt, env);
      const diagnostic = {
        kind: attempt.kind,
        host: attempt.host,
        status: result.status,
        contentType: result.contentType,
        length: result.text.length
      };
      diagnostics.push(diagnostic);

      if ((result.status === 401 || result.status === 403) && attempt.kind === 'reader') {
        readerAuthLimited = true;
      }
      if (!result.ok) continue;

      if (attempt.kind === 'source') sourcePageSeen = true;
      if (containsSchoolPage(result.text, school)) sourceHasSchool = true;

      const summary = extractSummary(result.text, school);
      if (!summary) continue;

      return json({
        ok: true,
        school,
        summary,
        source: {
          name: 'srgaoxiao.com',
          url: attempt.sourceUrl || canonicalSourceUrl
        },
        fetchedAt: new Date().toISOString(),
        transport: attempt.label,
        version: PARSER_VERSION
      });
    } catch (error) {
      diagnostics.push({
        kind: attempt.kind,
        host: attempt.host,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (sourcePageSeen || sourceHasSchool) {
    return json({
      ok: false,
      error: 'source_summary_unavailable',
      message: '来源站当前页面没有提供可识别的 AI 摘要。可能是该校评价数量暂不足、摘要尚未生成，或来源页面刚刚调整了结构。',
      school,
      source: { name: 'srgaoxiao.com', url: canonicalSourceUrl },
      version: PARSER_VERSION,
      diagnostics
    }, 404);
  }

  return json({
    ok: false,
    error: readerAuthLimited ? 'reader_auth_limited' : 'source_access_limited',
    message: readerAuthLimited
      ? '动态读取通道受到匿名访问限制。本站已尝试来源主域和备用域，但暂时无法读取该校页面。'
      : '暂时无法连接来源页面，请稍后重试。',
    school,
    source: { name: 'srgaoxiao.com', url: canonicalSourceUrl },
    version: PARSER_VERSION,
    readerKeyConfigured: Boolean(env.JINA_API_KEY),
    diagnostics
  }, 503);
}

function buildAttempts(school) {
  const attempts = [];

  for (const host of SOURCE_HOSTS) {
    const sourceUrl = buildSourceUrl(host, school);
    attempts.push({
      kind: 'source',
      label: host.includes('eo.') ? '来源备用域实时读取' : '来源主域实时读取',
      host,
      url: sourceUrl,
      sourceUrl
    });
  }

  for (const host of SOURCE_HOSTS) {
    const cleanHost = host.replace(/^https?:\/\//, '');
    const sourceUrl = buildSourceUrl(host, school);
    for (const protocol of ['https', 'http']) {
      attempts.push({
        kind: 'reader',
        label: host.includes('eo.') ? '动态读取备用域' : '动态读取主域',
        host,
        url: `${READER_ORIGIN}/${protocol}://${cleanHost}/school/${encodeURIComponent(school)}`,
        sourceUrl
      });
    }
  }

  return attempts;
}

async function fetchText(attempt, env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), attempt.kind === 'reader' ? 22000 : 13000);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'no-cache'
  };

  if (attempt.kind === 'reader') {
    headers.Accept = 'text/plain,text/markdown;q=0.9,*/*;q=0.8';
    headers['x-no-cache'] = 'true';
    headers['x-return-format'] = 'markdown';
    if (env.JINA_API_KEY) {
      headers.Authorization = `Bearer ${env.JINA_API_KEY}`;
      headers['x-engine'] = 'browser';
      headers['x-proxy'] = 'auto';
    }
  } else {
    headers.Accept = 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8';
    headers.Referer = `${attempt.host}/`;
  }

  try {
    const response = await fetch(attempt.url, {
      signal: controller.signal,
      redirect: 'follow',
      headers
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

function buildSourceUrl(host, school) {
  return `${host}/school/${encodeURIComponent(school)}`;
}

function normalizeSchool(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function containsSchoolPage(payload, school) {
  const text = decodeEntities(decodeEscapedPayload(String(payload || '')));
  return text.includes(school) && /学校|大学|学院|评价|宿舍|食堂/.test(text);
}

function extractSummary(payload, school) {
  const sources = buildCandidateSources(payload);

  for (const source of sources) {
    const byJsonField = extractJsonSummary(source, school);
    if (isUsefulSummary(byJsonField, school)) return tidySummary(byJsonField);
  }

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

function extractJsonSummary(source, school) {
  const fieldNames = ['aiSummary', 'ai_summary', 'summaryText', 'aiSummaryText', 'summary'];
  for (const field of fieldNames) {
    const pattern = new RegExp(`["']${field}["']\\s*[:=]\\s*["']([\\s\\S]{35,1800}?)["'](?=\\s*[,}])`, 'i');
    const match = source.match(pattern);
    if (!match) continue;
    const candidate = cleanCandidate(match[1], school);
    if (isUsefulSummary(candidate, school)) return candidate;
  }
  return '';
}

function extractSection(source, school) {
  const anchors = ['同学们普遍认为', '同学们认为', '学生普遍认为'];

  for (const anchor of anchors) {
    let cursor = source.indexOf(anchor);
    while (cursor !== -1) {
      const tail = source.slice(cursor + anchor.length, cursor + anchor.length + 2800);
      const candidate = cleanCandidate(stopAtBoundary(tail), school);
      if (isUsefulSummary(candidate, school)) return candidate;
      cursor = source.indexOf(anchor, cursor + anchor.length);
    }
  }

  const aiPatterns = [
    /AI\s*摘要\s*[:：]?\s*([\s\S]{35,1800}?)(?=\n\s*(?:#{1,6}\s*)?(?:基于学生评价自动生成|仅供参考|写评价|热门评价|全部评价|学校评价|院校评价)|$)/i,
    /AI\s*(?:总结|概览)\s*[:：]?\s*([\s\S]{35,1800}?)(?=\n\s*(?:#{1,6}\s*)?(?:基于学生评价自动生成|仅供参考|写评价|热门评价|全部评价)|$)/i
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
    '同学评价', '最新评价', '对比', '收藏', '攻略'
  ];

  let stop = Math.min(value.length, 1900);
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
    new RegExp(`学生对${escapedSchool}[^。！？]{20,1100}[。！？](?:[^。！？]{0,600}[。！？])?`),
    new RegExp(`(?:学生|同学)[^。！？]{0,50}${escapedSchool}[^。！？]{20,1100}[。！？](?:[^。！？]{0,600}[。！？])?`),
    /学生对[^。！？]{2,24}(?:大学|学院)[^。！？]{20,1100}[。！？](?:[^。！？]{0,600}[。！？])?/
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
    .replace(/^(?:AI\s*(?:摘要|总结|概览)|[:：\-—|·\s])+/i, '')
    .replace(/基于学生评价自动生成[\s\S]*$/i, '')
    .replace(/仅供参考[\s\S]*$/i, '')
    .replace(/(?:查看完整|详细评价|热门评价|全部评价|写评价)[\s\S]*$/i, '')
    .trim();

  const starts = [`学生对${school}`, '学生对', '同学们', '学生普遍'];
  let bestStart = -1;
  for (const marker of starts) {
    const index = text.indexOf(marker);
    if (index >= 0 && (bestStart === -1 || index < bestStart)) bestStart = index;
  }
  if (bestStart > 0 && bestStart < 600) text = text.slice(bestStart);

  return text.slice(0, 1550).trim();
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
  if (text.length < 35 || text.length > 1650) return false;
  if (/暂未定位|摘要解析器|已连接来源页面|DOCTYPE|javascript required/i.test(text)) return false;
  if (/登录\/注册|搜学校|排行榜|投稿|更多/.test(text) && text.length < 220) return false;

  const signals = ['学生', '同学', '宿舍', '食堂', '就业', '管理', '校区', '师资', '学习', '校园', '性价比', '转专业', '保研', '实习'];
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
