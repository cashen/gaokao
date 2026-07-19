export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const school = (requestUrl.searchParams.get('school') || '').trim();

  if (!school) {
    return Response.json({ error: 'missing school' }, { status: 400 });
  }

  const target = `https://srgaoxiao.com/school/${encodeURIComponent(school)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 GaokaoOS Tongxue Reader'
      }
    });

    if (!response.ok) {
      throw new Error(`source status ${response.status}`);
    }

    const html = await response.text();
    const summary = extractSummary(html, school);

    return Response.json({
      school,
      summary,
      source: {
        name: 'srgaoxiao.com',
        url: target
      },
      updated: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      error: 'source unavailable',
      message: '暂时无法获取学生评价摘要'
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

function extractSummary(html, school) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  const markers = [
    '同学们普遍认为',
    'AI摘要',
    'AI 摘要',
    '学生评价'
  ];

  for (const marker of markers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      const content = text
        .slice(index + marker.length, index + marker.length + 900)
        .trim();

      if (content.length > 20) {
        return content;
      }
    }
  }

  const schoolIndex = text.indexOf(school);
  if (schoolIndex !== -1) {
    const fallback = text
      .slice(schoolIndex, schoolIndex + 800)
      .trim();

    if (fallback.length > 30) {
      return fallback;
    }
  }

  return '已获取来源页面，但暂未定位到 AI 摘要区域。';
}
