import { strict as assert } from 'node:assert';
import {resolveActiveSetBonusesV20,validateEquipmentSetDefinitionV20,type EquipmentSetDefinitionV20} from './combat-stat-contract-v20';
import {SUNSCAR_DUNGEONS_V20,validateSunscarDungeonDefinitionsV20} from './sunscar-dungeons-v20';
import {SUNSCAR_BOSSES_V20,SUNSCAR_COLLECTIBLE_UNLOCKS_V20,SUNSCAR_ECHO_CONDITIONS_V20,SUNSCAR_ENEMIES_V20,SUNSCAR_EQUIPMENT_POLICY_V20,SUNSCAR_QUESTLINE_V20,SUNSCAR_RELIC_HOOKS_V20,SUNSCAR_RESOURCES_V20,SUNSCAR_ZONES_V20} from './sunscar-region-v20';
import {buildSunscarRegionContentBundleV20} from './region-content-publisher-v20';

assert.equal(SUNSCAR_ZONES_V20.length,5);
assert.equal(SUNSCAR_ENEMIES_V20.length,16);
assert.equal(SUNSCAR_BOSSES_V20.length,4);
assert.equal(SUNSCAR_DUNGEONS_V20.length,3);
assert.equal(SUNSCAR_QUESTLINE_V20.length,10);
assert.equal(SUNSCAR_RESOURCES_V20.length,12);
assert.equal(SUNSCAR_ECHO_CONDITIONS_V20.length,4);
assert.equal(SUNSCAR_RELIC_HOOKS_V20.length,4);
assert.equal(SUNSCAR_COLLECTIBLE_UNLOCKS_V20.length,9);
assert.deepEqual(validateSunscarDungeonDefinitionsV20(),[]);
assert.equal(SUNSCAR_EQUIPMENT_POLICY_V20.equipmentSetsAuthored,false);
assert.equal(SUNSCAR_EQUIPMENT_POLICY_V20.regionalWeaponsAuthored,false);
assert.ok(!JSON.stringify(SUNSCAR_QUESTLINE_V20).toLowerCase().includes('market'));
assert.ok(!JSON.stringify(SUNSCAR_RESOURCES_V20).toLowerCase().includes('market'));
assert.ok(SUNSCAR_ENEMIES_V20.some(x=>x.stats.critChance>=.10));
assert.ok(SUNSCAR_ENEMIES_V20.some(x=>x.stats.evasion>=30));
assert.ok(SUNSCAR_ENEMIES_V20.some(x=>x.stats.healingPower>0));
assert.ok(SUNSCAR_BOSSES_V20.every(x=>x.equipmentRewardsFinalized===false));

const bundle=buildSunscarRegionContentBundleV20();
assert.equal(bundle.regionId,'REG_002');
assert.equal(bundle.contentVersion,'sunscar-v20.0.0');
assert.equal(bundle.contentHash.length,64);
assert.equal(bundle.records.filter(x=>x.recordType==='zone').length,5);
assert.equal(bundle.records.filter(x=>x.recordType==='monster').length,16);
assert.equal(bundle.records.filter(x=>x.recordType==='boss').length,4);
assert.equal(bundle.records.filter(x=>x.recordType==='live_dungeon').length,3);
assert.ok(bundle.records.some(x=>x.recordType==='dungeon_node'));
assert.equal(bundle.records.filter(x=>x.recordType==='echo_condition').length,4);
assert.equal(bundle.records.filter(x=>x.recordType==='relic').length,4);
assert.equal(bundle.records.filter(x=>x.recordType==='collectible_unlock').length,9);

const sample:EquipmentSetDefinitionV20={id:'SET_TEST',name:'Test',eligibleSlots:['helmet','chest','legs','boots','gloves'],thresholds:[
  {pieces:2,label:'+HP',statModifiers:[{stat:'maxHpPercent',percent:.03}],powerBudgetWeight:.25},
  {pieces:3,label:'+2% Crit',statModifiers:[{stat:'critChance',flat:.02}],powerBudgetWeight:.30},
  {pieces:5,label:'Specialization',statModifiers:[],triggeredEffect:{id:'test_fx',description:'Rotation-specific effect',tags:['test']},powerBudgetWeight:.45},
]};
assert.deepEqual(validateEquipmentSetDefinitionV20(sample),[]);
const active=resolveActiveSetBonusesV20([
  {setId:'SET_TEST',slot:'helmet',itemId:'a'},
  {setId:'SET_TEST',slot:'chest',itemId:'b'},
  {setId:'SET_TEST',slot:'legs',itemId:'c'},
], [sample]);
assert.equal(active.length,1);
assert.equal(active[0].unlocked.length,2);
assert.equal(active[0].unlocked[1].pieces,3);
const second:EquipmentSetDefinitionV20={id:'SET_SECOND',name:'Second',eligibleSlots:['helmet','chest','legs','boots','gloves'],thresholds:[
  {pieces:2,label:'+Ward',statModifiers:[{stat:'ward',flat:8}],powerBudgetWeight:.30},
]};
const mixed=resolveActiveSetBonusesV20([
  {setId:'SET_TEST',slot:'helmet',itemId:'a'},{setId:'SET_TEST',slot:'chest',itemId:'b'},{setId:'SET_TEST',slot:'legs',itemId:'c'},
  {setId:'SET_SECOND',slot:'boots',itemId:'d'},{setId:'SET_SECOND',slot:'gloves',itemId:'e'},
], [sample,second]);
assert.equal(mixed.length,2);
assert.equal(mixed.find(x=>x.setId==='SET_TEST')?.unlocked.some(x=>x.pieces===3),true);
assert.equal(mixed.find(x=>x.setId==='SET_SECOND')?.unlocked.some(x=>x.pieces===2),true);
const duplicateSlot=resolveActiveSetBonusesV20([
  {setId:'SET_TEST',slot:'helmet',itemId:'a'},{setId:'SET_TEST',slot:'helmet',itemId:'duplicate'},{setId:'SET_TEST',slot:'chest',itemId:'b'},
],[sample]);
assert.equal(duplicateSlot[0].pieces,2);
assert.equal(duplicateSlot[0].unlocked.some(x=>x.pieces===3),false);
console.log('v20 Sunscar + set-bonus tests passed');
