/**
 * HIDDEN World Boss V87 — test-only bridge to the FIVE executable Equipment
 * 2.0 traits in Combat PR #1559. Never imported by live server routes.
 *
 * Receives separately verified exact-copy / owned-and-equipped sources,
 * NOT a client-specified gear stat. 13 prior V2 stats are already compiled
 * into combatants; only the 3 NEW percentage channels are applied here.
 *
 * Deliberately does not import the other branch's experimental engine:
 * integration must replace this pilot with that one canonical implementation
 * after two-branch source reconciliation and exact-copy DB authorization.
 */
export const WORLD_BOSS_EQUIPMENT_V87_LIVE=false as const;
export type WorldBossExecutableTraitV87='sword_dance'|'echoing_strike'|
 'thornbound_riposte'|'mending_echo'|'restorative_bloom';
export interface WorldBossEquippedSourceV87{
 readonly source:'server-persisted-equipment-v2';
 readonly policy:'eq2-traits-hidden-engine-pass1';
 readonly revision:number;
 readonly accountId:string;readonly characterId:string;readonly actorId:string;
 readonly equipmentReceiptDigest:string;
 readonly ownedEquippedInstanceIds:readonly string[];
 /** Actual percent points, not fractional multipliers. */
 readonly basicAttackDamagePct:number;
 readonly abilityDamagePct:number;
 readonly reflectDamagePct:number;
 readonly traits:readonly {instanceId:string;traitId:WorldBossExecutableTraitV87}[];
}
export interface WorldBossEquipmentProofV87{
 readonly eventId:string;readonly accountId:string;readonly bossId:string;
 readonly rosterDigest:string;readonly serverBossMaxHp:number;
 readonly sources:readonly WorldBossEquippedSourceV87[];
 /** This MUST come from independent server-owned persisted storage / SQL. */
 readonly verifyPersisted:(scope:Readonly<{
  eventId:string;accountId:string;bossId:string;rosterDigest:string;
  actorIds:readonly string[];serverBossMaxHp:number;
 }>,sources:readonly WorldBossEquippedSourceV87[])=>boolean;
}
export interface WorldBossEquipmentContextV87{
 readonly eventId:string;readonly accountId:string;readonly bossId:string;
 readonly rosterDigest:string;
 readonly actors:readonly {id:string;characterId:string}[];
}
export interface WorldBossTraitEffectV87{
 readonly traitId:WorldBossExecutableTraitV87|'reflect_damage_affix';
 readonly actorId:string;readonly amount:number;
 readonly effect:'bonus_direct_damage'|'retaliation_damage'|'secondary_heal'|'secondary_hot';
}
const id=(x:unknown)=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(x);
const digest=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const pct=(x:unknown,max:number)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
const finite=(x:number)=>Number.isFinite(x)&&x>=0;
const r6=(x:number)=>Math.round(x*1000000)/1000000;
const expectedSourceKeys=new Set([
 'source','policy','revision','accountId','characterId','actorId',
 'equipmentReceiptDigest','ownedEquippedInstanceIds','basicAttackDamagePct',
 'abilityDamagePct','reflectDamagePct','traits',
]);
const allowed=new Set<WorldBossExecutableTraitV87>([
 'sword_dance','echoing_strike','thornbound_riposte','mending_echo','restorative_bloom',
]);
const fail=(reason:string):never=>{throw Error('world_boss_v87_'+reason);};
type State={streak:number;lastTarget:string|null;globalAt:number;swordAt:number;
 echoAt:number;thornAt:number;mendingAt:number;bloomAt:number};
const start=():State=>({streak:0,lastTarget:null,globalAt:-Infinity,
 swordAt:-Infinity,echoAt:-Infinity,thornAt:-Infinity,
 mendingAt:-Infinity,bloomAt:-Infinity});
/** No client construction: only the disabled V25 authored account encounter
 * creates it, after its independently frozen roster and exact-item check. */
