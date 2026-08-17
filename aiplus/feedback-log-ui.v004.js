import {loadCurrentWorkspace} from '/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0';
import {appendFeedbackEvent,clearFeedbackLog,feedbackBundleText,copyFeedbackBundle} from '/aiplus/feedback-log.v004.js?v=004_0';

export const AIPLUS_FEEDBACK_LOG_UI_VERSION='aiplus-feedback-log-ui-v0.04';

const $=selector=>document.querySelector(selector);
const els={toggle:$('#feedbackLogToggle'),dialog:$('#feedbackLogDialog'),note:$('#feedbackLogNote'),includeTurn:$('#feedbackLogIncludeTurn'),preview:$('#feedbackLogPreview'),copy:$('#feedbackLogCopy'),clear:$('#feedbackLogClear'),status:$('#feedbackLogStatus')};
let workspace=null;

function clean(value,max=500){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,max);}
async function currentWorkspace(){const latest=await loadCurrentWorkspace().catch(()=>null);if(latest?.id)workspace=latest;return workspace||{};}
function problemNote(){return clean(els.note?.value);}
async function refresh(){const value=await currentWorkspace();if(els.preview)els.preview.value=feedbackBundleText({workspace:value,includeCurrentTurn:Boolean(els.includeTurn?.checked),problemNote:problemNote()});}
async function openFeedback(){const value=await currentWorkspace();appendFeedbackEvent({kind:'feedback_opened',message:'用户打开问题反馈 Log',task:value?.agentContext?.currentTask,stage:value?.decisionStage});await refresh();els.dialog?.showModal();}
async function copyFeedback(){const value=await currentWorkspace(),note=problemNote();if(note)appendFeedbackEvent({kind:'user_note',code:'user_report',message:note,task:value?.agentContext?.currentTask,stage:value?.decisionStage});const result=await copyFeedbackBundle({workspace:value,includeCurrentTurn:Boolean(els.includeTurn?.checked),problemNote:note});if(els.preview)els.preview.value=result.text;if(els.status)els.status.textContent=result.copied?'已复制，可以直接粘贴给 ChatGPT。':'自动复制失败，请手动复制上面的日志。';}

els.toggle?.addEventListener('click',()=>openFeedback().catch(error=>{if(els.status)els.status.textContent=`日志生成失败：${clean(error?.message||error,160)}`;}));
els.note?.addEventListener('input',()=>refresh().catch(()=>{}));
els.includeTurn?.addEventListener('change',()=>refresh().catch(()=>{}));
els.copy?.addEventListener('click',event=>{event.preventDefault();copyFeedback().catch(error=>{if(els.status)els.status.textContent=`复制失败：${clean(error?.message||error,160)}`;});});
els.clear?.addEventListener('click',event=>{event.preventDefault();clearFeedbackLog();if(els.note)els.note.value='';if(els.status)els.status.textContent='本地诊断日志已清空。';refresh().catch(()=>{});});
window.addEventListener('error',event=>appendFeedbackEvent({kind:'browser_error',code:'window_error',message:clean(event?.message,220),task:workspace?.agentContext?.currentTask,stage:workspace?.decisionStage}));
window.addEventListener('unhandledrejection',event=>appendFeedbackEvent({kind:'browser_error',code:'unhandled_rejection',message:clean(event?.reason?.message||event?.reason,220),task:workspace?.agentContext?.currentTask,stage:workspace?.decisionStage}));
