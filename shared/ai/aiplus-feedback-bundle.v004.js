import {deriveDecisionProgress} from './decision-progress.v003.js';

export const AIPLUS_FEEDBACK_BUNDLE_VERSION='aiplus-feedback-bundle-v0.04';

function clean(value,max=260){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,max);}
function safeEvent(event={}){return{at:clean(event.at,40),kind:clean(event.kind,48),code:clean(event.code,80),message:clean(event.message,220),task:clean(event.task,80),stage:clean(event.stage,60)};}

export function buildAiplusFeedbackBundle({workspace={},viewport={},release={},capabilityImpact='',problemNote='',events=[],includeCurrentTurn=false,createdAt=''}={}){
  const progress=deriveDecisionProgress(workspace),focus=workspace?.agentContext?.focus||{},next=progress.stages.find(item=>item.key===progress.recommendedStage)||null;
  const body={
    bundleVersion:AIPLUS_FEEDBACK_BUNDLE_VERSION,
    createdAt:clean(createdAt||new Date().toISOString(),40),
    release:{site:clean(release.site,80),runtime:clean(release.runtime,80),advisor:clean(release.advisor,80),decision:clean(release.decision,80),familyDecision:clean(release.familyDecision,80),assets:clean(release.assets,80)},
    workspace:{contractVersion:clean(workspace?.contractVersion,100),id:clean(workspace?.id,140),version:Number(workspace?.version||0),task:clean(workspace?.agentContext?.currentTask,80),stage:clean(workspace?.decisionStage,60),focus:{school:clean(focus.school,120),major:clean(focus.major,160)}},
    viewport:{device:clean(viewport.device,20),width:Number(viewport.width||0),height:Number(viewport.height||0),coarse:Boolean(viewport.coarse),touchPoints:Number(viewport.touchPoints||0)},
    progress:{version:clean(progress.version,80),nextKey:clean(progress.recommendedStage,60),nextLabel:clean(next?.label,80),readyCount:Number(progress.completedCount||0),total:Number(progress.total||0),stages:(progress.stages||[]).map(item=>({key:clean(item.key,60),state:clean(item.state,30),summary:clean(item.summary,180)}))},
    capabilityImpact:clean(capabilityImpact,240),
    problemNote:clean(problemNote,500),
    recentEvents:(Array.isArray(events)?events:[]).slice(-12).map(safeEvent)
  };
  if(includeCurrentTurn){const turn=(workspace?.turnHistory||[]).at(-1)||{};body.currentTurn={question:clean(turn.userText,600),answer:clean(turn.assistantSummary,1200)};}
  return body;
}

export function aiplusFeedbackBundleText(options={}){return ['AIPLuS 问题反馈 Log',JSON.stringify(buildAiplusFeedbackBundle(options),null,2)].join('\n');}
