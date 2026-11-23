import {strict as assert} from 'node:assert';
import type {CombatStats} from '../../types';
import {CLASS_NAMES_V2} from '../skill-catalog';
import type {ClassIdV2} from '../build-contract';
import {simulateUnifiedEquipmentCombatV2} from '../unified-equipment-encounter';
import {compileExactEquipmentTraitSourceV2} from '../equipment-trait-exact-copy-adapter';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

let runs=0,negativeChecks=0,traits=0;
const observedAffixes=new Set<EquipmentAffixIdV2>();
const comparisons=new Map<string,{low:number;high:number}>();
for(const classId of Object.keys(CLASS_NAMES_V2) as ClassIdV2[]){
 for(const which of [0,1] as const){
  for(const boss of bosses){
   for(const [qualityIndex,profile] of profiles.entries()){
    const x=setup(classId,which,boss,profile);
    const before=JSON.stringify(x.input);
    const first=simulateUnifiedEquipmentCombatV2(
     x.input,[x.build],[x.runtime],true,x.trustedKit,x.signedPort);
    const again=simulateUnifiedEquipmentCombatV2(
     x.input,[x.build],[x.runtime],true,x.trustedKit,x.signedPort);
    assert.deepEqual(first,again,'Signed 10-slot combat replay must be stable');
    assert.equal(JSON.stringify(x.input),before,'No mutation of combat input');
    const evidence=first.equipmentEvidence[0];
    assert.equal(evidence.baseSources.length,10);
    assert.equal(evidence.affixSources.length,9);
    assert.deepEqual(evidence.setEffects.map(s=>s.thresholdId),
     [2,4,6].map(n=>x.build.ownedItemsById[x.build.selected.equipment.helmet!].setFamilyId+':'+n));
    assert.deepEqual(new Set(evidence.baseSources.map(s=>s.instanceId)).size,10);
    assert.equal(first.combat.players[0].definition.abilities.length,2);
    assert.ok(first.enemyMechanicLabels.length>0);
    assert.equal(first.combat.players[0].definition.combatV2?.version,2);
    assert.ok(first.combat.events.some(e=>e.type==='combat_start'));
    assert.ok(first.combat.events.length<8000);
    for(const a of evidence.affixSources)observedAffixes.add(a.id);
    traits+=first.combat.events.filter(e=>e.type==='equipment_trait_trigger').length;
    const key=classId+'|'+which+'|'+boss.id;
    const previous=comparisons.get(key)??{low:0,high:0};
    const finalStat=evidence.statStages.afterAffixes[x.statName as keyof CombatStats];
    comparisons.set(key,qualityIndex===0?
     {...previous,low:finalStat}:{...previous,high:finalStat});
    runs++;
    if(classId==='IRONWARDEN'&&which===0&&boss.id==='BOSS_EXP_ROOT'&&qualityIndex===1){
     const firstSlot=x.build.selected.equipment.helmet!;
     const wrongOwner={...x.runtime,instancesById:{...x.runtime.instancesById,
      [firstSlot]:{...x.runtime.instancesById[firstSlot],ownerCharacterId:'BANK'}}};
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[wrongOwner],true,x.trustedKit,x.signedPort),
      /missing_authoritative_equipment_snapshot/);negativeChecks++;
     const tamperReceipt={...x.signedPort,receiptsByInstanceId:{
      ...x.receipts,[firstSlot]:{...x.receipts[firstSlot],quality:44}}};
     assert.throws(()=>compileExactEquipmentTraitSourceV2(
      x.build,x.runtime,tamperReceipt),/item_copy_receipt_does_not_match_equipment/);
     negativeChecks++;
     const lostReceipt={...x.signedPort,receiptsByInstanceId:Object.fromEntries(
      Object.entries(x.receipts).filter(([id])=>id!==firstSlot))};
     assert.throws(()=>compileExactEquipmentTraitSourceV2(
      x.build,x.runtime,lostReceipt),/item_copy_receipt_does_not_match_equipment/);
     negativeChecks++;
     const bankReceipt={...x.signedPort,receiptsByInstanceId:{
      ...x.receipts,BANK:{...x.receipts[firstSlot],instanceId:'BANK'}}};
     assert.throws(()=>compileExactEquipmentTraitSourceV2(
      x.build,x.runtime,bankReceipt),/receipt_contains_banked_or_unequipped_copy/);
     negativeChecks++;
     const fakeRoll={...x.runtime,affixesByInstanceId:{
      ...x.runtime.affixesByInstanceId,[firstSlot]:{
       ...x.runtime.affixesByInstanceId[firstSlot],
       affixes:[{id:'max_hp_pct' as const,value:999}],
      }}};
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[fakeRoll],true,x.trustedKit,x.signedPort),
      /roll_outside_approved_range/);negativeChecks++;
     const alteredDef=x.runtime.definitionsByItemId[x.runtime.instancesById[firstSlot].itemId];
     const scaled={...x.runtime,definitionsByItemId:{
      ...x.runtime.definitionsByItemId,[alteredDef.itemId]:{
       ...alteredDef,statSource:'craft-frozen-pre-scaled-v2' as const,
       rarityAndQualityAlreadyApplied:true},
     }};
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[scaled],true,x.trustedKit,x.signedPort),
      /crafting_pre_scaled_item_requires_exact_adapter/);negativeChecks++;
     assert.throws(()=>simulateUnifiedEquipmentCombatV2(
      x.input,[x.build],[x.runtime],true,x.trustedKit,
      {...x.signedPort,verifyPersisted:()=>false}),
      /persisted_ledger_not_verified/);negativeChecks++;
    }
   }
  }
 }
}
assert.equal(runs,9*2*6*2);
assert.equal(comparisons.size,108);
for(const [key,row] of comparisons){
 assert.ok(row.high>row.low,'Better rarity/quality must add verified base stat: '+key);
}
assert.ok(traits>0,'Gear-linked traits should actually execute');
assert.equal(negativeChecks,7);
assert.equal(observedAffixes.size,13,
 'All 13 existing Combat V2 random affix channels must be exercised');
console.log('PASS: '+runs+' actual ten-slot Skills + 2/4/6 set + 13 affix + signed trait boss simulations; '+
 traits+' trait events, '+negativeChecks+' forbidden-source probes, '+
 comparisons.size+' quality/rarity directional checks (synthetic policies only)');
