import {CLASSES} from '../content/classes';
import {hash32} from './rng';
import {seasonalQuestBoard,type SeasonalPeriod,type SeasonalActivity} from './seasonal-quests';
import type {GameState} from './types';

/** Older builds offered class/role challenges based on lifetime progression.
 * IDs were positional and are also used by the new verified-action catalog.
 *
 * A request header is NOT a security proof of client version. A short-lived
 * server-owned migration snapshot alone can authorize these older rewards.
 */
export const LEGACY_SEASONAL_CLAIM_CUTOFF_MS=Date.UTC(2026,11,1);
export interface LegacySeasonalGrantSnapshot{
 ownerCharacterId:string;
 eligibleIds:string[];
 capturedAtMs:number;
}
type LegacyTag='combat'|'gathering'|'crafting'|'equipment'|'exploration';
type LegacyObjective=readonly [LegacyTag,number];
const roleObjectives:Record<'Tank'|'Support'|'Damage',readonly LegacyObjective[]>={
 Tank:[['combat',24],['gathering',12],['equipment',6],['exploration',5]],
 Support:[['gathering',30],['crafting',12],['combat',20],['exploration',5]],
 Damage:[['combat',18],['crafting',14],['combat',30],['exploration',5]],
};
const classObjectives:Record<string,LegacyObjective>={
 IRONWARDEN:['equipment',6],BASTION:['combat',30],DREADGUARD:['combat',28],
 DAWNKEEPER:['crafting',15],WAYFINDER:['exploration',5],RAVAGER:['combat',40],
 HEXWEAVER:['gathering',22],KNIFE_DANCER:['exploration',6],STONECALLER:['gathering',24],
};

function legacyProgress(state:GameState,tag:LegacyTag):number{
 const character=state.character!;
 switch(tag){
  case 'combat':return Math.floor(character.xp/80);
  case 'gathering':return Math.floor(state.skills.reduce((sum,skill)=>sum+skill.xp,0)/40);
  case 'crafting':return Object.values(character.equipment).filter(Boolean).length+(character.craftedNoviceItemIds??[]).length;
  case 'equipment':return Object.values(character.equipment).filter(Boolean).length;
  case 'exploration':return state.unlockedMonsterIds.length;
 }
}
function legacyObjective(state:GameState,period:SeasonalPeriod,id:string,nowMs:number):{tag:LegacyTag;required:number}|null{
 if(!state.character||nowMs>=LEGACY_SEASONAL_CLAIM_CUTOFF_MS)return null;
 const prefix=period.toUpperCase()+'_';
 if(!id.startsWith(prefix))return null;
 const tail=id.slice(prefix.length),separator=tail.lastIndexOf('_');
 if(separator<=0)return null;
 const key=tail.slice(0,separator),indexText=tail.slice(separator+1);
 const utc=new Date(nowMs),start=new Date(Date.UTC(utc.getUTCFullYear(),utc.getUTCMonth(),utc.getUTCDate()));
 let expected=start.toISOString().slice(0,10);
 if(period==='weekly'){
  start.setUTCDate(start.getUTCDate()-(start.getUTCDay()||7)+1);
  const yearStart=Date.UTC(start.getUTCFullYear(),0,1);
  expected=`${start.getUTCFullYear()}-W${Math.ceil(((start.getTime()-yearStart)/86400000+1)/7)}`;
 }else if(period==='monthly')expected=`${start.getUTCFullYear()}-${start.getUTCMonth()+1}`;
 if(key!==expected||!/^(0|[1-9][0-9]*)$/.test(indexText))return null;
 const index=Number(indexText),count=period==='daily'?2:period==='weekly'?3:4;
 if(index>=count)return null;
 const classDef=CLASSES.find(row=>row.id===state.character!.classId);
 if(!classDef||!classObjectives[classDef.id])return null;
 const tasks=roleObjectives[classDef.role];
 const entry=index===0?classObjectives[classDef.id]:tasks[hash32(`${key}:${index-1}`)%tasks.length];
 if(!entry)return null;
 const volume=period==='daily'?.45:period==='weekly'?1:2;
 return {tag:entry[0],required:Math.max(1,Math.round(entry[1]*volume))};
}
export function legacySeasonalObjectiveComplete(state:GameState,period:SeasonalPeriod,id:string,nowMs:number):boolean{
 const objective=legacyObjective(state,period,id,nowMs);
 return !!objective&&legacyProgress(state,objective.tag)>=objective.required;
}
/** Called only against a trusted, stored pre-migration game snapshot, before
 * account/character projection. It freezes a finite list once; later requests
 * cannot mint more older-catalog rewards, regardless of claimed app version. */
export function snapshotEarnedLegacySeasonalClaims(state:GameState,nowMs:number):GameState{
 if(!state.character||state.character.personalSeasonal!==undefined||
   state.account.personalSeasonalClaimLedger!==undefined||state.account.legacySeasonalGrantSnapshot!==undefined||
   nowMs>=LEGACY_SEASONAL_CLAIM_CUTOFF_MS)return state;
 const previouslyClaimed=state.account.seasonalContractClaimIds??[];
 const progress=state.account.seasonalContractProgress;
 // A genuinely established old quest save must have a history and verified
 // current-period activity. Lifetime XP by itself never authorizes a grant.
 if(!previouslyClaimed.length||!progress)return state;
 const eligibleIds:string[]=[];
 for(const period of ['daily','weekly','monthly'] as const){
  const saved=progress[period];
  if(!saved)continue;
  for(const quest of seasonalQuestBoard(state,period,new Date(nowMs))){
   const objective=legacyObjective(state,period,quest.id,nowMs);
   if(!objective||previouslyClaimed.includes(quest.id)||saved.key!==quest.id.slice(period.length+1,quest.id.lastIndexOf('_')))continue;
   // Equipment equip state alone has no trustworthy per-period action receipt.
   if(objective.tag==='equipment')continue;
   const verified=saved.counts[objective.tag as SeasonalActivity]??0;
   if(verified<1||legacyProgress(state,objective.tag)<objective.required)continue;
   eligibleIds.push(quest.id);
  }
 }
 const snapshot:LegacySeasonalGrantSnapshot={ownerCharacterId:state.character.id,eligibleIds,capturedAtMs:nowMs};
 return {...state,account:{...state.account,legacySeasonalGrantSnapshot:snapshot}};
}
export function hasFrozenLegacySeasonalGrant(state:GameState,id:string,nowMs:number):boolean{
 const frozen=state.account.legacySeasonalGrantSnapshot;
 return !!state.character&&!!frozen&&nowMs<LEGACY_SEASONAL_CLAIM_CUTOFF_MS&&
  frozen.ownerCharacterId===state.character.id&&frozen.capturedAtMs<=nowMs&&
  frozen.eligibleIds.includes(id);
}
export function normalizeLegacySeasonalGrantSnapshot(raw:unknown):LegacySeasonalGrantSnapshot|undefined{
 if(!raw||typeof raw!=='object')return undefined;
 const x=raw as Partial<LegacySeasonalGrantSnapshot>;
 if(typeof x.ownerCharacterId!=='string'||!x.ownerCharacterId||!Number.isSafeInteger(x.capturedAtMs)||x.capturedAtMs!<0||!Array.isArray(x.eligibleIds))return undefined;
 const eligibleIds=[...new Set(x.eligibleIds.filter((s):s is string=>typeof s==='string'&&/^(DAILY|WEEKLY|MONTHLY)_.{1,48}_[0-9]+$/.test(s)))].slice(0,9);
 return {ownerCharacterId:x.ownerCharacterId,eligibleIds,capturedAtMs:x.capturedAtMs!};
}
