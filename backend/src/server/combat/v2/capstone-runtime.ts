/**
 * Combat 2.0 capstone triggers.
 * State and modifiers come solely from a previously validated server loadout.
 * All reactive effects are bounded, cooldown-gated, deterministic and reset
 * each encounter. Never call this module from client-derived combat data.
 */
import type {AbilityEffect,CombatantState,CombatEvent} from '../types';
export type CapstoneTriggerV2='gain'|'spend'|'hit'|'heal'|'shield'|'interrupt'|'evade'|'totem_expires';
export type ProcTargetV2='self'|'target'|'enemy'|'lowest_hp_ally'|'tank'|'all_allies';
export interface CapstoneActionV2 {target:ProcTargetV2;effect:AbilityEffect}
export interface CapstoneResultV2 {event?:CombatEvent;actions:CapstoneActionV2[]}
export interface CapstoneContextV2 {spent?:number;amount?:number;hitIsCrit?:boolean;healedAlly?:boolean;isPartyShield?:boolean}

export function triggerCapstoneV2(
 actor:CombatantState,kind:CapstoneTriggerV2,now:number,ctx:CapstoneContextV2={},
):CapstoneResultV2{
 const v2=actor.combatV2,full=actor.definition.combatV2?.capstoneId;
 const empty:CapstoneResultV2={actions:[]};
 if(!v2||!full||actor.definition.team!=='players')return empty;
 const id=full.slice(full.lastIndexOf(':')+1);
 const count=(key:string)=>v2.procCounters[key]=(v2.procCounters[key]??0)+1;
 const can=(cd=0)=>now-(v2.procCooldownAt[id]??-Infinity)>=cd;
 let effects:CapstoneActionV2[]=[];
 const buff=(tag:string,value:number,durationMs:number,target:ProcTargetV2='self'):CapstoneActionV2=>
  ({target,effect:{kind:'buff',tag,value,durationMs}});
 const debuff=(tag:string,value:number,durationMs:number,target:ProcTargetV2='enemy'):CapstoneActionV2=>
  ({target,effect:{kind:'debuff',tag,value,durationMs}});
 const shield=(flat:number,target:ProcTargetV2='self'):CapstoneActionV2=>
  ({target,effect:{kind:'shield',flat:Math.max(0,flat)}});
 const heal=(flat:number):CapstoneActionV2=>({target:'self',effect:{kind:'heal',flat:Math.max(0,flat)}});
 let triggered=false;
 switch(id){
  case 'oathkeeper':{
   if(kind!=='spend')break;
   const milestones=Math.floor(v2.spentTotal/3);
   if(milestones>(v2.procCounters[id]??0)){
    v2.procCounters[id]=milestones;triggered=true;
    effects=[buff('damage_taken',-.08,4000,'lowest_hp_ally')];
   }
   break;
  }
  case 'runic_retribution':
   if((kind==='interrupt'||(kind==='spend'&&(ctx.spent??0)>=3))&&can(12000)){
    triggered=true;
    effects=[{target:'enemy',effect:{kind:'damage',coeff:1.30,damageType:'physical'}}];
   }break;
  case 'immovable':
   if(kind==='shield'&&v2.stacks===3&&can(10000)){
    triggered=true;effects=[shield(actor.definition.stats.maxHp*.08)];
   }break;
  case 'sheltering_wall':
   if(kind==='shield'&&ctx.isPartyShield&&(ctx.amount??0)>0){
    // Same party-wide cast may shield several recipients in the same tick.
    // Grant each the 15% supplement, but only emit one proc/cooldown event.
    if(v2.procCooldownAt[id]===now)
      return {actions:[shield((ctx.amount??0)*.15,'target')]};
    if(can(20000)){
      triggered=true;effects=[shield((ctx.amount??0)*.15,'target')];
    }
   }break;
  case 'blood_oath':
   if(kind==='spend'&&(ctx.spent??0)>=3&&can(15000)){
    triggered=true;effects=[heal((actor.definition.stats.maxHp-actor.hp)*.05)];
   }break;
  case 'dread_dominion':
   if(kind==='gain'&&v2.stacks>=5&&can(12000)){
    triggered=true;effects=[debuff('damage_done',-.07,6000)];
   }break;
  case 'perfect_aim':
   if(kind==='spend'&&(ctx.spent??0)>=3&&can(12000)){
    triggered=true;v2.pendingCritMultiplierBonus=.25;
   }break;
  case 'unbroken_trail':
   if(kind==='hit'&&count('ranged_hits')%5===0){
    triggered=true;effects=[buff('haste',.06,6000)];
   }break;
  case 'final_verdict':
   // Executing below 30% HP (boss-capped) is resolved in the damage engine.
   break;
  case 'unbound_fury':
   if(kind==='gain'&&v2.stacks>=5&&can(6000)){
    triggered=true;effects=[buff('haste',.07,6000),buff('damage_taken',.03,6000)];
   }break;
  case 'endless_weave':
   // Extension of one already-active curse is resolved on a successful direct spell.
   break;
  case 'void_surge':
   if(kind==='spend'&&(ctx.spent??0)>=5&&can(12000)){
    triggered=true;v2.pendingDamageBonus=.25;
   }break;
  case 'scarlet_crescendo':
   if(kind==='hit'&&count('clean_hits')%5===0&&can(10000)){
    triggered=true;v2.pendingDamageBonus=Math.max(v2.pendingDamageBonus,.22);
   }break;
  case 'silent_answer':
   if(kind==='evade'&&can(10000)){
    triggered=true;effects=[
      {target:'enemy',effect:{kind:'damage',coeff:.90,damageType:'physical'}},
      buff('damage_taken',-.03,3000)];
   }break;
  case 'dawn_renewal':
   if(kind==='heal'&&count('effective_heals')%5===0&&can(15000)){
    triggered=true;v2.pendingHealingBonus=.20;
   }break;
  case 'solar_covenant':
   if(kind==='heal'&&ctx.healedAlly&&can(6000)){
    triggered=true;effects=[buff('damage_done',.04,6000),buff('damage_done',.04,6000,'target')];
   }break;
  case 'living_mountain':
   if((kind==='heal'||kind==='shield')&&count('effective_wards')%3===0&&can(12000)){
    triggered=true;effects=[buff('damage_taken',-.05,4000,'tank')];
   }break;
  case 'ritual_surge':
   if(kind==='totem_expires'&&can(16000)){
    triggered=true;effects=[buff('haste',.04,5000,'all_allies')];
   }break;
  default:throw Error('combat_v2_unknown_capstone:'+id);
 }
 if(!triggered)return empty;
 v2.procCooldownAt[id]=now;
 return {actions:effects,event:{
   atMs:now,type:'capstone_trigger',actorId:actor.definition.id,abilityId:full,
   detail:kind,
 }};
}
