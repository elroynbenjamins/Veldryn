/**
 * Hidden Party Events V59 -> Combat / Equipment 2.0 integration contract.
 *
 * These are authoritative EQUIPPED-item modifiers, never a bonus for owning
 * gear or for opening a chest. A future combat adapter must first validate
 * character ownership, slot/level restrictions, encounter build version,
 * equipment provenance and final stat caps against the v2 item ledger.
 *
 * No live combat engine imports this file; it does not grant items or stats.
 */
import {
 PARTY_EVENT_GEAR_SETS_V51,partyEventGearPieceV51,
 type PartyGearEffectV51,type PartyGearSlotV51,
} from './weekly-party-event-gear-v51';

export const PARTY_EVENT_COMBAT_V59_RELEASED=false;
export const PARTY_EVENT_COMBAT_V59_VERSION='party-event-combat-v59' as const;
export type PartyEventCombatStatV59=
 'haste'|'critChance'|'critMultiplier'|'maxHp'|'healingPower'|
 'penetrationPp'|'abilityDamagePct';
export interface TrustedEquippedPartyPieceV59 {
 readonly instanceId:string;
 readonly ownerCharacterId:string;
 readonly pieceId:string;
 readonly slot:PartyGearSlotV51;
 readonly tier:number;
 /** Supplied ONLY by server-persisted current combat loadout, not inventory. */
 readonly equipped:true;
}
export interface PartyEventCombatStatEffectV59 {
 readonly setId:string;
 readonly threshold:2|3;
 readonly stat:PartyEventCombatStatV59;
 readonly mode:'points'|'relative';
 /** A fraction: 150 basis points = 0.015. */
 readonly value:number;
}
export type PartyEventCombatHookV59=Exclude<PartyGearEffectV51,{kind:'stat'}>;
export interface PartyEventActiveHookV59 {
 readonly id:string;
 readonly setId:string;
 readonly threshold:3;
 readonly tier:number;
 readonly effect:PartyEventCombatHookV59;
}
export interface PartyEventCompiledSetsV59 {
 readonly version:typeof PARTY_EVENT_COMBAT_V59_VERSION;
 readonly activeThresholdIds:readonly string[];
 readonly statEffects:readonly PartyEventCombatStatEffectV59[];
 readonly hooks:readonly PartyEventActiveHookV59[];
 readonly activeItemCount:number;
}
const empty=():PartyEventCompiledSetsV59=>({
 version:PARTY_EVENT_COMBAT_V59_VERSION,activeThresholdIds:[],statEffects:[],
 hooks:[],activeItemCount:0,
});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const knownStat:Readonly<Record<string,{stat:PartyEventCombatStatV59;mode:'points'|'relative'}>>={
 haste:{stat:'haste',mode:'points'},
 critical_rate:{stat:'critChance',mode:'points'},
 critical_damage:{stat:'critMultiplier',mode:'relative'},
 maximum_hp:{stat:'maxHp',mode:'relative'},
 healing_power:{stat:'healingPower',mode:'relative'},
 penetration:{stat:'penetrationPp',mode:'points'},
 ability_damage:{stat:'abilityDamagePct',mode:'relative'},
};
function assertPiece(row:TrustedEquippedPartyPieceV59,characterId:string):void{
 const piece=partyEventGearPieceV51(row?.pieceId);
 if(!piece||!UUID.test(row.instanceId)||row.ownerCharacterId!==characterId||
  row.equipped!==true||piece.slot!==row.slot||
  !Number.isSafeInteger(row.tier)||row.tier<1||row.tier>9)
  throw Error('party_event_v59_unverified_equipped_item');
}
/** An explicit server-only opt in; the currently released game always returns empty. */
export function compileEquippedPartyEventSetsV59(input:{
 readonly characterId:string;
 readonly verifiedEquipped:readonly TrustedEquippedPartyPieceV59[];
 readonly combatV2Enabled:boolean;
},serverEnabled=false):PartyEventCompiledSetsV59{
 if(!serverEnabled)return empty();
 if(!input?.combatV2Enabled||!UUID.test(input.characterId)||
  !Array.isArray(input.verifiedEquipped)||input.verifiedEquipped.length>5)
  throw Error('party_event_v59_unverified_v2_build');
 const slots=new Set<string>(),instances=new Set<string>();
 const groups=new Map<string,Set<string>>();
 for(const row of input.verifiedEquipped){
  assertPiece(row,input.characterId);
  if(slots.has(row.slot)||instances.has(row.instanceId))
   throw Error('party_event_v59_duplicate_equipment');
  slots.add(row.slot);instances.add(row.instanceId);
  const piece=partyEventGearPieceV51(row.pieceId)!;
  // Different tiers of one set never unlock a combined set bonus.
  const key=piece.setId+':T'+row.tier;
  if(!groups.has(key))groups.set(key,new Set());
  groups.get(key)!.add(row.pieceId);
 }
 const activeThresholdIds:string[]=[],statEffects:PartyEventCombatStatEffectV59[]=[];
 const hooks:PartyEventActiveHookV59[]=[];
 for(const set of PARTY_EVENT_GEAR_SETS_V51){
  for(let tier=1;tier<=9;tier++){
   const worn=groups.get(set.id+':T'+tier);
   if(!worn)continue;
   for(const bonus of set.bonuses){
    if(worn.size<bonus.threshold)continue;
    const thresholdId=set.id+':T'+tier+':'+bonus.threshold;
    activeThresholdIds.push(thresholdId);
    for(const effect of bonus.effects){
     if(effect.kind==='stat'){
      const mapping=knownStat[effect.stat];
      if(!mapping||!Number.isSafeInteger(effect.valueBps)||
       effect.valueBps<0||effect.valueBps>10000)
       throw Error('party_event_v59_unapproved_stat_mapping');
      statEffects.push({setId:set.id,threshold:bonus.threshold,
       ...mapping,value:effect.valueBps/10000});
     }else{
      if(bonus.threshold!==3)throw Error('party_event_v59_unapproved_hook_threshold');
      hooks.push({id:thresholdId+':'+effect.kind,setId:set.id,
       threshold:3,tier,effect});
     }
    }
   }
  }
 }
 return {version:PARTY_EVENT_COMBAT_V59_VERSION,
  activeThresholdIds,statEffects,hooks,activeItemCount:instances.size};
}
export type PartyEventHookTriggerV59='ability_cast'|'direct_damage'|'low_hp_cross';
export interface PartyEventHookStateV59{
 readonly lastProcAtMs:number|null;
 readonly activeUntilMs:number;
}
export interface PartyEventHookContextV59{
 readonly trigger:PartyEventHookTriggerV59;
 readonly nowMs:number;
 readonly targetIsElite?:boolean;
 readonly targetHpBps?:number;
 readonly previousHpBps?:number;
 readonly currentHpBps?:number;
 /** A server RNG value only; never supplied by a client. */
 readonly serverRoll?:number;
}
export interface PartyEventHookResolutionV59{
 readonly state:PartyEventHookStateV59;
 readonly activated:boolean;
 readonly kind:PartyEventCombatHookV59['kind'];
 readonly bonusBps:number;
 readonly durationMs:number;
}
/**
 * Pure deterministic event projection. The combined v2 engine must persist
 * cooldown state per encounter and apply these results at the verified
 * skill/damage boundary, once only. Does not execute skills or change HP.
 */
