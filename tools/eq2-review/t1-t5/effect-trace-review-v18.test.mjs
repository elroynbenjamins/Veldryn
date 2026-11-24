import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTrace,broadOpportunity} from './effect-trace-review-v18.mjs';
import {combatExperimentPlan} from './set-trait-cp-review-v17.mjs';
test('324 synthetic trace shapes produce 972 review rows, never effect-applied outcomes',()=>{
 const rows=combatExperimentPlan().filter(x=>x.gearVariant==='baseline').map(x=>({bossId:x.bossId,classId:x.classId,specIndex:x.specializationIndex,strategy:x.strategy,actorId:'QA',victory:false,durationMs:1000,events:[{type:'combat_start'},{type:'damage',actorId:'QA',targetId:'BOSS',amount:1}]}));
 const trace={scope:'QA_ORIGINAL_FORGE_BASELINE_TRACE_ONLY',effectApplied:false,rows};
 const s=compareTrace(trace);assert.equal(s.baselineEngineTraces,324);assert.equal(s.comparisonRows,972);assert.equal(s.shadowRows,648);assert.equal(s.executedCandidateCombatRuns,0);
 assert(s.rows.every(x=>x.candidateOutcome===null&&x.effectsApplied===0&&!x.mayApply));
 assert.throws(()=>compareTrace({...trace,effectApplied:true}));
 assert.throws(()=>compareTrace({...trace,rows:[...rows.slice(1),rows[1]]}));
 const r=broadOpportunity({id:'a',trigger:'direct_nontrue_hp_loss'},{actorId:'QA',events:[{type:'damage',targetId:'QA',amount:50}]});
 assert.equal(r.status,'POSSIBLE_NOT_PROVEN');assert.equal(r.qualifiedTriggers,null);
});
