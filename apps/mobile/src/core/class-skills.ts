import {classSkillsFor} from '../content/class-skills';
import {levelFromXp,totalXpAtLevel} from './progression';
import type {CharacterState,ClassId,GameState,RewardBundle} from './types';
export type TrainingFocus='balanced'|'primary'|'secondary';
export interface ClassSkillState{skillId:string;xp:number;level:number;}
export interface ClassDrills{lastClaimAtMs:number;progressMs:number;focus:TrainingFocus;xpPerDrill:number;}
export const MAX_CLASS_SKILL_XP=totalXpAtLevel(100);
export const normalizeTrainingFocus=(v:unknown):TrainingFocus=>v==='primary'||v==='secondary'?v:'balanced';
export function normalizeClassSkills(id:ClassId,raw:unknown):ClassSkillState[]{
 const rows=Array.isArray(raw)?raw:[];
 return classSkillsFor(id).map(d=>{const entry=rows.find(r=>r?.skillId===d.id);const xp=typeof entry?.xp==='number'&&Number.isFinite(entry.xp)?Math.max(0,Math.min(MAX_CLASS_SKILL_XP,Math.floor(entry.xp))):0;return {skillId:d.id,xp,level:levelFromXp(xp)};});
}
export const characterClassSkills=(c:CharacterState)=>normalizeClassSkills(c.classId,c.classSkills);
export function awardCombatClassXp(c:CharacterState,kills:number,perKill:number,firstFocus?:TrainingFocus){
 if(kills<=0)return {character:c,awards:characterClassSkills(c).map(s=>({skillId:s.skillId,xp:0}))};
 const first=awardClassSkillXp(c,kills>0?perKill:0,firstFocus??normalizeTrainingFocus(c.trainingFocus));
 const rest=awardClassSkillXp(first.character,Math.max(0,kills-1)*perKill);
 return {character:rest.character,awards:rest.awards.map((a,i)=>({...a,xp:a.xp+first.awards[i].xp}))};
}
export function normalizeClassDrills(raw:any):ClassDrills|undefined{
 if(!raw||!Number.isSafeInteger(raw.lastClaimAtMs)||raw.lastClaimAtMs<0)return undefined;
 return {lastClaimAtMs:raw.lastClaimAtMs,progressMs:Math.min(59999,Math.max(0,Math.floor(Number(raw.progressMs)||0))),focus:normalizeTrainingFocus(raw.focus),xpPerDrill:Math.max(8,Math.min(80,Number(raw.xpPerDrill)||8))};
}
export function awardClassSkillXp(c:CharacterState,pool:number,focus=normalizeTrainingFocus(c.trainingFocus)){
 const shares=focus==='primary'?[.75,.25]:focus==='secondary'?[.25,.75]:[.5,.5],remainders={...(c.classSkillRemainders??{})};
 const awards:Array<{skillId:string;xp:number}>=[];
 const classSkills=characterClassSkills(c).map((s,i)=>{const prior=Number.isFinite(remainders[s.skillId])?Math.max(0,Math.min(.999999,remainders[s.skillId])):0;const amount=Math.max(0,pool)*shares[i]+prior;const whole=Math.floor(amount+1e-9),gain=Math.min(MAX_CLASS_SKILL_XP-s.xp,whole);remainders[s.skillId]=s.xp+gain>=MAX_CLASS_SKILL_XP?0:Math.max(0,amount-whole);awards.push({skillId:s.skillId,xp:gain});return {...s,xp:s.xp+gain,level:levelFromXp(s.xp+gain)};});
 return {character:{...c,classSkills,classSkillRemainders:remainders},awards};
}
/** Conservative runtime interpretation: at most 10% offense and 12% resilience. */
export function characterClassEffects(c:CharacterState){
 const [a,b]=characterClassSkills(c).map(s=>(s.level-1)/99);
 const tank=['IRONWARDEN','BASTION','DREADGUARD'].includes(c.classId),support=['DAWNKEEPER','STONECALLER'].includes(c.classId);
 return tank?{attack:1,hp:1+.12*a,defense:1+.10*b}:support?{attack:1+.10*a,hp:1+.10*b,defense:1}:{attack:1+.07*a+.03*b,hp:1,defense:1+.06*b};
}
export function settleClassDrills(state:GameState,now:number,capSeconds:number):{state:GameState;reward:RewardBundle}{
 const c=state.character,drill=c?.classTraining;const empty:RewardBundle={xp:0,gold:0,kills:0,items:[],elapsedSeconds:0};
 if(!c||!drill||now<=drill.lastClaimAtMs)return {state,reward:empty};
 const elapsed=Math.min(capSeconds*1000,now-drill.lastClaimAtMs),total=elapsed+drill.progressMs,actions=Math.floor(total/60000);
 let character=c;const awards:Record<string,number>={};
 const apply=(count:number,focus:TrainingFocus)=>{if(!count)return;const earned=awardClassSkillXp(character,drill.xpPerDrill*count,focus);character=earned.character;for(const a of earned.awards)awards[a.skillId]=(awards[a.skillId]??0)+a.xp;};
 const focus=normalizeTrainingFocus(c.trainingFocus);
 let completed=characterClassSkills(c).every(s=>s.level===100)?0:Math.min(1,actions);
 apply(completed,drill.focus);
 const shares=focus==='primary'?[.75,.25]:focus==='secondary'?[.25,.75]:[.5,.5];
 const remainingToCap=Math.max(...characterClassSkills(character).map((s,i)=>Math.max(0,Math.ceil((MAX_CLASS_SKILL_XP-s.xp-(character.classSkillRemainders?.[s.skillId]??0))/(drill.xpPerDrill*shares[i])))));
 const rest=Math.min(Math.max(0,actions-completed),remainingToCap);
 apply(rest,focus);completed+=rest;
 const capped=characterClassSkills(character).every(s=>s.level===100);
 character={...character,classTraining:capped?undefined:{...drill,lastClaimAtMs:now,progressMs:total%60000,focus:actions?normalizeTrainingFocus(c.trainingFocus):drill.focus}};
 return {state:{...state,character},reward:{...empty,elapsedSeconds:Math.floor(elapsed/1000),trainingActions:completed,classSkillXp:Object.entries(awards).map(([skillId,xp])=>({skillId,xp}))}};
}
