/** PRIVATE TEST ONLY. Fresh four-player pressure matrix, exact frozen
 * Forge projections, mock persisted binding and zero additional trait
 * overlay. Does not expose a new issuer or bypass full-range RNG gates. */
import {strict as assert} from 'node:assert';
import type {CombatInput,CombatResult,CombatantDefinition} from '../../types';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import {simulateCombatWithServerAuthoritiesV2} from '../../engine';
import {ACTION_STREAM_RNG_QA_V2} from '../../deterministic-rng';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {preparePartyEnemyKitsV2,verifyPersistedPartyEnemyKitsV2} from '../enemy-kit-composer';
import {enemyV2SnapshotDigest,issuePersistedPartyEnemyV2EngineAuthority} from '../enemy-engine-authority';
import {issuePersistedPartyEquipmentV2TraitAuthority,EQUIPMENT_V2_TRAIT_ENGINE_POLICY,type VerifiedV2EquipmentEffectSource} from '../equipment-trait-engine-authority';
import {reviewPartyV2RunBinding} from '../party-dungeon-persistence-review';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import type {compileRealFrozenForgeActorV2} from '../equipment-frozen-forge-bridge';
import type {reviewFrozenForgeSocketsV2} from '../frozen-forge-socket-review';
import {gentleStatGemActorReviewV2} from './gentle-stat-gem-combat-review';
import {reviewPotentAuthoredActorV2} from './potent-authored-output-combat-review';
import {issuePrivateDamageGemAuthorityV2} from '../effect-gem-private-damage-authority';
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
type Member={classId:ClassIdV2;accountId:string;characterId:string;revision:number;
 compiled:ReturnType<typeof compileRealFrozenForgeActorV2>;baseline:Projection};
