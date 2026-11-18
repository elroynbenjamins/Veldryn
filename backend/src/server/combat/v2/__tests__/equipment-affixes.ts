import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../content/launch-combat';
import {
 EQUIPMENT_AFFIXES_V2,validateTrustedAffixesV2,compileTrustedEquipmentAffixesV2,
 type TrustedEquipmentItemAffixesV2,type ServerAffixPolicyV2,
} from '../equipment-affixes';
const actor=launchPlayer('Ironwarden',40);
const ready={
 ...actor,
 combatV2:{version:2 as const,resource:'guard' as const,specializationId:'v2:spec:ironwarden:sentinel'},
 tags:[...(actor.tags??[]),'combat-v2','combat-v2-gear-base-resolved'],
};
assert.equal(Object.keys(EQUIPMENT_AFFIXES_V2).length,13);
const limits=Object.fromEntries(Object.keys(EQUIPMENT_AFFIXES_V2).map(x=>[x,{min:.01,max:.10}]));
const policy:ServerAffixPolicyV2={
 limits:limits as unknown as ServerAffixPolicyV2['limits'],
 countsByTierRarity:{'T3:epic':2},
 maxFinalHaste:.75,maxFinalCritChance:.85,maxFinalCritMultiplier:3.5,
};
const item=(id:string,slot:TrustedEquipmentItemAffixesV2['slot'],affixes:TrustedEquipmentItemAffixesV2['affixes']):TrustedEquipmentItemAffixesV2=>({
 instanceId:id,slot,tier:'T3',rarity:'epic',quality:86,affixes,
});
const items:TrustedEquipmentItemAffixesV2[]=[
 item('h','helmet',[{id:'defense_pct',value:.04},{id:'max_hp_pct',value:.03}]),
 item('w','weapon',[{id:'attack_pct',value:.04},{id:'crit_rate_pp',value:.02}]),
 item('g','gloves',[{id:'haste_pp',value:.015}]),
 item('a','amulet',[{id:'crit_damage_pct',value:.05}]),
 item('c','chest',[{id:'class_healing_pct',value:.04}]),
];
const original=JSON.stringify(ready);
const disabled=compileTrustedEquipmentAffixesV2(ready,items,policy,false);
assert.equal(disabled.actor,ready);
assert.equal(disabled.sources.length,0);
const compiled=compileTrustedEquipmentAffixesV2(ready,items,policy,true);
assert.equal(compiled.sources.length,7);
assert.equal(compiled.actor.stats.attackPower,Math.round(ready.stats.attackPower*1.04*1e5)/1e5);
assert.equal(compiled.actor.stats.defense,Math.round(ready.stats.defense*1.04*1e5)/1e5);
assert.equal(compiled.actor.stats.maxHp,Math.round(ready.stats.maxHp*1.03*1e5)/1e5);
assert.equal(compiled.actor.stats.healingPower,Math.round(ready.stats.healingPower*1.04*1e5)/1e5);
assert.equal(compiled.actor.stats.haste,Math.round((ready.stats.haste+.015)*1e5)/1e5);
assert.equal(compiled.actor.stats.critChance,Math.round((ready.stats.critChance+.02)*1e5)/1e5);
assert.equal(compiled.actor.stats.critMultiplier,Math.round(ready.stats.critMultiplier*1.05*1e5)/1e5);
assert.equal(JSON.stringify(ready),original,'Must not alter class base or trusted snapshot');
assert.ok(compiled.actor.tags?.includes('combat-v2-affixes-applied'));
assert.throws(()=>compileTrustedEquipmentAffixesV2(compiled.actor,items,policy,true),
 /affix_actor_not_ready/,'Cannot double-apply');
assert.throws(()=>compileTrustedEquipmentAffixesV2(actor,items,policy,true),
 /affix_actor_not_ready/,'Cannot attach roll data to a legacy actor');
assert.throws(()=>validateTrustedAffixesV2(item('x','helmet',[{id:'haste_pp',value:.02}]),policy),
 /affix_slot_ineligible/);
assert.throws(()=>validateTrustedAffixesV2(item('x','weapon',[{id:'attack_pct',value:.15}]),policy),
 /roll_outside_approved_range/);
