import {GATHERING} from '../src/content/skills';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {MINING_ESSENCE_BY_ZONE,ASTERFALL_MINERAL_ESSENCE_ID} from '../src/content/mining-essence';
import {itemDef} from '../src/content/items';
import {newGame,createCharacter,startGathering,previewActivityReward,claimActivity} from '../src/core/game';
import {attemptEquipmentUpgrade,upgradeMaterialCosts,upgradeQuote} from '../src/core/equipment-enhancement';
import {gatheringDropPreview} from '../src/core/gathering-drop-preview';
import {workingTowardItemSourceEntries} from '../src/core/working-toward';
import {resourceCodexEntries} from '../src/core/resource-codex';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const id=ASTERFALL_MINERAL_ESSENCE_ID;
const base=createCharacter(newGame(1000),'IRONWARDEN','Ore Miner');
const copper=GATHERING.find(node=>node.id==='GREENFIELDS_COPPER_OUTCROP')!;
ok(copper.zoneId==='GREENFIELDS'&&copper.skillId==='mining'&&copper.unlockLevel===1,
 'A character can mine for early enhancement materials in the starting region');
ok(itemDef(id).rarity==='rare'&&itemDef(id).type==='material','Mineral Essence is a real Rare inventory material');
ok(MINING_ESSENCE_BY_ZONE.GREENFIELDS.baseChance===.02&&MINING_ESSENCE_BY_ZONE.OLD_MINES.baseChance===.02,
 'Canonical 2% Mining drop rate must be explicit and shared with UI');
ok(gatheringDropPreview(copper,base).some(drop=>drop.itemId===id&&drop.chance===.02),
 'Mining drop disclosure must show the same authoritative base rate');
ok(workingTowardItemSourceEntries(base,id).some(row=>row.destination.kind==='skills'
 &&row.destination.actionId===copper.id&&row.availability.status==='ready'),
 'Mining Essence source must appear in actionable resource acquisition links');
ok(resourceCodexEntries().find(row=>row.id===id)?.category==='Mining',
 'Mining Essence must be categorized correctly in Resource Codex');
const started=startGathering(base,copper.id,1000);
const time=1000+24*60*60*1000;
const preview=previewActivityReward(started,time);
const found=preview.items.find(row=>row.itemId===id)?.quantity??0;
ok(preview.kills>100&&found>0,
 'Real seeded Mining settlement must generate rare Mineral Essence at the authored rate');
const committed=claimActivity(started,time).state;
const acquired=[...committed.inventory.stacks,...committed.bank.stacks,...committed.overflow.stacks]
 .filter(row=>row.itemId===id).reduce((n,row)=>n+row.quantity,0);
ok(acquired===found&&acquired>0,'Offline Mining rewards must reach storage without loss or duplication');

const allEarly=V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier==='T1'||row.v33EquipmentTier==='T2');
ok(allEarly.length>0,'Expected early forged equipment');
for(const recipe of allEarly){
 const resinId=recipe.v33EquipmentTier==='T1'?'VERDANT_BINDING_RESIN':'IRONWOOD_BINDING_RESIN';
 ok(recipe.inputs.some(input=>input.itemId===resinId),
  'Forging recipe must use the correct tier-specific resin for '+recipe.id);
 for(const rank of [1,2,3,4]){
  const costs=upgradeMaterialCosts(recipe.output.itemId,rank);
  ok(costs.some(row=>row.itemId===id&&row.quantity===1),
   'Early enchant attempt requires one Mineral Essence: '+recipe.id+' rank '+rank);
  ok(!costs.some(row=>['VERDANT_BINDING_RESIN','IRONWOOD_BINDING_RESIN'].includes(row.itemId)),
   'Early enchanting must use Mineral Essence rather than either forging resin: '+recipe.id+' rank '+rank);
 }
}
const later=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T3')!;
ok(upgradeMaterialCosts(later.output.itemId,1).some(row=>row.itemId==='SUNSCAR_DUNE_BINDER')
 &&!upgradeMaterialCosts(later.output.itemId,1).some(row=>row.itemId===id),
 'T3 enchanting must use Sunscar materials rather than Asterfall Mineral Essence');
const ring=allEarly.find(row=>row.classId==='IRONWARDEN'&&itemDef(row.output.itemId).slot==='ring')!;
const costs=upgradeMaterialCosts(ring.output.itemId,1);
const prepared={...base,character:{...base.character!,gold:100000,equipment:{...base.character!.equipment,ring:ring.output.itemId}},
 inventory:{...base.inventory,stacks:[...ring.inputs.map(input=>({...input,quantity:1000})),
 ...costs.filter(input=>!ring.inputs.some(row=>row.itemId===input.itemId)).map(input=>({...input,quantity:1000})),
 {itemId:'TEMPERING_DUST',quantity:1000},{itemId:'TEMPERING_CORE',quantity:1000}]}};
const quote=upgradeQuote(prepared,ring.output.itemId);
ok(quote.materials.some(row=>row.itemId===id)&&!quote.materials.some(row=>row.itemId==='VERDANT_BINDING_RESIN'),
 'Live enchanting quote must show mineral instead of resin');
const failed=attemptEquipmentUpgrade(prepared,ring.output.itemId,.99);
ok(!failed.result.success,'Failure fixture must be a genuinely failed enchanting attempt');
const beforeMineral=prepared.inventory.stacks.find(row=>row.itemId===id)!.quantity;
const beforeVerdant=prepared.inventory.stacks.find(row=>row.itemId==='VERDANT_BINDING_RESIN')!.quantity;
ok(failed.state.inventory.stacks.find(row=>row.itemId===id)!.quantity===beforeMineral-1,
 'Even a failed attempt must consume only its stated rare Mineral Essence');
ok(failed.state.inventory.stacks.find(row=>row.itemId==='VERDANT_BINDING_RESIN')!.quantity===beforeVerdant,
 'Failed enchanting must never reduce Verdant Forge supplies');
console.log('PASS: rare Mining Essence is earnable, visible, source-linked and replaces Verdant only for T1/T2 enchanting');
