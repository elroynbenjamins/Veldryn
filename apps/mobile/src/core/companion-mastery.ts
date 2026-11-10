/**
 * Account-wide Companion Mastery.
 * This is separate from the Sanctuary Training Ground (facility levels 0–3)
 * and individual companion XP/Bond/Ascension. All awards are made inside a
 * trusted, committed game action; the client cannot submit mastery XP.
 */
export const COMPANION_MASTERY_MAX_LEVEL=100;
export const COMPANION_MASTERY_MAX_STAT_BONUS=.05;
export const COMPANION_MASTERY_MAX_XP_BONUS=.10;
export const COMPANION_MASTERY_MAX_ASSIST_BONUS=.05;
export type CompanionMasterySource='training'|'expedition'|'trial';

export function companionMasteryXpForNext(level:number){
 const safe=Math.max(1,Math.min(99,Math.floor(Number.isFinite(level)?level:1)));
 return Math.floor(120+16*safe+1.75*Math.pow(safe,1.45));
}
export const COMPANION_MASTERY_MAX_XP=Array.from({length:99},(_,i)=>companionMasteryXpForNext(i+1)).reduce((a,b)=>a+b,0);
export function normalizeCompanionMasteryXp(value:unknown):number{
 return typeof value==='number'&&Number.isFinite(value)?Math.min(COMPANION_MASTERY_MAX_XP,Math.max(0,Math.floor(value))):0;
}
export function companionMasteryProgress(value:unknown){
 const xp=normalizeCompanionMasteryXp(value);
 let level=1,spent=0;
 while(level<100&&spent+companionMasteryXpForNext(level)<=xp){spent+=companionMasteryXpForNext(level);level++;}
 return {level,xp,current:xp-spent,need:level===100?0:companionMasteryXpForNext(level),maxXp:COMPANION_MASTERY_MAX_XP};
}
export function companionMasteryBonuses(value:unknown){
 const {level}=companionMasteryProgress(value),fraction=(level-1)/99;
 return {
  level,
  statPct:COMPANION_MASTERY_MAX_STAT_BONUS*fraction,
  companionXpPct:COMPANION_MASTERY_MAX_XP_BONUS*fraction,
  assistPct:COMPANION_MASTERY_MAX_ASSIST_BONUS*fraction,
 };
}
export const companionMasteryStatMultiplier=(value:unknown)=>1+companionMasteryBonuses(value).statPct;
export function companionMasteryCompanionXp(raw:number,masteryXp:unknown):number{
 if(!Number.isFinite(raw)||raw<=0)return 0;
 return Math.max(0,Math.floor(raw*(1+companionMasteryBonuses(masteryXp).companionXpPct)+.5));
}
export function awardCompanionMasteryXp<T extends {companionMasteryXp?:number}>(account:T,amount:number):T{
 const xp=normalizeCompanionMasteryXp(account.companionMasteryXp);
 const gain=Number.isFinite(amount)?Math.max(0,Math.floor(amount)):0;
 if(gain===0||xp===COMPANION_MASTERY_MAX_XP)return account;
 return {...account,companionMasteryXp:Math.min(COMPANION_MASTERY_MAX_XP,xp+gain)};
}
/** Explicit, capped outcome XP; never derive this from arbitrary client counters. */
export function companionMasteryAward(source:CompanionMasterySource,options:{days?:number;eligible?:number;hours?:number;grade?:'C'|'B'|'A'|'S';floor?:number;firstClear?:boolean;boss?:boolean}={}):number{
 if(source==='training'){
  const days=Math.max(0,Math.min(7,Math.floor(options.days??0)));
  const eligible=Math.max(0,Math.min(3,Math.floor(options.eligible??0)));
  return days&&eligible?days*(12+6*eligible):0;
 }
 if(source==='expedition'){
  const hours=Math.max(0,Math.min(72,Number.isFinite(options.hours)?options.hours!:0));
  return Math.round(65+hours*15+(options.grade==='S'?45:options.grade==='A'?25:options.grade==='B'?10:0));
 }
 const floor=Math.max(1,Math.min(30,Math.floor(options.floor??1)));
 return 35+floor*7+(options.boss?60:0)+(options.firstClear?45:0);
}
