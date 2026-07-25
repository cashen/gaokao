import { FEISHU_REPORT_CONTRACT, FEISHU_REPORT_ROUTES } from '../../shared/resources/reports/feishu-report-contract.js';
import { feishuJson } from '../_lib/feishu-report-service.js';

export function onRequest(context) {
  const env = context.env || {};
  const hasSecret = name => Boolean(String(env[name] || '').trim());
  return feishuJson({
    ok: true,
    version: FEISHU_REPORT_CONTRACT.releaseVersion,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    rankYear: FEISHU_REPORT_CONTRACT.rankYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion,
    routes: FEISHU_REPORT_ROUTES,
    env: {
      FEISHU_APP_ID: hasSecret('FEISHU_APP_ID'),
      FEISHU_APP_SECRET: hasSecret('FEISHU_APP_SECRET'),
      FEISHU_DOC_HOST: hasSecret('FEISHU_DOC_HOST')
    },
    message: '飞书报告 Functions 路由和共享合同已加载。真实文档创建仍需有效的飞书应用凭据。'
  });
}
