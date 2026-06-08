export function initRankBandLegend(){
  const panel=document.querySelector('.middle.panel'); const btn=document.getElementById('rankBandLegendToggle'); if(!panel||!btn)return;
  const set=open=>{panel.classList.toggle('is-band-legend-open',open); btn.setAttribute('aria-expanded',String(open)); btn.textContent=open?'收起分数区间说明':'展开分数区间说明'};
  set(false); btn.addEventListener('click',()=>set(!panel.classList.contains('is-band-legend-open')));
}
