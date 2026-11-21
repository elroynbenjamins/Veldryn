/**
 * HIDDEN REVIEW ONLY. Twelve set-family playstyles mapped to the *proposed*
 * 17 affix and 28 signature-trait review options. A set NEVER grants any
 * signature trait from this map. Traits remain independently earned from
 * authenticated rare blueprint, dungeon, or party equipment receipts.
 *
 * Boss counterplay directions are authored here so that enemy/boss tuning
 * can be benchmarked AFTER item sources and exact effects exist. No numbers
 * are asserted, no boss is retuned, and this module is not a combat hook.
 */
import {SET_FAMILIES_V2} from './set-catalog';
import {PLANNED_T1_T4_SETS_V2} from './equipment-expanded-launch-registry';

export const SET_SYNERGY_REVIEW_VERSION_V2='eq2-48-set-combat-synergy-review-v1' as const;
export interface FamilySynergyReviewV2 {
 readonly familyId:string;
 readonly role:'tank'|'damage'|'support';
 readonly candidateAffixIds:readonly string[];
 readonly separatelyEarnedTraitCandidates:readonly string[];
 readonly bossCounterplayStudy:string;
 readonly effectStatus:'review_only';
 readonly givesFreeSignatureTrait:false;
 readonly grantsAnyCombatPower:false;
}
const directions:Readonly<Record<string,Omit<FamilySynergyReviewV2,'familyId'|'role'|'effectStatus'|'givesFreeSignatureTrait'|'grantsAnyCombatPower'>>> = {
 oathplate:{
  candidateAffixIds:['defense_pct','max_hp_pct','tenacity_pp'],
  separatelyEarnedTraitCandidates:['bulwark_oath','hardened_resolve','vital_reserve'],
  bossCounterplayStudy:'Physical direct-hit telegraphs and timed guard windows; no phase-cast immunity'},
 citadel:{
  candidateAffixIds:['max_hp_pct','shield_strength_pct','ward_pp'],
  separatelyEarnedTraitCandidates:['bastion_heart','guardian_aegis'],
  bossCounterplayStudy:'Multi-hit party pressure, shields credited only on actual absorption'},
 bloodsteel:{
  candidateAffixIds:['attack_pct','reflect_damage_pct','defense_pct'],
  separatelyEarnedTraitCandidates:['thornbound_riposte','counterbalance'],
  bossCounterplayStudy:'Retaliation and reflection share a five-second boss target budget; no proc loops'},
 vigilhide:{
  candidateAffixIds:['evasion_pp','tenacity_pp','max_hp_pct'],
  separatelyEarnedTraitCandidates:['unshaken','frostbound_guard'],
  bossCounterplayStudy:'Eligible evasions versus mandatory boss hazards and non-boss control duration'},
 quickstep:{
  candidateAffixIds:['haste_pp','basic_attack_damage_pct','crit_rate_pp'],
  separatelyEarnedTraitCandidates:['sword_dance','deep_cut'],
  bossCounterplayStudy:'Basic-hit speed, minimum action interval and downtime without critical proc chains'},
 horizon:{
  candidateAffixIds:['accuracy_pp','crit_rate_pp','crit_damage_pct'],
  separatelyEarnedTraitCandidates:['hunters_precision','first_light','quickened_focus'],
  bossCounterplayStudy:'Avoidable accuracy/crit tests; boss telegraphs never count as ordinary evasions'},
 blackscript:{
  candidateAffixIds:['hex_potency_pct','ability_damage_pct','haste_pp'],
  separatelyEarnedTraitCandidates:['spell_fang','echoing_strike'],
  bossCounterplayStudy:'Arcane/nature/shadow DoT windows, cleanse and phase breaks; exclude physical bleeds'},
 breakerforge:{
  candidateAffixIds:['penetration_pp','ability_damage_pct','attack_pct'],
  separatelyEarnedTraitCandidates:['armor_breaker','ruthless_edge'],
  bossCounterplayStudy:'Armor and direct-ability damage without bypassing shields or true-damage rules'},
 brightweave:{
  candidateAffixIds:['class_healing_pct','shield_strength_pct','haste_pp'],
  separatelyEarnedTraitCandidates:['mending_echo','soothing_light','graceful_mend'],
  bossCounterplayStudy:'Credited ally healing and shields, never overheal or consumable proc farming'},
 stormthread:{
  candidateAffixIds:['haste_pp','tenacity_pp','class_healing_pct'],
  separatelyEarnedTraitCandidates:['swift_recovery','beacon_of_courage'],
  bossCounterplayStudy:'Time-pressure and control ends, under global cooldown and class ability bounds'},
 rootshield:{
  candidateAffixIds:['ward_pp','shield_strength_pct','defense_pct'],
  separatelyEarnedTraitCandidates:['resonant_barrier','fortified_prayer','warding_hands'],
  bossCounterplayStudy:'Elemental boss phases and group absorbs, under shared party shield caps'},
 echohide:{
  candidateAffixIds:['class_healing_pct','max_hp_pct','shield_strength_pct'],
  separatelyEarnedTraitCandidates:['restorative_bloom'],
  bossCounterplayStudy:'Low-health effective heal checks and anti-recursion on support secondary heals'},
} as const;

