import {createHash} from 'node:crypto';
import {conditionalCandidates} from './normalized-effect-review-v18.mjs';
const deny=Object.freeze({reviewOnly:true,mayApplyInEngine:false,mayMint:false,mayEquip:false,mayTrade:false,cpApproved:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_effect_compile_v19_'+x);};
const round=n=>Math.round(n*1e6)/1e6;
// Channel semantics explicit. A source-defined next-event output is not a
// delayed flat damage proc; it must be applied during the next eligible event.
const damage=['next_direct_spell_damage','next_basic_damage','direct_hit_damage','next_direct_weapon_damage','next_direct_physical_ability_damage','next_direct_class_ability_damage','next_basic_chained_scourge_damage','direct_damage_bonus'];
const mitigation=['incoming_nontrue_reduction','next_direct_nontrue_reduction','periodic_nontrue_reduction'];
const heal=['next_effective_heal_on_same_ally','effective_heal_bonus'];
const stats=['defense_pct','tenacity_pp','haste_pp','healing_received_pct','accuracy_pp'];
const requiredUnit=ch=>ch.endsWith('_pp')?'percentage_points':'relative_percent';
function compileOutput(o,phase,c){
 let op,unit;
 if(damage.includes(o.channel)){op='damage_multiplier';unit='relative_percent';}
 else if(mitigation.includes(o.channel)){op='incoming_nontrue_reduction';unit='relative_percent';}
 else if(heal.includes(o.channel)){op='healing_multiplier';unit='relative_percent';}
 else if(stats.includes(o.channel)){op='temporary_stat';unit=requiredUnit(o.channel);}
 else if(o.channel==='shield'){op='shield';unit='percent_target_max_hp';}
 else if(['self_heal','direct_heal','next_basic_hit_self_heal'].includes(o.channel)){op='secondary_heal';unit='percent_target_max_hp';}
 else if(o.channel==='nonrecursive_reflect_of_actual_hp_loss'){op='nonrecursive_reflect';unit='percent_trigger_hp_loss';}
 else if(o.channel==='one_use_direct_damage_or_heal_bonus'){op='branch_multiplier';unit='relative_percent';}
 else if(o.channel==='cooldown_refund'){op='cooldown_refund';unit='seconds';}
 else fail('unknown_channel:'+o.channel);
 if(unit!==o.unit||!Number.isFinite(o.value)||o.value<=0||!Number.isFinite(o.durationSeconds)||o.durationSeconds<0)fail('bad_output:'+c.id);
 if(!['self','enemy','healed_target','cleansed_target','buffed_target','attacker','event_target','trigger_target','trigger_ability'].includes(o.target))fail('target');
 let requiredPhase=phase;
 if(op==='shield'||op==='secondary_heal'||op==='nonrecursive_reflect'||op==='cooldown_refund')requiredPhase='after_confirmed_event';
 else if(op==='damage_multiplier'||op==='incoming_nontrue_reduction'||op==='healing_multiplier'||op==='branch_multiplier'||o.channel==='accuracy_pp'){
  requiredPhase=o.durationSeconds>0?'timed_state_before_event':'before_amount_resolution';
 }else if(op==='temporary_stat')requiredPhase='timed_state_before_event';
 return {op,sourceChannel:o.channel,unit,value:o.value,target:o.target,durationSeconds:o.durationSeconds,delivery:phase,requiredPhase,nonrecursive:true};
}
const candidates=conditionalCandidates();
const byId=new Map(candidates.map(c=>[c.id,c]));
export function compileEffect(id){
 const c=byId.get(id);if(!c)fail('unknown_id');
 const immediate=c.consumeOn?(c.chargeOutputs?c.outputs:[]):c.outputs;
 const charged=c.consumeOn?(c.chargeOutputs??c.outputs):[];
 const operations=[...immediate.map(o=>compileOutput(o,'trigger',c)),...charged.map(o=>compileOutput(o,'consume',c))];
 // V17 current-hit effects use the current hit modifier, not a second hit.
 const source=structuredClone(c);
 const evidence=['exact_owned_equipped_copy_or_qa_fixture','event_receipt','event_phase','actor_target_team','source_ability_and_origin','recursive_exclusion'];
 if(/hp_loss|mitigat|heavy_direct_hit|cross_below|shield_broken/.test(c.trigger))evidence.push('pre_post_hp_and_damage_school');
 if(/heal|cleanse/.test(c.trigger))evidence.push('effective_heal_or_removed_hostile_status');
 if(/evade/.test(c.trigger))evidence.push('verified_evade_cause');
 if(c.count||c.sameTarget)evidence.push('verified_sequence_and_target');
 if(c.requiredShieldEffect)evidence.push('exact_shield_origin_and_depletion');
 if(c.requiresEquippedShield)evidence.push('verified_equipped_shield_and_skill');
 if(c.minRemainingCooldownSeconds)evidence.push('authoritative_remaining_cooldown');
 return {id,sourceDigest:createHash('sha256').update(JSON.stringify(source)).digest('hex'),source,
  operations,evidence,blockedBy:['PRIVATE_ENGINE_TYPED_EVENT_ADAPTER','EFFECT_CUSTODY_POLICY','OWNER_EFFECT_APPROVAL'],...deny};
}
export function compileAll(){return candidates.map(c=>compileEffect(c.id));}
// Deterministic arithmetic of a single already-qualified QA event. This is
// intentionally NOT a raw-log classifier, encounter simulator or write path.
export function resolveQualifiedQaAmounts({baseAmount=0,targetMaxHp=0,actualHpLoss=0,missingHp=0,remainingCooldownSeconds=0,trueDamage=false,mode='damage',operations=[]}){
 if(!['damage','heal','none'].includes(mode)||[baseAmount,targetMaxHp,actualHpLoss,missingHp,remainingCooldownSeconds].some(n=>!Number.isFinite(n)||n<0))fail('amount');
 const vals=op=>operations.filter(x=>x.op===op).map(x=>x.value);
 if(operations.some(x=>!Number.isFinite(x.value)||x.value<0))fail('value');
 const branch=vals('branch_multiplier'),sum=xs=>xs.reduce((n,x)=>n+x,0),max=xs=>Math.max(0,...xs);
 const damagePct=mode==='damage'?Math.min(20,sum([...vals('damage_multiplier'),...branch])):0;
 const healPct=mode==='heal'?sum([...vals('healing_multiplier'),...branch]):0;
 const mitigationPct=mode==='damage'&&!trueDamage?Math.min(15,max(vals('incoming_nontrue_reduction'))):0;
 const scaledAmount=mode==='damage'?baseAmount*(1+damagePct/100)*(1-mitigationPct/100):mode==='heal'?Math.min(missingHp,baseAmount*(1+healPct/100)):0;
 const shield=targetMaxHp*max(vals('shield'))/100;
 const secondaryHeal=Math.min(missingHp,targetMaxHp*sum(vals('secondary_heal'))/100);
 const reflect=trueDamage?0:actualHpLoss*sum(vals('nonrecursive_reflect'))/100;
 const refund=Math.min(.5,remainingCooldownSeconds,max(vals('cooldown_refund')));
 return {scaledAmount:round(scaledAmount),damagePct,healPct,mitigationPct,shield:round(shield),secondaryHeal:round(secondaryHeal),reflect:round(reflect),refund:round(refund),
  timedStateUnapplied:operations.filter(x=>x.op==='temporary_stat'||x.durationSeconds>0).map(x=>x.sourceChannel),qualifiedQaOnly:true,...deny};
}
export function summary(){
 const rows=compileAll(),operations=rows.flatMap(x=>x.operations);
 return {conditionalDefinitions:rows.length,operations:operations.length,operationKinds:[...new Set(operations.map(x=>x.op))].sort(),engineAdapterReady:false,conditionalEngineRuns:0,...deny};
}
