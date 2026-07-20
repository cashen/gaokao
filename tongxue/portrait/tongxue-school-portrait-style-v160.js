import { installPortraitStyles as installBasePortraitStyles } from './tongxue-school-portrait-style-v120.js';

let installed=false;

export function installPortraitStyles(){
  installBasePortraitStyles();
  if(installed||typeof document==='undefined')return;
  installed=true;
  const style=document.createElement('style');
  style.id='tongxue-portrait-evidence-v160-style';
  style.textContent=`
.portrait-evidence-overview{margin-top:18px;padding:17px;border:1px solid var(--border);border-radius:16px;background:#f8faf9}
.portrait-evidence-overview h4{margin:0 0 8px;color:var(--primary);font-size:16px}.portrait-evidence-overview p{margin:0;color:var(--muted);font-size:13px;line-height:1.75}
.portrait-evidence-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.portrait-evidence-chip{display:inline-flex;align-items:center;min-height:27px;border-radius:999px;padding:4px 9px;background:#fff;border:1px solid var(--border);color:var(--muted);font-size:11px;font-weight:750}
.portrait-evidence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.portrait-evidence-card{min-width:0;border:1px solid var(--border);border-radius:15px;padding:15px;background:#fff}.portrait-evidence-card.consensus{background:#f4faf7}.portrait-evidence-card.dispute{background:var(--warm);border-color:var(--warm-border)}
.portrait-evidence-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.portrait-evidence-card-head strong{font-size:14px}.portrait-evidence-card-head span{flex:none;color:var(--primary);font-size:16px;font-weight:900}.portrait-evidence-card p{margin:9px 0 0;color:var(--muted);font-size:12px;line-height:1.7}
.portrait-distribution{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:11px}.portrait-distribution span{border-radius:8px;padding:6px 5px;background:#f3f6f5;color:var(--muted);font-size:10px;text-align:center}.portrait-evidence-card.dispute .portrait-distribution span{background:#fff9f3}
.portrait-trend{display:inline-flex;margin-top:9px;border-radius:999px;padding:3px 7px;background:var(--soft);color:var(--primary);font-size:10px;font-weight:800}
.portrait-topic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.portrait-topic-card{border:1px solid var(--border);border-radius:14px;padding:13px;background:#fff}.portrait-topic-card-head{display:flex;justify-content:space-between;gap:8px}.portrait-topic-card strong{font-size:14px}.portrait-topic-count{color:var(--primary);font-size:12px;font-weight:900}.portrait-topic-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;color:var(--muted);font-size:10px}.portrait-topic-meta span{border-radius:999px;background:#f3f6f5;padding:3px 7px}.portrait-topic-links{display:flex;gap:9px;flex-wrap:wrap;margin-top:9px}.portrait-topic-links a{color:var(--primary);font-size:11px;font-weight:800;text-underline-offset:3px}
.portrait-checklist{display:grid;gap:9px}.portrait-check-item{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--border);border-radius:13px;padding:12px 13px;background:#fff}.portrait-check-mark{display:grid;place-items:center;flex:none;width:22px;height:22px;border:1px solid #a9c6ce;border-radius:7px;color:var(--primary);font-size:12px;font-weight:900}.portrait-check-copy{min-width:0}.portrait-check-copy strong{display:block;font-size:13px;line-height:1.55}.portrait-check-copy span{display:block;margin-top:3px;color:var(--muted);font-size:11px;line-height:1.65}
.portrait-empty-evidence{border:1px dashed var(--border);border-radius:13px;padding:13px;color:var(--muted);font-size:12px;line-height:1.7}.portrait-evidence-note{margin-top:15px;padding:12px 14px;border-radius:12px;background:#f7f8f8;color:var(--muted);font-size:11px;line-height:1.75}
@media(max-width:700px){.portrait-evidence-grid,.portrait-topic-grid{grid-template-columns:1fr}.portrait-evidence-overview{padding:14px}.portrait-evidence-card,.portrait-topic-card{padding:13px}.portrait-distribution span{padding:6px 3px}}
`;
  document.head.append(style);
}
