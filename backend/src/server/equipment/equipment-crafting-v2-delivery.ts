import type {GameState,ItemStack,CharacterState} from '../../../../apps/mobile/src/core/types';
import {v2ServerExactTemplateConsistent} from './equipment-crafting-v2-instances';
import {
 V2DraftCraftError,type V2DraftItem,type V2DraftJob,type V2DraftReceipt,type V2DraftSkillAward,
} from './equipment-crafting-v2-transaction';

/**
 * PRIVATE Equipment 2.0 custody boundary. These functions only inspect the
 * authenticated GameState and propose placement; they NEVER insert EQ2 IDs
 * into the live V33 Inventory, Bank, equipment slots or overflow.
 *
 * Until the common item catalogue, gem handling and existing online CAS have
 * been upgraded together, a claimed exact copy remains in hidden account
 * metadata with a stable claim receipt. In particular, a full pouch cannot
 * destroy the copy or cause a second roll on retry.
 */
export interface V2HiddenClaimCustody{
 instanceId:string;itemId:string;ownerCharacterId:string;
 suggestedLocation:'equipment_pouch'|'inventory'|'deferred';
 reason:'space_available'|'storage_full';
 stack:ItemStack;
 /** The eventual online command must include this placement in the SAME
  * existing account CAS as the corresponding claim receipt and XP award. */
 requiresSingleAccountCommit:true;
 requiresV2CatalogCompatibility:true;
 physicallyDelivered:false;
}
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const copies=(state:GameState)=>[
 ...(state.account.craftedGearInstances??[]).map(item=>item.id),
 ...state.bank.stacks.map(stack=>stack.instanceId),
 ...state.inventory.stacks.map(stack=>stack.instanceId),
 ...state.overflow.stacks.map(stack=>stack.instanceId),
 ...(state.character?[
  ...Object.values(state.character.equipmentInstanceIds??{}),
  ...(state.character.equipmentPouch?.stacks??[]).map(s=>s.instanceId),
 ]:[]),
 ...(state.otherCharacters??[]).flatMap(row=>[
  ...Object.values(row.character.equipmentInstanceIds??{}),
  ...row.inventory.stacks.map(s=>s.instanceId),
  ...row.overflow.stacks.map(s=>s.instanceId),
  ...(row.character.equipmentPouch?.stacks??[]).map(s=>s.instanceId),
 ]),
].filter((id):id is string=>typeof id==='string'&&id.length>0);
const owned=(state:GameState,id:string):{character:CharacterState;inventory:GameState['inventory']}|undefined=>{
 if(state.character?.id===id)return {character:state.character,inventory:state.inventory};
 const row=state.otherCharacters?.find(row=>row.character.id===id);
 return row?{character:row.character,inventory:row.inventory}:undefined;
};

/** Validate EVERY hidden receipt before accepting another command. No migration,
 * auto-repair or blind trust of the account's opaque V2 metadata is permitted. */
