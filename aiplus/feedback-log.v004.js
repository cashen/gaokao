import {buildAiplusFeedbackBundle,aiplusFeedbackBundleText} from '/shared/ai/aiplus-feedback-bundle.v004.js?v=004_0';

export const AIPLUS_FEEDBACK_LOG_VERSION='aiplus-feedback-log-v0.04';
const STORAGE_KEY='aiplus.feedback-log.v004';
const MAX_EVENTS=40;

function clean(value,max=260){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,max);}
function now(){try{return new Date().toISOString();}catch{return'';}}
function viewportSnapshot(){const width=Math.round(window.innerWidth||document.documentElement?.clientWidth||0),height=Math.round(window.innerHeight||document.documentElement?.clientHeight||0),coarse=Boolean(window.matchMedia?.('(pointer: coarse)')?.matches),device=width<720?'mobile':width<960?'pad':'desktop';return{device,width,height,coarse,touchPoints:Number(navigator.maxTouchPoints||0)};}
function sanitizeEvent(event={}){return{at:clean(event.at||now(),40),kind:clean(event.kind,48),code:clean(event.code,80),message:clean(event.message,220),task:clean(event.task,80),stage:clean(event.stage,60)};}
function readRows(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(parsed)?parsed.map(sanitizeEvent).slice(-MAX_EVENTS):[];}catch{return[];}}
function writeRows(rows=[]){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(rows.slice(-MAX_EVENTS)));}catch{}}
function releaseSnapshot(release={}){return{site:clean(release.site||document.body?.dataset?.release,80),runtime:clean(release.runtime||document.body?.dataset?.siteRuntimeGeneration,80),advisor:clean(release.advisor||document.body?.dataset?.aiAdvisorGeneration,80),decision:clean(release.decision||document.body?.dataset?.aiDecisionGeneration,80),familyDecision:clean(release.familyDecision||document.body?.dataset?.aiFamilyDecision,80),assets:clean(release.assets||document.body?.dataset?.aiPlusAssets,80)};}

export function appendFeedbackEvent(event={}){const rows=readRows();rows.push(sanitizeEvent({...event,at:event.at||now()}));writeRows(rows);return rows.at(-1);}
export function clearFeedbackLog(){writeRows([]);}
export function feedbackEvents(){return readRows();}
export function buildFeedbackBundle({workspace={},includeCurrentTurn=false,release={},capabilityImpact='',problemNote=''}={}){return buildAiplusFeedbackBundle({workspace,viewport:viewportSnapshot(),release:releaseSnapshot(release),capabilityImpact,problemNote,events:readRows(),includeCurrentTurn,createdAt:now()});}
export function feedbackBundleText(options={}){const {workspace={},includeCurrentTurn=false,release={},capabilityImpact='',problemNote=''}=options;return aiplusFeedbackBundleText({workspace,viewport:viewportSnapshot(),release:releaseSnapshot(release),capabilityImpact,problemNote,events:readRows(),includeCurrentTurn,createdAt:now()});}
export async function copyFeedbackBundle(options={}){const text=feedbackBundleText(options);if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return{text,copied:true};}const textarea=document.createElement('textarea');textarea.value=text;textarea.setAttribute('readonly','');textarea.style.position='fixed';textarea.style.opacity='0';document.body.append(textarea);textarea.select();let copied=false;try{copied=document.execCommand('copy');}finally{textarea.remove();}return{text,copied};}
