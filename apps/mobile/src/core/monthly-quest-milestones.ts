import type {GameState,SkillId,SkillState} from './types';
import type {SeasonalPeriod} from './seasonal-quests';
import {levelFromXp,totalXpAtLevel} from './progression';

/** Personal challenge completions feed one shared account calendar-month reward track. */
export const MONTHLY_QUEST_MILESTONES = [
 {points:30,xp:1000},
 {points:60,xp:2500},
 {points:100,xp:5000},
] as const;
export type MonthlyQuestMilestoneThreshold=typeof MONTHLY_QUEST_MILESTONES[number]['points'];
export const MONTHLY_QUEST_POINTS:Record<SeasonalPeriod,number>={daily:1,weekly:3,monthly:5};
const GRACE_MS=7*24*60*60*1000;
const MAX_XP=totalXpAtLevel(100);

export interface MonthlyQuestMilestoneClaim {characterId:string;skillId:SkillId;claimedAtMs:number;xpGranted:number;}
export interface MonthlyQuestMilestoneMonth {
 key:string;
 points:number;
 creditedQuestIds:string[];
 claimed:Partial<Record<MonthlyQuestMilestoneThreshold,MonthlyQuestMilestoneClaim>>;
}
export interface MonthlyQuestMilestoneState {months:MonthlyQuestMilestoneMonth[];}
export interface MonthlyQuestMilestoneView {
 key:string;points:number;claimed:MonthlyQuestMilestoneThreshold[];
 isPrevious:boolean;claimUntilMs:number;
}
export function utcQuestMonth(nowMs:number):string{return new Date(nowMs).toISOString().slice(0,7);}
function previousMonth(key:string):string{
 const [year,month]=key.split('-').map(Number);
 const date=new Date(Date.UTC(year,month-2,1));
 return date.toISOString().slice(0,7);
}
function monthStartMs(key:string):number{return Date.parse(key+'-01T00:00:00.000Z');}
/** Preserve the account ledger when upgrading older offline saves; discard malformed data. */
export function normalizeMonthlyQuestMilestones(raw:unknown):MonthlyQuestMilestoneState{
 const input=raw&&typeof raw==='object'?(raw as {months?:unknown}).months:undefined;
 if(!Array.isArray(input))return {months:[]};
 const allowedSkills=new Set<string>(['mining','woodcutting','fishing','herbalism','smithing','cooking','alchemy','exploration','tailoring','enchanting','faith']);
 const months:MonthlyQuestMilestoneMonth[]=[];
 for(const value of input){
  if(!value||typeof value!=='object')continue;
  const row=value as Partial<MonthlyQuestMilestoneMonth>;
  if(typeof row.key!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.key))continue;
  const claimed:MonthlyQuestMilestoneMonth['claimed']={};
  for(const milestone of MONTHLY_QUEST_MILESTONES){
   const record=row.claimed?.[milestone.points];
   if(!record||typeof record.characterId!=='string'||!record.characterId||!allowedSkills.has(record.skillId)||
    !Number.isFinite(record.claimedAtMs)||!Number.isFinite(record.xpGranted)||record.xpGranted<1||record.xpGranted>milestone.xp)continue;
   claimed[milestone.points]={characterId:record.characterId,skillId:record.skillId,claimedAtMs:record.claimedAtMs,xpGranted:record.xpGranted};
  }
  months.push({
   key:row.key,
   points:Number.isSafeInteger(row.points)&&Number(row.points)>=0?Math.min(300,Number(row.points)):0,
   creditedQuestIds:Array.isArray(row.creditedQuestIds)?[...new Set(row.creditedQuestIds.filter(id=>typeof id==='string'&&id.length<120))].slice(-150):[],
   claimed,
  });
 }
 return {months:[...new Map(months.map(row=>[row.key,row])).values()].sort((a,b)=>a.key.localeCompare(b.key)).slice(-2)};
}
function readMonths(state:GameState):MonthlyQuestMilestoneMonth[]{
 return normalizeMonthlyQuestMilestones(state.account.monthlyQuestMilestones).months;
}
function eligibleMonth(key:string,nowMs:number):boolean{
 const current=utcQuestMonth(nowMs);
 if(key===current)return true;
 return key===previousMonth(current)&&nowMs<monthStartMs(current)+GRACE_MS;
}
function activeMonths(state:GameState,nowMs:number):MonthlyQuestMilestoneMonth[]{
 return readMonths(state).filter(row=>eligibleMonth(row.key,nowMs));
}
export function monthlyQuestMilestoneStatus(state:GameState,nowMs=Date.now()):MonthlyQuestMilestoneView[]{
 const current=utcQuestMonth(nowMs),existing=activeMonths(state,nowMs);
 const currentRow:MonthlyQuestMilestoneMonth=existing.find(row=>row.key===current)??{key:current,points:0,creditedQuestIds:[],claimed:{}};
 const previous=existing.find(row=>row.key===previousMonth(current));
 return [currentRow,...(previous?[previous]:[])].map(row=>({
  key:row.key,points:row.points,
  claimed:MONTHLY_QUEST_MILESTONES.filter(milestone=>Boolean(row.claimed[milestone.points])).map(milestone=>milestone.points),
  isPrevious:row.key!==current,
  claimUntilMs:row.key===current?monthStartMs(new Date(Date.UTC(Number(current.slice(0,4)),Number(current.slice(5,7)),1)).toISOString().slice(0,7))+GRACE_MS:monthStartMs(current)+GRACE_MS,
 }));
}
/** Called only after the server has verified and settled an unclaimed seasonal quest. */
export function creditMonthlyQuestMilestone(state:GameState,period:SeasonalPeriod,questId:string,nowMs:number):GameState{
 const key=utcQuestMonth(nowMs),months=activeMonths(state,nowMs);
 const existing=months.find(row=>row.key===key)??{key,points:0,creditedQuestIds:[],claimed:{}};
 if(existing.creditedQuestIds.includes(questId))return state;
 const next:MonthlyQuestMilestoneMonth={
  ...existing,points:existing.points+MONTHLY_QUEST_POINTS[period],
  creditedQuestIds:[...existing.creditedQuestIds,questId].slice(-150),
 };
 return {...state,account:{...state.account,monthlyQuestMilestones:{months:[...months.filter(row=>row.key!==key),next]}}};
}
/** Server-authoritative single-use award. Chosen profession must belong to the requested account character. */
export function claimMonthlyQuestMilestone(state:GameState,key:string,threshold:number,characterId:string,skillId:SkillId,nowMs:number):GameState{
 const milestone=MONTHLY_QUEST_MILESTONES.find(row=>row.points===threshold);
 if(!milestone)throw new Error('Unknown monthly quest milestone.');
 if(!eligibleMonth(key,nowMs))throw new Error('This monthly milestone has expired.');
 const months=activeMonths(state,nowMs),row=months.find(entry=>entry.key===key);
 if(!row||row.points<milestone.points)throw new Error('Earn more Quest Points before claiming this milestone.');
 if(row.claimed[milestone.points])throw new Error('This monthly milestone was already claimed.');
 const isActive=state.character?.id===characterId;
 const parkedIndex=isActive?-1:(state.otherCharacters??[]).findIndex(entry=>entry.character.id===characterId);
 if(!isActive&&parkedIndex<0)throw new Error('Select a character on this account.');
 const originalSkills:SkillState[]=isActive?state.skills:state.otherCharacters![parkedIndex].skills;
 const selected=originalSkills.find(skill=>skill.skillId===skillId);
 if(!selected||!Number.isFinite(selected.xp)||selected.xp<0)throw new Error('Select an unlocked skill.');
 const award=Math.min(milestone.xp,Math.max(0,MAX_XP-selected.xp));
 if(award<1)throw new Error('This skill is already at maximum level.');
 const updatedSkills=originalSkills.map(skill=>{
  if(skill.skillId!==skillId)return skill;
  const xp=Math.min(MAX_XP,skill.xp+award);
  return {...skill,xp,level:levelFromXp(xp)};
 });
 const updatedMonth:MonthlyQuestMilestoneMonth={
  ...row,claimed:{...row.claimed,[milestone.points]:{characterId,skillId,claimedAtMs:nowMs,xpGranted:award}},
 };
 const updatedAccount={...state.account,monthlyQuestMilestones:{months:months.map(entry=>entry.key===key?updatedMonth:entry)}};
 if(isActive)return {...state,account:updatedAccount,skills:updatedSkills};
 return {...state,account:updatedAccount,otherCharacters:(state.otherCharacters??[]).map((entry,index)=>index===parkedIndex?{...entry,skills:updatedSkills}:entry)};
}
