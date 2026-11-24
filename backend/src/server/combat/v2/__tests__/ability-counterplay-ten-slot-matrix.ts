/**
 * Skills/Abilities × Equipment 2.0 — 324 FULL TEN SLOT encounters.
 *
 * SYNTHETIC equipment source policies and TEST-ONLY persistence verifier.
 * Neither these results nor their diagnostic CP index approve release balance,
 * authorizes items, production persistence, rewards or market circulation.
 */
import {strict as assert} from 'node:assert';
import type {CombatEvent,CombatStats,AbilityDefinition,CombatantDefinition,CombatInput} from '../../types';
import {simulateCombat} from '../../engine';
import {launchPlayer} from '../../content/launch-combat';
import {reviewCandidatePowerV1,type CandidatePowerReferenceV1} from '../candidate-power-review';
import {issueEnemyV2EngineAuthority} from '../enemy-engine-authority';
import {reviewCompanionContributionV2} from '../companion-contribution-review';
import {CLASS_NAMES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import type {ClassIdV2} from '../build-contract';
import {selectReviewSkillLoadoutV2,
 type ReviewCounterRouteV2} from '../ability-counterplay-strategies';
import {reviewAbilityCounterplayV2,
 type AbilityCounterplaySampleV2} from '../ability-counterplay-review';
import {reviewObservedCounterOpportunityV2,
 type ObservedCounterAttemptV2} from '../ability-counterplay-opportunity-review';
import {simulateUnifiedEquipmentCombatV2} from '../unified-equipment-encounter';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';
import {observeRoleCalibrationV2} from '../role-power-calibration-review';
import {CLASS_ROLES_V2} from '../build-contract';

const scenarios:AbilityCounterplaySampleV2[]=[];
const opportunities:ObservedCounterAttemptV2[]=[];
const strategies=['generic','targeted','alternative'] as const;
const evidenceByScenario=new Map<string,string>();
let runs=0,gearTraitTriggers=0,nonbaselineLoadouts=0,confirmedActiveCasts=0;
let bossOpportunityEvents=0;
const traitSensitivity:unknown[]=[];
const candidatePowerRows:unknown[]=[];
const candidateReference:CandidatePowerReferenceV1={version:'QA_L25_LAUNCH_REFERENCE_V1',anchor:1000,enemyAccuracy:1600,enemyEvasion:100,accuracyScale:1400,mitigationConstant:1200,roles:{tank:launchPlayer('Ironwarden',25).stats,damage:launchPlayer('Ravager',25).stats,support:launchPlayer('Dawnkeeper',25).stats}};
const companionSensitivity:unknown[]=[];
const companionIds=['UNIT_001','UNIT_002','UNIT_003','UNIT_005'] as const;
const number=(n:number)=>Math.round(n*100)/100;
function fraction(hp:number,maxHp:number){
 return number(Math.max(0,Math.min(100,(hp/maxHp)*100)));
}
function seedCode(seed:string){
 let n=0;
 for(const c of seed)n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;
 return n;
}
function selectedSkillEffect(ability:AbilityDefinition,route:ReviewCounterRouteV2){
 switch(route){
  case 'control':
   return ability.target==='interruptible_casting_enemy'||
    ability.effects.some(e=>e.kind==='interrupt');
  case 'cleanse':
   return ability.effects.some(e=>e.kind==='cleanse');
  case 'sustain':
   return ability.effects.some(e=>['shield','heal','hot'].includes(e.kind));
  case 'pressure':
   return ability.effects.some(e=>['damage','dot','debuff'].includes(e.kind));
 }
}
const selectedEvent=(e:CombatEvent,actorId:string,selectedIds:ReadonlySet<string>)=>
 e.actorId===actorId&&selectedIds.has(e.abilityId??'');

for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const specIndex of [0,1] as const){
  for(const boss of bosses){
   // This fixture contains one server-owned, immutable set of ten equipped
   // copies; reuse it for all three variants to actually hold gear constant.
   const x=setup(classId,specIndex,boss,profiles[1]);
   const spec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
   const scenarioId=classId+'|'+specIndex+'|'+boss.id;
   const original=JSON.stringify({
    input:x.input,instances:x.runtime.instancesById,affixes:x.runtime.affixesByInstanceId,
    receipts:x.receipts,
   });
   const input={...x.input,maxDurationMs:35000};
   for(const strategy of strategies){
    const choice=selectReviewSkillLoadoutV2(classId,spec.id,x.actor,boss.id,strategy);
    const build={...x.build,selected:{
     ...x.build.selected,activeSkills:choice.activeSkills,
    }};
    const first=simulateUnifiedEquipmentCombatV2(
     input,[build],[x.runtime],true,x.trustedKit,x.signedPort);
    const repeat=simulateUnifiedEquipmentCombatV2(
     input,[build],[x.runtime],true,x.trustedKit,x.signedPort);
    assert.deepEqual(repeat,first,'Deterministic full-ten-slot combat replay '+scenarioId+strategy);
    assert.equal(JSON.stringify({
     input:x.input,instances:x.runtime.instancesById,affixes:x.runtime.affixesByInstanceId,
     receipts:x.receipts,
    }),original,'Never mutate original item, Forge-like receipt, or combat input');
    const proof=JSON.stringify(first.equipmentEvidence);
    const earlier=evidenceByScenario.get(scenarioId);
    if(earlier===undefined)evidenceByScenario.set(scenarioId,proof);
    else assert.equal(proof,earlier,
     'Changing only class skills must not change signed gear or computed stats');
    assert.equal(first.equipmentEvidence.length,1);
    assert.equal(first.equipmentEvidence[0].baseSources.length,10);
    assert.equal(first.equipmentEvidence[0].setEffects.length,3);
    assert.equal(first.equipmentEvidence[0].affixSources.length,9);
    assert.equal(first.combat.players[0].definition.combatV2?.version,2);
    assert.ok(first.enemyMechanicLabels.length>0);
    assert.ok(first.combat.events.length<10000,'Unbounded proc recursion');
    const player=first.combat.players[0],enemy=first.combat.enemies[0];
    const actorId=x.actor.id,enemyId=boss.id;
    const events=first.combat.events;
    const selectedIds=new Set(player.definition.abilities.map(a=>a.id));
    const routeAbilities=new Set(player.definition.abilities.filter(a=>
     selectedSkillEffect(a,choice.route)).map(a=>a.id));
    const targetedCast=(e:CombatEvent)=>e.type==='cast_complete'&&
     selectedEvent(e,actorId,routeAbilities);
    const attributed=(e:CombatEvent)=>selectedEvent(e,actorId,selectedIds);
    const interrupts=events.filter(e=>e.type==='interrupt'&&e.actorId===actorId).length;
    const cleanses=events.filter(e=>e.type==='status_remove'&&
     e.actorId===actorId&&(e.statusKind==='dot'||e.statusKind==='debuff')).length;
    const mitigations=events.filter(e=>
     (e.type==='shield'&&e.actorId===actorId)||
     (e.type==='damage'&&e.targetId===actorId&&(e.absorbed??0)>0)).length;
    const completed=events.filter(targetedCast).length;
    // Timed skills emit cast_complete, but castTimeMs=0 skills execute
    // directly and can emit only an effect event. Do not misclassify those
    // as 'never cast' when the trace cannot prove attempted use.
    const instantMatchingSkillCount=player.definition.abilities.filter(a=>
     routeAbilities.has(a.id)&&a.castTimeMs===0).length;
    confirmedActiveCasts+=completed;
    const observedCounters=events.filter(e=>attributed(e)&&(
     choice.route==='control'?e.type==='interrupt':
     choice.route==='cleanse'?e.type==='status_remove'&&
      (e.statusKind==='dot'||e.statusKind==='debuff'):
     choice.route==='sustain'?e.type==='shield'||e.type==='heal'||e.type==='hot_tick':
     e.type==='damage'||e.type==='dot_tick'||e.type==='status_apply'
    )).length;
    const interruptsAvailable=new Set(enemy.definition.abilities.filter(a=>a.interruptible)
     .map(a=>a.id));
    const exposure=events.filter(e=>
     choice.route==='control'?
      e.type==='cast_start'&&e.actorId===enemyId&&
       interruptsAvailable.has(e.abilityId??''):
     choice.route==='cleanse'?
      e.type==='status_apply'&&e.actorId===enemyId&&e.targetId===actorId&&
       (e.statusKind==='debuff'||e.statusKind==='dot'):
     choice.route==='sustain'?
      e.type==='damage'&&e.targetId===actorId&&e.actorId===enemyId:
     e.type==='combat_start'&&enemy.definition.stats.maxHp>0).length;
    bossOpportunityEvents+=exposure;
    if(strategy==='generic'){
     // Exact same compiled gear, authored kit, seed and skill variants.
     // Only the signed trait/three new affix sidecar authority is omitted.
     // This measures their combined marginal effect, not a per-trait price.
     const without=simulateUnifiedEquipmentCombatV2(
      input,[build],[x.runtime],true,x.trustedKit);
     assert.deepEqual(without.equipmentEvidence,first.equipmentEvidence);
     assert.deepEqual(without.combat.players.map(p=>p.definition.stats),
      first.combat.players.map(p=>p.definition.stats));
     assert.deepEqual(without.combat.enemies.map(e=>e.definition),
      first.combat.enemies.map(e=>e.definition));
     assert.ok(!without.combat.events.some(e=>e.type==='equipment_trait_trigger'));
     const identity={caseId:scenarioId,bossId:boss.id,classId,
      specializationId:spec.id,actorId};
     const off=observeRoleCalibrationV2(without.combat,identity);
     const on=observeRoleCalibrationV2(first.combat,identity);
     const stages=first.equipmentEvidence[0].statStages;
     const role=CLASS_ROLES_V2[classId];
     const baselinePower=reviewCandidatePowerV1(stages.afterSkills,role,candidateReference);
     const equippedPower=reviewCandidatePowerV1(stages.afterAffixes,role,candidateReference);
     assert.equal(equippedPower.cpApproved,false);
     candidatePowerRows.push({scenarioId,classId,specializationId:spec.id,bossId:boss.id,role,
      level:boss.level,baseline:baselinePower.partialScore,equipped:equippedPower.partialScore,
      axes:equippedPower.rows,observedSidecarOff:off.values,
      observedSidecarOn:on.values});

     // QA-only counterfactuals from the same fully compiled, sidecar-OFF
     // character and verified authored enemy definitions. Never issue a
     // companion effect authority to a public runtime.
     const owner=without.combat.players[0].definition;
     const snapshot=x.trustedKit.snapshot;
     const preparedEnemies=without.combat.enemies.map(e=>e.definition);
     const replay=(candidate:CombatantDefinition)=>{
      const replayInput:CombatInput={...input,players:[candidate],enemies:preparedEnemies};
      const authority=issueEnemyV2EngineAuthority({
       source:'server-persisted-v2',version:2,ruleset:snapshot.ruleset,mode:'solo',
       encounterId:snapshot.encounterId,revision:snapshot.revision,seed:snapshot.seed,
       playerIds:[owner.id],enemyIds:snapshot.enemyIds,bossIds:snapshot.bossIds,
      },replayInput,(_scope,digest)=>x.trustedKit.verifyPersisted(snapshot,digest));
      return simulateCombat(replayInput,authority);
     };
     assert.deepEqual(replay(owner),without.combat,'Companion calibration baseline must replay exactly');
     for(const companionId of companionIds){
      const projection=reviewCompanionContributionV2(owner,{
       accountId:x.signedPort.accountId,characterId:x.runtime.characterId,actorId:owner.id,
       revision:1,selectedCompanionId:companionId,ownedCompanionIds:[companionId],busyCompanionIds:[],
       progress:{companionId,level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false},
       verifyPersisted:(digest,rev)=>/^[a-f0-9]{64}$/.test(digest)&&rev===1,
      });
      assert.equal(projection.activeAssists.length,1);
      const stats={...owner.stats};
      for(const key of Object.keys(stats) as (keyof CombatStats)[])
       stats[key]+=projection.permanentStatDelta[key];
      const passiveOnly=replay({...owner,stats});
      const fullActor={...owner,stats,abilities:[...owner.abilities,...projection.activeAssists]};
      const full=replay(fullActor);
      assert.equal(full.players.length,1,'An assist must not create another player slot');
      assert.deepEqual(full.players[0].definition.stats,passiveOnly.players[0].definition.stats);
      const passive=observeRoleCalibrationV2(passiveOnly,identity),combined=observeRoleCalibrationV2(full,identity);
      companionSensitivity.push({scenarioId,classId,specializationId:spec.id,bossId:boss.id,
       companionId,off:off.values,passive:passive.values,full:combined.values,
       offVictory:off.victory,passiveVictory:passive.victory,fullVictory:combined.victory,
       offDowned:off.downed,fullDowned:combined.downed,
       assistEvents:full.events.filter(e=>e.abilityId===projection.activeAssists[0].id).length});
     }

     traitSensitivity.push({scenarioId,classId,role:CLASS_ROLES_V2[classId],
      specializationId:spec.id,bossId:boss.id,off:off.values,on:on.values,
      offVictory:off.victory,onVictory:on.victory,
      offDowned:off.downed,onDowned:on.downed,
      traitEvents:events.filter(e=>e.type==='equipment_trait_trigger').length});
    }
    const equivalentStat=first.equipmentEvidence[0].statStages.afterAffixes;
    const provisionalIndex=Math.max(1,Math.round(
     (Object.keys(equivalentStat) as (keyof CombatStats)[])
      .reduce((sum,key)=>sum+equivalentStat[key],0)));
    scenarios.push({
     scenarioId,classId,specializationId:spec.id,enemyId,seed:seedCode(input.seed),
     combatLevel:boss.level,combatPower:provisionalIndex,strategy,
     outcome:first.combat.reason==='victory'?'win':first.combat.reason,
     enemyHpRemainingPct:fraction(enemy.hp,enemy.definition.stats.maxHp),
     playerHpRemainingPct:fraction(player.hp,player.definition.stats.maxHp),
     damageDealt:player.damageDone,damageTaken:player.damageTaken,
     effectiveHealing:player.healingDone,interrupts,cleanses,
     mitigationEvents:mitigations,counterMechanicEvents:observedCounters,
    });
    if(strategy!=='generic')opportunities.push({
     scenarioId,classId,specializationId:spec.id,enemyId,strategy,
     route:choice.route,hasMatchingCounter:choice.hasMatchingCounter,
     observedOpportunityEvents:exposure,eligibleSkillCasts:completed,
     instantMatchingSkillCount,attributedCounterEvents:observedCounters,
    });
    if(strategy!=='generic'){
     const defaultChoice=selectReviewSkillLoadoutV2(classId,spec.id,x.actor,boss.id,'generic');
     if(JSON.stringify(defaultChoice.activeSkills)!==JSON.stringify(choice.activeSkills))
      nonbaselineLoadouts++;
    }
    gearTraitTriggers+=events.filter(e=>e.type==='equipment_trait_trigger').length;
    runs++;
   }
  }
 }
}
assert.equal(runs,324);
assert.equal(evidenceByScenario.size,108);
assert.equal(scenarios.length,324);
assert.equal(opportunities.length,216);
assert.ok(gearTraitTriggers>0,'At least one correctly verified EQ2 trait must trigger');
assert.ok(nonbaselineLoadouts>0,'Tactical selections must vary class skill variants');
assert.ok(bossOpportunityEvents>0,'Real bosses must present observable mechanics');
const counterplay=reviewAbilityCounterplayV2(scenarios);
const opportunity=reviewObservedCounterOpportunityV2(opportunities);
assert.equal(counterplay.comparisons.length,108);
assert.equal(opportunity.comparisons,108);
assert.equal(opportunity.rows.length,216);
assert.equal(counterplay.releaseApproved,false);
assert.equal(opportunity.releaseApproved,false);
assert.deepEqual(reviewAbilityCounterplayV2([...scenarios].reverse()),counterplay,
 'Counterplay outcomes must be independent of row order');
