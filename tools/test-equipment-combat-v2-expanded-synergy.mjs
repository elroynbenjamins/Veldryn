#!/usr/bin/env node
/**
 * Full source parity against the Equipment 2.0 review JSON.
 * This prevents the 48-set boss-balance plan from recommending nonexistent
 * affixes or free/unimplemented combat traits. DOES NOT run combat.
 */
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const review=JSON.parse(readFileSync('docs/equipment-2-0/eq2-combat-affix-trait-proposal-v1.json','utf8'));
const directions=require('../backend/dist-equipment-combat-v2-launch/server/combat/v2/equipment-expanded-set-synergy-review.js');
const launch=require('../backend/dist-equipment-combat-v2-launch/server/combat/v2/equipment-expanded-launch-registry.js');
assert.equal(review.contractVersion,'eq2-combat-affix-traits-review-v2');
assert.equal(review.releaseActivation,false);
assert.equal(review.affixes.length,17);
assert.equal(review.traits.length,28);
const audit=directions.auditExpandedSetSynergyV2();
const facts=launch.auditUnifiedSetLaunchV2();
assert.equal(audit.families,12);
assert.equal(audit.launchTieredSets,48);
assert.equal(facts.launchMemberConcepts,204);
assert.equal(facts.launchBonusConcepts,108);
assert.equal(audit.activatedSetEffects,0);
assert.equal(audit.freeTraitsFromSets,0);
assert.equal(audit.worldBossUtilityExcluded,true);
assert.equal(audit.status,'UNAPPROVED_NONEXECUTABLE');
const publishedAffixes=new Map(review.affixes.map(a=>[a.id,a]));
const publishedTraits=new Map(review.traits.map(t=>[t.id,t]));
assert.deepEqual(audit.uniqueAffixSuggestions,
 [...publishedAffixes.keys()].sort(),
 'All 17 source-authored proposed channels appear in class/gear playstyle reviews');
const combatTraits=review.traits.filter(t=>t.role!=='utility').map(x=>x.id).sort();
assert.equal(combatTraits.length,27);
assert.deepEqual(audit.uniqueSeparatelyEarnedCombatTraitSuggestions,combatTraits,
 'Every proposed combat trait is associated with at least one class-role build for boss QA');
assert.equal(review.traits.filter(t=>t.role==='utility').length,1);
assert.equal(directions.WORLD_BOSS_UTILITY_TRAIT_CANDIDATE_V2.id,'worldwalker');
for(const row of directions.EXPANDED_SET_FAMILY_SYNERGIES_V2){
 assert.ok(['tank','damage','support'].includes(row.role));
 assert.ok(row.bossCounterplayStudy.length>=25);
 assert.equal(row.effectStatus,'review_only');
 assert.equal(row.givesFreeSignatureTrait,false);
 assert.equal(row.grantsAnyCombatPower,false);
 assert.equal(new Set(row.candidateAffixIds).size,row.candidateAffixIds.length);
 assert.equal(new Set(row.separatelyEarnedTraitCandidates).size,row.separatelyEarnedTraitCandidates.length);
 for(const id of row.candidateAffixIds){
  assert.ok(publishedAffixes.has(id),'Only sourced reviewed affix IDs may be suggested: '+id);
 }
 for(const id of row.separatelyEarnedTraitCandidates){
  const trait=publishedTraits.get(id);
  assert.ok(trait,'Only proposed authored trait IDs: '+id);
  assert.equal(trait.role,row.role,'Trait cannot be suggested across wrong class roles: '+id);
  assert.ok(trait.source.every(s=>['rare_blueprint_craft','dungeon_boss_chest','party_event_chest'].includes(s)),
   'Set synergy cannot bypass source-owned rare/dungeon/party provenance: '+id);
 }
}
const setsByFamily=new Map();
for(const set of launch.PLANNED_T1_T4_SETS_V2)setsByFamily.set(set.familyId,(setsByFamily.get(set.familyId)??0)+1);
assert.ok([...setsByFamily.values()].every(n=>n===4));
const tank=directions.EXPANDED_SET_FAMILY_SYNERGIES_V2.filter(x=>x.role==='tank');
const dmg=directions.EXPANDED_SET_FAMILY_SYNERGIES_V2.filter(x=>x.role==='damage');
const support=directions.EXPANDED_SET_FAMILY_SYNERGIES_V2.filter(x=>x.role==='support');
assert.equal(tank.length,4);
assert.equal(dmg.length,4);
assert.equal(support.length,4);
console.log('PASS: 12 complete set-family identities, all 17 proposed affixes, all 27 separately-earned combat traits, '+
 'Worldwalker isolated from combat, 48 set launch concepts, and zero authorized execution');
