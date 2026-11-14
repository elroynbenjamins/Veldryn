import {CLASSES} from '../content/classes';
import {hash32} from './rng';
import type {GameState} from './types';
import type {SeasonalPeriod} from './seasonal-quests';

/**
 * Transitional server-only validation for clients released before the
 * verified-action seasonal objective catalog. The old app reuses positional
 * daily/weekly/monthly IDs but assigns class/role objectives to those slots.
 *
 * Never call this for a v2 client or after the compatibility window; the
 * modern verified-action objectives remain the sole authority otherwise.
 * Claim receipts and rewards still follow the current trusted claim path.
 */
export const LEGACY_SEASONAL_CLAIM_CUTOFF_MS=Date.UTC(2026,11,1);
type LegacyTag='combat'|'gathering'|'crafting'|'equipment'|'exploration';
type LegacyObjective=readonly [LegacyTag,number];
const roleObjectives:Record<'Tank'|'Support'|'Damage',readonly LegacyObjective[]>={
 Tank:[['combat',24],['gathering',12],['equipment',6],['exploration',5]],
 Support:[['gathering',30],['crafting',12],['combat',20],['exploration',5]],
 Damage:[['combat',18],['crafting',14],['combat',30],['exploration',5]],
};
const classObjectives:Record<string,LegacyObjective>={
 IRONWARDEN:['equipment',6],
 BASTION:['combat',30],
 DREADGUARD:['combat',28],
 DAWNKEEPER:['crafting',15],
 WAYFINDER:['exploration',5],
 RAVAGER:['combat',40],
 HEXWEAVER:['gathering',22],
 KNIFE_DANCER:['exploration',6],
 STONECALLER:['gathering',24],
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

/** Called only after current-catalog readiness fails, using a trusted server flag. */
export function legacySeasonalObjectiveComplete(state:GameState,period:SeasonalPeriod,id:string,serverNowMs:number):boolean{
 if(!state.character||serverNowMs>=LEGACY_SEASONAL_CLAIM_CUTOFF_MS)return false;
 const prefix=period.toUpperCase()+'_';
 if(!id.startsWith(prefix))return false;
 const tail=id.slice(prefix.length),separator=tail.lastIndexOf('_');
 if(separator<=0)return false;
 const key=tail.slice(0,separator),indexText=tail.slice(separator+1);
 if(!/^(0|[1-9][0-9]*)$/.test(indexText))return false;
 const index=Number(indexText),count=period==='daily'?2:period==='weekly'?3:4;
 if(index>=count)return false;
 const classDef=CLASSES.find(row=>row.id===state.character!.classId);
 if(!classDef||!classObjectives[classDef.id])return false;
 const tasks=roleObjectives[classDef.role];
 const task=index===0?classObjectives[classDef.id]:tasks[hash32(`${key}:${index-1}`)%tasks.length];
 if(!task)return false;
 const volume=period==='daily'?.45:period==='weekly'?1:2;
 return legacyProgress(state,task[0])>=Math.max(1,Math.round(task[1]*volume));
}
