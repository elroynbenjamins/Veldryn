import type {GameState} from './types';
import {combatCompanionDef} from '../content/combat-companions';
import {companionXpToNextLevel} from './combat-companions';

export type SanctuaryClaimKind='companion_training'|'companion_essence';
export interface SanctuaryClaimReceipt{
  kind:SanctuaryClaimKind;
  status:'timer_started'|'claimed';
  companionXp:number;
  companionCount:number;
  essence:number;
  companions:Array<{id:string;name:string;xp:number}>;
}

/** Use the confirmed before/after account snapshots, never a speculative timer preview. */
function creditedCompanionXp(state:GameState,id:string){
 const progress=state.account.combatCompanionProgress?.[id],def=combatCompanionDef(id);
 if(!progress||!def)return 0;
 let xp=Math.max(0,progress.xp)+Math.max(0,progress.bankedXp??0);
 for(let level=1;level<progress.level;level++)xp+=companionXpToNextLevel(def.rarity,level);
 return xp;
}

export function sanctuaryClaimReceipt(before:GameState,after:GameState,kind:SanctuaryClaimKind):SanctuaryClaimReceipt|undefined{
 const key=kind==='companion_training'?'lastTrainingClaimAtMs':'lastEssenceClaimAtMs';
 const previous=before.account.companionSanctuary?.[key],current=after.account.companionSanctuary?.[key];
 if(current===undefined||current===previous)return undefined;
 const status=previous===undefined?'timer_started':'claimed';
 const essence=status==='claimed'?Math.max(0,(after.account.companionEssence??0)-(before.account.companionEssence??0)):0;
 const companions=status==='claimed'&&kind==='companion_training'
  ?(after.account.unlockedCombatCompanionIds??[]).flatMap(id=>{
    const def=combatCompanionDef(id);if(!def)return [];
    const xp=Math.max(0,creditedCompanionXp(after,id)-creditedCompanionXp(before,id));
    return xp>0?[{id,name:def.name,xp}]:[];
   }):[];
 return {kind,status,essence,companions,companionCount:companions.length,companionXp:companions.reduce((sum,row)=>sum+row.xp,0)};
}
