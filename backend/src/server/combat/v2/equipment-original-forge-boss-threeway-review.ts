/**
 * HIDDEN Veldryn 2.0 actual authored-boss tactical A/B/C audit.
 *
 * Read-only comparison of combat results ALREADY obtained from real original
 * Forge exact-copy and persisted Enemy 2.0 boss source bridges.
 * Holds item identity, frozen rarity/quality, source affixes, boss and seed
 * constant; changes only authored class skill selections. This is equality of
 * observed source input stats, NOT a released equal-CP balance certification.
 * This cannot grant loot, bonuses, Experience or market ownership.
 */
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import type {OriginalForgeAuthoredBossReviewV2}
 from './equipment-original-forge-authored-boss';
import type {ReviewSkillChoiceV2,ReviewSkillStrategyV2}
 from './ability-counterplay-strategies';

export interface OriginalForgeBossThreewayInputV2{
 readonly choice:ReviewSkillChoiceV2;
 readonly result:OriginalForgeAuthoredBossReviewV2;
}
export type OriginalForgeBossComparisonLabelV2=
 'targeted_observed_advantage'|'alternative_observed_advantage'|
 'generic_observed_advantage'|'no_measurable_differential';
export interface OriginalForgeBossThreewayMetricV2{
 readonly strategy:ReviewSkillStrategyV2;
 readonly route:string;
 readonly selectedSkillIdentities:readonly string[];
 readonly skillSelectionDiffersFromGeneric:boolean;
 readonly matchingCounterAvailable:boolean;
 readonly realCounterEffectEvents:number;
 readonly victory:boolean;
 readonly durationMs:number;
 readonly playerDamageDone:number;
 readonly playerDamageTaken:number;
 readonly playerHealingDone:number;
 readonly playerInterrupts:number;
 readonly playerFinalHp:number;
 readonly bossFinalHp:number;
 readonly bossMechanicEventCount:number;
}
export interface OriginalForgeBossThreewayReviewV2{
 readonly scope:'ORIGINAL_FORGE_AUTHORED_BOSS_EQUAL_SOURCE_INPUT_NOT_APPROVED_CP';
 readonly bossId:string;
 readonly playerId:string;
 readonly originalEquippedCopies:number;
 readonly frozenStatsIdentical:true;
 readonly originalForgeReceiptsPinnedToEachSelectedSkillBuild:true;
 readonly metrics:readonly OriginalForgeBossThreewayMetricV2[];
 readonly outcome:OriginalForgeBossComparisonLabelV2;
 readonly targetedCounterAvailable:boolean;
 readonly targetedCounterEffectObserved:boolean;
 readonly balancePassApproved:false;
 readonly sourceIsLiveAuthenticated:false;
 readonly canAuthorizeCombat:false;
 readonly canGrantRewards:false;
 readonly releaseApproved:false;
}
const fail=(reason:string):never=>{
 throw Error('eq2_original_boss_threeway_'+reason);
};
const comparable=(metric:OriginalForgeBossThreewayMetricV2)=>{
 // A win outranks a wipe, but timing vs timed-out damage is only
 // observational. No victory/timeout is silently transformed into DPS.
 return {
  victory:metric.victory?1:0,
  time:metric.victory?metric.durationMs:Number.MAX_SAFE_INTEGER,
  damage:metric.playerDamageDone,
 };
};
function outranks(a:OriginalForgeBossThreewayMetricV2,
 b:OriginalForgeBossThreewayMetricV2):boolean{
 const x=comparable(a),y=comparable(b);
 if(x.victory!==y.victory)return x.victory>y.victory;
 if(x.victory===1&&x.time!==y.time)return x.time<y.time;
 return x.damage>y.damage+1e-7;
}
/** Single actor, same boss, three genuine class Skills strategies. A test
 * stub does not make this live database/authenticator proof. */
