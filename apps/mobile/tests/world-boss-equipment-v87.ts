/**
 * V87 test-only: Equipment 2.0 stat/trait calculation parity on account World
 * Boss rounds. These are synthetic verified-receipt callbacks, NOT real DB.
 */
import {assert} from './test-assert';
import {
 WorldBossEquipmentRuntimeV87,WORLD_BOSS_EQUIPMENT_V87_LIVE,
 type WorldBossEquipmentProofV87,
} from '../../../backend/src/server/combat/world-boss-equipment-effects-v87';
const eventId='event_87',accountId='account_87',rosterDigest='a'.repeat(64);
const actors=['tank','dance','echo','medic','bloom'].map((id,i)=>({
 id,characterId:'character_'+i,
}));
const sources=actors.map((actor,i)=>({
 source:'server-persisted-equipment-v2' as const,
 policy:'eq2-traits-hidden-engine-pass1' as const,
 revision:1,accountId,characterId:actor.characterId,actorId:actor.id,
 equipmentReceiptDigest:String(i+1).repeat(64),
 ownedEquippedInstanceIds:['copy_'+i],
 basicAttackDamagePct:actor.id==='dance'?19:0,
 abilityDamagePct:actor.id==='echo'?22:0,
 reflectDamagePct:actor.id==='tank'?8:0,
 traits:[{instanceId:'copy_'+i,traitId:({
  tank:'thornbound_riposte',dance:'sword_dance',echo:'echoing_strike',
  medic:'mending_echo',bloom:'restorative_bloom',
 } as const)[actor.id as 'tank'|'dance'|'echo'|'medic'|'bloom']}],
}));
const scope={eventId,accountId,bossId:'hollowroot',rosterDigest,actors};
let verifiedCalls=0;
const proof:WorldBossEquipmentProofV87={
 eventId,accountId,bossId:'hollowroot',rosterDigest,serverBossMaxHp:1000,
 sources,verifyPersisted:(context,items)=>{
  verifiedCalls++;
  return context.eventId===eventId&&context.accountId===accountId&&
   context.rosterDigest===rosterDigest&&context.actorIds.length===5&&
   context.actorIds.every(id=>items.some(x=>x.actorId===id))&&
   context.serverBossMaxHp===1000;
 },
};
const reject=(f:()=>unknown,part:string)=>{
 let error='';try{f()}catch(e){error=String(e);}
 assert.ok(error.includes(part),'Expected '+part+' in '+error);
};
const make=(p:WorldBossEquipmentProofV87=proof)=>
 WorldBossEquipmentRuntimeV87.fromVerified(p,scope);
assert.equal(WORLD_BOSS_EQUIPMENT_V87_LIVE,false);
const r=make();
assert.equal(verifiedCalls,1);
assert.equal(r.originalDirectHit(1,'dance','HOLLOWROOT','BASIC',100).damage,119);
assert.equal(r.originalDirectHit(2,'dance','HOLLOWROOT','BASIC',100).damage,119);
const third=r.originalDirectHit(3,'dance','HOLLOWROOT','BASIC',100);
assert.equal(third.damage,124.95);
assert.equal(third.proc?.traitId,'sword_dance');
assert.equal(r.originalDirectHit(4,'dance','HOLLOWROOT','GEM_BLAST',100).damage,100);
r.miss('dance','BASIC');
assert.equal(r.originalDirectHit(5,'dance','HOLLOWROOT','BASIC',100).proc,undefined);
assert.equal(r.originalDirectHit(1,'echo','HOLLOWROOT','CLASS_SLASH',100).damage,122);
assert.equal(r.originalDirectHit(1,'echo','HOLLOWROOT','BASIC',100).damage,100);
assert.equal(r.originalDirectHit(1,'echo','HOLLOWROOT','V2_TRAIT',100).damage,100);
assert.equal(r.skillEcho(1,'echo','CLASS_SLASH',100,1000)?.amount,8);
assert.equal(r.skillEcho(2,'echo','CLASS_SLASH',100,1000),undefined);
assert.equal(r.skillEcho(7,'echo','CLASS_SLASH',1000,1000)?.amount,200);
const firstReflect=r.retaliation(1,'tank',100,1000,500,true,'BASIC');
assert.equal(firstReflect?.amount,1);
assert.equal(firstReflect?.traitId,'thornbound_riposte');
assert.equal(r.retaliation(1,'tank',100,1000,500,true,'BASIC'),undefined,
 'shared boss budget cannot be spent twice in the same five-second window');
assert.equal(r.retaliation(2,'tank',100,1000,500,true,'SOLAR_COLLAPSE'),undefined,
 'boss special casts cannot reflect');
assert.equal(r.retaliation(2,'tank',100,1000,500,false,'BASIC'),undefined,
 'fatal hit cannot reflect');
assert.equal(r.retaliation(2,'tank',0,1000,500,true,'BASIC'),undefined,
 'fully shielded hit cannot reflect');
assert.equal(r.retaliation(2,'tank',100,1000,500,true,'BASIC')?.amount,1);
assert.equal(r.effectiveAllyHeal(1,'medic','tank','dance',100,200)?.amount,8);
assert.equal(r.effectiveAllyHeal(1,'medic','tank','dance',100,200),undefined);
assert.equal(r.effectiveAllyHeal(1,'bloom','tank','echo',100,200)?.amount,5);
assert.equal(r.effectiveAllyHeal(1,'medic','medic','dance',100,200),undefined);
assert.equal(r.effectiveAllyHeal(1,'medic','tank','tank',100,200),undefined);
reject(()=>make({...proof,verifyPersisted:()=>false}), 'persisted_receipt_not_verified');
reject(()=>make({...proof,serverBossMaxHp:0}), 'untrusted_scope');
reject(()=>make({...proof,accountId:'wrong'}), 'untrusted_scope');
reject(()=>make({...proof,sources:[...sources.slice(0,4),{...sources[4],characterId:'foreign'}]}),
 'untrusted_equipment');
reject(()=>make({...proof,sources:[...sources.slice(0,4),{...sources[4],basicAttackDamagePct:1900}]}),
 'untrusted_equipment');
reject(()=>make({...proof,sources:[...sources.slice(0,4),{...sources[4],traits:[
  {instanceId:'copy_4',traitId:'future_unimplemented' as never}]}]}),
 'unsupported_or_duplicate_trait');
reject(()=>make({...proof,sources:[...sources.slice(0,4),{...sources[4],traits:[
  {...sources[4].traits[0]},{...sources[4].traits[0]}]}]}),
 'unsupported_or_duplicate_trait');
console.log('WORLD_BOSS_EQUIPMENT_V87_PURE_OK: 3 new channels, 5 executable traits, capped reflection, proc provenance, forged-receipt denial, no live effects');
