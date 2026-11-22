import {v2ServerSocketGemKind} from './equipment-crafting-v2-gem-identity';
import type {V2GemCopySockets,V2GemSidecarState} from './equipment-crafting-v2-gem-sidecar-types';
import type {V2DraftItem} from './equipment-crafting-v2-transaction';
import {V2DraftCraftError} from './equipment-crafting-v2-transaction';

/** Read-only canonical socket and receipt verifier. No app runtime, no writes. */
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(x:number)=>Number.isSafeInteger(x)&&x>=0;
const validRoll=(value:number)=>safe(value)&&value>=80&&value<=120&&(value-80)%5===0;

export function verifyEquipmentV2GemSidecar(
 items:readonly V2DraftItem[],sidecar:V2GemSidecarState,
):void{
 if(!sidecar||!Array.isArray(sidecar.slots)||!Array.isArray(sidecar.receipts))fail('invalid_v2_gem_sidecar');
 const itemIds=new Set(items.map(row=>row.id));
 const ids=new Set<string>(),receiptIds=new Set<string>();
 const rebuilt=new Map<string,V2GemCopySockets>();
 let lastVersion=-1;
 for(const row of sidecar.slots){
  if(!row||!itemIds.has(row.instanceId)||ids.has(row.instanceId))
   fail('invalid_v2_gem_copy_sockets');
  ids.add(row.instanceId);
  for(const kind of ['stat','effect'] as const){
   const gem=row[kind];
   if(!gem)continue;
   if(!validRoll(gem.rollPercent)||v2ServerSocketGemKind(gem.gemId)!==kind)
    fail('invalid_v2_installed_gem');
  }
 }
 for(const row of sidecar.receipts){
  if(!row||typeof row.requestId!=='string'||!row.requestId
   ||receiptIds.has(row.requestId)||!itemIds.has(row.instanceId)
   ||row.fingerprint!=='gem:'+row.instanceId+':'+row.gemId
   ||!validRoll(row.rollPercent)||v2ServerSocketGemKind(row.gemId)!==row.socket
   ||!safe(row.version)||!['gem_pouch','inventory','bank'].includes(row.source)
   ||(row.burnedGemId!==null&&v2ServerSocketGemKind(row.burnedGemId)!==row.socket))
   fail('invalid_v2_gem_receipt');
  if(row.version<=lastVersion)fail('out_of_order_v2_gem_receipt');
  lastVersion=row.version;
  const before:V2GemCopySockets=rebuilt.get(row.instanceId)??{instanceId:row.instanceId};
  const previous=before[row.socket];
  const burned=previous&&previous.gemId!==row.gemId?previous.gemId:null;
  if(burned!==row.burnedGemId
   ||(previous?.gemId===row.gemId&&
    (previous.rollPercent>=120||row.rollPercent<previous.rollPercent)))
   fail('invalid_v2_gem_receipt_history');
  rebuilt.set(row.instanceId,{...before,[row.socket]:{
   gemId:row.gemId,rollPercent:row.rollPercent,
  }});
  receiptIds.add(row.requestId);
 }
 if(rebuilt.size!==sidecar.slots.length)fail('v2_gem_sidecar_state_mismatch');
 for(const current of sidecar.slots){
  const expected=rebuilt.get(current.instanceId);
  if(!expected||JSON.stringify(expected)!==JSON.stringify(current))
   fail('v2_gem_sidecar_state_mismatch');
 }
}
