export const AIPLUS_CONVERSATION_SCROLL_CONTRACT_VERSION='aiplus-conversation-scroll-v0.02';
export const COMPLETED_TURN_SAFE_GAP_PX=16;
function finite(value,fallback=0){const number=Number(value);return Number.isFinite(number)?number:fallback;}
function clamp(value,min,max){return Math.min(Math.max(value,min),max);}
export function completedTurnScrollTarget({scrollY=0,anchorTop=0,topbarBottom=0,maxScroll=0,safeGap=COMPLETED_TURN_SAFE_GAP_PX}={}){
  const current=Math.max(0,finite(scrollY)),anchor=finite(anchorTop),bar=Math.max(0,finite(topbarBottom)),gap=clamp(finite(safeGap,COMPLETED_TURN_SAFE_GAP_PX),8,32),limit=Math.max(0,finite(maxScroll));
  return clamp(current+anchor-(bar+gap),0,limit);
}
export function shouldBlurComposerOnCompletion({activeIsComposer=false,coarsePointer=false,maxTouchPoints=0}={}){
  return Boolean(activeIsComposer&&(coarsePointer||finite(maxTouchPoints)>0));
}
