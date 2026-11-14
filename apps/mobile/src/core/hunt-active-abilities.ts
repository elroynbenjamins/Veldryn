import type {ClassId} from './types';
import type {HuntHit} from './combat-hit-timeline';

/** Single-target solo-hunt techniques share names with their existing dungeon
 * counterparts. This is a separate, budget-neutral hunt ruleset, not the
 * dungeon cooldown / status engine. */
export const HUNT_CLASS_TECHNIQUES:Readonly<Record<ClassId,{id:string;name:string}>>={
 IRONWARDEN:{id:'IW_BASH',name:'Rune Bash'},
 BASTION:{id:'BT_REBUFF',name:'Fortress Rebuff'},
 DREADGUARD:{id:'DG_BIND',name:'Binding Chain'},
 DAWNKEEPER:{id:'DK_SMITE',name:'Sun Smite'},
 WAYFINDER:{id:'WF_SHOT',name:'Windshot'},
 RAVAGER:{id:'RV_SWING',name:'Titan Swing'},
 HEXWEAVER:{id:'HX_CURSE',name:'Black Thread'},
 KNIFE_DANCER:{id:'KD_LOOP',name:'Scarlet Loop'},
 STONECALLER:{id:'SC_THUNDER',name:'Thunder Totem'},
};

export interface HuntActiveAbility {
 source:'class'|'companion';
 id:string;
 name:string;
 kind:'damage'|'heal'|'shield';
 amount:number;
}

/** A damage-role companion contributes part of an already budgeted landed
 * attack, never free extra damage or an extra kill. Healer units receive their
 * own event from the effective recovery applied in the settlement loop.
 *
 * Class burst skills move damage from an earlier landed hit to the final hit.
 * Real intermediate enemy HP changes; the encounter's total damage, finish
 * time and rewards are identical. No abilities fire during searching/misses,
 * and none are invented when only a single attack lands.
 *
 * All input events are cloned; consecutive / partial / offline settlements
 * therefore see the same results for the same encounter.
 */
export function huntActiveDamageEvents(events:readonly HuntHit[],input:{
 classId:ClassId;
 classSkillLevel:number;
 encounterNumber:number;
 companion?:{id:string;name:string;abilityId:string;abilityName:string;role:'damage'|'tank'|'support';contributionPct:number};
}):HuntHit[]{
 const result=events.map(hit=>({...hit}));
 const playerIndices=result.map((hit,index)=>hit.actor==='player'&&hit.damage>0?index:-1).filter(index=>index>=0);
 if(playerIndices.length<2)return result;
 const first=result[playerIndices[0]],last=result[playerIndices[playerIndices.length-1]];
 // Technique rank controls how much of the encounter budget is concentrated
 // into the finisher. Minimum 1 HP is left on the donor's attack.
 const rank=Math.max(1,Math.min(100,Math.floor(input.classSkillLevel||1)));
 const fraction=.10+.10*(rank-1)/99;
 const shifted=Math.min(first.damage-1,Math.max(1,Math.floor(first.damage*fraction)));
 if(shifted>0){
  first.damage-=shifted;
  last.damage+=shifted;
  const ability=HUNT_CLASS_TECHNIQUES[input.classId];
  last.activeAbility={source:'class',id:ability.id,name:ability.name,kind:'damage',amount:last.damage};
 }
 // A single companion assist is taken from an actual landed hit, limited to
 // its already-applied power budget. Not all companion roles are damage roles.
 const companion=input.companion;
 if(companion?.role==='damage'&&companion.contributionPct>0&&input.encounterNumber%2===0){
  const hit=result[playerIndices[Math.floor((playerIndices.length-1)/2)]];
  const portion=Math.min(hit.damage-1,Math.max(1,Math.floor(hit.damage*Math.min(.12,companion.contributionPct))));
  if(portion>0){
   hit.companionAssist={source:'companion',id:companion.abilityId,name:companion.name+': '+companion.abilityName,kind:'damage',amount:portion};
  }
 }
 return result;
}

/** Tank companion combat guard. The companion's passive damage reduction has
 * already been applied by combatEncounterDamage; this *active* guard prevents
 * a further, tightly capped portion of a real incoming monster strike.
 *
 * Cooldown pulses are anchored to the original combat session clock, not the
 * current claim tick. The first monster strike after a pulse in that encounter
 * consumes its shield. A pulse during an encounter with no monster hit is
 * skipped. This makes offline claims and foreground replay use the same
 * ability schedule without persisted cooldown state.
 *
 * The effect is intentionally small (at most 2.5% of one monster strike):
 * fatigue, search time, enemy HP, kill count and reward pace do not change.
 */
export function huntTankGuardEvents(events:readonly HuntHit[],input:{
 combatStartedAtMs:number;
 encounterStartedAtMs:number;
 cycleSeconds:number;
 companion?:{
  id:string;name:string;abilityId:string;abilityName:string;
  role:'damage'|'tank'|'support';activeKind:string;
  cooldownSeconds:number;incomingDamageMultiplier:number;
 };
}):HuntHit[]{
 const result=events.map(hit=>({...hit}));
 const unit=input.companion;
 if(!unit||unit.role!=='tank'||(unit.activeKind!=='shield'&&unit.activeKind!=='damage_reduction'))return result;
 const cooldown=Math.max(1000,Math.round(unit.cooldownSeconds*1000));
 const session=Number.isFinite(input.combatStartedAtMs)?input.combatStartedAtMs:0;
 const start=Number.isFinite(input.encounterStartedAtMs)?input.encounterStartedAtMs:session;
 const cycle=Math.max(0,Number.isFinite(input.cycleSeconds)?input.cycleSeconds:0)*1000;
 if(cycle<=0)return result;
 // Only a pulse that starts during this encounter can arm its shield. The
 // upper limit is exclusive, so adjacent encounters never claim the same pulse.
 const pulseIndex=Math.max(0,Math.ceil((start-session-0.00001)/cooldown));
 const pulseAt=session+pulseIndex*cooldown;
 const end=start+cycle;
 if(pulseAt<start-1e-3||pulseAt>=end-1e-3)return result;
 const first=result.find(hit=>hit.actor==='enemy'&&hit.damage>0&&start+hit.fraction*cycle>=pulseAt-1e-3);
 if(!first)return result;
 const passiveMitigation=Math.max(0,1-Math.min(1,unit.incomingDamageMultiplier));
 // No defensive contribution means no active guard or false shield number.
 const rate=Math.min(.025,passiveMitigation*.35);
 const prevented=Math.min(first.damage*.025,first.damage*rate);
 if(!(prevented>1e-6))return result;
 first.damage=Math.max(0,first.damage-prevented);
 first.guardAbility={source:'companion',id:unit.abilityId,name:unit.name+': '+unit.abilityName,kind:'shield',amount:prevented};
 return result;
}
