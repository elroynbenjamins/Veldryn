import assert from 'node:assert/strict';
import {EQUIPMENT_PIECES_V33,EQUIPMENT_SETS_V33} from './equipment-catalog-v33';
import {settleEquipmentCraftV33,type CraftReceiptV33} from './equipment-settlement-v33';

const set=EQUIPMENT_SETS_V33[0],pieces=EQUIPMENT_PIECES_V33.filter(piece=>piece.setId===set.id);
const receipts=new Set<string>(),keys=new Set<string>(),skins=new Set<string>();
const repo={hasMutationKey:async(key:string)=>keys.has(key),markMutationKey:async(key:string)=>void keys.add(key),hasCraftReceipt:async(_c:string,p:string)=>receipts.has(p),insertCraftReceipt:async(receipt:CraftReceiptV33)=>void receipts.add(receipt.pieceId),listCraftedPieceIds:async(_c:string)=>[...receipts],hasSkin:async(_c:string,s:string)=>skins.has(s),unlockSkin:async(_c:string,s:string)=>void skins.add(s)};
(async()=>{
 let last:any;
 for(const piece of pieces)last=await settleEquipmentCraftV33(repo,{characterId:'c',pieceId:piece.id,instanceId:`i-${piece.id}`,completedAt:'2026-09-15T00:00:00Z',idempotencyKey:`k-${piece.id}`});
 assert.equal(last.skinProgress.complete,true);assert.equal(last.skinUnlocked,set.id);
 const duplicate=await settleEquipmentCraftV33(repo,{characterId:'c',pieceId:pieces[0].id,instanceId:'duplicate',completedAt:'2026-09-15T00:00:00Z',idempotencyKey:'k-'+pieces[0].id});
 assert.equal(duplicate.duplicate,true);assert.equal(duplicate.skinProgress.complete,true);
 console.log('v33 equipment settlement passed');
})();