type BossProfile={region:'asterfall'|'sunscar'|'frostmarch';tier:2|3|4;enemy:CombatantDefinition};
function measure(r:CombatResult,i:number){
 const a=r.players[i],sec=r.durationMs/1000;
 assert.ok(sec>0);
 const own=r.events.filter(e=>e.actorId===a.definition.id);
 return {damage:a.damageDone,dps:a.damageDone/sec,healing:a.healingDone,hps:a.healingDone/sec,
  damageTaken:a.damageTaken,hpFraction:a.hp/a.definition.stats.maxHp,alive:Number(a.alive),
  shield:own.filter(e=>e.type==='shield').reduce((n,e)=>n+(e.amount??0),0),
  crits:own.filter(e=>e.type==='damage'&&e.critical===true).length,
  hits:own.filter(e=>e.type==='damage').length,
  misses:own.filter(e=>e.type==='miss').length,
  partyAlive:r.players.filter(p=>p.alive).length,victory:Number(r.victory),
  enemyHp:r.enemies.reduce((n,e)=>n+e.hp,0),durationMs:r.durationMs};
}
export function createGentleGemPartyPressureReviewV2(members:readonly Member[],profile:BossProfile,seed:string){
 assert.equal(members.length,4);
 assert.equal(new Set(members.flatMap(m=>m.baseline.equippedInstanceIds)).size,
  members.reduce((n,m)=>n+m.baseline.equippedInstanceIds.length,0));
 const baseline=members.map(m=>reviewPotentAuthoredActorV2(gentleStatGemActorReviewV2(m.compiled,m.baseline,true),m.baseline).actor);
 const snapshots=JSON.stringify(members);
 const runId='QA_GEM_PARTY_'+seed,nodeId='BOSS';
 const proposed=preparePartyEnemyKitsV2([profile.enemy],{ruleset:ENEMY_V2_RULESET,serverSeed:seed,
  encounterId:runId+':'+nodeId,region:profile.region,equipmentTier:profile.tier,eliteEnemyIds:[]});
 const kit={...proposed,source:'server-persisted-v2' as const,revision:3};
 const verified=verifyPersistedPartyEnemyKitsV2([profile.enemy],kit);
 const kitDigest=enemyV2SnapshotDigest(kit);
 const run=(projections:readonly Projection[],players:CombatantDefinition[])=>{
  const input:CombatInput={seed,players,enemies:[...verified.enemies],maxDurationMs:60000,tickMs:100};
  const roster:ReadyRosterMember[]=members.map((m,i)=>({accountId:m.accountId,characterId:m.characterId,
   ticketId:'QA_TICKET_'+i,role:CLASS_ROLES_V2[m.classId],originalEnqueuedAtMs:1,
   loadoutId:'QA_LOADOUT_'+i,loadoutRevision:m.revision,loadoutSnapshotHash:projections[i].digest}));
  const readyCheck:ReadyCheckRecord={id:'QA_GEM_READY',partyId:'QA_GEM_PARTY',rosterRevision:1,
   roster,accepts:Object.fromEntries(roster.map(m=>[m.accountId,true])),status:'committed',openedAtMs:1,closesAtMs:1000};
  const frozenRoster=members.map((m,i)=>({accountId:m.accountId,characterId:m.characterId,classId:m.classId,
   loadoutId:roster[i].loadoutId,revision:m.revision,snapshotHash:roster[i].loadoutSnapshotHash,
   readiness:{role:CLASS_ROLES_V2[m.classId]}} as unknown as FrozenLoadoutSnapshot));
  const {binding}=reviewPartyV2RunBinding({runId,nodeId,encounterRevision:3,stateRevision:1,
   contentVersion:'qa_gem_content',balanceVersion:'qa_gentle_gems',seed,readyCheck,frozenRoster,
   actorCharacterIds:Object.fromEntries(members.map(m=>[m.compiled.actor.id,m.characterId])),combatInput:input});
  // No extra trait/ability multipliers: exact Forge stats already compiled.
  // This is a mock QA receipt binding, not production persisted trait data.
  const sources:VerifiedV2EquipmentEffectSource[]=members.map((m,i)=>({
   source:'server-persisted-equipment-v2',policy:EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
   revision:m.revision,accountId:m.accountId,characterId:m.characterId,actorId:players[i].id,
   ownedEquippedInstanceIds:projections[i].equippedInstanceIds,equipmentReceiptDigest:projections[i].digest,
   basicAttackDamagePct:0,abilityDamagePct:0,reflectDamagePct:0,traits:[]}));
  const sourceDigest=enemyV2SnapshotDigest(sources),inputDigest=enemyV2SnapshotDigest(input);
  const bindingDigest=enemyV2SnapshotDigest(binding);
  const equipmentTrait=issuePersistedPartyEquipmentV2TraitAuthority(input,sources,binding,
   (row,actual,d)=>d===inputDigest&&enemyV2SnapshotDigest(row)===bindingDigest&&enemyV2SnapshotDigest(actual)===sourceDigest);
  const enemy=issuePersistedPartyEnemyV2EngineAuthority(input,binding,kit.enemyIds,kit.bossIds,
   (row,d)=>d===inputDigest&&enemyV2SnapshotDigest(row)===bindingDigest&&enemyV2SnapshotDigest(kit)===kitDigest);
  const effects=projections.filter(p=>p.deferredEffectSources.length>0);
  assert.ok(effects.length<=1);
  const projection=effects[0];
  const projectionDigest=projection?enemyV2SnapshotDigest(projection):null;
  const privateDamageGem=projection?issuePrivateDamageGemAuthorityV2(input,projection,
   (p,d)=>d===inputDigest&&enemyV2SnapshotDigest(p)===projectionDigest):undefined;
  const result=simulateCombatWithServerAuthoritiesV2(input,{enemy,equipmentTrait,aiPolicy:'tactical',rngReviewPolicy:ACTION_STREAM_RNG_QA_V2,
   ...(privateDamageGem?{privateDamageGem}:{})});
  if(privateDamageGem){
   assert.throws(()=>simulateCombatWithServerAuthoritiesV2({...input,maxDurationMs:59900},
    {enemy,equipmentTrait,aiPolicy:'tactical',rngReviewPolicy:ACTION_STREAM_RNG_QA_V2,privateDamageGem}),/scope_does_not_match|not_matching_compiled/);
   assert.throws(()=>simulateCombatWithServerAuthoritiesV2(input,{enemy,equipmentTrait,aiPolicy:'tactical',privateDamageGem}),/private_damage_gem_review_engine_scope/);
  }
  assert.equal(result.events[0].detail,ACTION_STREAM_RNG_QA_V2);
  return result;
 };
 const empty=members.map(m=>m.baseline);
 const before=run(empty,baseline);
 assert.deepEqual(run(empty,baseline),before);
 return (index:number,p:Projection,replay=false)=>{
  const m=members[index];
  assert.deepEqual(p.forgeEvidence,m.baseline.forgeEvidence);
  const effectOnly=p.deferredEffectSources.length>0;
  if(effectOnly){assert.equal(p.gemSources.length,0);assert.deepEqual(p.stats,m.baseline.stats);assert.deepEqual(p.advanced,m.baseline.advanced);}
  const actor=effectOnly?baseline[index]:reviewPotentAuthoredActorV2(gentleStatGemActorReviewV2(m.compiled,p,true),p).actor;
  const players=baseline.map((a,i)=>i===index?actor:a);
  const projections=empty.map((x,i)=>i===index?p:x);
  const after=run(projections,players);
  if(replay)assert.deepEqual(run(projections,players),after);
  for(let i=0;i<4;i++)if(i!==index)assert.deepEqual(after.players[i].definition,before.players[i].definition);
  assert.deepEqual(after.enemies.map(x=>x.definition),before.enemies.map(x=>x.definition));
  assert.equal(JSON.stringify(members),snapshots);
  const a=measure(before,index),b=measure(after,index);
  assert.ok([...Object.values(a),...Object.values(b)].every(Number.isFinite));
  const isGemTrace=(e:{detail?:string})=>/^private_qa_(damage|stack|haste)_gem:/.test(e.detail??'');
  const triggers=after.events.filter(isGemTrace);
  const stackTriggers=triggers.filter(e=>e.detail?.startsWith('private_qa_stack_gem:'));
  assert.ok(!before.events.some(isGemTrace));
  const keys=stackTriggers.map(e=>e.detail!.split(':').slice(1,3).join(':'));
  assert.equal(new Set(keys).size,keys.length,'one stack transition per family/action');
  assert.ok(stackTriggers.every(e=>Number(e.detail!.split(':')[2])>0&&Number(e.detail!.split(':')[3])>0));
  assert.ok(triggers.every(e=>e.actorId===actor.id&&e.amount!==undefined&&e.amount>0&&
   (e.abilityId==='BASIC'||actor.abilities.some(a=>a.id===e.abilityId))));
  if(effectOnly){
   const report=p.effectResonanceReview!;
   assert.ok(triggers.every(e=>report.families.some(g=>e.detail!.split(':')[1]===g.familyId&&e.amount!<=g.peak.candidate+1e-9)));
   const byFamily=new Map(report.families.map(g=>[g.familyId,g]));
   for(const event of stackTriggers){
    const [,family,,count]=event.detail!.split(':'),g=byFamily.get(family)!;
    const cap=family==='effect_momentum'?(g.resonance>=2?6:5):(g.resonance>=2?4:3);
    assert.ok(Number(count)<=cap&&Math.abs(event.amount!-Number(count)*g.totalValue)<1e-9);
   }
   for(const family of ['effect_momentum','effect_critical_surge']){
    const xs=stackTriggers.filter(e=>e.detail!.split(':')[1]===family);
    for(let i=1;i<xs.length;i++)assert.ok(xs[i].atMs-xs[i-1].atMs>=(family==='effect_momentum'?500:750));
   }
   assert.deepEqual(after.players[index].definition,before.players[index].definition);
  }else assert.equal(triggers.length,0);
  const recoveryEvents=after.events.filter(e=>e.abilityId==='V2_QA_GEM_RETALIATION');
  const armed=after.events.filter(e=>e.detail==='private_qa_retaliation_armed');
  assert.ok(recoveryEvents.every(e=>e.actorId===actor.id&&e.targetId===actor.id&&e.type==='heal'&&e.detail==='private_qa_terminal_recovery'&&(e.amount??0)<=actor.stats.maxHp*.01+.011));
  for(let i=1;i<recoveryEvents.length;i++)assert.ok(recoveryEvents[i].atMs-recoveryEvents[i-1].atMs>=10000);
  for(let i=1;i<armed.length;i++)assert.ok(armed[i].atMs-armed[i-1].atMs>=8000);
  if(recoveryEvents.length)assert.equal(p.effectResonanceReview?.families.find(g=>g.familyId==='effect_retaliation')?.resonance,3);
  return {before:a,after:b,triggerCount:triggers.length,stackTriggers:stackTriggers.length,armed:armed.length,recoveryEvents:recoveryEvents.length,
   hasteUses:triggers.filter(e=>e.detail?.startsWith('private_qa_haste_gem:')).length,
   maxStacks:Math.max(0,...stackTriggers.map(e=>Number(e.detail!.split(':')[3]))),
   maxFraction:Math.max(0,...triggers.map(e=>e.amount??0)),releaseEnabled:false as const};
 };
}
