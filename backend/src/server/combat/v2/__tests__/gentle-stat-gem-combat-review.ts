/** PRIVATE TEST ONLY. First executable stat-gem sensitivity pass.
 * Do not import from gameplay routes, engine or release adapters.
 * Potent authored-output sensitivity is explicit opt-in; no effect-gem execution. */
import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatInput,CombatResult} from '../../types';
import {simulateCombat} from '../../engine';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {prepareSoloEnemyKitsV2,verifyPersistedEnemyKitsV2} from '../enemy-kit-composer';
import {issueEnemyV2EngineAuthority} from '../enemy-engine-authority';
import type {compileRealFrozenForgeActorV2} from '../equipment-frozen-forge-bridge';
import type {reviewFrozenForgeSocketsV2} from '../frozen-forge-socket-review';
import {inspectSocketStackingCapReviewV2,SOCKET_CAP_GENTLE_V2} from '../socket-stacking-cap-review';
import {reviewUtilityGemSemanticsV2} from '../socket-utility-gem-review';
import {reviewPotentAuthoredActorV2,assertPotentOutputBoundaryReviewV2} from './potent-authored-output-combat-review';
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
type Compiled=ReturnType<typeof compileRealFrozenForgeActorV2>;
const round=(x:number)=>Math.round(x*1e5)/1e5;
export function gentleStatGemActorReviewV2(compiled:Compiled,p:Projection,allowPotent=false):CombatantDefinition{
 assert.deepEqual(p.forgeEvidence,compiled.evidence);
 assert.equal(p.canExecuteCombat,false);assert.equal(p.releaseEnabled,false);
 assert.equal(p.cpApproved,false);
 assert.equal(p.deferredEffectSources.length,0,'effect gems not allowed in static pass');
 assert.ok(allowPotent||p.gemSources.every(g=>g.stat!=='potency'),'Potent requires explicit authored-output sensitivity policy');
 const report=inspectSocketStackingCapReviewV2(p,SOCKET_CAP_GENTLE_V2);
 const utility=reviewUtilityGemSemanticsV2(p);
 const actor=structuredClone(compiled.actor),meta=actor.combatV2,gear=meta?.equipmentEffects;
 if(!meta||!gear)throw Error('gentle_stat_gem_review_compiled_actor_required');
 const base=p.forgeEvidence.stages.afterFrozenBase;
 const value=(key:string)=>{const channel=report.channels.find(c=>c.key===key);if(!channel)throw Error('missing_gentle_lane');return channel.effective;};
 // Start from pre-affix base for compatible lanes, not compounded totals.
 // Savage remains additive to the already Forge-scaled crit multiplier;
 // Swift uses the explicit additive shared gear/gem candidate.
 actor.stats.attackPower=round(base.attackPower*(1+value('power:percent')));
 actor.stats.maxHp=round(base.maxHp*(1+value('maxHp:percent')));
 actor.stats.defense=round(base.defense*(1+value('armor:percent')));
 actor.stats.critChance=round(base.critChance+value('critRate:percentage_point'));
 actor.stats.critMultiplier=round(compiled.actor.stats.critMultiplier+value('critDamage:percent'));
 actor.stats.haste=round(utility.haste.projectedHaste);
 actor.combatV2={...meta,equipmentEffects:{...gear,
  wardPp:round(value('ward:percent')),accuracyPp:round(value('accuracy:percentage_point')),
  penetrationPp:round(value('penetration:percentage_point')),evasionPp:round(value('evasion:percentage_point'))}};
 assert.ok(Object.values(actor.stats).every(x=>Number.isFinite(x)&&x>=0));
 assert.equal(actor.combatV2.equipmentEffects?.tenacityPp,gear.tenacityPp);
 assert.equal(actor.combatV2.equipmentEffects?.abilityDamagePct,gear.abilityDamagePct);
 assert.deepEqual(actor.abilities,compiled.actor.abilities);
 assert.ok(!actor.effectGems?.length);
 return actor;
}
function metrics(result:CombatResult){
 const p=result.players[0];
 return {victory:result.victory,reason:result.reason,durationMs:result.durationMs,
  damage:p.damageDone,healing:p.healingDone,damageTaken:p.damageTaken,remainingHp:p.hp,maxHp:p.definition.stats.maxHp,
  interrupts:p.interrupts,casts:result.events.filter(e=>e.actorId===p.definition.id&&e.type==='cast_start').length,
  basics:result.events.filter(e=>e.actorId===p.definition.id&&e.type==='damage'&&e.abilityId==='BASIC').length};
}
export function createGentleStatCombatReviewV2(compiled:Compiled,p:Projection,enemy:CombatantDefinition,seed:string,allowPotent=false){
 const baseActor=gentleStatGemActorReviewV2(compiled,p,allowPotent);
 const baseline=allowPotent?reviewPotentAuthoredActorV2(baseActor,p).actor:baseActor;
 const snapshot=JSON.stringify(compiled);
 const proposal=prepareSoloEnemyKitsV2([enemy],{ruleset:ENEMY_V2_RULESET,region:'frostmarch',
  equipmentTier:4,encounterId:'QA_GENTLE_GEM_'+seed,serverSeed:seed});
 const persisted={...proposal,source:'server-persisted-v2' as const,revision:6};
 const verified=verifyPersistedEnemyKitsV2([enemy],persisted);
 const scope={source:'server-persisted-v2' as const,version:2 as const,ruleset:persisted.ruleset,
  mode:'solo' as const,encounterId:persisted.encounterId,revision:persisted.revision,seed:persisted.seed,
  playerIds:[baseline.id],enemyIds:persisted.enemyIds,bossIds:persisted.bossIds};
 const run=(actor:CombatantDefinition)=>{
  const input:CombatInput={seed,players:[actor],enemies:[...verified.enemies],maxDurationMs:15000};
  // Mock storage verifier limited to this unit test, never a production token.
  return simulateCombat(input,issueEnemyV2EngineAuthority(scope,input,(_s,d)=>/^[a-f0-9]{64}$/.test(d)));
 };
 const before=run(baseline);
 assert.deepEqual(run(baseline),before);
 return (candidate:Projection)=>{
  const staticActor=gentleStatGemActorReviewV2(compiled,candidate,allowPotent);
  const potency=allowPotent?reviewPotentAuthoredActorV2(staticActor,candidate):null;
  const actor=potency?.actor??staticActor;
  const boundaryCases=allowPotent?assertPotentOutputBoundaryReviewV2(staticActor,candidate):0;
  const after=run(actor);
  assert.deepEqual(run(actor),after,'deterministic private combat replay');
  assert.equal(JSON.stringify(compiled),snapshot,'no source actor mutation');
  assert.deepEqual(run(baseline),before,'baseline unchanged by gem candidate');
  assert.ok(after.events.every(e=>e.amount===undefined||Number.isFinite(e.amount)));
  const outputTotals=(fight:CombatResult)=>Object.fromEntries(['damage','dot_tick','heal','hot_tick','shield'].map(kind=>[kind,
   fight.events.filter(e=>e.actorId===actor.id&&e.type===kind&&actor.abilities.some(a=>a.id===e.abilityId))
    .reduce((n,e)=>n+(e.amount??0),0)]));
  return {baseline:metrics(before),candidate:metrics(after),statGemCopies:candidate.gemSources.length,
   authoredOutputs:{baseline:outputTotals(before),candidate:outputTotals(after)},potentRows:potency?.rows??[],boundaryCases,
   canGrantRewards:false as const,releaseEnabled:false as const};
 };
}