export function previewPartyEventHookV59(
 hook:PartyEventActiveHookV59,
 state:PartyEventHookStateV59,
 context:PartyEventHookContextV59,
):PartyEventHookResolutionV59{
 if(!hook||!hook.id||!state||
  !Number.isSafeInteger(context?.nowMs)||context.nowMs<0||
  (state.lastProcAtMs!==null&&(
   !Number.isSafeInteger(state.lastProcAtMs)||state.lastProcAtMs<0||
   state.lastProcAtMs>context.nowMs))||
  !Number.isSafeInteger(state.activeUntilMs)||state.activeUntilMs<0)
  throw Error('party_event_v59_invalid_proc_state');
 const effect=hook.effect;
 let activated=false,bonusBps=0,durationMs=0;
 let next=state;
 const ready=(cooldownMs:number)=>state.lastProcAtMs===null||
  context.nowMs-state.lastProcAtMs>=cooldownMs;
 const spend=(cooldownMs:number,duration:number,bps:number)=>{
  if(!ready(cooldownMs))return;
  activated=true;durationMs=duration;bonusBps=bps;
  next={lastProcAtMs:context.nowMs,activeUntilMs:context.nowMs+duration};
 };
 if(effect.kind==='ability_momentum'&&context.trigger==='ability_cast')
  spend(effect.internalCooldownMs,effect.durationMs,effect.abilityDamageBps);
 if(effect.kind==='elite_execute'&&context.trigger==='direct_damage'&&
   context.targetIsElite===true&&Number.isInteger(context.targetHpBps)&&
   context.targetHpBps!>=0&&context.targetHpBps!<effect.enemyHpBelowBps){
  activated=true;bonusBps=effect.damageBps;
 }
 if(effect.kind==='defensive_barrier'&&context.trigger==='low_hp_cross'&&
   Number.isInteger(context.previousHpBps)&&Number.isInteger(context.currentHpBps)&&
   context.previousHpBps!>=4000&&context.currentHpBps!<4000){
  spend(effect.internalCooldownMs,effect.durationMs,effect.maxHpBps);
 }
 if(effect.kind==='echo_cooldown'&&context.trigger==='ability_cast'){
  if(!Number.isInteger(context.serverRoll)||context.serverRoll!<0||
    context.serverRoll!>=10000)
   throw Error('party_event_v59_unverified_proc_roll');
  if(context.serverRoll!<effect.procChanceBps)
   spend(effect.internalCooldownMs,0,effect.cooldownRefundBps);
 }
 return {state:next,activated,kind:effect.kind,bonusBps,durationMs};
}