assert.deepEqual(reviewObservedCounterOpportunityV2([...opportunities].reverse()),opportunity,
 'Opportunity classifications must be independent of row order');
console.log('PASS: '+runs+' deterministic real Engine V2 ten-slot signed-trait skill counterplay runs; '+
 gearTraitTriggers+' gear trait events; '+confirmedActiveCasts+' eligible casts; '+
 bossOpportunityEvents+' boss opportunities; 108 compared class/spec/boss triplets');
console.log('FULL GEAR counterplay review flags (not final balance): '+JSON.stringify(
 counterplay.findings.reduce<Record<string,number>>((r,f)=>{
  r[f.type]=(r[f.type]??0)+1;return r;
 },{})));
console.log('FULL GEAR observed counterplay reasons: '+JSON.stringify(opportunity.counts));

assert.equal(traitSensitivity.length,108);
console.log('EXACT_COPY_TRAIT_AND_NEW_AFFIX_MARGINAL_REVIEW_NOT_CP '+JSON.stringify({
 pairs:traitSensitivity.length,rows:traitSensitivity,
 scope:'SOLO_SAME_BUILD_SIDE_CAR_OFF_ON_SYNTHETIC_GEAR',
 independentPerTraitWeight:false,companionWeightApproved:false,cpApproved:false,releaseEnabled:false,
}));

assert.equal(companionSensitivity.length,108*4);
console.log('COMPANION_PASSIVE_AND_ASSIST_MARGINAL_REVIEW_NOT_CP '+JSON.stringify({
 triplets:companionSensitivity.length,rows:companionSensitivity,
 scope:'SOLO_SAME_COMPILED_ACTOR_ENEMY_AND_SEED_SIDECAR_OFF',
 testedCompanionIds:companionIds,companionLevel:10,
 rosterComplete:false,partySupportCalibration:false,cpApproved:false,releaseEnabled:false,
}));

assert.equal(candidatePowerRows.length,108);
console.log('STATIC_ROLE_CANDIDATE_POWER_V1_NOT_FINAL_CP '+JSON.stringify({
 cases:candidatePowerRows.length,rows:candidatePowerRows,
 referenceVersion:candidateReference.version,scope:'SYNTHETIC_GEAR_CANDIDATE_NOT_EQUAL_CP',
 cpApproved:false,releaseEnabled:false,
}));
