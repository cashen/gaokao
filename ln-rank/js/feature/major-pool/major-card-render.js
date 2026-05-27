import { formatNumber, signed } from "../../core/number-utils.js";
export function renderMajorCard(record) {
  const score = record.score == null ? "—" : `${formatNumber(record.score)} 分`;
  const rank = record.rank == null ? "—" : formatNumber(record.rank);
  const delta = record.scoreDeltaFromCandidate == null ? "—" : `${signed(record.scoreDeltaFromCandidate)} 分`;
  const flags = Array.isArray(record.flags) ? record.flags.slice(0, 2) : [];
  return `
    <article class="major-card">
      <div class="major-card-top">
        <div>
          <h4>${record.school || '学校待核验'}</h4>
          <p class="major-name">${record.major || '专业待核验'}</p>
        </div>
        <span class="status-badge status-${record.statusKey || 'match'}">${record.statusLabel || '匹配参考'}</span>
      </div>
      <div class="major-meta">
        <span>2025最低分：${score}</span>
        <span>最低位次：${rank}</span>
        <span>相对考生：${delta}</span>
        <span>${record.region || '地区待核验'}</span>
        ${record.nature ? `<span>${record.nature}</span>` : ''}
        ${record.tuition ? `<span>学费：${record.tuition}</span>` : ''}
      </div>
      ${flags.length ? `<div class="major-flags">${flags.map((flag) => `<span>${flag}</span>`).join('')}</div>` : ''}
    </article>
  `;
}
