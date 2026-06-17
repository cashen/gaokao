function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function onRequest(context) {
  const env = context.env || {};
  const hasSecret = (name) => Boolean(String(env[name] || '').trim());
  return json({
    ok: true,
    routes: {
      currentBandReport: '/api/feishu-create-report',
      selectionPoolReport: '/api/feishu-create-selection-pool-report'
    },
    env: {
      FEISHU_APP_ID: hasSecret('FEISHU_APP_ID'),
      FEISHU_APP_SECRET: hasSecret('FEISHU_APP_SECRET'),
      FEISHU_DOC_HOST: hasSecret('FEISHU_DOC_HOST')
    },
    message: '飞书报告 Functions 健康检查可用。若前端仍收到 HTML，请确认请求路径是否为 /api/feishu-create-report 或 /api/feishu-create-selection-pool-report，并确认本包 functions 目录已部署到 Cloudflare Pages 项目根目录。'
  });
}
