import assert from 'node:assert/strict';
import {V2_SERVER_RECIPES,v2ServerRecipeAndPiece} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome} from '../equipment-crafting-v2-rolls';
import {v2ServerCreateExactTemplate} from '../equipment-crafting-v2-instances';
import {validateEquipmentV2EffectGemInstall} from '../equipment-crafting-v2-effect-gem-policy';
import {readEquipmentV2VirtualCustody,type V2VirtualMoveReceipt} from '../equipment-crafting-v2-virtual-history';
import type {V2DraftItem} from '../equipment-crafting-v2-transaction';
import type {V2HiddenStorageReservation} from '../equipment-crafting-v2-storage-reservations';
import type {V2GemSidecarState} from '../equipment-crafting-v2-gem-sidecar-types';

// Server-owned fixtures only: this suite must never import apps/mobile.
const accountId='effect-server-qa',actor='ironwarden-QA';
const slots=['helmet','chest','gloves','legs'] as const;
const pieces=slots.map(slot=>{
 const recipe=V2_SERVER_RECIPES.find(row=>{
  const match=v2ServerRecipeAndPiece(row.id);
  return match?.piece.slot===slot&&!match.piece.classRestriction;
 });
 if(!recipe)throw Error('missing_general_eq2_piece_'+slot);
 const match=v2ServerRecipeAndPiece(recipe.id);
 if(!match)throw Error('missing_canonical_eq2_recipe_'+slot);
 return match;
});
const items:V2DraftItem[]=pieces.map(({recipe,piece},index)=>{
 const outcome=draftEquipmentV2Outcome({
  recipeId:recipe.id,pieceId:piece.id,role:piece.role,tier:piece.tier,slot:piece.slot,
 },()=>0);
 return {
  id:'effect-copy-'+index,accountId,jobId:'forge-job-'+index,
  ownerCharacterId:actor,createdAtMs:2_000_000_000_000,
  outcome,exactItem:v2ServerCreateExactTemplate(piece,outcome),
 };
});
const reservations:V2HiddenStorageReservation[]=items.map(item=>({
 instanceId:item.id,itemId:item.exactItem.pieceId,jobId:item.jobId,
 ownerCharacterId:actor,destination:'equipment_pouch',quantity:1,
}));
const receipts:V2VirtualMoveReceipt[]=items.map((item,index)=>({
 instanceId:item.id,requestId:'effect-equip-'+index,
 fingerprint:'custody:equip:'+item.id,actorCharacterId:actor,
 from:'pouch',to:'equipped',oldHolder:actor,newHolder:actor,
 version:20+index,equippedSlot:item.exactItem.slot,
 physicallyDelivered:false,
}));
const gemId='gem:effect_momentum:g1';
const installed:V2GemSidecarState={slots:items.slice(0,3).map(item=>({
 instanceId:item.id,effect:{gemId,rollPercent:100},
})),receipts:[]};
const state={character:{id:actor,equipment:{}}};
const base={state,accountId,actorCharacterId:actor,items,reservations,
 custodyReceipts:receipts,installed,targetInstanceId:items[3].id,incomingGemId:gemId};
const initial=JSON.stringify(base);
assert.equal(readEquipmentV2VirtualCustody(items,reservations,receipts).length,4);
assert.throws(()=>validateEquipmentV2EffectGemInstall(base),
 /v2_effect_equipped_family_cap/,'Fourth concurrently worn copy of one family must fail');
const replacement=validateEquipmentV2EffectGemInstall({...base,targetInstanceId:items[0].id});
assert.equal(replacement.equippedCopiesAfter,3,'Replacing existing family is not a fourth');
assert.equal(replacement.resonance,3);
assert.equal(replacement.combatReady,false);
assert.equal(replacement.physicallyDelivered,false);
const other=validateEquipmentV2EffectGemInstall({
 ...base,incomingGemId:'gem:effect_execution:g1',
});
assert.equal(other.equippedCopiesAfter,1);
assert.equal(other.resonance,1);
assert.throws(()=>validateEquipmentV2EffectGemInstall({
 ...base,incomingGemId:'gem:effect_nonexistent:g1',
}),/unknown_v2_effect_gem/);
assert.throws(()=>validateEquipmentV2EffectGemInstall({
 ...base,incomingGemId:'SWIFT_SIGIL',
}),/invalid_v2_effect_gem_identity/);
assert.throws(()=>validateEquipmentV2EffectGemInstall({
 ...base,targetInstanceId:items[3].id,custodyReceipts:receipts.slice(0,3),
}),/v2_effect_requires_equipped_copy/);
const legacy={character:{id:actor,equipment:{weapon:'legacy_weapon'}}};
assert.throws(()=>validateEquipmentV2EffectGemInstall({...base,state:legacy}),
 /v2_mixed_legacy_effect_loadout_unverified/);
const otherActor={character:{id:'unowned-character',equipment:{}}};
assert.throws(()=>validateEquipmentV2EffectGemInstall({...base,state:otherActor}),
 /untrusted_v2_effect_actor/);
const tampered=receipts.map((row,index)=>index===0?{...row,
 fingerprint:'custody:withdraw_bank:'+row.instanceId}:row);
assert.throws(()=>readEquipmentV2VirtualCustody(items,reservations,tampered),
 /invalid_v2_virtual_move_receipt/,
 'Replay history cannot forge a deposit or withdrawal into an equip receipt');
const swapped=receipts.map((row,index)=>index===0?{
 ...row,equippedSlot:items[1].exactItem.slot,
}:row);
assert.throws(()=>readEquipmentV2VirtualCustody(items,reservations,swapped),
 /v2_virtual_move_slot_conflict/,
 'Virtual receipt must equip the exact item\'s actual slot');
assert.equal(JSON.stringify(base),initial,'Read-only policy must never modify owner snapshot');
console.log('PASS: pure EQ2 effect gems enforce server family identity, 3-copy cap, replay integrity and legacy isolation');
