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
import {issuePrivateDamageGemAuthorityV2,authorizePrivateDamageGemReviewV2} from '../effect-gem-private-damage-authority';
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
  // Fresh private runtime probes, independent of the encounter's RNG.
  if(privateDamageGem&&projection){
   const group=projection.effectResonanceReview?.families[0];
   const runtime=authorizePrivateDamageGemReviewV2(input,privateDamageGem,new Map(sources.map(s=>[s.actorId,s])))!;
   const original=result.players.find(p=>p.definition.id===projection.forgeEvidence.actorId)!;
   const owner={...original,alive:true,hp:original.definition.stats.maxHp};
   const enemy={...result.enemies[0],alive:true};
   if(group?.familyId==='effect_last_stand'){
    const threshold=group.resonance>=2?.35:.30;
    const before=owner.hp;
    owner.hp=before*(threshold-.01);
    assert.equal(runtime.afterIncomingDefense(100,enemy,owner,'V2_GENERATED',before).length,0);
    assert.equal(runtime.incomingReductions(100,owner).length,0);
    const earned=runtime.afterIncomingDefense(100,enemy,owner,'BASIC',before);
    assert.equal(earned.length,1);assert.equal(earned[0].fraction,group.totalValue);
    assert.equal(earned[0].expiresAt,100+(group.resonance===3?8000:6000));
    assert.equal(runtime.incomingReductions(101,owner)[0].fraction,group.totalValue);
    assert.equal(runtime.incomingReductions(earned[0].expiresAt,owner).length,0);
    assert.equal(runtime.afterIncomingDefense(10000,enemy,owner,'BASIC',before).length,0);
   }
   if(group?.familyId==='effect_unyielding'){
    const before=owner.hp;owner.hp=before-1;
    assert.equal(runtime.defenseFraction(100,owner),0);
    assert.equal(runtime.afterIncomingDefense(100,enemy,owner,'V2_GENERATED',before).length,0);
    assert.equal(runtime.afterIncomingDefense(100,enemy,owner,'BASIC',owner.hp).length,0);
    assert.equal(runtime.afterIncomingDefense(100,enemy,owner,'BASIC',before).length,1);
    assert.equal(runtime.afterIncomingDefense(849,enemy,owner,'BASIC',before).length,0);
    const cap=group.resonance>=2?5:4;
    for(let i=1;i<=cap;i++)runtime.afterIncomingDefense(100+i*750,enemy,owner,'BASIC',before);
    assert.ok(Math.abs(runtime.defenseFraction(100+cap*750,owner)-group.totalValue*cap)<1e-9);
    assert.equal(runtime.defenseFraction(15000,owner),0);
   }
   if(group?.familyId==='effect_guardians_gift'){
    const shield=owner.definition.abilities.find(a=>a.id.includes(':v2:')&&a.effects.some(e=>e.kind==='shield'));
    if(shield){
     const ally={...result.players.find(p=>p.definition.id!==owner.definition.id)!,alive:true};
     runtime.beginAction(100,owner,shield.id);
     assert.equal(runtime.onBarrier(100,owner,ally,shield.id,0).length,0);
     assert.equal(runtime.onBarrier(100,owner,owner,shield.id,10).length,0);
     assert.equal(runtime.onBarrier(100,owner,ally,'V2_GENERATED',10).length,0);
     const grants=runtime.onBarrier(100,owner,ally,shield.id,10);
     assert.equal(grants.length,group.resonance===3?2:1);
     assert.equal(runtime.incomingReductions(101,ally)[0].fraction,group.totalValue);
     assert.equal(runtime.incomingReductions(101,owner)[0]?.fraction??0,group.resonance===3?group.totalValue*.5:0);
     runtime.beginAction(200,owner,shield.id);runtime.onBarrier(200,owner,ally,shield.id,10);
     assert.equal(runtime.incomingReductions(201,ally).length,1);
     assert.equal(runtime.incomingReductions(200+(group.resonance>=2?6000:4000),ally).length,0);
    }
   }
   const ally={...result.players.find(p=>p.definition.id!==owner.definition.id)!,alive:true,shield:0};
   const heal=owner.definition.abilities.find(a=>a.id.includes(':v2:')&&a.effects.some(e=>e.kind==='heal'));
   const shield=owner.definition.abilities.find(a=>a.id.includes(':v2:')&&a.effects.some(e=>e.kind==='shield'));
   if(group?.familyId==='effect_bulwark'){
    assert.equal(runtime.onDefensiveAction(0,owner,'BASIC'),undefined);
    const defensive=owner.definition.abilities.find(a=>a.id.includes(':v2:')&&a.effects.some(e=>e.kind==='shield'||(e.kind==='buff'&&((e.tag==='damage_taken'&&(e.value??0)<0)||(e.tag==='defense_pct'&&(e.value??0)>0)))));
    if(defensive){
     runtime.beginAction(100,owner,defensive.id);
     const row=runtime.onDefensiveAction(100,owner,defensive.id)!;
     assert.equal(row.fraction,group.totalValue);
     assert.equal(row.expiresAt,100+(group.resonance>=2?5000:4000));
     assert.equal(runtime.incomingReductions(row.expiresAt,owner).length,0);
    }
   }
   if(group?.familyId==='effect_aegis'&&shield){
    runtime.beginAction(100,owner,shield.id);
    const effect=shield.effects.find(e=>e.kind==='shield')!;
    const out=runtime.aegisBarrier(100,owner,ally,shield.id,10,effect);
    if(effect.shieldReflectPct)assert.equal(out,undefined);
    else{
     assert.ok(out);assert.ok(out.amount>=0&&out.amount<=10*(1+group.totalValue)+1e-9);
     assert.equal(out.owned,!!effect.durationMs&&effect.durationMs>0);
     ally.shield+=out.amount;
     if(out.owned){
      const expiry=100+effect.durationMs!;
      assert.equal(runtime.tickLifecycle(expiry-1).expired.length,0);
      const due=runtime.tickLifecycle(expiry);
      assert.equal(due.expired.length,1);
      assert.equal(due.expiryHeals.length,group.resonance>=2?1:0);
     }else assert.equal(runtime.tickLifecycle(30000).expired.length,0);
    }
   }
   if(group?.familyId==='effect_mercy'&&heal){
    runtime.beginAction(100,owner,heal.id);
    assert.equal(runtime.afterHeal(100,owner,ally,'V2_GENERATED',100,0).mercy,0);
    const out=runtime.afterHeal(100,owner,ally,heal.id,100,0);
    const expected=Math.min(100*group.totalValue,ally.definition.stats.maxHp*(group.resonance>=2?.04:.03));
    assert.ok(Math.abs(out.mercy-expected)<1e-9);ally.shield+=out.mercy;
    const absorbed=runtime.absorbOwned(101,ally,out.mercy/2);ally.shield-=absorbed;
    assert.ok(Math.abs(absorbed-out.mercy/2)<1e-9);
    const due=runtime.tickLifecycle(100+(group.resonance===3?10000:8000));
    assert.equal(due.expired.length,1);assert.equal(due.expiryHeals.length,0);
   }
   if(group?.familyId==='effect_renewal'&&heal){
    runtime.beginAction(100,owner,heal.id);
    assert.equal(runtime.afterHeal(100,owner,ally,heal.id,100,0).renewal,0);
    const out=runtime.afterHeal(100,owner,ally,heal.id,100,50);
    const expected=50*group.totalValue*(group.resonance>=2?1.2:1);
    assert.ok(Math.abs(out.renewal-expected)<1e-9);
    assert.equal(runtime.tickLifecycle(2099).renewalHeals.length,0);
    const due=runtime.tickLifecycle(6100).renewalHeals;
    assert.equal(due.length,group.resonance>=2?3:2);
    assert.ok(Math.abs(due.reduce((n,x)=>n+x.amount,0)-expected)<1e-9);
    assert.equal(runtime.tickLifecycle(6100).renewalHeals.length,0);
   }
   if(group?.familyId==='effect_benediction'&&(heal||shield)){
    const ability=(heal??shield)!,kind=heal?'heal':'shield';
    runtime.beginAction(100,owner,ability.id);
    assert.equal(runtime.supportMultiplier(100,owner,ally,ability.id,kind),1);
    runtime.markSupportOutput(100,owner,ally,ability.id,kind,10);
    const first=runtime.finishAction(100,owner,ability.id)!;
    assert.equal(first.consumed,false);assert.equal(first.granted,true);
    runtime.beginAction(200,owner,ability.id);
    assert.equal(runtime.supportMultiplier(200,owner,ally,ability.id,kind),1+group.totalValue);
    runtime.markSupportOutput(200,owner,ally,ability.id,kind,10);
    runtime.markSupportOutput(200,owner,owner,ability.id,kind,10);
    const second=runtime.finishAction(200,owner,ability.id)!;
    assert.equal(second.consumed,true);assert.equal(second.charges,1);
    assert.equal(runtime.finishAction(200,owner,ability.id),undefined);
    assert.equal(runtime.haste(201,owner).find(x=>x.familyId==='effect_benediction')?.fraction??0,group.resonance===3?.02:0);
   }
   if(group?.familyId==='effect_shared_resolve'){
    const ability=owner.definition.abilities.find(a=>a.id.includes(':v2:')&&a.effects.some(e=>e.kind==='shield'||e.kind==='buff'));
    if(ability){
     const kind=ability.effects.some(e=>e.kind==='shield')?'shield':'buff';
     runtime.beginAction(100,owner,ability.id);
     assert.equal(runtime.onAllySupport(100,owner,owner,ability.id,kind,10),undefined);
     assert.equal(runtime.onAllySupport(100,owner,ally,ability.id,kind,10)?.stacks,1);
     assert.equal(runtime.onAllySupport(100,owner,ally,ability.id,kind,10),undefined);
     if(heal||shield){
      const next=(heal??shield)!,output=heal?'heal':'shield';
      runtime.finishAction(100,owner,ability.id);
      runtime.beginAction(200,owner,next.id);
      assert.equal(runtime.supportMultiplier(200,owner,ally,next.id,output),1+group.totalValue);
     }
    }
   }
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
  const extensions=after.events.filter(e=>e.detail?.startsWith('private_qa_opportunist_extension:'));
  assert.ok(!before.events.some(e=>e.detail?.startsWith('private_qa_opportunist_extension:')));
  assert.ok(extensions.every(e=>e.type==='gem_state'&&e.actorId===actor.id&&e.statusKind==='debuff'&&!!e.statusTag&&e.amount===1000&&(e.expiresAtMs??0)>e.atMs));
  if(extensions.length)assert.equal(p.effectResonanceReview?.families.find(g=>g.familyId==='effect_opportunist')?.resonance,3);
  const defenseEvents=after.events.filter(e=>e.detail?.startsWith('private_qa_defense_'));
   const defenseEarned=defenseEvents.filter(e=>e.detail?.startsWith('private_qa_defense_earned:'));
   assert.ok(!before.events.some(e=>e.detail?.startsWith('private_qa_defense_')));
   for(const event of defenseEvents){
    const group=p.effectResonanceReview?.families.find(g=>g.familyId===event.detail!.split(':')[1]);
    assert.ok(group&&event.type==='gem_state'&&event.amount!==undefined&&event.amount>0&&event.amount<=group.peak.candidate+1e-9);
    if(event.detail?.startsWith('private_qa_defense_earned:'))assert.ok((event.expiresAtMs??0)>event.atMs);
   }
   assert.ok(defenseEarned.filter(e=>e.detail==='private_qa_defense_earned:effect_last_stand').length<=1);
   const u=defenseEarned.filter(e=>e.detail==='private_qa_defense_earned:effect_unyielding');
   for(let i=1;i<u.length;i++)assert.ok(u[i].atMs-u[i-1].atMs>=750);
   const recoveryEvents=after.events.filter(e=>e.abilityId==='V2_QA_GEM_RETALIATION');
  const armed=after.events.filter(e=>e.detail==='private_qa_retaliation_armed');
  assert.ok(recoveryEvents.every(e=>e.actorId===actor.id&&e.targetId===actor.id&&e.type==='heal'&&e.detail==='private_qa_terminal_recovery'&&(e.amount??0)<=actor.stats.maxHp*.01+.011));
  for(let i=1;i<recoveryEvents.length;i++)assert.ok(recoveryEvents[i].atMs-recoveryEvents[i-1].atMs>=10000);
  for(let i=1;i<armed.length;i++)assert.ok(armed[i].atMs-armed[i-1].atMs>=8000);
  if(recoveryEvents.length)assert.equal(p.effectResonanceReview?.families.find(g=>g.familyId==='effect_retaliation')?.resonance,3);
  const supportEvents=after.events.filter(e=>e.detail?.startsWith('private_qa_support_'));
  const lifecycleEvents=after.events.filter(e=>e.detail?.startsWith('private_qa_lifecycle_'));
  assert.ok(!before.events.some(e=>e.detail?.startsWith('private_qa_support_')||e.detail?.startsWith('private_qa_lifecycle_')));
  for(const event of supportEvents){
   const parts=event.detail!.split(':'),g=p.effectResonanceReview?.families.find(x=>x.familyId===parts[1]);
   assert.ok(g&&event.actorId===actor.id&&event.type==='gem_state'&&Number(parts[2])>0);
   if(parts[0]==='private_qa_support_stack'){
    assert.ok(Number(parts[3])<= (g.resonance===3?3:2)&&Math.abs(event.amount!-Number(parts[3])*g.totalValue)<1e-9);
   }else{
    assert.ok(Number(parts[4])<=(g.resonance>=2?2:1)&&Math.abs(event.amount!-Number(parts[3])*g.totalValue)<1e-9);
   }
  }
  assert.equal(new Set(supportEvents.map(e=>e.detail!.split(':').slice(0,3).join(':'))).size,supportEvents.length);
  assert.ok(lifecycleEvents.every(e=>e.actorId===actor.id&&Number.isFinite(e.amount)&&e.amount!>0));
  const terminal=lifecycleEvents.filter(e=>e.detail==='private_qa_lifecycle_terminal');
  assert.ok(terminal.every(e=>e.type==='heal'&&['V2_QA_GEM_RENEWAL_TICK','V2_QA_GEM_AEGIS_EXPIRY'].includes(e.abilityId??'')));
  return {before:a,after:b,supportEvents:supportEvents.length,lifecycleEvents:lifecycleEvents.length,terminalHeals:terminal.length,triggerCount:triggers.length,stackTriggers:stackTriggers.length,armed:armed.length,recoveryEvents:recoveryEvents.length,extensions:extensions.length,defenseEarned:defenseEarned.length,defenseUses:defenseEvents.length-defenseEarned.length,
   hasteUses:triggers.filter(e=>e.detail?.startsWith('private_qa_haste_gem:')).length,
   maxStacks:Math.max(0,...stackTriggers.map(e=>Number(e.detail!.split(':')[3]))),
   maxFraction:Math.max(0,...triggers.map(e=>e.amount??0)),releaseEnabled:false as const};
 };
}
