const PARSER_VERSION = 'v1.0.7';
const SOURCE_HOSTS = ['https://srgaoxiao.com', 'https://eo.srgaoxiao.com'];
const READER_ORIGIN = 'https://r.jina.ai';
const MAX_BODY_LENGTH = 1_800_000;

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
  const attempts = buildAttempts(school, Boolean(env.JINA_API_KEY));
  const diagnostics = [];
  let readablePageSeen = false;
  let matchingSchoolPageSeen = false;
  let readerAuthLimited = false;

  for (const attempt of attempts) {
    try {
      const result = await fetchText(attempt, env);
      diagnostics.push({
        kind: attempt.kind,
        host: attempt.host,
        status: result.status,
        contentType: result.contentType,
        length: result.text.length
      });

      if ((result.status === 401 || result.status === 403) && attempt.kind === 'reader') {
        readerAuthLimited = true;
      }
      if (!result.ok) continue;

      readablePageSeen = true;
      if (containsSchoolPage(result.text, school)) matchingSchoolPageSeen = true;

      const summary = extractSummary(result.text, school);
      if (!summary) continue;

      return json({
        ok: true,
        school,
        summary: tidySummary(summary),
        source: { name: 'srgaoxiao.com', url: attempt.sourceUrl || canonicalSourceUrl },
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

  if (readablePageSeen || matchingSchoolPageSeen) {
    return json({
      ok: false,
      error: 'summary_not_recognized',
      message: '来源页面已经取得，但本次没有识别到“同学们普遍认为”的 AI 摘要。不能据此判断来源站没有摘要，可能是页面结构发生了变化。',
      school,
      source: { name: 'srgaoxiao.com', url: canonicalSourceUrl },
      version: PARSER_VERSION,
      diagnostics
    }, 502);
  }

  return json({
    ok: false,
    error: readerAuthLimited ? 'reader_auth_limited' : 'source_access_limited',
    message: readerAuthLimited
      ? '来源页面直接读取失败，备用动态读取通道也受到访问限制。'
      : '暂时无法连接来源页面，请稍后重试。',
    school,
    source: { name: 'srgaoxiao.com', url: canonicalSourceUrl },
    version: PARSER_VERSION,
    readerKeyConfigured: Boolean(env.JINA_API_KEY),
    diagnostics
  }, 503);
}

function buildAttempts(school, hasReaderKey) {
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

  // Jina 仅作为配置了服务端密钥后的最后回退；浏览器不再直接请求它。
  if (hasReaderKey) {
    for (const host of SOURCE_HOSTS) {
      const cleanHost = host.replace(/^https?:\/\//, '');
      const sourceUrl = buildSourceUrl(host, school);
      attempts.push({
        kind: 'reader',
        label: host.includes('eo.') ? '服务端动态读取备用域' : '服务端动态读取主域',
        host,
        url: `${READER_ORIGIN}/https://${cleanHost}/school/${encodeURIComponent(school)}`,
        sourceUrl
      });
    }
  }

  return attempts;
}

async function fetchText(attempt, env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), attempt.kind === 'reader' ? 22000 : 14000);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'no-cache'
  };

  if (attempt.kind === 'reader') {
    headers.Accept = 'text/plain,text/markdown;q=0.9,*/*;q=0.8';
    headers.Authorization = `Bearer ${env.JINA_API_KEY}`;
    headers['x-no-cache'] = 'true';
    headers['x-return-format'] = 'markdown';
    headers['x-engine'] = 'browser';
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

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_BODY_LENGTH) {
      throw new Error(`来源响应过大：${declaredLength}`);
    }

    const raw = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text: raw.slice(0, MAX_BODY_LENGTH)
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

function buildSourceUrl(host, school) {
  return `${host}/school/${encodeURIComponent(school)}`;
}

function containsSchoolPage(payload, school) {
  const decoded = decodeEntities(decodeEscapedPayload(String(payload || '')));
  if (!decoded.includes(school)) return false;
  const signals = ['同学们普遍认为', 'AI摘要', 'AI 摘要', '学校评价', '学生评价', '宿舍', '食堂', '就业'];
  return signals.some((signal) => decoded.includes(signal));
}

function extractSummary(payload, school) {
  const raw = String(payload || '');
  const decoded = decodeEntities(decodeEscapedPayload(raw));
  const sources = unique([
    normalizeDocument(raw),
    normalizeDocument(decoded),
    normalizeDocument(htmlToText(decoded)),
    normalizeDocument(markdownToText(decoded))
  ]).filter(Boolean);

  for (const source of sources) {
    const byJson = extractJsonField(source, school);
    if (isUsefulSummary(byJson, school)) return byJson;
  }

  for (const source of sources) {
    const byAnchor = extractByAnchor(source, school);
    if (isUsefulSummary(byAnchor, school)) return byAnchor;
  }

  for (const source of sources) {
    const bySentence = extractBySentence(source, school);
    if (isUsefulSummary(bySentence, school)) return bySentence;
  }

  return '';
}

function extractJsonField(source, school) {
  const fields = ['aiSummary', 'ai_summary', 'summaryText', 'aiSummaryText', 'summary'];
  for (const field of fields) {
    const doubleQuoted = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\]){35,4000})"`, 'i');
    const singleQuoted = new RegExp(`'${field}'\\s*:\\s*'((?:\\\\.|[^'\\\\]){35,4000})'`, 'i');
    const match = source.match(doubleQuoted) || source.match(singleQuoted);
    if (!match) continue;
    const candidate = cleanCandidate(match[1], school);
    if (isUsefulSummary(candidate, school)) return candidate;
  }
  return '';
}

