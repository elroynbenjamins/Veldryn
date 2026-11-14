import type {ClassId} from './types';
import type {HuntHit} from './combat-hit-timeline';
import {HUNT_CLASS_TECHNIQUES,huntCooldownPulseAt} from './hunt-active-abilities';

/** Solo-hunt defensive and restorative identities.
 * Only one ability activation is announced per encounter. Later Bastion
 * protection is part of the same cast, not a second cooldown bypass.
 * All outcomes derive from *real* enemy/fatigue events; the event timeline
 * remains deterministic across offline claims, preview and app restarts.
 */
export type DefensiveClassId='IRONWARDEN'|'BASTION'|'DREADGUARD'|'DAWNKEEPER'|'STONECALLER';
export const HUNT_CLASS_SURVIVAL_PROFILES:Readonly<Record<DefensiveClassId,{
 mechanic:'counter_guard'|'fortress'|'dread_leech'|'sun_heal'|'storm_totem';
 firstGuardPct:number;followupGuardPct:number;recoveryOfPreventedPct:number;healingOfIncomingPct:number;
}>>={
 IRONWARDEN:{mechanic:'counter_guard',firstGuardPct:.055,followupGuardPct:0,recoveryOfPreventedPct:0,healingOfIncomingPct:0},
 BASTION:{mechanic:'fortress',firstGuardPct:.065,followupGuardPct:.025,recoveryOfPreventedPct:0,healingOfIncomingPct:0},
 DREADGUARD:{mechanic:'dread_leech',firstGuardPct:.05,followupGuardPct:0,recoveryOfPreventedPct:.30,healingOfIncomingPct:0},
 DAWNKEEPER:{mechanic:'sun_heal',firstGuardPct:0,followupGuardPct:0,recoveryOfPreventedPct:0,healingOfIncomingPct:.12},
 STONECALLER:{mechanic:'storm_totem',firstGuardPct:.06,followupGuardPct:0,recoveryOfPreventedPct:.20,healingOfIncomingPct:0},
};
export function isHuntDefensiveClass(id:ClassId):id is DefensiveClassId{
 return Object.prototype.hasOwnProperty.call(HUNT_CLASS_SURVIVAL_PROFILES,id);
}
export function huntClassSurvivalEvents(events:readonly HuntHit[],input:{
 classId:ClassId;classSkillLevel:number;
 combatStartedAtMs:number;encounterStartedAtMs:number;cycleSeconds:number;
}):HuntHit[]{
 const result=events.map(event=>({...event}));
 if(!isHuntDefensiveClass(input.classId))return result;
 const profile=HUNT_CLASS_SURVIVAL_PROFILES[input.classId];
 const ability=HUNT_CLASS_TECHNIQUES[input.classId];
 const pulse=huntCooldownPulseAt({...input,cooldownSeconds:ability.cooldownSeconds});
 if(pulse===undefined)return result;
 const rank=Math.min(100,Math.max(1,Math.floor(Number.isFinite(input.classSkillLevel)?input.classSkillLevel:1)));
 const scale=1+.30*(rank-1)/99;
 const eligible=result.filter(event=>(event.actor==='enemy'||(profile.mechanic==='sun_heal'&&event.actor==='fatigue'))
  &&event.damage>0
  &&input.encounterStartedAtMs+event.fraction*input.cycleSeconds*1000>=pulse-1e-3);
 const first=eligible[0];
 if(!first)return result;
 if(profile.mechanic==='sun_heal'){
  const bonus=Math.max(0,Math.min(first.damage*.15,first.damage*profile.healingOfIncomingPct*scale));
  if(bonus>1e-6){
   first.healing+=bonus;
   first.classHealingBudget=(first.classHealingBudget??0)+bonus;
   first.classHealAbility={source:'class',id:ability.id,name:ability.name,kind:'heal',amount:bonus};
  }
  return result;
 }
 const hit=first;
 const prevented=hit.damage*Math.min(.09,profile.firstGuardPct*scale);
 if(prevented<=1e-6)return result;
 hit.damage=Math.max(0,hit.damage-prevented);
 hit.classGuardAbility={source:'class',id:ability.id,name:ability.name,kind:'shield',amount:prevented};
 if(profile.recoveryOfPreventedPct>0){
  const siphon=prevented*profile.recoveryOfPreventedPct;
  if(siphon>1e-6){
   hit.healing+=siphon;
   hit.classHealingBudget=(hit.classHealingBudget??0)+siphon;
   // Settlement only displays the recovery after HP is actually restored.
   // This can coexist with the protection event on the same landed strike.
   hit.classHealAbility={source:'class',id:ability.id,name:ability.name,kind:'heal',amount:siphon};
  }
 }
 if(profile.followupGuardPct>0){
  const followup=eligible.find(event=>event!==first&&event.actor==='enemy');
  if(followup)followup.damage=Math.max(0,followup.damage*(1-Math.min(.04,profile.followupGuardPct*scale)));
 }
 return result;
}
