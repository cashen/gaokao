const PARSER_VERSION = 'v1.0.3';
const SOURCE_HOSTS = ['https://srgaoxiao.com', 'https://eo.srgaoxiao.com'];

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const school = normalizeSchool(requestUrl.searchParams.get('school'));

  if (!school) {
    return json({ error: 'missing_school', message: '请输入学校名称。', version: PARSER_VERSION }, 400);
  }

  if (school.length > 40 || /[\/?#@:&=]/.test(school)) {
    return json({ error: 'invalid_school', message: '学校名称格式不正确。', version: PARSER_VERSION }, 400);
  }

  let lastError = null;

  for (const host of SOURCE_HOSTS) {
    const target = `${host}/school/${encodeURIComponent(school)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(target, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': `${host}/`
        }
      });

      if (!response.ok) {
        lastError = new Error(`source status ${response.status}`);
        continue;
      }

      const html = await response.text();
      const summary = extractSummary(html, school);

      if (!summary) {
        lastError = new Error('summary not found');
        continue;
      }

      return json({
        school,
        summary,
        source: {
          name: 'srgaoxiao.com',
          url: target
        },
        updated: new Date().toISOString(),
        version: PARSER_VERSION
      });
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return json({
    error: 'summary_not_found',
    message: '已连接来源页面，但暂未定位到 AI 摘要。来源页面可能刚刚调整了结构，请稍后重试。',
    school,
    source: {
      name: 'srgaoxiao.com',
      url: `${SOURCE_HOSTS[0]}/school/${encodeURIComponent(school)}`
    },
    version: PARSER_VERSION,
    detail: lastError instanceof Error ? lastError.message : 'unknown'
  }, 502);
}

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Tongxue-Version': PARSER_VERSION
    }
  });
}

function normalizeSchool(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractSummary(html, school) {
  const decodedHtml = decodeEntities(String(html || ''));
  const sources = [
    decodedHtml,
    decodeEscapedPayload(decodedHtml),
    htmlToVisibleText(decodedHtml)
  ];

  for (const source of sources) {
    const result = extractByAnchor(source, school);
    if (isUsefulSummary(result, school)) return tidySummary(result);
  }

  for (const source of sources) {
    const result = extractBySentence(source, school);
    if (isUsefulSummary(result, school)) return tidySummary(result);
  }

  return '';
}

function extractByAnchor(source, school) {
  const anchors = ['同学们普遍认为', '同学们认为', 'AI摘要', 'AI 摘要'];

  for (const anchor of anchors) {
    let start = source.indexOf(anchor);
    while (start !== -1) {
      const after = source.slice(start + anchor.length, start + anchor.length + 2200);
      const cleaned = cleanCandidate(after, school);
      if (isUsefulSummary(cleaned, school)) return cleaned;
      start = source.indexOf(anchor, start + anchor.length);
    }
  }

  return '';
}

function extractBySentence(source, school) {
  const normalized = source.replace(/\\n/g, ' ').replace(/\s+/g, ' ');
  const patterns = [
    new RegExp(`学生对${escapeRegExp(school)}[^。！？]{20,700}[。！？]`),
    new RegExp(`(?:学生|同学)[^。！？]{0,30}${escapeRegExp(school)}[^。！？]{20,700}[。！？]`),
    /学生对[^。！？]{2,20}(?:大学|学院)[^。！？]{20,700}[。！？]/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return match[0];
  }

  return '';
}

function cleanCandidate(value, school) {
  let text = decodeEscapedPayload(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[{}\[\]"]/g, ' ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = text
    .replace(/^(?:[:：\-—|·\s]|AI摘要|AI 摘要)+/i, '')
    .replace(/基于学生评价自动生成[\s\S]*$/i, '')
    .replace(/仅供参考[\s\S]*$/i, '')
    .replace(/(?:写评价|查看全部|展开|收藏|攻略)[\s\S]*$/i, '')
    .trim();

  const sentenceStart = Math.max(
    text.indexOf(`学生对${school}`),
    text.indexOf('学生对')
  );
  if (sentenceStart > 0 && sentenceStart < 500) text = text.slice(sentenceStart);

  const stopMarkers = ['基于学生评价自动生成', '仅供参考', '详细评价', '热门评价', '全部评价', '写评价'];
  let stop = text.length;
  for (const marker of stopMarkers) {
    const index = text.indexOf(marker);
    if (index > 30) stop = Math.min(stop, index);
  }

  return text.slice(0, Math.min(stop, 1200)).trim();
}

function tidySummary(value) {
  return value
    .replace(/\s*([，。！？；：])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/^[：:，,。\s]+/, '')
    .trim();
}

function isUsefulSummary(value, school) {
  if (!value || value.length < 35 || value.length > 1400) return false;
  if (/暂未定位|摘要解析器|已连接来源页面/.test(value)) return false;
  const signals = ['学生', '同学', '宿舍', '食堂', '就业', '管理', '校区', '师资', '学习', '校园'];
  const score = signals.filter((word) => value.includes(word)).length;
  return score >= 2 || (value.includes(school) && score >= 1);
}

function htmlToVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h1|h2|h3|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