export class WorldBossEquipmentRuntimeV87{
 private readonly sources=new Map<string,WorldBossEquippedSourceV87>();
 private readonly state=new Map<string,State>();
 private retaliationHistory:Array<{atMs:number;amount:number}>=[];
 private constructor(private readonly bossHp:number){}
 static fromVerified(
  proof:WorldBossEquipmentProofV87,context:WorldBossEquipmentContextV87,
 ):WorldBossEquipmentRuntimeV87{
  if(process.env.NODE_ENV==='production'||WORLD_BOSS_EQUIPMENT_V87_LIVE||
   !proof||!context||typeof proof.verifyPersisted!=='function'||
   !id(proof.eventId)||proof.eventId!==context.eventId||
   !id(proof.accountId)||proof.accountId!==context.accountId||
   proof.bossId!==context.bossId||!digest(proof.rosterDigest)||
   proof.rosterDigest!==context.rosterDigest||
   !Number.isSafeInteger(proof.serverBossMaxHp)||
   proof.serverBossMaxHp<=0||proof.serverBossMaxHp>1e12||
   !Array.isArray(proof.sources)||!Array.isArray(context.actors)||
   proof.sources.length!==context.actors.length||
   context.actors.length<1||context.actors.length>5)
   fail('untrusted_scope');
  const seen=new Set<string>();
  for(const source of proof.sources){
   const actor=context.actors.find(a=>a.id===source?.actorId);
   if(!source||source.source!=='server-persisted-equipment-v2'||
    source.policy!=='eq2-traits-hidden-engine-pass1'||
    !actor||actor.characterId!==source.characterId||
    source.accountId!==context.accountId||seen.has(source.actorId)||
    !Number.isSafeInteger(source.revision)||source.revision<1||
    !digest(source.equipmentReceiptDigest)||
    !Array.isArray(source.ownedEquippedInstanceIds)||
    source.ownedEquippedInstanceIds.length>10||
    new Set(source.ownedEquippedInstanceIds).size!==source.ownedEquippedInstanceIds.length||
    source.ownedEquippedInstanceIds.some(x=>!id(x))||
    !pct(source.basicAttackDamagePct,19)||!pct(source.abilityDamagePct,22)||
    !pct(source.reflectDamagePct,8)||
    !Array.isArray(source.traits)||source.traits.length>2||
    Object.keys(source).some(key=>!expectedSourceKeys.has(key)))
    fail('untrusted_equipment');
   const traits=new Set<string>(),instances=new Set<string>();
   for(const selected of source.traits){
    if(!selected||!allowed.has(selected.traitId)||
     !source.ownedEquippedInstanceIds.includes(selected.instanceId)||
     traits.has(selected.traitId)||instances.has(selected.instanceId)||
     Object.keys(selected).some(key=>key!=='instanceId'&&key!=='traitId'))
     fail('unsupported_or_duplicate_trait');
    traits.add(selected.traitId);instances.add(selected.instanceId);
   }
   seen.add(source.actorId);
  }
  const scope=Object.freeze({eventId:context.eventId,accountId:context.accountId,
   bossId:context.bossId,rosterDigest:context.rosterDigest,
   actorIds:Object.freeze(context.actors.map(x=>x.id)),
   serverBossMaxHp:proof.serverBossMaxHp});
  // Freeze exactly what the privileged verifier sees and what the encounter
  // later executes. A callback cannot mutate the accepted receipt between
  // persistence verification and the first authored round.
  const frozenSources=Object.freeze(proof.sources.map(source=>Object.freeze({
   ...source,
   ownedEquippedInstanceIds:Object.freeze([...source.ownedEquippedInstanceIds]),
   traits:Object.freeze(source.traits.map(t=>Object.freeze({...t}))),
  })));
  let verified=false;
  try{verified=proof.verifyPersisted(scope,frozenSources)===true;}catch{verified=false;}
  if(!verified)fail('persisted_receipt_not_verified');
  const runtime=new WorldBossEquipmentRuntimeV87(scope.serverBossMaxHp);
  for(const source of frozenSources){
   runtime.sources.set(source.actorId,source);
   runtime.state.set(source.actorId,start());
  }
  return runtime;
 }
 private has(id:string,trait:WorldBossExecutableTraitV87){
  return this.sources.get(id)?.traits.some(t=>t.traitId===trait)===true;
 }
 miss(actorId:string,abilityId:string){
  if(abilityId==='BASIC'){const s=this.state.get(actorId);if(s)s.streak=0;}
 }
 /** Only after the native hit roll and crit/mitigation. DoT / gem never qualifies. */
 originalDirectHit(round:number,actorId:string,targetId:string,
  abilityId:string,damage:number):{damage:number;proc?:WorldBossTraitEffectV87}{
  const s=this.state.get(actorId),source=this.sources.get(actorId);
  if(!s||!source||!finite(damage)||!Number.isInteger(round)||round<1||round>14)
   throw Error('world_boss_v87_invalid_direct_hit');
  if(abilityId==='BASIC'){
   let value=damage*(1+source.basicAttackDamagePct/100);
   if(s.lastTarget!==targetId){s.lastTarget=targetId;s.streak=0;}
   s.streak++;
   const atMs=round*5000;
   if(this.has(actorId,'sword_dance')&&s.streak>=3){
    s.streak=0;
    if(atMs-s.swordAt>=9000&&atMs-s.globalAt>=1000){
     s.swordAt=atMs;s.globalAt=atMs;
     const bonus=r6(value*.05);value+=bonus;
     return {damage:r6(value),proc:{traitId:'sword_dance',actorId,
      amount:bonus,effect:'bonus_direct_damage'}};
    }
   }
   return {damage:r6(value)};
  }
  if(abilityId.startsWith('V2_')||abilityId.startsWith('GEM_')||
   abilityId.startsWith('COMPANION_')||abilityId.startsWith('PASSIVE_')||
   abilityId.startsWith('WB87_'))return {damage};
  return {damage:r6(damage*(1+source.abilityDamagePct/100))};
 }
 skillEcho(round:number,actorId:string,abilityId:string,hpDamage:number,
  attackPower:number):WorldBossTraitEffectV87|undefined{
  const s=this.state.get(actorId),atMs=round*5000;
  if(!s||abilityId==='BASIC'||abilityId.startsWith('GEM_')||
   abilityId.startsWith('WB87_')||abilityId.startsWith('V2_')||
   abilityId.startsWith('COMPANION_')||abilityId.startsWith('PASSIVE_')||
   !this.has(actorId,'echoing_strike')||!finite(hpDamage)||hpDamage===0||
   !finite(attackPower)||atMs-s.echoAt<30000||atMs-s.globalAt<1000)return;
  const amount=r6(Math.min(hpDamage*.08,attackPower*.20));
  if(!amount)return;
  s.echoAt=atMs;s.globalAt=atMs;
  return {traitId:'echoing_strike',actorId,amount,effect:'bonus_direct_damage'};
 }
 /** The 5-second budget is shared by ALL characters, never per defender.
  * World bosses are treated at least as strictly as regional bosses. */
 retaliation(round:number,defenderId:string,actualHpLost:number,
  defenderMaxHp:number,defenderAttack:number,aliveAfterHit:boolean,
  bossAbilityId:string):WorldBossTraitEffectV87|undefined{
  const s=this.state.get(defenderId),source=this.sources.get(defenderId),atMs=round*5000;
  if(!s||!source||bossAbilityId!=='BASIC'||!aliveAfterHit||
   !finite(actualHpLost)||actualHpLost===0||
   !finite(defenderMaxHp)||defenderMaxHp===0||
   !finite(defenderAttack)||!defenderAttack)return;
  this.retaliationHistory=this.retaliationHistory.filter(x=>atMs-x.atMs<5000);
  const thorn=this.has(defenderId,'thornbound_riposte')&&
    atMs-s.thornAt>=15000&&atMs-s.globalAt>=1000;
  const reflect=actualHpLost*source.reflectDamagePct/100;
  const thornPart=thorn?Math.min(actualHpLost*.08,defenderMaxHp*.015):0;
  const spent=this.retaliationHistory.reduce((n,v)=>n+v.amount,0);
  const amount=r6(Math.max(0,Math.min(reflect+thornPart,
   defenderMaxHp*.015,this.bossHp*.001-spent)));
  if(!amount)return;
  const usesThorn=amount>Math.min(reflect,amount);
  if(usesThorn){s.thornAt=atMs;s.globalAt=atMs;}
  this.retaliationHistory.push({atMs,amount});
  return {traitId:usesThorn?'thornbound_riposte':'reflect_damage_affix',
   actorId:defenderId,amount,effect:'retaliation_damage'};
 }
 effectiveAllyHeal(round:number,actorId:string,healedId:string,
  otherId:string,actualHeal:number,otherMissingHp:number):
  WorldBossTraitEffectV87|undefined{
  const s=this.state.get(actorId),atMs=round*5000;
  if(!s||actorId===healedId||actorId===otherId||healedId===otherId||
   !finite(actualHeal)||actualHeal===0||
   !finite(otherMissingHp)||otherMissingHp===0||atMs-s.globalAt<1000)return;
  if(this.has(actorId,'mending_echo')&&atMs-s.mendingAt>=24000){
   const amount=r6(Math.min(otherMissingHp,actualHeal*.08));
   if(amount>0){s.mendingAt=atMs;s.globalAt=atMs;
    return {traitId:'mending_echo',actorId,amount,effect:'secondary_heal'};}
  }
  if(this.has(actorId,'restorative_bloom')&&atMs-s.bloomAt>=26000){
   const amount=r6(Math.min(otherMissingHp,actualHeal*.05));
   if(amount>0){s.bloomAt=atMs;s.globalAt=atMs;
    return {traitId:'restorative_bloom',actorId,amount,effect:'secondary_hot'};}
  }
 }
}