export const EXPANDED_SET_FAMILY_SYNERGIES_V2:readonly FamilySynergyReviewV2[]=
 SET_FAMILIES_V2.map(family=>{
  const row=directions[family.id];
  if(!row)throw Error('equipment_combat_v2_missing_synergy_family:'+family.id);
  return Object.freeze({
   familyId:family.id,role:family.role,
   candidateAffixIds:[...row.candidateAffixIds],
   separatelyEarnedTraitCandidates:[...row.separatelyEarnedTraitCandidates],
   bossCounterplayStudy:row.bossCounterplayStudy,
   effectStatus:'review_only' as const,
   givesFreeSignatureTrait:false as const,
   grantsAnyCombatPower:false as const,
  });
 });

/** Restriction is explicit: Worldwalker is World Boss out-of-combat utility,
 * not a combat proc or a free 2/4/6 set effect.
 */
export const WORLD_BOSS_UTILITY_TRAIT_CANDIDATE_V2={
 id:'worldwalker',source:'world_boss_chest',
 combatProc:false,grantedBySet:false,
} as const;

export function auditExpandedSetSynergyV2(){
 const families=new Set(EXPANDED_SET_FAMILY_SYNERGIES_V2.map(x=>x.familyId));
 const affixes=new Set(EXPANDED_SET_FAMILY_SYNERGIES_V2.flatMap(x=>x.candidateAffixIds));
 const combatTraits=new Set(EXPANDED_SET_FAMILY_SYNERGIES_V2.flatMap(x=>x.separatelyEarnedTraitCandidates));
 if(families.size!==12||Object.keys(directions).length!==families.size||
    EXPANDED_SET_FAMILY_SYNERGIES_V2.some(x=>
     x.candidateAffixIds.length<2||x.separatelyEarnedTraitCandidates.length<1||
     x.grantsAnyCombatPower||x.givesFreeSignatureTrait||
     x.effectStatus!=='review_only')||
    PLANNED_T1_T4_SETS_V2.some(x=>!families.has(x.familyId)))
  throw Error('equipment_combat_v2_set_synergy_scope_invalid');
 return {
  source:SET_SYNERGY_REVIEW_VERSION_V2,
  families:families.size,launchTieredSets:PLANNED_T1_T4_SETS_V2.length,
  uniqueAffixSuggestions:[...affixes].sort(),
  uniqueSeparatelyEarnedCombatTraitSuggestions:[...combatTraits].sort(),
  worldBossUtilityExcluded:!combatTraits.has(WORLD_BOSS_UTILITY_TRAIT_CANDIDATE_V2.id),
  activatedSetEffects:0,freeTraitsFromSets:0,
  status:'UNAPPROVED_NONEXECUTABLE' as const,
 };
}
