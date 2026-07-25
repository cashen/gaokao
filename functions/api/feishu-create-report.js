import { buildFeishuReport } from '../_lib/feishu-report-builder.js';
import { buildReportDataV3956 } from '../_lib/report-data-service-v3956.js';
import { createFeishuReportResponse } from '../_lib/feishu-report-service.js';
import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';

export function onRequest(context) {
  return createFeishuReportResponse(context, async (input, runtime) => {
    const data = await buildReportDataV3956(runtime.context.request, runtime.env, input);
    return {
      ...buildFeishuReport(data),
      reportType: FEISHU_REPORT_CONTRACT.currentBandReportType,
      dataYear: FEISHU_REPORT_CONTRACT.dataYear,
      rankYear: FEISHU_REPORT_CONTRACT.rankYear,
      audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
      yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion
    };
  }, FEISHU_REPORT_CONTRACT);
}