export function verifyEquipmentV2HiddenLedger(
 accountId:string,jobs:readonly V2DraftJob[],items:readonly V2DraftItem[],
 receipts:readonly V2DraftReceipt[],awards:readonly V2DraftSkillAward[],
):void{
 const unique=(values:readonly string[],reason:string)=>{
  if(values.some(value=>typeof value!=='string'||!value)||new Set(values).size!==values.length)
   fail(reason);
 };
 unique(jobs.map(job=>job.id),'duplicate_hidden_v2_job');
 unique(items.map(item=>item.id),'duplicate_hidden_v2_item');
 unique(receipts.map(row=>row.requestId),'duplicate_hidden_v2_receipt');
 unique(awards.map(row=>row.jobId),'duplicate_hidden_v2_award');
 const jobMap=new Map(jobs.map(job=>[job.id,job]));
 const itemMap=new Map(items.map(item=>[item.id,item]));
 const startReceiptIds=new Set<string>(),claimReceiptIds=new Set<string>();
 for(const job of jobs){
  if(job.accountId!==accountId||!job.ownerCharacterId
   ||(job.status!=='queued'&&job.status!=='claimed'))fail('invalid_hidden_v2_job');
  const linked=items.filter(item=>item.jobId===job.id);
  const xp=awards.filter(award=>award.jobId===job.id);
  if(job.status==='queued'&&(job.resultId||linked.length||xp.length))
   fail('queued_v2_job_has_rewards');
  if(job.status==='claimed'&&(!job.resultId||linked.length!==1||xp.length!==1
   ||linked[0].id!==job.resultId||xp[0].characterId!==job.ownerCharacterId
   ||xp[0].profession!==job.craftContract.profession
   ||xp[0].xp!==job.craftContract.xpAwarded))fail('invalid_hidden_v2_claim_settlement');
 }
 for(const item of items){
  const job=jobMap.get(item.jobId);
  if(!job||job.status!=='claimed'||job.resultId!==item.id
   ||item.accountId!==accountId||item.ownerCharacterId!==job.ownerCharacterId
   ||item.exactItem.pieceId!==job.pieceId
   ||!v2ServerExactTemplateConsistent(item.exactItem))fail('invalid_hidden_v2_exact_copy');
 }
 for(const award of awards){
  if(!jobMap.has(award.jobId)||!safe(award.xp))fail('orphan_hidden_v2_skill_award');
 }
 for(const receipt of receipts){
  const response=receipt.response;
  if(!response||!safe(response.version))fail('invalid_hidden_v2_receipt');
  const job=jobMap.get(response.jobId);
  if(!job)fail('orphan_hidden_v2_receipt');
  if(response.kind==='started'){
   if(receipt.commandFingerprint!=='start:'+job.recipeId
    ||startReceiptIds.has(job.id)||response.recipeId!==job.recipeId
    ||response.pieceId!==job.pieceId||response.finishesAtMs!==job.finishesAtMs
    ||response.goldCharged!==job.goldReserved)fail('invalid_hidden_v2_start_receipt');
   startReceiptIds.add(job.id);
  }else if(response.kind==='claimed'){
   const item=itemMap.get(response.instanceId);
   if(receipt.commandFingerprint!=='claim:'+job.id||claimReceiptIds.has(job.id)
    ||job.status!=='claimed'||!item||item.jobId!==job.id
    ||!equal(response.exactItem,item.exactItem)
    ||!equal(response.outcome,item.outcome)
    ||response.xpAwarded!==job.craftContract.xpAwarded
    ||response.profession!==job.craftContract.profession)
    fail('invalid_hidden_v2_claim_receipt');
   claimReceiptIds.add(job.id);
  }else fail('invalid_hidden_v2_receipt_kind');
 }
 if(jobs.some(job=>!startReceiptIds.has(job.id)||
  (job.status==='claimed'&&!claimReceiptIds.has(job.id))))
  fail('missing_hidden_v2_receipt');
}

/** Read-only delivery preflight for the *original crafter*, even if another
 * character is now active. Never mistake an old V33 item/instance for EQ2.
 * Inventory and equipment pouch capacities are respected independently.
 * Overflow has an expiry policy and cannot silently receive new EQ2 gear.
 */
export function proposeEquipmentV2ClaimCustody(
 state:GameState,item:V2DraftItem,
):V2HiddenClaimCustody{
 if(!state||!item||!v2ServerExactTemplateConsistent(item.exactItem)
  ||!item.id||item.accountId==='')fail('invalid_v2_delivery_copy');
 const owner=owned(state,item.ownerCharacterId);
 if(!owner)fail('unknown_v2_delivery_owner');
 if(copies(state).includes(item.id))fail('v2_delivery_instance_collision');
 const itemId=item.exactItem.pieceId;
 if(!itemId.startsWith('EQ2_'))fail('invalid_v2_delivery_namespace');
 const space=(stacks:readonly ItemStack[],capacity:number)=>{
  if(!safe(capacity)||stacks.some(row=>!safe(row.quantity)||row.quantity<1))
   fail('invalid_v2_delivery_capacity');
  return stacks.length<capacity;
 };
 const pouch=owner.character.equipmentPouch;
 const suggestedLocation=pouch&&space(pouch.stacks,pouch.capacity)
  ?'equipment_pouch' as const
  :space(owner.inventory.stacks,owner.inventory.capacity)
   ?'inventory' as const:'deferred' as const;
 return {
  instanceId:item.id,itemId,ownerCharacterId:item.ownerCharacterId,
  suggestedLocation,reason:suggestedLocation==='deferred'?'storage_full':'space_available',
  stack:{itemId,instanceId:item.id,quantity:1},
  requiresSingleAccountCommit:true,requiresV2CatalogCompatibility:true,physicallyDelivered:false,
 };
}