export function reviewOriginalForgeBossThreeWayV2(
 cases:readonly OriginalForgeBossThreewayInputV2[],
):OriginalForgeBossThreewayReviewV2{
 if(!Array.isArray(cases)||cases.length!==3)fail('exactly_three_authored_strategies');
 const order:readonly ReviewSkillStrategyV2[]=['generic','targeted','alternative'];
 if(!cases.every((c,i)=>c?.choice?.strategy===order[i]&&
  c.result?.authenticBossProfile===true&&
  c.result.equipmentSource==='ORIGINAL_EQ2_MINT_AND_CUSTODY_TEST_LEDGER'&&
  c.result.grantAllowed===false&&c.result.marketTradeAllowed===false&&
  c.result.releaseApproved===false))
  fail('unknown_or_unauthorized_source');
 const first=cases[0].result;
 const baseline=first.equipmentEvidence;
 const originalStatic=enemyV2SnapshotDigest({
  actor:baseline.actorId,
  items:baseline.items,
  equippedInstanceIds:baseline.equippedInstanceIds,
  base:baseline.stages.afterFrozenBase,
  stats:baseline.stages.afterForgeAffixes,
  affixes:baseline.affixSources,
  setBonuses:baseline.setBonuses,
 });
 const playerId=baseline.actorId,player=first.combat.players[0];
 const boss=first.combat.enemies[0];
 if(!player||!boss||player.definition.id!==playerId||
  boss.definition.boss!==true||!first.bossMechanicLabels.length||
  baseline.items.length<1||baseline.items.length>10||
  baseline.setBonuses!=='BLOCKED_PENDING_EXACT_EQ2_SET_RECONCILIATION')
  fail('incomplete_original_boss_source');
 const bossId=boss.definition.id;
 const originalBoss=enemyV2SnapshotDigest(boss.definition);
 const originalStats=enemyV2SnapshotDigest(player.definition.stats);
 const buildByDigest=new Map<string,string>();
 const digestByBuild=new Map<string,string>();
 const metrics=cases.map(({choice,result})=>{
  const row=result.equipmentEvidence;
  const actor=result.combat.players[0],enemy=result.combat.enemies[0];
  if(!actor||!enemy||actor.definition.id!==playerId||
   enemy.definition.id!==bossId||
   enemyV2SnapshotDigest(enemy.definition)!==originalBoss||
   enemyV2SnapshotDigest(actor.definition.stats)!==originalStats||
   enemyV2SnapshotDigest({
    actor:row.actorId,items:row.items,
    equippedInstanceIds:row.equippedInstanceIds,
    base:row.stages.afterFrozenBase,
    stats:row.stages.afterForgeAffixes,
    affixes:row.affixSources,setBonuses:row.setBonuses,
   })!==originalStatic||
   row.receiptDigest.length!==64||
   !/^[0-9a-f]{64}$/.test(row.receiptDigest)||
   !result.bossMechanicLabels.length)
    fail('changed_gear_base_enemy_or_invalid_ledger_digest');
  const selection=JSON.stringify(choice.activeSkills);
  const priorBuild=buildByDigest.get(row.receiptDigest);
  if(priorBuild!==undefined&&priorBuild!==selection)
   fail('changed_skill_using_stale_receipt_digest');
  const priorDigest=digestByBuild.get(selection);
  if(priorDigest!==undefined&&priorDigest!==row.receiptDigest)
   fail('same_skill_changed_receipt_digest');
  buildByDigest.set(row.receiptDigest,selection);
  digestByBuild.set(selection,row.receiptDigest);
  const active=choice.activeSkills;
  const identities=active.map(x=>x.skillId+':'+x.variantId);
  const authoredIds=new Set(actor.definition.abilities.filter(x=>
   x.id.includes(':v2:')).map(x=>x.id));
  const effectEvents=result.combat.events.filter(e=>
   e.actorId===playerId&&Boolean(e.abilityId)&&
   authoredIds.has(e.abilityId!)&&
   ['damage','heal','shield','status_apply','interrupt','dot_tick','hot_tick']
    .includes(e.type)).length;
  const observedBossEvents=result.combat.events.filter(e=>
   e.actorId===bossId&&['cast_start','phase','status_apply','damage',
    'shield','dot_tick'].includes(e.type)).length;
  return {
   strategy:choice.strategy,route:choice.route,
   selectedSkillIdentities:identities,
   skillSelectionDiffersFromGeneric:JSON.stringify(active)!==
    JSON.stringify(cases[0].choice.activeSkills),
   matchingCounterAvailable:choice.hasMatchingCounter,
   realCounterEffectEvents:effectEvents,
   victory:result.combat.victory,
   durationMs:result.combat.durationMs,
   playerDamageDone:actor.damageDone,
   playerDamageTaken:actor.damageTaken,
   playerHealingDone:actor.healingDone,
   playerInterrupts:actor.interrupts,
   playerFinalHp:actor.hp,bossFinalHp:enemy.hp,
   bossMechanicEventCount:observedBossEvents,
  };
 });
 const [generic,targeted,alternative]=metrics;
 let best=generic;
 for(const row of [targeted,alternative])
  if(outranks(row,best))best=row;
 const isTie=metrics.some(row=>row!==best&&
  !outranks(best,row)&&!outranks(row,best));
 const outcome:OriginalForgeBossComparisonLabelV2=isTie?
  'no_measurable_differential':
  best.strategy==='targeted'?'targeted_observed_advantage':
  best.strategy==='alternative'?'alternative_observed_advantage':
  'generic_observed_advantage';
 return {
  scope:'ORIGINAL_FORGE_AUTHORED_BOSS_EQUAL_SOURCE_INPUT_NOT_APPROVED_CP',
  bossId,playerId,originalEquippedCopies:baseline.items.length,
  frozenStatsIdentical:true,
  originalForgeReceiptsPinnedToEachSelectedSkillBuild:true,
  metrics,outcome,
  targetedCounterAvailable:targeted.matchingCounterAvailable,
  targetedCounterEffectObserved:targeted.realCounterEffectEvents>0,
  balancePassApproved:false,sourceIsLiveAuthenticated:false,
  canAuthorizeCombat:false,canGrantRewards:false,releaseApproved:false,
 };
}
