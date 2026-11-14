import type {ClassId} from './types';
import type {HuntHit} from './combat-hit-timeline';

/** Single-target solo-hunt techniques share names with their existing dungeon
 * counterparts. This is a separate, budget-neutral hunt ruleset, not the
 * dungeon cooldown / status engine. */
export const HUNT_CLASS_TECHNIQUES:Readonly<Record<ClassId,{id:string;name:string;cooldownSeconds:number}>>={
 IRONWARDEN:{id:'IW_BASH',name:'Rune Bash',cooldownSeconds:6.5},
 BASTION:{id:'BT_REBUFF',name:'Fortress Rebuff',cooldownSeconds:7.5},
 DREADGUARD:{id:'DG_BIND',name:'Binding Chain',cooldownSeconds:6.5},
 DAWNKEEPER:{id:'DK_SMITE',name:'Sun Smite',cooldownSeconds:5.5},
 WAYFINDER:{id:'WF_SHOT',name:'Windshot',cooldownSeconds:4.5},
 RAVAGER:{id:'RV_SWING',name:'Titan Swing',cooldownSeconds:4.2},
 HEXWEAVER:{id:'HX_CURSE',name:'Black Thread',cooldownSeconds:6.5},
 KNIFE_DANCER:{id:'KD_LOOP',name:'Scarlet Loop',cooldownSeconds:5},
 STONECALLER:{id:'SC_THUNDER',name:'Thunder Totem',cooldownSeconds:6},
};

/** First cooldown pulse in a hunt encounter. The original combat-session
 * clock is the only authority: a claim / app restart cannot refresh a skill.
 * Only the first eligible landed hit in the encounter may use the pulse.
 * No persisted ability state or per-frame timers are needed. */
export function huntCooldownPulseAt(input:{
 combatStartedAtMs:number;encounterStartedAtMs:number;cycleSeconds:number;cooldownSeconds:number;
}):number|undefined{
 const {combatStartedAtMs:session,encounterStartedAtMs:start,cycleSeconds,cooldownSeconds}=input;
 if(![session,start,cycleSeconds,cooldownSeconds].every(Number.isFinite)||cycleSeconds<=0||cooldownSeconds<=0||start<session-1e-3)return undefined;
 const period=Math.max(1000,Math.round(cooldownSeconds*1000));
 const count=Math.max(0,Math.ceil((start-session-1e-5)/period));
 const pulse=session+count*period;
 return pulse>=start-1e-3&&pulse<start+cycleSeconds*1000-1e-3?pulse:undefined;
}
const timeOf=(hit:HuntHit,start:number,cycleSeconds:number)=>start+hit.fraction*cycleSeconds*1000;

export interface HuntActiveAbility {
 source:'class'|'companion';
 id:string;
 name:string;
 kind:'damage'|'heal'|'shield';
 amount:number;
}

/** Deterministic, session-timed combat skills for ordinary hunting.
 * Class finishers move a small part of an actual earlier attack into the
 * finishing hit; no damage is created. Damage-companion assists attribute
 * existing damage at the first eligible hit following their cooldown pulse.
 * The caller resolves these same events in online, offline and live replay.
 */
export function huntActiveDamageEvents(events:readonly HuntHit[],input:{
 classId:ClassId;classSkillLevel:number;
 combatStartedAtMs:number;encounterStartedAtMs:number;cycleSeconds:number;
 companion?:{id:string;name:string;abilityId:string;abilityName:string;role:'damage'|'tank'|'support';contributionPct:number;cooldownSeconds:number};
}):HuntHit[]{
 const result=events.map(hit=>({...hit}));
 const landed=result.filter(hit=>hit.actor==='player'&&hit.damage>0);
 if(landed.length<2)return result;
 const ability=HUNT_CLASS_TECHNIQUES[input.classId];
 const classPulse=huntCooldownPulseAt({...input,cooldownSeconds:ability.cooldownSeconds});
 const first=landed[0],last=landed[landed.length-1];
 if(classPulse!==undefined&&timeOf(last,input.encounterStartedAtMs,input.cycleSeconds)>=classPulse-1e-3){
  const rank=Math.max(1,Math.min(100,Math.floor(input.classSkillLevel||1)));
  const fraction=.10+.10*(rank-1)/99;
  const shifted=Math.min(first.damage-1,Math.max(1,Math.floor(first.damage*fraction)));
  if(shifted>0){
   first.damage-=shifted;last.damage+=shifted;
   last.activeAbility={source:'class',id:ability.id,name:ability.name,kind:'damage',amount:last.damage};
  }
 }
 const companion=input.companion;
 if(companion?.role==='damage'&&companion.contributionPct>0){
  const pulse=huntCooldownPulseAt({...input,cooldownSeconds:companion.cooldownSeconds});
  if(pulse!==undefined){
   // Prefer the middle eligible strike for readability, never attribute an
   // assist to a hit that preceded the cooldown becoming available.
   const eligible=landed.filter(hit=>timeOf(hit,input.encounterStartedAtMs,input.cycleSeconds)>=pulse-1e-3);
   const hit=eligible[Math.floor((eligible.length-1)/2)];
   if(hit){
    const portion=Math.min(hit.damage-1,Math.max(1,Math.floor(hit.damage*Math.min(.12,companion.contributionPct))));
    if(portion>0)hit.companionAssist={source:'companion',id:companion.abilityId,name:companion.name+': '+companion.abilityName,kind:'damage',amount:portion};
   }
  }
 }
 return result;
}

/** A restorative companion can cast only on a genuinely resolved heal tick
 * after its cooldown pulse. This tags a real healing opportunity; the actual
 * restored HP is checked and attributed by the settlement loop. */
export function huntSupportHealEvents(events:readonly HuntHit[],input:{
 combatStartedAtMs:number;encounterStartedAtMs:number;cycleSeconds:number;
 companion?:{id:string;name:string;abilityId:string;abilityName:string;role:'damage'|'tank'|'support';activeKind:string;cooldownSeconds:number;healingPctPerHour:number};
}):HuntHit[]{
 const result=events.map(hit=>({...hit}));
 const c=input.companion;
 if(!c||c.role!=='support'||c.activeKind!=='heal'||c.healingPctPerHour<=0)return result;
 const pulse=huntCooldownPulseAt({...input,cooldownSeconds:c.cooldownSeconds});
 if(pulse===undefined)return result;
 const first=result.find(hit=>(hit.actor==='enemy'||hit.actor==='fatigue')&&hit.healing>0&&timeOf(hit,input.encounterStartedAtMs,input.cycleSeconds)>=pulse-1e-3);
 if(first)first.supportAbility={source:'companion',id:c.abilityId,name:c.name+': '+c.abilityName,kind:'heal',amount:0};
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
 const pulseAt=huntCooldownPulseAt({...input,cooldownSeconds:unit.cooldownSeconds});
 if(pulseAt===undefined)return result;
 const first=result.find(hit=>hit.actor==='enemy'&&hit.damage>0&&timeOf(hit,input.encounterStartedAtMs,input.cycleSeconds)>=pulseAt-1e-3);
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
