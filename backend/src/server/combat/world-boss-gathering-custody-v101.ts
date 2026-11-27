/** Hidden exact-copy claim/move rehearsal. Returns detached candidates only.
 * A committed V96 chest roll + independently verified account mint ledger are
 * required; no legacy V84 conversion or production item/command registration.
 * Future SQL must use a single account lock, CAS and original-source uniqueness. */
import type {GameState,GearSlot} from '../../../../apps/mobile/src/core/types';
import {gatheringSnapshotDigestV100,readWorldBossGatheringPhysicalV100,assertWorldBossGatheringOriginV100,type GatheringMintReadbackV100} from './world-boss-gathering-snapshot-v100';
import {reviewWorldBossGatheringSpeedV99} from './world-boss-gathering-speed-v99';
import {WORLD_BOSS_GATHERING_PIECES_V64} from './world-boss-gathering-loot-v64';
export const WORLD_BOSS_GATHERING_CUSTODY_V101_LIVE=false as const;
type Location='unclaimed'|'bank'|'inventory'|'equipped';
export type GatheringCustodyCopyV101=Omit<GatheringMintReadbackV100,'characterId'|'custody'>&{
 readonly holderCharacterId:string|null;readonly location:Location;
};
export type GatheringCustodyIntentV101={kind:'claim_to_bank'|'withdraw_bank'|'deposit_bank'|'equip'|'unequip';instanceId:string;requestId:string};
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,180}$/.test(x);
export function reviewWorldBossGatheringCustodyV101(input:{
 accountId:string;revision:number;state:GameState;ownedCharacterIds:readonly string[];
 copies:readonly GatheringCustodyCopyV101[];intent:GatheringCustodyIntentV101;
 verifyPersisted:(accountId:string,revision:number,digest:string)=>boolean;
 /** Includes reservation/encounter locks and original source claim uniqueness. */
 verifyMoveAllowed:(accountId:string,revision:number,instanceId:string,requestId:string)=>boolean;
}){
 const {accountId,revision,state,copies,intent}=input;
 const c=state.character;
 if(!validId(accountId)||!Number.isSafeInteger(revision)||revision<1||revision>=Number.MAX_SAFE_INTEGER||
 !c||!validId(c.id)||state.activity||c.classTraining||!intent||!validId(intent.instanceId)||!validId(intent.requestId)||
 !['claim_to_bank','withdraw_bank','deposit_bank','equip','unequip'].includes(intent.kind)||
 !Array.isArray(copies)||copies.length>10000||!Array.isArray(input.ownedCharacterIds)||
 typeof input.verifyPersisted!=='function'||typeof input.verifyMoveAllowed!=='function')
  throw Error('gathering_custody_invalid_scope');
 const sourceDigest=gatheringSnapshotDigestV100({accountId,revision,state,copies,ownedCharacterIds:input.ownedCharacterIds,intent});
 const readDigest=()=>gatheringSnapshotDigestV100({accountId,revision,state,copies,ownedCharacterIds:input.ownedCharacterIds,intent});
 if(input.verifyPersisted(accountId,revision,sourceDigest)!==true||readDigest()!==sourceDigest)
  throw Error('gathering_custody_unverified_source');
 const physical=readWorldBossGatheringPhysicalV100(state,input.ownedCharacterIds);
 const rows:readonly GatheringCustodyCopyV101[]=copies;
 const byId=new Map<string,GatheringCustodyCopyV101>(),sources=new Set<string>();
 for(const row of rows){
  if(!row||row.accountId!==accountId||!validId(row.instanceId)||byId.has(row.instanceId)||
   !['unclaimed','bank','inventory','equipped'].includes(row.location)||
   (state.account.craftedGearInstances??[]).some(x=>x.id===row.instanceId))
   throw Error('gathering_custody_invalid_copy');
  assertWorldBossGatheringOriginV100(accountId,row);
  if(sources.has(row.originalChest.sourceKey))throw Error('gathering_custody_duplicate_source');
  // Validate exact roll ranges with the same V99 skill projection.
  reviewWorldBossGatheringSpeedV99({accountId,characterId:c.id,skill:row.roll.skill,
   copies:[{accountId,characterId:c.id,instanceId:row.instanceId,roll:row.roll}],
   baseActionSeconds:1,toolTimeMultiplier:1,existingRateMultiplier:1,verifyEquippedCopy:()=>true});
  const found=physical.get(row.instanceId)?.[0];
  if(row.location==='unclaimed'){
   if(row.holderCharacterId!==null||found)throw Error('gathering_custody_unclaimed_has_physical_copy');
  }else if(!found||found.itemId!==row.roll.itemId||
    (row.location==='bank'?(found.owner!==null||row.holderCharacterId!==null||found.slot!==undefined):
     (!row.holderCharacterId||!input.ownedCharacterIds.includes(row.holderCharacterId)||found.owner!==row.holderCharacterId||
      (row.location==='equipped'?found.slot!==row.roll.slot:found.slot!==undefined))))
   throw Error('gathering_custody_physical_mismatch');
  byId.set(row.instanceId,row);sources.add(row.originalChest.sourceKey);
 }
 // Complete world gear inventory, not merely the requested copy.
 for(const [instanceId,locations] of physical)if(WORLD_BOSS_GATHERING_PIECES_V64.some(x=>x.itemId===locations[0].itemId)&&!byId.has(instanceId))
  throw Error('gathering_custody_missing_mint');
 const copy=byId.get(intent.instanceId);
 if(!copy)throw Error('gathering_custody_unknown_item');
 if(input.verifyMoveAllowed(accountId,revision,copy.instanceId,intent.requestId)!==true||readDigest()!==sourceDigest)
  throw Error('gathering_custody_move_rejected');
 const next=structuredClone(state),hero=next.character!;
 const slot=copy.roll.slot as GearSlot;
 const from=copy.location;
 let to:Location;let holder:string|null;
 const take=(bag:GameState['inventory'])=>{
  const index=bag.stacks.findIndex(x=>x.instanceId===copy.instanceId&&x.itemId===copy.roll.itemId&&x.quantity===1);
  if(index<0)throw Error('gathering_custody_wrong_storage');bag.stacks.splice(index,1);
 };
 const put=(bag:GameState['inventory'])=>{
  if(!Number.isSafeInteger(bag.capacity)||bag.stacks.length>=bag.capacity)throw Error('gathering_custody_storage_full');
  bag.stacks.push({itemId:copy.roll.itemId,instanceId:copy.instanceId,quantity:1});
 };
 if(intent.kind==='claim_to_bank'){
  if(from!=='unclaimed')throw Error('gathering_custody_already_claimed');
  put(next.bank);to='bank';holder=null;
 }else if(intent.kind==='withdraw_bank'){
  if(from!=='bank')throw Error('gathering_custody_wrong_location');
  take(next.bank);put(next.inventory);to='inventory';holder=c.id;
 }else if(intent.kind==='deposit_bank'){
  if(from!=='inventory'||copy.holderCharacterId!==c.id)throw Error('gathering_custody_wrong_owner_or_location');
  take(next.inventory);put(next.bank);to='bank';holder=null;
 }else if(intent.kind==='equip'){
  if(from!=='inventory'||copy.holderCharacterId!==c.id)throw Error('gathering_custody_wrong_owner_or_location');
  if(hero.equipment[slot]||hero.equipmentInstanceIds?.[slot])throw Error('gathering_custody_slot_occupied');
  // Until a canonical mixed weapon compiler is consolidated, fail closed on
  // any existing opposite hand (even one-handed legacy gear).
  if((slot==='weapon'&&hero.equipment.offhand)||(slot==='offhand'&&hero.equipment.weapon))
   throw Error('gathering_custody_hand_conflict');
  take(next.inventory);hero.equipment={...hero.equipment,[slot]:copy.roll.itemId};
  hero.equipmentInstanceIds={...hero.equipmentInstanceIds,[slot]:copy.instanceId};to='equipped';holder=c.id;
 }else{
  if(from!=='equipped'||copy.holderCharacterId!==c.id||hero.equipmentInstanceIds?.[slot]!==copy.instanceId)
   throw Error('gathering_custody_wrong_owner_or_location');
  put(next.inventory);hero.equipment={...hero.equipment};delete hero.equipment[slot];
  hero.equipmentInstanceIds={...hero.equipmentInstanceIds};delete hero.equipmentInstanceIds[slot];to='inventory';holder=c.id;
 }
 const nextCopy={...copy,location:to,holderCharacterId:holder};
 const nextCopies=rows.map(row=>row.instanceId===copy.instanceId?nextCopy:structuredClone(row));
 const after=readWorldBossGatheringPhysicalV100(next,input.ownedCharacterIds).get(copy.instanceId)?.[0];
 if(!after||after.itemId!==copy.roll.itemId||after.owner!==holder||
 (to==='equipped'?after.slot!==slot:after.slot!==undefined))throw Error('gathering_custody_candidate_mismatch');
 const receipt={accountId,requestId:intent.requestId,instanceId:copy.instanceId,sourceKey:copy.originalChest.sourceKey,
  from,to,oldHolder:copy.holderCharacterId,newHolder:holder,sourceRevision:revision,nextRevision:revision+1,sourceDigest,
  candidateDigest:gatheringSnapshotDigestV100({state:next,copies:nextCopies})};
 return {candidateState:next,candidateCopies:nextCopies,receipt,receiptDigest:gatheringSnapshotDigestV100(receipt),
  persisted:false as const,canCommit:false as const,releaseReady:false as const};
}
