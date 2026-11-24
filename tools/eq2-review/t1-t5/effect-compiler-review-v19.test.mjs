import test from 'node:test';
import assert from 'node:assert/strict';
import {compileEffect,compileAll,resolveQualifiedQaAmounts,summary} from './effect-compiler-review-v19.mjs';
import {summarizeSensitivity} from './permanent-sensitivity-review-v19.mjs';
import {combatExperimentPlan} from './set-trait-cp-review-v17.mjs';
import {contract} from './normalized-effect-review-v18.mjs';
test('142 exact effects compile to phase-bound QA intents, no engine or equip authority',()=>{
 const rows=compileAll();assert.equal(rows.length,142);assert.equal(new Set(rows.map(x=>x.id)).size,142);
 for(const x of rows){assert.match(x.sourceDigest,/^[0-9a-f]{64}$/);assert(x.operations.length>0);assert.equal(x.mayApplyInEngine,false);assert.equal(x.cpApproved,false);assert(x.blockedBy.includes('PRIVATE_ENGINE_TYPED_EVENT_ADAPTER'));}
 assert.throws(()=>compileEffect('FAKE'));assert.equal(summary().conditionalEngineRuns,0);
 const bell=compileEffect('eq2_dungeon_t5_shiverlake_bellwake:4');
 assert.deepEqual(bell.operations.map(x=>[x.op,x.delivery]),[['shield','trigger'],['branch_multiplier','consume']]);
 assert.equal(bell.operations[1].requiredPhase,'before_amount_resolution');
});
test('single-event arithmetic respects damage/mitigation caps, shields, refunds and Bellwake branch',()=>{
 const op=(op,value)=>({op,value,durationSeconds:0});
 const p=resolveQualifiedQaAmounts({baseAmount:100,targetMaxHp:1000,missingHp:20,remainingCooldownSeconds:5,operations:[op('damage_multiplier',18),op('branch_multiplier',5),op('incoming_nontrue_reduction',30),op('shield',3),op('shield',5),op('secondary_heal',3),op('cooldown_refund',1)]});
 assert.equal(p.scaledAmount,102);assert.equal(p.damagePct,20);assert.equal(p.mitigationPct,15);assert.equal(p.shield,50);assert.equal(p.secondaryHeal,20);assert.equal(p.refund,.5);
 const h=resolveQualifiedQaAmounts({mode:'heal',baseAmount:100,missingHp:200,operations:[op('branch_multiplier',5),op('damage_multiplier',18)]});
 assert.equal(h.scaledAmount,105);assert.equal(h.damagePct,0);
 assert.equal(resolveQualifiedQaAmounts({baseAmount:100,trueDamage:true,operations:[op('incoming_nontrue_reduction',15)]}).scaledAmount,100);
 assert.throws(()=>resolveQualifiedQaAmounts({baseAmount:-1}));
});
test('static counterfactual audit requires source-derived exact coefficient, separates wins from nonwins',()=>{
 const regions={BOSS_EXP_ROOT:['rootbound_t2','heartward','thornstrider','lifebloom'],BOSS_EXP_BELL:['rootbound_t2','heartward','thornstrider','lifebloom'],BOSS_EXP_SOLAR:['observatory_t4','helioguard','sphinxclaw','mirageveil'],BOSS_EXP_SPHINX:['observatory_t4','helioguard','sphinxclaw','mirageveil'],BOSS_EXP_BELLBEAST:['shiverlake_t5','rimevanguard','cantorshard','frosthym'],BOSS_EXP_CANTOR:['shiverlake_t5','rimevanguard','cantorshard','frosthym']};
 const roles={IRONWARDEN:1,BASTION:1,DREADGUARD:1,WAYFINDER:2,RAVAGER:2,HEXWEAVER:2,KNIFE_DANCER:2,DAWNKEEPER:3,STONECALLER:3};
 const rows=combatExperimentPlan().filter(x=>x.gearVariant==='baseline').map(x=>{
  const reg=regions[x.bossId],s=contract.sets.find(y=>y.setId==='eq2_dungeon_'+reg[0]+'_'+reg[roles[x.classId]]&&y.pieces===2).stats[0];
  return {bossId:x.bossId,classId:x.classId,specIndex:x.specializationIndex,strategy:x.strategy,channel:s.channel,pct:s.value,
   baseline:{victory:false,reason:'timeout',durationMs:35000,damage:100,healing:10,hp:10},candidate:{victory:true,reason:'victory',durationMs:30000,damage:110,healing:12,hp:12}};
 });
 const report={scope:'QA_ORIGINAL_SOURCE_STATIC_STAT_COUNTERFACTUAL',actualOwnedCandidateCopies:false,conditionalEffectsApplied:false,releaseApproved:false,rows};
 const s=summarizeSensitivity(report);assert.equal(s.cases,324);assert.equal(s.gainedWins,324);assert.equal(s.bothWinMeanTimeDeltaMs,null);assert.equal(s.conditionalEngineRuns,0);
 assert.throws(()=>summarizeSensitivity({...report,rows:[{...rows[0],pct:999},...rows.slice(1)]}));
});
