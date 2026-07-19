export async function onRequest(context) {
  const url = new URL(context.request.url);
  const school = (url.searchParams.get('school') || '').trim();

  if (!school) {
    return Response.json({ error: 'missing school' }, { status: 400 });
  }

  // 第一版保守实现：通过可配置来源获取摘要。
  // 不保存数据库，不生成二次 AI，不改变原始内容。
  const target = `https://srgaoxiao.com/search?q=${encodeURIComponent(school)}`;

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 GaokaoOS Tongxue Reader'
      }
    });

    const html = await res.text();

    return Response.json({
      school,
      source: 'srgaoxiao.com',
      url: target,
      summary: '已连接来源页面。摘要解析器需要根据 srgaoxiao 当前页面结构配置提取规则。',
      rawLength: html.length
    });
  } catch (e) {
    return Response.json({
      error: 'source unavailable'
    }, { status: 502 });
  }
}