assert.throws(()=>validateTrustedAffixesV2(item('x','weapon',[{id:'attack_pct',value:.02},{id:'attack_pct',value:.03}]),policy),
 /duplicate_item_affix/);
assert.throws(()=>validateTrustedAffixesV2(item('x','weapon',[{id:'attack_pct',value:.02}]),{
 ...policy,countsByTierRarity:{},
}),/missing_approved_roll_count/);
assert.throws(()=>compileTrustedEquipmentAffixesV2(ready,[
 item('x','weapon',[{id:'penetration_pp',value:.02}]),
],policy,true),/missing_approved_advanced_affix_caps/);
const advancedCaps={
 accuracyPp:.12,evasionPp:.10,penetrationPp:.10,
 wardPp:.12,shieldStrengthPct:.15,hexPotencyPct:.12,
};
const advancedPolicy={...policy,maxAdvancedEffects:advancedCaps};
const sourceItems=[
 item('adv_weapon','weapon',[{id:'accuracy_pp',value:.04}]),
 item('adv_boots','boots',[{id:'evasion_pp',value:.05}]),
 item('adv_amulet','amulet',[{id:'penetration_pp',value:.03}]),
 item('adv_chest','chest',[{id:'ward_pp',value:.06}]),
 item('adv_offhand','offhand',[{id:'shield_strength_pct',value:.07}]),
 item('adv_cape','cape',[{id:'hex_potency_pct',value:.08}]),
];
const advanced=compileTrustedEquipmentAffixesV2(ready,sourceItems,advancedPolicy,true);
assert.equal(advanced.sources.length,6);
assert.deepEqual(advanced.actor.combatV2?.equipmentEffects,{
 accuracyPp:.04,evasionPp:.05,penetrationPp:.03,
 wardPp:.06,shieldStrengthPct:.07,hexPotencyPct:.08,
});
assert.equal(JSON.stringify(ready),original,
 'Six advanced affixes must not mutate the raw equipment or actor');
assert.throws(()=>compileTrustedEquipmentAffixesV2(ready,sourceItems,{
 ...advancedPolicy,maxAdvancedEffects:{...advancedCaps,wardPp:.04},
},true),/advanced_affix_exceeds_approved_cap:wardPp/);
assert.throws(()=>compileTrustedEquipmentAffixesV2(ready,sourceItems,{
 ...advancedPolicy,maxAdvancedEffects:{...advancedCaps,hexPotencyPct:NaN},
},true),/invalid_approved_advanced_affix_cap:hexPotencyPct/);
assert.throws(()=>compileTrustedEquipmentAffixesV2(ready,[
 item('adv_weapon','weapon',[{id:'accuracy_pp',value:.04}]),
 item('adv_cape','cape',[{id:'accuracy_pp',value:.04}]),
],{...advancedPolicy,maxAdvancedEffects:{...advancedCaps,accuracyPp:.06}},true),
 /advanced_affix_exceeds_approved_cap:accuracyPp/);

assert.throws(()=>compileTrustedEquipmentAffixesV2(ready,items,{
 ...policy,maxFinalCritChance:ready.stats.critChance+.01,
},true),/affix_exceeds_approved_stat_caps/);
assert.throws(()=>compileTrustedEquipmentAffixesV2(ready,items,{
 ...policy,maxFinalCritChance:NaN,
},true),/missing_approved_stat_caps/);
assert.throws(()=>compileTrustedEquipmentAffixesV2(ready,[items[0],items[0]],policy,true),
 /affix_item_duplicate/);
assert.throws(()=>validateTrustedAffixesV2({...items[0],quality:101},policy),
 /invalid_authoritative_item/);
assert.throws(()=>validateTrustedAffixesV2({...items[0],tier:'T6'},policy),
 /invalid_authoritative_item/);
assert.throws(()=>validateTrustedAffixesV2(item('x','weapon',[{id:'attack_pct',value:.02}]),{
 ...policy,limits:{...policy.limits,attack_pct:{min:.06,max:.05}},
}),/missing_approved_roll_limit/);
console.log('PASS: all 13 affix types, six bounded advanced effects, per-slot/per-rarity source guards');
