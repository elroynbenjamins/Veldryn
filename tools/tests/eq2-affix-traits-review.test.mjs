import test from 'node:test';
import assert from 'node:assert/strict';
import {loadEq2AffixTraits,validateEq2AffixTraits} from '../validate-eq2-affix-traits-review.mjs';

const fresh=()=>structuredClone(loadEq2AffixTraits());
const expectFailure=(mutate,reason)=>{
 const data=fresh();
 mutate(data);
 const errors=validateEq2AffixTraits(data);
 assert.ok(errors.some(error=>error.includes(reason)),JSON.stringify(errors));
};
test('review taxonomy: 17 distinct affixes, 13 Combat 2.0 channels + 4 additions',()=>{
 assert.deepEqual(validateEq2AffixTraits(fresh()),[]);
 assert.equal(fresh().affixes.length,17);
 assert.equal(fresh().traits.length,28);
});
test('reference T1–T4 rarity counts stay pinned and edition remains disabled',()=>{
 expectFailure(d=>{d.releaseActivation=true;},'activation_fence');
 expectFailure(d=>{d.existingDraftRollCounts.T3T4.mythic=4;},'inherited_roll_counts');
});
test('reject duplicate or unsupported affixes and lost slot eligibility',()=>{
 expectFailure(d=>{d.affixes[0].id=d.affixes[1].id;},'duplicate_affix_id');
 expectFailure(d=>{d.affixes[0].eligibleSlots=['weapon','unknown'];},'invalid_affix_slots');
 expectFailure(d=>{d.affixes[0].unit='flat_atk';},'invalid_affix_identity_or_units');
});
test('roll ranges and equipment-only caps cannot invalidate legal T4 item combinations',()=>{
 expectFailure(d=>{d.affixes[0].tiers.T4=[3,2];},'invalid_roll_band');
 expectFailure(d=>{d.affixes[0].maxEquipmentOnlyContribution=1;},'cap_would_reject_legitimate_gear');
 expectFailure(d=>{d.affixes[0].tiers.T4=[0.1,0.5];},'non_monotone_tier_max');
});
test('refuse silent conversion of old generic Potency and incomplete legacy aliases',()=>{
 expectFailure(d=>{d.legacyMapping.potency.to='hex_potency_pct';},'unsafe_potency_auto_conversion');
 expectFailure(d=>{delete d.legacyMapping.ward;},'legacy_mapping_incomplete');
});
test('two active signature traits, extra worn dormant, and no proc feedback loop',()=>{
 expectFailure(d=>{d.traitPolicy.combatTraitsActivePerBuild=5;},'trait_runtime_guardrails');
 expectFailure(d=>{d.traitPolicy.procCanTriggerProc=true;},'trait_runtime_guardrails');
 expectFailure(d=>{d.traits[0].cooldownSeconds=0;},'unbounded_combat_proc');
 expectFailure(d=>{d.traits.find(t=>t.role==='utility').source=['dungeon_boss_chest'];},'utility_trait_combat_leak');
 expectFailure(d=>{d.traits[2].source=['NPC_SHOP'];},'invalid_trait_source');
});
test('basic attacks are not a second general Attack Power or skill multiplier',()=>{
 const c=fresh();
 const basic=c.affixes.find(x=>x.id==='basic_attack_damage_pct');
 assert.deepEqual(basic.eligibleSlots,['weapon','gloves','amulet','ring']);
 assert.ok(basic.maxEquipmentOnlyContribution>=basic.tiers.T4[1]*basic.eligibleSlots.length);
 expectFailure(d=>{d.combatChannelPolicy.basicAttackDamage.ultimateAttackPowerMultiplier=true;},'basic_attack_source_isolation');
 expectFailure(d=>{d.combatChannelPolicy.basicAttackDamage.excludes=[];},'basic_attack_source_isolation');
});
test('reflect is post-shield actual HP damage, with shared anti-boss-cheese cap and no recursion',()=>{
 const c=fresh();
 const reflected=c.affixes.find(x=>x.id==='reflect_damage_pct');
 assert.deepEqual(reflected.eligibleSlots,['chest','legs','offhand','ring']);
 assert.ok(reflected.maxEquipmentOnlyContribution>=reflected.tiers.T4[1]*reflected.eligibleSlots.length);
 expectFailure(d=>{d.combatChannelPolicy.reflection.damageBase='pre_mitigation_damage';},'unsafe_reflection_source_or_recursion');
 expectFailure(d=>{d.combatChannelPolicy.reflection.cannotReflectReflection=false;},'unsafe_reflection_source_or_recursion');
 expectFailure(d=>{d.combatChannelPolicy.reflection.excludes=[];},'unsafe_reflection_source_or_recursion');
 expectFailure(d=>{d.combatChannelPolicy.reflection.maxRegionalBossHpPercentPerFiveSeconds=2;},'unbounded_retaliation_damage');
 expectFailure(d=>{d.traits.find(t=>t.id==='thornbound_riposte').params.reflectOwnMaxHpCapPercent=9;},'riposte_shared_budget');
});
test('new roles and new trait sources remain safe and deterministic',()=>{
 const c=fresh();
 assert.deepEqual(['tank','damage','support','utility'].map(role=>c.traits.filter(t=>t.role===role).length),[9,9,9,1]);
 expectFailure(d=>{d.traitPolicy.perItemTraitsMax=2;},'trait_runtime_guardrails');
 expectFailure(d=>{d.traits.find(t=>t.role==='damage').source=['world_boss_chest'];},'combat_trait_from_utility_only_source');
 expectFailure(d=>{d.traits[0].cooldownSeconds=0;d.traits[0].oncePerEncounter=false;},'unbounded_combat_proc');
 expectFailure(d=>{d.traits[1].id=d.traits[0].id;},'duplicate_trait_id');
});
test('existing dungeons and old items remain untouched by reviewed 2.0 rules',()=>{
 expectFailure(d=>{d.inheritance.legacyDungeonAnd1_0_x='UPGRADE';},'legacy_or_migration_release_fence');
 expectFailure(d=>{d.inheritance.migration='AUTO_CONVERT';},'legacy_or_migration_release_fence');
});
