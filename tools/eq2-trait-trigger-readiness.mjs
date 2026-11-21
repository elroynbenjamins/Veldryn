/**
 * REVIEW-ONLY event integration inventory, NOT a combat trait dispatcher.
 * Every required data field comes from server-frozen encounter receipts;
 * this file intentionally does not import or mount any gameplay handler.
 */
import {fileURLToPath} from 'node:url';
import {loadReviewContract} from './eq2-trait-event-model.mjs';
const EVENT_REQUIREMENTS={
 after_direct_damage_taken_alive:['original_enemy_direct','post_shield_hp_loss','survived_hit','server_time'],
 before_first_direct_damage_taken:['original_enemy_direct','pre_hit_hp','once_per_encounter','server_time'],
 after_direct_hit_evaded:['original_enemy_direct','hit_evasion_result','server_time'],
 after_elemental_direct_damage_taken_alive:['original_enemy_direct','damage_element','post_shield_hp_loss','survived_hit','server_time'],
 after_self_shield_created:['player_class_shield','actual_applied_shield','own_shield_cap','ally_target','server_time'],
 before_direct_damage_taken:['original_enemy_direct','pre_hit_damage','pre_hit_hp','server_time'],
 on_eligible_debuff_applied:['server_applied_status','ordinary_status_tag','boss_status_exemption','server_time'],
 after_direct_class_ability_critical_hit:['player_class_skill_direct','critical_hit_result','target_armor','boss_resistance','server_time'],
 after_basic_direct_critical_hit:['player_direct_basic','critical_hit_result','physical_bleed_source_cap','server_time'],
 after_direct_class_ability_hit:['player_class_skill_direct','actual_direct_damage','trusted_attack_power','server_time'],
 before_first_successful_direct_hit:['player_original_direct_hit','once_per_encounter','server_time'],
 after_eligible_direct_miss:['player_original_direct_hit','server_rolled_hit','server_time'],
 after_direct_ability_critical_hit:['player_class_skill_direct','critical_hit_result','server_time'],
 before_direct_damage_dealt:['player_original_direct_hit','target_pre_hit_hp','execute_source_cap','server_time'],
 after_elemental_direct_class_ability_hit:['player_class_skill_direct','damage_element','dot_refresh_cap','server_time'],
 before_every_third_basic_direct_hit:['player_direct_basic','consecutive_target_hit_counter','server_time'],
 after_direct_ally_heal:['player_direct_class_heal','effective_heal_excluding_overheal','ally_target','server_time'],
 after_ally_shield_created:['player_class_shield','shield_duration_and_cap','ally_target','server_time'],
 before_direct_ally_heal:['player_direct_class_heal','ally_pre_heal_hp','server_time'],
 after_ally_eligible_control_ends:['ordinary_ally_control_end','boss_status_exemption','server_time'],
 before_ally_shield_created:['player_class_shield','pre_shield_target','server_time'],
 out_of_combat_gather_action:['server_owned_gather_event','noncombat_status','best_copy_rule'],
};
const neverGenerated=['trait_secondary','effect_gem_secondary','reflected_damage','companion_damage','potion_damage','dot_tick'];
const requiredPolicy=['procCanTriggerProc','effectGemCanTriggerTrait','generatedDamageCannotLifestealOrCrit'];
export function analyzeTraitTriggerReadiness(contract=loadReviewContract()){
 const violations=[];
 if(contract?.releaseActivation!==false||contract?.status!=='REVIEW_ONLY_NOT_APPROVED')
  violations.push('not_review_only');
 const traits=contract.traits;
 if(!Array.isArray(traits)||traits.length!==28)return {violations:['not_28_traits'],entries:[],requirements:[]};
 const seen=new Set(),entries=[],totalFamilies=new Set(),features=new Set();
 for(const row of traits){
  if(seen.has(row.id))violations.push('duplicate_trait:'+row.id);
  seen.add(row.id);
  const requires=EVENT_REQUIREMENTS[row.trigger];
  if(!Array.isArray(requires)||!requires.length)violations.push('unmapped_trigger:'+row.id);
  if(row.role==='utility'){
   if(row.trigger!=='out_of_combat_gather_action'||row.source.length!==1||
     row.source[0]!=='world_boss_chest')violations.push('utility_combat_leak:'+row.id);
  }else if(row.trigger==='out_of_combat_gather_action'||row.source.includes('world_boss_chest')){
   violations.push('combat_trait_source_leak:'+row.id);
  }
  if(row.cooldownSeconds===0&&row.role!=='utility'&&!row.oncePerEncounter)
   violations.push('uncapped_proc:'+row.id);
  if(!row.params||Object.values(row.params).some(n=>!Number.isFinite(n)||n<0))
   violations.push('invalid_params:'+row.id);
  (requires??[]).forEach(k=>features.add(k));
  totalFamilies.add(row.trigger);
  entries.push({id:row.id,role:row.role,trigger:row.trigger,
   sourceCount:row.source.length,requires:[...(requires??[])],
   engineStatus:'UNIMPLEMENTED_NEEDS_NEW_RUN_SERVER_ADAPTER'});
 }
 for(const field of requiredPolicy)if(contract.traitPolicy?.[field]!==false)
  violations.push('unsafe_proc_policy:'+field);
 if(contract.traitPolicy?.combatTraitsActivePerBuild!==2)
  violations.push('active_trait_limit_drift');
 if(contract.combatChannelPolicy?.reflection?.cannotReflectReflection!==true)
  violations.push('unbounded_reflect_recursion');
 if(Object.keys(EVENT_REQUIREMENTS).some(trigger=>!totalFamilies.has(trigger)))
  violations.push('orphaned_approved_trigger');
 const categories=Object.fromEntries(['tank','damage','support','utility'].map(role=>[
  role,entries.filter(x=>x.role===role).length
 ]));
 if(categories.tank!==9||categories.damage!==9||categories.support!==9||categories.utility!==1)
  violations.push('role_distribution_drift');
 return {
  version:'eq2-hidden-trigger-readiness-1',violations,entries,
  distinctEventHooks:totalFamilies.size,requiredTrustedFields:[...features].sort(),
  allTrailsNotMounted:true, // intentionally no dispatcher; informational label
  roleCounts:categories,unsafeReentrySources:neverGenerated,
 };
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const result=analyzeTraitTriggerReadiness();
 if(result.violations.length){
  console.error(result.violations.join('\n'));process.exitCode=1;
 }else{
  console.log(JSON.stringify({
   version:result.version,traitCount:result.entries.length,
   distinctEventHooks:result.distinctEventHooks,requiredTrustedFields:result.requiredTrustedFields,
   roleCounts:result.roleCounts,engineStatus:'all_unimplemented_review_only',
  },null,2));
 }
}
