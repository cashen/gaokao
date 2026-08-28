import { buildUndergradGraduatePathway } from './undergrad-graduate-pathway.v001.js';
import { GRADUATE_CATALOG_SOURCES } from '../graduate/graduate-catalog-2022.v001.js';
import { buildMajorPathHref } from './major-path-navigation.v003.js';

export const UNDERGRAD_GRADUATE_PATHWAY_VIEW_META = Object.freeze({
  version: 'undergrad-graduate-pathway-view-v001',
  dataOwner: 'undergrad-graduate-pathway-v001',
  policy: 'compact-navigation-only'
});

function text(value = '') {
  return String(value || '').trim();
}

function html(value = '') {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function attr(value = '') {
  return html(value);
}

function entryList(entries = [], emptyText) {
  if (!entries.length) return `<p class="major-pathway-empty">${html(emptyText)}</p>`;
  return `<ul class="major-pathway-list">${entries.map(entry => `<li><span class="major-pathway-code">${html(entry.code)}</span><span>${html(entry.name)}</span>${entry.note ? `<small>${html(entry.note)}</small>` : ''}</li>`).join('')}</ul>`;
}

function fieldList(fields = []) {
  if (!fields.length) return '';
  return `<div class="major-pathway-fields"><strong>可继续查看的专业学位领域</strong><ul class="major-pathway-list">${fields.map(field => `<li><span class="major-pathway-code">${html(field.code)}</span><span>${html(field.name)}</span>${field.note || field.futureRule ? `<small>${html(field.note || field.futureRule)}</small>` : ''}</li>`).join('')}</ul></div>`;
}

export function buildUndergradGraduatePathwayView({ major = {}, returnTo = '/tongxue/' } = {}) {
  const pathway = buildUndergradGraduatePathway(major);
  const undergraduate = pathway.undergraduate;
  const majorCode = text(undergraduate.code).toUpperCase();
  if (!majorCode || !text(undergraduate.name)) return '';
  const href = buildMajorPathHref({
    majorCode,
    canonicalName: undergraduate.name,
    sourceSurface: 'tongxue',
    returnTo
  });
  const academic = entryList(pathway.academic, '当前没有可核验的学术学位方向。');
  const professional = entryList(pathway.professional, '当前没有可核验的专业学位方向。');
  const source = GRADUATE_CATALOG_SOURCES.catalog2022;
  const admissions = GRADUATE_CATALOG_SOURCES.admissions2026;
  const relationHint = pathway.relationStatus === 'curated_navigation'
    ? '以下方向用于继续查找，不是本科专业与研究生专业的一一对应表。'
    : '当前没有整理出可核验的对应方向，不代表不能继续深造。';
  return `<section class="major-pathway" data-major-pathway="${attr(majorCode)}" data-pathway-version="${attr(UNDERGRAD_GRADUATE_PATHWAY_VIEW_META.version)}" aria-label="本科到研究生路径">
    <div class="section-heading">本科 → 研究生路径</div>
    <p class="major-pathway-intro"><strong>${html(undergraduate.name)}</strong>：${html(relationHint)}</p>
    <div class="major-pathway-grid">
      <section class="major-pathway-panel"><h3>学术学位方向</h3>${academic}</section>
      <section class="major-pathway-panel"><h3>专业学位方向</h3>${professional}</section>
    </div>
    ${fieldList(pathway.professionalFields)}
    <p class="major-pathway-boundary">${html(pathway.note)} ${html(pathway.boundary)}</p>
    <div class="major-pathway-sources"><span>目录依据：</span><a href="${attr(source.url)}" target="_blank" rel="noopener noreferrer">${html(source.title)}</a><span>·</span><a href="${attr(admissions.url)}" target="_blank" rel="noopener noreferrer">${html(admissions.title)}</a></div>
    ${href ? `<a class="link" data-major-pathway-full-link href="${attr(href)}">查看完整专业升学地图 ↗</a>` : ''}
  </section>`;
}
