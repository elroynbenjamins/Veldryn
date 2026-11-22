import assert from 'node:assert/strict';
import {newGame,createCharacter} from '../../../../../apps/mobile/src/core/game';
import {V2_SERVER_RECIPES,v2ServerRecipeAndPiece} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome} from '../equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate} from '../equipment-crafting-v2-instances';
import {validateEquipmentV2EffectGemInstall} from '../equipment-crafting-v2-effect-gem-policy';
import type {V2DraftItem} from '../equipment-crafting-v2-transaction';
import type {V2HiddenStorageReservation} from '../equipment-crafting-v2-storage-reservations';
import type {V2VirtualMoveReceipt} from '../equipment-crafting-v2-virtual-custody';
import type {V2GemSidecarState} from '../equipment-crafting-v2-gem-sidecar';

const game=createCharacter(newGame(2_000_000_000_000),'IRONWARDEN');
assert.ok(game.character);
game.character.equipment={};
const actor=game.character.id,accountId='effect-policy';
const slots=['helmet','chest','gloves','legs'] as const;
const pieces=slots.map(slot=>{
 const recipe=V2_SERVER_RECIPES.find(row=>{
  const match=v2ServerRecipeAndPiece(row.id);
  return match?.piece.slot===slot&&!match.piece.classRestriction;
 });
 assert.ok(recipe, 'A canonical general item is required in '+slot);
 const match=v2ServerRecipeAndPiece(recipe.id);
 assert.ok(match);
 return match;
});
const items:V2DraftItem[]=pieces.map(({recipe,piece},index)=>{
 const outcome=draftEquipmentV2Outcome({
  recipeId:recipe.id,pieceId:piece.id,role:piece.role,
  tier:piece.tier,slot:piece.slot,
 },()=>0);
 return {
  id:'effect-copy-'+index,accountId,jobId:'effect-job-'+index,
  ownerCharacterId:actor,createdAtMs:2_000_000_000_000,
  outcome,exactItem:v2ServerCreateExactTemplate(piece,outcome),
 };
});
const reservations:V2HiddenStorageReservation[]=items.map(row=>({
 instanceId:row.id,itemId:row.exactItem.pieceId,jobId:row.jobId,
 ownerCharacterId:actor,destination:'equipment_pouch',quantity:1,
}));
const custodyReceipts:V2VirtualMoveReceipt[]=items.map((row,index)=>({
 instanceId:row.id,requestId:'effect-equip-'+index,
 fingerprint:'custody:equip:'+row.id,actorCharacterId:actor,
 from:'pouch',to:'equipped',oldHolder:actor,newHolder:actor,
 version:20+index,equippedSlot:row.exactItem.slot,
 physicallyDelivered:false,
}));
const gemId='gem:effect_momentum:g1';
const installed:V2GemSidecarState={slots:items.slice(0,3).map(row=>({
 instanceId:row.id,effect:{gemId,rollPercent:100},
})),receipts:[]};
const base={state:game,accountId,actorCharacterId:actor,items,reservations,
 custodyReceipts,installed,targetInstanceId:items[3].id,incomingGemId:gemId};
assert.throws(()=>validateEquipmentV2EffectGemInstall(base),/v2_effect_equipped_family_cap/,
 'No fourth equipped copy of the same effect family is legal');
const substitute=validateEquipmentV2EffectGemInstall({...base,targetInstanceId:items[0].id});
assert.equal(substitute.equippedCopiesAfter,3,
 'Replacing an already equipped family member never counts a phantom fourth copy');
assert.equal(substitute.resonance,3);
assert.equal(substitute.maxEquippedCopies,3);
assert.equal(substitute.combatReady,false);
assert.equal(substitute.physicallyDelivered,false);
const onlyThreeEquipped=validateEquipmentV2EffectGemInstall({...base,
 custodyReceipts:custodyReceipts.slice(0,3),
 installed:{...installed,slots:[...installed.slots,{
  instanceId:items[3].id,effect:{gemId,rollPercent:100},
 }]},
 targetInstanceId:items[0].id,
});
assert.equal(onlyThreeEquipped.equippedCopiesAfter,3,
 'Gem-equipped copies that are not worn must not count toward the active loadout cap');
assert.throws(()=>validateEquipmentV2EffectGemInstall({...base,
 custodyReceipts:custodyReceipts.slice(0,3)}),
 /v2_effect_requires_equipped_copy/,
 'An unequipped item cannot receive a new Effect Gem');
const otherFamily=validateEquipmentV2EffectGemInstall({...base,
 incomingGemId:'gem:effect_execution:g1'});
assert.equal(otherFamily.equippedCopiesAfter,1);
assert.equal(otherFamily.resonance,1);
assert.throws(()=>validateEquipmentV2EffectGemInstall({...base,
 incomingGemId:'SWIFT_SIGIL'}),/invalid_v2_effect_gem_identity/,
 'Legacy effect-gem IDs cannot be silently assigned a Combat 2.0 family');
const legacy=structuredClone(game);
legacy.character!.equipment.weapon='basic_sword';
assert.throws(()=>validateEquipmentV2EffectGemInstall({...base,state:legacy}),
 /v2_mixed_legacy_effect_loadout_unverified/);
const foreign=structuredClone(game);
foreign.character!.id='other-character';
assert.throws(()=>validateEquipmentV2EffectGemInstall({...base,state:foreign}),
 /untrusted_v2_effect_actor/);
console.log('PASS: hidden Effect Gem 2.0 per-family 3-copy cap, replacement, resonance, legacy isolation and no combat activation');
