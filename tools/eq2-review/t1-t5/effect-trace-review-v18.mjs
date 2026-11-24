// Read-only baseline engine trace opportunity audit. Never mutates CombatInput,
// never reconstructs missing event semantics, and never applies a candidate.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {conditionalCandidates} from './normalized-effect-review-v18.mjs';
const deny={reviewOnly:true,mayApply:false,mayMint:false,mayTrade:false,cpApproved:false,releaseApproved:false};
const fail=x=>{throw Error('eq2_trace_v18_'+x);};
const regions={
 BOSS_EXP_ROOT:['rootbound_t2','heartward','thornstrider','lifebloom'],
 BOSS_EXP_BELL:['rootbound_t2','heartward','thornstrider','lifebloom'],
 BOSS_EXP_SOLAR:['observatory_t4','helioguard','sphinxclaw','mirageveil'],
 BOSS_EXP_SPHINX:['observatory_t4','helioguard','sphinxclaw','mirageveil'],
 BOSS_EXP_BELLBEAST:['shiverlake_t5','rimevanguard','cantorshard','frosthym'],
 BOSS_EXP_CANTOR:['shiverlake_t5','rimevanguard','cantorshard','frosthym']
};
const roles={IRONWARDEN:1,BASTION:1,DREADGUARD:1,WAYFINDER:2,RAVAGER:2,HEXWEAVER:2,KNIFE_DANCER:2,DAWNKEEPER:3,STONECALLER:3};
export function broadOpportunity(effect,row){
 const t=effect.trigger,events=row.events,actor=row.actorId;
 // Raw event fields do not prove damage school, hit/evade cause, threshold
 // crossing, exact authored ability or effective healing scope.
 let hints=null;
 if(t.includes('heal')||t.includes('cleanse')){
  hints=events.filter(e=>e.actorId===actor&&((t.includes('heal')&&e.type==='heal'&&e.amount>0)||(t.includes('cleanse')&&e.type==='status_remove'))).length;
 }else if(t.includes('evade'))hints=events.filter(e=>e.targetId===actor&&e.type==='miss').length;
 else if(t.includes('hp_loss')||t.includes('mitigated')||t.includes('cross_below'))hints=events.filter(e=>e.targetId===actor&&e.type==='damage'&&e.amount>0).length;
 else if(t.includes('hit')||t.includes('bash'))hints=events.filter(e=>e.actorId===actor&&e.type==='damage'&&e.amount>0).length;
 return {effectId:effect.id,hintCount:hints,status:hints===null?'RAW_EVENT_SCHEMA_INSUFFICIENT':hints>0?'POSSIBLE_NOT_PROVEN':'NO_BROAD_HINT_OBSERVED',qualifiedTriggers:null,applied:0,...deny};
}
export function compareTrace(trace){
 if(trace.scope!=='QA_ORIGINAL_FORGE_BASELINE_TRACE_ONLY'||trace.effectApplied!==false||!Array.isArray(trace.rows)||trace.rows.length!==324)fail('scope');
 const ids=new Set(),effects=conditionalCandidates(),rows=[];
 for(const r of trace.rows){
  const region=regions[r.bossId],role=roles[r.classId],key=[r.bossId,r.classId,r.specIndex,r.strategy].join(':');
  if(!region||!role||![0,1].includes(r.specIndex)||!['generic','targeted','alternative'].includes(r.strategy)||ids.has(key)||!Array.isArray(r.events)||!r.events.some(x=>x.type==='combat_start'))fail('trace_identity');
  ids.add(key);
  const set=effects.filter(x=>x.id==='eq2_dungeon_'+region[0]+'_'+region[role]+':4');
  const trait=effects.filter(x=>x.id==='EQ2_DUNGEON_'+region[0].toUpperCase()+'_WEAPON_'+r.classId);
  if(set.length!==1||trait.length!==1)fail('effect_identity');
  for(const [variant,list] of [['baseline',[]],['set_candidate',set],['trait_candidate',trait]])rows.push({key,variant,baselineVictory:r.victory,baselineDurationMs:r.durationMs,
    opportunities:list.map(x=>broadOpportunity(x,r)),candidateOutcome:null,effectsApplied:0,...deny});
 }
 return {baselineEngineTraces:ids.size,comparisonRows:rows.length,shadowRows:rows.filter(x=>x.variant!=='baseline').length,
  hintRows:rows.filter(x=>x.opportunities.some(y=>y.hintCount>0)).length,unresolvedRows:rows.filter(x=>x.opportunities.some(y=>y.hintCount===null)).length,
  executedCandidateCombatRuns:0,rows,...deny};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url&&process.argv[2]){
 const r=compareTrace(JSON.parse(readFileSync(process.argv[2],'utf8')));
 const {rows,...summary}=r;
 console.log('EQ2_V18_TRACE '+JSON.stringify(summary));
}
