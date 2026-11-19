import {strict as assert} from 'node:assert';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {TIERED_SETS_BY_ID_V2} from '../set-catalog';
import {
 legacyEquipmentRegistryV2,equipmentRegistryWithV2SetsV2,
} from '../equipment-compatibility';
import {EQUIPMENT_PIECES_V33} from '../../../equipment/equipment-catalog-v33';
import {compileEnemiesForCombatV2,ENEMY_ARCHETYPES_V2} from '../enemy-bridge';
import type {CombatantDefinition} from '../../types';
import {simulateCombat} from '../../engine';
import {launchPlayer} from '../../content/launch-combat';
import {simulateUnifiedCombatV2} from '../unified-encounter';

const legacy=legacyEquipmentRegistryV2();
assert.ok(Object.keys(legacy).length>0);
for(const piece of EQUIPMENT_PIECES_V33){
 const converted=legacy[piece.id];
 assert.ok(converted,piece.id+' legacy gear must remain available');
 assert.equal(converted.requiredLevel,piece.requiredLevel);
 assert.equal(converted.eligibleClasses?.length,1,'legacy class restriction must stay narrow');
 assert.equal(converted.eligibleRoles,undefined,'legacy gear cannot silently become role-shared');
}
const drafted=equipmentRegistryWithV2SetsV2([
 {itemId:'new_t1_oath_helm',tier:'T1',setId:'eq2_t1_oathplate',slot:'helmet',requiredLevel:2},
 {itemId:'new_t1_oath_cape',tier:'T1',setId:'eq2_t1_oathplate',slot:'cape',requiredLevel:2},
],legacy);
assert.deepEqual(drafted.new_t1_oath_helm.eligibleRoles,['tank']);
assert.equal(drafted.new_t1_oath_helm.setFamilyId,'eq2_t1_oathplate');
assert.equal(drafted.new_t1_oath_helm.requiredLevel,2);
assert.equal(drafted.new_t1_oath_helm.eligibleClasses,undefined);
assert.throws(()=>equipmentRegistryWithV2SetsV2([
 {itemId:'bad_tier',tier:'T2',setId:'eq2_t1_oathplate',slot:'helmet',requiredLevel:2},
],{}),/invalid_authored_set_item/);
assert.throws(()=>equipmentRegistryWithV2SetsV2([
 {itemId:'weapon_in_set',tier:'T1',setId:'eq2_t1_oathplate',slot:'weapon',requiredLevel:2},
],{}),/invalid_authored_set_item/);
assert.throws(()=>equipmentRegistryWithV2SetsV2([
 {itemId:'bad_class',tier:'T1',setId:'eq2_t1_oathplate',slot:'helmet',
  requiredLevel:2,eligibleClasses:['WAYFINDER']},
],{}),/authored_set_class_mismatch/);
for(const cls of Object.keys(CLASS_ROLES_V2) as ClassIdV2[])
 assert.ok(['tank','damage','support'].includes(CLASS_ROLES_V2[cls]));
assert.equal(Object.keys(TIERED_SETS_BY_ID_V2).length,60);

const baseline=(archetype:string,boss=false):CombatantDefinition=>({
 id:'ENEMY_'+archetype,name:archetype,team:'enemies',role:'enemy',level:30,boss,
 stats:{maxHp:2400,attackPower:180,healingPower:0,defense:90,accuracy:850,
  evasion:110,critChance:.05,critMultiplier:1.5,haste:0},
 basicAttackMs:2500,basicAttackCoeff:.7,abilities:[],
 tags:['pve:archetype:'+archetype],
});
const originals=ENEMY_ARCHETYPES_V2.map(a=>baseline(a));
const before=JSON.stringify(originals);
const gated=compileEnemiesForCombatV2(originals,false);
assert.equal(gated.enemies,originals,'disabled behavior preserves exact reference');
assert.deepEqual(gated.mechanicLabels,[]);
const compiled=compileEnemiesForCombatV2(originals,true);
assert.equal(compiled.enemies.length,8);
assert.equal(compiled.mechanicLabels.length,8);
assert.equal(JSON.stringify(originals),before,'no source mutations');
for(const item of compiled.enemies){
 assert.ok(item.tags?.includes('combat-v2-enemy'));
 assert.equal(item.abilities.length,1);
 assert.ok(item.abilities[0].cooldownMs>=2000);
 assert.ok(item.abilities[0].effects.length>0);
}
const boss=baseline('guardian',true);
const converted=compileEnemiesForCombatV2([boss],true);
assert.equal(converted.enemies[0].phases?.length,1);
assert.equal(converted.enemies[0].phases?.[0].hpPct,.45);
const again=compileEnemiesForCombatV2(converted.enemies,true);
assert.equal(again.enemies[0],converted.enemies[0],'idempotent when already compiled');
assert.equal(again.enemies[0].phases?.length,1);
assert.throws(()=>compileEnemiesForCombatV2([
 {...baseline('guardian'),team:'players'},
],true),/invalid_enemy_team/);
// Authoritative Enemy 2.0 kits are not eligible for generic ability/phase
// compilation; this prevents stacking two enemy powers on the same foe.
const authoredFromOtherCompiler={
 ...baseline('guardian'),tags:['pve:archetype:guardian','enemy-v2:kit:v1'],
};
assert.throws(()=>compileEnemiesForCombatV2([authoredFromOtherCompiler],true),
 /mixed_enemy_compilers/);
assert.equal(compileEnemiesForCombatV2([authoredFromOtherCompiler],false).enemies[0],
 authoredFromOtherCompiler,'Disabled generic compiler must leave authored kits untouched');
assert.throws(()=>compileEnemiesForCombatV2([{
 ...baseline('guardian'),
 abilities:[{id:'ENEMY_V2_SPOOF',name:'Authored',target:'self',cooldownMs:5000,
  effects:[{kind:'shield',flat:1}]}],
}],true),/mixed_enemy_compilers/);
assert.throws(()=>compileEnemiesForCombatV2([{
 ...baseline('guardian'),boss:true,
 phases:[{id:'ENEMY_V2_BOSS_PHASE',name:'Authored phase',hpPct:.5,
  target:'self',effects:[{kind:'shield',flat:1}]}],
}],true),/mixed_enemy_compilers/);

const hero=launchPlayer('Ironwarden',25);
const input={seed:'v2-unified-bridge',players:[hero],enemies:[baseline('guardian')],
  maxDurationMs:3000};
const oldReplay=simulateCombat(input);
const isolated=simulateUnifiedCombatV2(input,[],false);
assert.deepEqual(isolated.combat,oldReplay,'V2 disabled must be byte-for-byte legacy replay parity');
assert.deepEqual(isolated.enemyMechanicLabels,[]);
const enabled=simulateUnifiedCombatV2(input,[],true);
const repeated=simulateUnifiedCombatV2(input,[],true);
assert.deepEqual(enabled,repeated,'Integrated opt-in encounter must remain deterministic');
assert.equal(enabled.enemyMechanicLabels.length,1);
console.log('PASS: legacy/class gear, 60 future role sets, eight enemy archetypes and gated boss phases');