function extractByAnchor(source, school) {
  const anchors = ['同学们普遍认为', '同学们认为', '学生普遍认为', 'AI 摘要', 'AI摘要'];
  for (const anchor of anchors) {
    let start = source.indexOf(anchor);
    while (start !== -1) {
      const tail = source.slice(start + anchor.length, start + anchor.length + 3200);
      const candidate = cleanCandidate(stopAtBoundary(tail), school);
      if (isUsefulSummary(candidate, school)) return candidate;
      start = source.indexOf(anchor, start + anchor.length);
    }
  }
  return '';
}

function extractBySentence(source, school) {
  const oneLine = source.replace(/\s+/g, ' ');
  const escapedSchool = escapeRegExp(school);
  const patterns = [
    new RegExp(`学生对${escapedSchool}[^。！？]{20,1300}[。！？](?:[^。！？]{0,700}[。！？])?`),
    new RegExp(`(?:学生|同学)[^。！？]{0,60}${escapedSchool}[^。！？]{20,1300}[。！？](?:[^。！？]{0,700}[。！？])?`),
    /学生对[^。！？]{2,30}(?:大学|学院)[^。！？]{20,1300}[。！？](?:[^。！？]{0,700}[。！？])?/
  ];

  for (const pattern of patterns) {
    const match = oneLine.match(pattern);
    if (!match) continue;
    const candidate = cleanCandidate(match[0], school);
    if (isUsefulSummary(candidate, school)) return candidate;
  }
  return '';
}

function stopAtBoundary(value) {
  const markers = [
    '\n# ', '\n## ', '\n### ', '\n#### ',
    '基于学生评价自动生成', '仅供参考', '查看完整', '详细评价',
    '热门评价', '全部评价', '写评价', '学校简介', '院校简介',
    '同学评价', '最新评价', '评分分布', '对比', '收藏', '攻略'
  ];
  let stop = Math.min(value.length, 2200);
  for (const marker of markers) {
    const index = value.indexOf(marker);
    if (index > 20) stop = Math.min(stop, index);
  }
  return value.slice(0, stop);
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
  if (bestStart > 0 && bestStart < 700) text = text.slice(bestStart);

  return text.slice(0, 1800).trim();
}

function isUsefulSummary(value, school) {
  const text = String(value || '').trim();
  if (text.length < 35 || text.length > 1900) return false;
  if (/暂未定位|摘要解析器|已连接来源页面|DOCTYPE|javascript required|webpack|__NEXT_DATA__/i.test(text)) return false;
  if (/登录\/注册|搜学校|排行榜|投稿|更多/.test(text) && text.length < 260) return false;

  const signals = ['学生', '同学', '宿舍', '食堂', '就业', '管理', '校区', '师资', '学习', '校园', '性价比', '转专业', '保研', '实习', '课程', '环境'];
  const score = signals.filter((word) => text.includes(word)).length;
  return score >= 2 || (text.includes(school) && score >= 1);
}

function tidySummary(value) {
  return String(value || '')
    .replace(/\s*([，。！？；：、])\s*/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[：:，,。\s]+/, '')
    .trim();
}

function markdownToText(value) {
  return String(value || '')
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

function htmlToText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, (script) => `\n${script}\n`)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h1|h2|h3|h4|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
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
  const map = {
    '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&amp;': '&',
    '&lt;': '<', '&gt;': '>', '&mdash;': '—', '&middot;': '·'
  };
  return String(value || '')
    .replace(/&(nbsp|quot|amp|lt|gt|mdash|middot);/g, (match) => map[match] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeDocument(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function unique(values) {
  return [...new Set(values)];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
