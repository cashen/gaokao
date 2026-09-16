// v016.45/r135 compatibility guard.
// The current v017 responsive runtime owns visible candidate interactions and
// the compact PDF runtime owns visible PDF export. Keep the legacy hidden DOM
// available for persistence compatibility without allowing it to become a
// second visible interaction surface.
const LEGACY_ROOT='#simulationLegacyRuntime';
function installLegacyRenderGuard(){
  const root=document.querySelector(LEGACY_ROOT);
  if(!root)return;
  root.setAttribute('aria-hidden','true');
  root.hidden=true;
  root.dataset.v016LegacyGuard='v016.45-r135';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installLegacyRenderGuard,{once:true});
else installLegacyRenderGuard();
export const SIMULATION_LEGACY_RENDER_GUARD='v016.45-r135';
