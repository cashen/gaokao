export function initRankBandLegend(){
  const panel=document.querySelector('.middle.panel');
  const legend=document.querySelector('.rank-band-legend');
  panel?.classList.add('is-band-legend-static');
  legend?.setAttribute('data-legend-role','explanation');
}
