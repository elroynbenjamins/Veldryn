/**
 * Combat 2.0 encounter resource state.
 *
 * The only runtime entrypoint is the server-compiled CombatantDefinition.combatV2.
 * Resource events never accept client-supplied amounts or bonus multipliers.
 * State starts at zero for every new encounter (not persisted across Q-mode rooms).
 */
import type {AbilityDefinition,CombatantDefinition,CombatantState,CombatEvent,CombatV2Resource,CombatV2State} from '../types';

export const RESOURCE_BY_CLASS_V2 = {
  IRONWARDEN:'guard',BASTION:'barrier',DREADGUARD:'dread',WAYFINDER:'focus',
  RAVAGER:'fury',HEXWEAVER:'threads',KNIFE_DANCER:'rhythm',DAWNKEEPER:'radiance',
  STONECALLER:'resonance',
} as const;

export const RESOURCE_NAME_V2:Record<CombatV2Resource,string>={
  guard:'Guard Marks',barrier:'Barrier Layers',dread:'Dread',focus:'Focus',
  fury:'Fury',threads:'Threads',rhythm:'Rhythm',radiance:'Radiance',resonance:'Resonance',
};
export const RESOURCE_CAP_V2:Record<CombatV2Resource,number>={
  guard:3,barrier:3,dread:5,focus:3,fury:5,threads:5,rhythm:5,radiance:5,resonance:5,
};
export type ResourceTriggerV2='direct_hit'|'periodic_hit'|'damage_taken'|'shield_absorb'|
  'effective_heal'|'shield_granted'|'taunt'|'interrupt'|'evade';
const TRIGGERS_V2:Readonly<Record<CombatV2Resource,readonly ResourceTriggerV2[]>>={
  guard:['taunt','interrupt','shield_absorb'],
  barrier:['shield_absorb','shield_granted'],
  dread:['taunt','damage_taken'],
  focus:['direct_hit'],
  fury:['direct_hit','damage_taken'],
  threads:['periodic_hit'],
  rhythm:['direct_hit','evade'],
  radiance:['effective_heal','shield_granted'],
  resonance:['effective_heal','shield_granted'],
};
export function initCombatResourceV2(def:CombatantDefinition):CombatV2State|undefined{
  const resource=def.combatV2?.resource;
  if(def.team!=='players'||!resource||!RESOURCE_CAP_V2[resource])return undefined;
  return {resource,stacks:0,maxStacks:RESOURCE_CAP_V2[resource],lastEarnedAt:{},spentTotal:0};
}
/** At most one stack per (trigger, event source, tick), avoiding multi-target / multi-hit farming. */
export function awardCombatResourceV2(
  state:CombatantState,trigger:ResourceTriggerV2,now:number,sourceId:string,
):CombatEvent|undefined{
  const v2=state.combatV2;
  if(!v2||!TRIGGERS_V2[v2.resource].includes(trigger)||!Number.isFinite(now)||now<0)return;
  if(!sourceId||/^(GEM_|COMPANION_)/.test(sourceId))return;
  // Source ID dedup prevents multi-target, two-hit and repeated intercepts per tick.
  const dedup=trigger+':'+sourceId;
  if(v2.lastEarnedAt[dedup]===now)return;
  v2.lastEarnedAt[dedup]=now;
  if(v2.stacks>=v2.maxStacks)return;
  const before=v2.stacks;
  v2.stacks+=1;
  return {atMs:now,type:'resource_gain',actorId:state.definition.id,abilityId:sourceId,
    resource:v2.resource,resourceBefore:before,resourceAfter:v2.stacks,detail:trigger};
}
/** Cast-time spend. Every spend is bounded by currently held stacks; no negatives. */
export function spendCombatResourceV2(state:CombatantState,ability:AbilityDefinition,now:number):
  {ability:AbilityDefinition;event?:CombatEvent}{
  const v2=state.combatV2,config=ability.combatV2;
  if(!v2||!config?.spend)return {ability};
  const requested=config.spend==='all'?v2.stacks:Math.max(0,Math.min(v2.maxStacks,Math.floor(config.spend)));
  const spent=Math.min(v2.stacks,requested);
  if(!spent)return {ability};
  const before=v2.stacks;
  v2.stacks-=spent;
  v2.spentTotal+=spent;
  const coeffScale=Math.min(1.5,1+spent*Math.max(0,Math.min(.12,config.bonusPerStack??.05)));
  const effects=ability.effects.map(effect=>
    ['damage','shield','heal'].includes(effect.kind)&&typeof effect.coeff==='number'
      ?{...effect,coeff:Math.round(effect.coeff*coeffScale*1e6)/1e6}:effect);
  return {ability:{...ability,effects},event:{
    atMs:now,type:'resource_spend',actorId:state.definition.id,abilityId:ability.id,
    resource:v2.resource,resourceBefore:before,resourceAfter:v2.stacks,detail:'spent:'+spent,
  }};
}
