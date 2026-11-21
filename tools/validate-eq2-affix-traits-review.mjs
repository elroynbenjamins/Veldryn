import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const DEFAULT_FILE=fileURLToPath(new URL('../docs/equipment-2-0/eq2-combat-affix-trait-proposal-v1.json',import.meta.url));
const SLOTS=new Set(['helmet','chest','gloves','legs','boots','cape','weapon','offhand','amulet','ring']);
const COMBAT_13=new Set(['attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp','crit_damage_pct','accuracy_pp','evasion_pp','penetration_pp','ward_pp','shield_strength_pct','class_healing_pct','hex_potency_pct']);
const NEW_4=new Set(['tenacity_pp','ability_damage_pct','basic_attack_damage_pct','reflect_damage_pct']);
const LEGACY_12=new Set(['armor','maxHp','ward','tenacity','critRate','critDamage','haste','penetration','accuracy','potency','abilityDamage','healingPower']);
const TIERS=['T1','T2','T3','T4'];
const INHERITED_COUNTS={
 T1T2:{common:1,uncommon:1,rare:1,epic:1,legendary:2,mythic:2},
 T3T4:{common:1,uncommon:1,rare:1,epic:2,legendary:2,mythic:3},
};
const finite=(value)=>typeof value==='number'&&Number.isFinite(value);
const safe=(value)=>Number.isSafeInteger(value);
const unique=(items)=>new Set(items).size===items.length;
/** Pure review-only audit: no actual item or combat policies are modified. */
export function validateEq2AffixTraits(contract){
 const errors=[];
 const fail=(s)=>errors.push(s);
 if(!contract||typeof contract!=='object'||Array.isArray(contract))
  return ['invalid_contract'];
 if(contract.contractVersion!=='eq2-combat-affix-traits-review-v2'||contract.status!=='REVIEW_ONLY_NOT_APPROVED'||contract.releaseActivation!==false)
  fail('activation_fence');
 for(const [tier,expected] of Object.entries(INHERITED_COUNTS)){
  const got=contract.existingDraftRollCounts?.[tier];
  if(JSON.stringify(got)!==JSON.stringify(expected))fail('inherited_roll_counts:'+tier);
 }
 const affixes=contract.affixes;
 if(!Array.isArray(affixes)||affixes.length!==17)return [...errors,'expected_exactly_17_affixes'];
 const ids=affixes.map(a=>a?.id);
 if(!unique(ids))fail('duplicate_affix_id');
 for(const id of [...COMBAT_13,...NEW_4])if(!ids.includes(id))fail('missing_affix:'+id);
 for(const a of affixes){
  if(!a||!ids.includes(a.id)||!['relative_percent','percentage_points'].includes(a.unit))
   {fail('invalid_affix_identity_or_units');continue;}
  if(!Array.isArray(a.eligibleSlots)||!a.eligibleSlots.length||!unique(a.eligibleSlots)||
    a.eligibleSlots.some(s=>!SLOTS.has(s)))fail('invalid_affix_slots:'+a.id);
  if(!['offense','defense','support'].includes(a.category))fail('invalid_affix_category:'+a.id);
  if(!['tank','damage','support'].includes(a.roleHint))fail('invalid_affix_role_hint:'+a.id);
  const tierKeys=Object.keys(a.tiers??{});
  if(!unique(tierKeys)||tierKeys.length!==4||TIERS.some(t=>!tierKeys.includes(t)))fail('invalid_tier_coverage:'+a.id);
  let priorMax=-1;
  for(const tier of TIERS){
   const band=a.tiers?.[tier];
   if(!Array.isArray(band)||band.length!==2||band.some(x=>!finite(x))||
    band[0]<=0||band[1]<band[0]||band[1]>25)fail('invalid_roll_band:'+a.id+':'+tier);
   else{
    if(band[1]<priorMax)fail('non_monotone_tier_max:'+a.id);
    priorMax=band[1];
   }
  }
  const upper=a.tiers?.T4?.[1];
  if(finite(upper)&&Array.isArray(a.eligibleSlots)){
   const legalUpper=Number((upper*a.eligibleSlots.length).toFixed(4));
   if(!finite(a.maxEquipmentOnlyContribution)||
     a.maxEquipmentOnlyContribution<legalUpper-1e-9||
     a.maxEquipmentOnlyContribution>100)
    fail('cap_would_reject_legitimate_gear:'+a.id);
  }
  if(typeof a.engine!=='string'||a.engine.length<12)
   fail('missing_effect_semantics:'+a.id);
 }
 const aliases=contract.legacyMapping;
 if(!aliases||!unique(Object.keys(aliases))||Object.keys(aliases).length!==LEGACY_12.size||
  [...LEGACY_12].some(id=>!Object.hasOwn(aliases,id)))
  fail('legacy_mapping_incomplete');
 else{
  for(const [legacy,entry] of Object.entries(aliases)){
   if(!entry||typeof entry.status!=='string'||
    (entry.to!==null&&!ids.includes(entry.to)))fail('invalid_legacy_alias:'+legacy);
  }
  if(aliases.potency?.to!==null||aliases.potency?.status!=='AMBIGUOUS_NO_AUTOMATIC_MAPPING')
   fail('unsafe_potency_auto_conversion');
 }
 // New combat channels must not merely rebrand a general outgoing Attack modifier.
 const basic=contract.combatChannelPolicy?.basicAttackDamage;
 if(basic?.id!=='basic_attack_damage_pct'||
   basic.eligibleEvent!=='player_direct_basic_attack_hit'||
   basic.ultimateAttackPowerMultiplier!==false||
   basic.requiresApprovedCombinedDamageCeiling!==true||
   !Array.isArray(basic.excludes)||
   ['direct_class_ability','damage_over_time_tick','trait_generated_damage','gem_generated_damage','reflected_damage','companion_attack']
    .some(tag=>!basic.excludes.includes(tag)))fail('basic_attack_source_isolation');
 const reflected=contract.combatChannelPolicy?.reflection;
 if(reflected?.id!=='reflect_damage_pct'||
   reflected.eligibleEvent!=='enemy_direct_hit_causes_player_hp_loss'||
   reflected.damageBase!=='actual_hp_lost_after_armor_ward_shields'||
   reflected.onlyOriginalAttacker!==true||reflected.disabledOnLegacyEncounters!==true||
   reflected.damageType!=='retaliation_true_not_crit'||
   !Array.isArray(reflected.sharedWithSignatureTrait)||
   !reflected.sharedWithSignatureTrait.includes('thornbound_riposte')||
   ['cannotCrit','cannotLifesteal','cannotTriggerTrait','cannotTriggerEffectGem','cannotReflectReflection']
    .some(tag=>reflected[tag]!==true)||
   !Array.isArray(reflected.excludes)||
   ['damage_over_time_tick','shield_only_absorption','environmental_hazard','self_inflicted_damage','trait_generated_damage','reflected_damage','pet_or_companion_damage','other_player_damage','unavoidable_telegraph_phase']
    .some(tag=>!reflected.excludes.includes(tag)))
   fail('unsafe_reflection_source_or_recursion');
 if(!reflected||!finite(reflected.maxPlayerMaxHpPercentPerSourceHit)||
   reflected.maxPlayerMaxHpPercentPerSourceHit<=0||reflected.maxPlayerMaxHpPercentPerSourceHit>1.5||
   !finite(reflected.maxEnemyMaxHpPercentPerFiveSeconds)||
   reflected.maxEnemyMaxHpPercentPerFiveSeconds<=0||reflected.maxEnemyMaxHpPercentPerFiveSeconds>0.2||
   !finite(reflected.maxRegionalBossHpPercentPerFiveSeconds)||
   reflected.maxRegionalBossHpPercentPerFiveSeconds<=0||reflected.maxRegionalBossHpPercentPerFiveSeconds>0.1)
   fail('unbounded_retaliation_damage');
 const reflectedAffix=affixes.find(a=>a.id==='reflect_damage_pct');
 const basicAffix=affixes.find(a=>a.id==='basic_attack_damage_pct');
 if(reflectedAffix?.roleHint!=='tank'||reflectedAffix?.unit!=='relative_percent'||
   basicAffix?.roleHint!=='damage'||basicAffix?.unit!=='relative_percent'||
   (reflectedAffix?.maxEquipmentOnlyContribution??101)>8||
   (basicAffix?.maxEquipmentOnlyContribution??101)>19)
    fail('new_affix_role_or_upper_limits');
 const sameSlots=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&
   expected.every(s=>actual.includes(s));
 if(!sameSlots(basicAffix?.eligibleSlots,['weapon','gloves','amulet','ring'])||
   !sameSlots(reflectedAffix?.eligibleSlots,['chest','legs','offhand','ring']))
    fail('new_affix_slot_policy');
 const policy=contract.traitPolicy;
 if(!policy||policy.combatTraitsActivePerBuild!==2||policy.sameTraitActivePerBuild!==1||
  policy.ordinaryCraftedGearHasProcTrait!==false||policy.procCanTriggerProc!==false||
  policy.effectGemCanTriggerTrait!==false||policy.generatedDamageCannotLifestealOrCrit!==false||
  policy.serverSelectedTraitReceiptsOnly!==true||policy.pendingUIApproval!==true||
  policy.sourceLootNotSellableByNPC!==true||policy.traitSourcesExcludedFromCurrencyExchanges!==true||
  policy.globalProcCooldownSeconds!==1||policy.perItemTraitsMax!==1||
  policy.sharedRetaliationBudgetRef!=='combatChannelPolicy.reflection'||
  policy.traitExecution!=='NOT_IMPLEMENTED_REVIEW_ONLY')
  fail('trait_runtime_guardrails');
 const sources=policy?.sourceEligibility;
 const allowedSources=new Set(Array.isArray(sources)?sources:[]);
 const approvedSources=new Set(['rare_blueprint_craft','dungeon_boss_chest','party_event_chest','world_boss_chest']);
 if(!Array.isArray(sources)||!unique(sources)||allowedSources.size!==4||
    [...allowedSources].some(x=>!approvedSources.has(x)))fail('trait_source_policy');
 const traits=contract.traits;
 if(!Array.isArray(traits)||traits.length!==28)return [...errors,'expected_exactly_28_traits'];
 if(!unique(traits.map(t=>t?.id)))fail('duplicate_trait_id');
 for(const trait of traits){
  if(!trait||typeof trait.id!=='string'||!/^[a-z_]+$/.test(trait.id)||
   !['tank','damage','support','utility'].includes(trait.role))
   {fail('invalid_trait_identity');continue;}
  if(!Array.isArray(trait.source)||!trait.source.length||
    trait.source.some(src=>!allowedSources.has(src)))fail('invalid_trait_source:'+trait.id);
  if(!trait.trigger||!trait.params||typeof trait.params!=='object'||
    Object.values(trait.params).some(n=>!finite(n)||n<0||n>100))
   fail('unsafe_trait_effect:'+trait.id);
  if(!safe(trait.cooldownSeconds)||trait.cooldownSeconds<0||trait.cooldownSeconds>90||
    typeof trait.oncePerEncounter!=='boolean')fail('invalid_trait_cooldown:'+trait.id);
  if(trait.role!=='utility'&&trait.source.includes('world_boss_chest'))fail('combat_trait_from_utility_only_source:'+trait.id);
  if(trait.role==='utility'&&
    (trait.source.length!==1||trait.source[0]!=='world_boss_chest'||
      trait.cooldownSeconds!==0))fail('utility_trait_combat_leak:'+trait.id);
  if(trait.role!=='utility'&&trait.cooldownSeconds===0&&!trait.oncePerEncounter)
   fail('unbounded_combat_proc:'+trait.id);
  if(typeof trait.notes!=='string'||trait.notes.length<20)
   fail('missing_trait_safety_semantics:'+trait.id);
 }
 if(traits.filter(t=>t.role==='utility').length!==1||
  ['tank','damage','support'].some(role=>traits.filter(t=>t.role===role).length!==9))
  fail('trait_role_distribution');
 const riposte=traits.find(t=>t.id==='thornbound_riposte');
 if(!riposte||riposte.params?.reflectOwnMaxHpCapPercent>(reflected?.maxPlayerMaxHpPercentPerSourceHit??0)||
   !riposte.notes?.includes('Shared per-hit retaliation budget'))fail('riposte_shared_budget');
 const roleAllowed=new Set(['tank','damage','support','utility']);
 if(traits.some(t=>!roleAllowed.has(t.role)))fail('unknown_trait_role');
 if(contract.inheritance?.legacyDungeonAnd1_0_x!=='UNTOUCHED'||
  contract.inheritance?.migration!=='NO_SILENT_CONVERSION_OR_RE_ROLL_OF_EXISTING_EQUIPMENT')
  fail('legacy_or_migration_release_fence');
 return errors;
}
export const loadEq2AffixTraits=(path=DEFAULT_FILE)=>JSON.parse(readFileSync(path,'utf8'));
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const errors=validateEq2AffixTraits(loadEq2AffixTraits());
 if(errors.length){errors.forEach(s=>console.error('EQ2 REVIEW FAIL: '+s));process.exitCode=1;}
 else console.log('PASS: EQ2 17-affix/28-trait review taxonomy with bounded basic-hit and reflection contracts, role/slot eligibility, legal roll caps, ambiguous alias, dormant trait and legacy release fences');
}
