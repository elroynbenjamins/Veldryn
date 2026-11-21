/**
 * Hidden Combat 2.0 equipped-event hooks, opt-in ONLY with an engine-authorized,
 * source-owned persisted Equipment 2.0 actor snapshot.
 *
 * These five traits have real bounded implementation hooks; all remaining
 * proposed signature traits intentionally fail closed in authority issuer.
 * No secondary damage/healing event is fed into a trigger.
 */
import type {VerifiedV2EquipmentEffectSource} from './equipment-trait-engine-authority';
export type ExecutedTraitId='sword_dance'|'echoing_strike'|'thornbound_riposte'|'mending_echo'|'restorative_bloom';
const round=(v:number)=>Math.round(v*1e6)/1e6;
const positive=(v:number)=>Number.isFinite(v)&&v>=0;
const snapshotTrait=(s:VerifiedV2EquipmentEffectSource,id:ExecutedTraitId)=>
 s.traits.some(t=>t.traitId===id);
interface RunnerState {
 streak:number;targetId:string|null;swordProcAt:number;
 echoProcAt:number;thornProcAt:number;
 mendingProcAt:number;bloomProcAt:number;
 history:Array<{atMs:number;attackerId:string;amount:number}>;
}
export interface EquipmentTraitTriggerV2{
 readonly traitId:ExecutedTraitId;
 readonly actorId:string;
 readonly targetId:string;
 readonly atMs:number;
 readonly effect:'bonus_direct_damage'|'retaliation_damage'|'secondary_heal'|'secondary_hot';
 readonly amount:number;
}
export class EquipmentTraitRuntimeV2{
 private readonly states=new Map<string,RunnerState>();
 constructor(private readonly sources:ReadonlyMap<string,VerifiedV2EquipmentEffectSource>){
  for(const id of sources.keys())this.states.set(id,{
   streak:0,targetId:null,swordProcAt:-Infinity,echoProcAt:-Infinity,
   thornProcAt:-Infinity,mendingProcAt:-Infinity,bloomProcAt:-Infinity,history:[],
  });
 }
 private get(id:string){return this.states.get(id);}
 private source(id:string){return this.sources.get(id);}
 /** A miss breaks a Sword Dance hit streak; no effect is generated. */
 miss(actorId:string,abilityId:string){
  const state=this.get(actorId);
  if(state&&abilityId==='BASIC')state.streak=0;
 }
 /** Called only after the actual engine confirms an ORIGINAL direct hit.
  * Input raw is already Attack, Defense, Crit, Ward and other core modifiers.
  * Never called for DoT ticks, gem attacks or generated trait hits. */
 directHit(atMs:number,actorId:string,targetId:string,abilityId:string,raw:number):
 {damage:number;trigger?:EquipmentTraitTriggerV2}{
  const source=this.source(actorId),state=this.get(actorId);
  if(!source||!state||!positive(raw)||!Number.isSafeInteger(atMs)||atMs<0)return {damage:raw};
  if(abilityId==='BASIC'){
   let adjusted=raw*(1+source.basicAttackDamagePct/100);
   if(state.targetId!==targetId){state.targetId=targetId;state.streak=0;}
   state.streak++;
   if(snapshotTrait(source,'sword_dance')&&state.streak>=3){
    state.streak=0;
    if(atMs-state.swordProcAt>=9000){
     state.swordProcAt=atMs;
     const extra=adjusted*.05;
     adjusted+=extra;
     return {damage:round(adjusted),trigger:{traitId:'sword_dance',actorId,targetId,atMs,
      effect:'bonus_direct_damage',amount:round(extra)}};
    }
   }
   return {damage:round(adjusted)};
  }
  if(abilityId.startsWith('V2_')||abilityId.startsWith('GEM_'))
   return {damage:raw};
  return {damage:round(raw*(1+source.abilityDamagePct/100))};
 }
 /** Echo is generated from the ACTUAL direct class skill HP damage. */
 afterDirectSkillHit(atMs:number,actorId:string,targetId:string,
  abilityId:string,hpDamage:number,attackPower:number):EquipmentTraitTriggerV2|undefined{
  const source=this.source(actorId),state=this.get(actorId);
  if(!source||!state||!snapshotTrait(source,'echoing_strike')||
     abilityId==='BASIC'||abilityId.startsWith('V2_')||
     abilityId.startsWith('GEM_')||!positive(hpDamage)||hpDamage===0||
     !positive(attackPower)||atMs-state.echoProcAt<30000)return;
  const amount=round(Math.min(hpDamage*.08,attackPower*.20));
  if(amount<=0)return;
  state.echoProcAt=atMs;
  return {traitId:'echoing_strike',actorId,targetId,atMs,effect:'bonus_direct_damage',amount};
 }
 /** Rolling shared enemy-specific 5s budget for affix and Thornbound Riposte. */
 retaliation(atMs:number,defenderId:string,attackerId:string,actualHpLost:number,
  defenderMaxHp:number,attackerMaxHp:number,isRegionalBoss:boolean):
 EquipmentTraitTriggerV2|undefined{
  const source=this.source(defenderId),state=this.get(defenderId);
  if(!source||!state||!Number.isSafeInteger(atMs)||atMs<0||
     !positive(actualHpLost)||actualHpLost===0||
     !positive(defenderMaxHp)||!positive(attackerMaxHp)||
     !defenderMaxHp||!attackerMaxHp)return;
  state.history=state.history.filter(entry=>atMs-entry.atMs<5000);
  const thornReady=snapshotTrait(source,'thornbound_riposte')&&atMs-state.thornProcAt>=15000;
  const reflect=actualHpLost*source.reflectDamagePct/100;
  const thorn=thornReady?Math.min(actualHpLost*.08,defenderMaxHp*.015):0;
  const budget=attackerMaxHp*(isRegionalBoss?.001:.002);
  const spent=state.history.filter(entry=>entry.attackerId===attackerId)
   .reduce((n,entry)=>n+entry.amount,0);
  const amount=Math.max(0,Math.min(reflect+thorn,defenderMaxHp*.015,budget-spent));
  if(amount<=0)return;
  const reflectPart=Math.min(reflect,amount);
  const thornPart=amount-reflectPart;
  if(thornPart>0)state.thornProcAt=atMs;
  state.history.push({atMs,attackerId,amount});
  return {traitId:thornPart>0?'thornbound_riposte':'thornbound_riposte',
   actorId:defenderId,targetId:attackerId,atMs,effect:'retaliation_damage',amount:round(amount)};
 }
 /** Direct effective ally heal only. Return two separate secondary actions,
  * which the real engine must apply outside any direct-heal triggering path. */
 afterDirectAllyHeal(atMs:number,sourceId:string,healedId:string,otherId:string,
  actualHeal:number,otherMissingHp:number):readonly EquipmentTraitTriggerV2[]{
  const source=this.source(sourceId),state=this.get(sourceId);
  if(!source||!state||sourceId===healedId||otherId===healedId||
    otherId===sourceId||!positive(actualHeal)||actualHeal===0||
    !positive(otherMissingHp)||otherMissingHp===0)return [];
  const result:EquipmentTraitTriggerV2[]=[];
  if(snapshotTrait(source,'mending_echo')&&atMs-state.mendingProcAt>=24000){
   const amount=round(Math.min(otherMissingHp,actualHeal*.08));
   if(amount>0){state.mendingProcAt=atMs;result.push({
    traitId:'mending_echo',actorId:sourceId,targetId:otherId,atMs,
    effect:'secondary_heal',amount,
   });}
  }
  if(snapshotTrait(source,'restorative_bloom')&&atMs-state.bloomProcAt>=26000){
   const amount=round(Math.min(otherMissingHp,actualHeal*.05));
   if(amount>0){state.bloomProcAt=atMs;result.push({
    traitId:'restorative_bloom',actorId:sourceId,targetId:otherId,atMs,
    effect:'secondary_hot',amount,
   });}
  }
  return result;
 }
}
