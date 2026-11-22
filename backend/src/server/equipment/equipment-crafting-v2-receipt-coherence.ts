import {V2DraftCraftError} from './equipment-crafting-v2-transaction';

/** All hidden Equipment 2.0 commands eventually share ONE online account CAS
 * and one global request-id namespace. Check persisted receipts across
 * crafting, permanent gems and custody *before* replaying any command.
 * No client-visible route or independent request ledger is created here.
 */
export function verifyEquipmentV2ReceiptNamespace(groups:{
 forge:readonly {requestId:string}[];
 gems?:readonly {requestId:string}[];
 custody?:readonly {requestId:string}[];
 physical?:readonly {requestId:string}[];
}):void{
 if(!groups||!Array.isArray(groups.forge)
  ||(groups.gems!==undefined&&!Array.isArray(groups.gems))
  ||(groups.custody!==undefined&&!Array.isArray(groups.custody))
  ||(groups.physical!==undefined&&!Array.isArray(groups.physical)))
  throw new V2DraftCraftError('invalid_v2_receipt_namespace');
 const keys=new Set<string>();
 for(const group of [groups.forge,groups.gems??[],groups.custody??[],groups.physical??[]]){
  for(const receipt of group){
   if(!receipt||typeof receipt.requestId!=='string'
    ||!/^[a-zA-Z0-9_-]{8,128}$/.test(receipt.requestId))
    throw new V2DraftCraftError('invalid_v2_receipt_id');
   if(keys.has(receipt.requestId))
    throw new V2DraftCraftError('duplicate_cross_system_v2_receipt_id');
   keys.add(receipt.requestId);
  }
 }
}
