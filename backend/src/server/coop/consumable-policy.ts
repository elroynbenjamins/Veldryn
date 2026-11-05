import {healingPotionFraction} from '../../shared/healing-potion-catalog';
/** Minimal portable shape: never pull React Native modules into the backend compiler. */
export interface DungeonPotionItemStack {itemId:string;quantity:number;instanceId?:string;}
export interface DungeonPotionCharacterState {character:{id:string;equippedHealingPotionId?:string}|null;inventory:{stacks:DungeonPotionItemStack[];};}
import type {PersistentRunState} from '../expeditions/node-resolution';

export const DUNGEON_FOOD_ALLOWED=false;
/** Per-character, per-run crafted potion allowance. Food is disabled and healing always spends authoritative inventory. */
export const DUNGEON_POTION_CHARGES_BY_TIER={1:3,2:3,3:4,4:4,5:5} as const;
export type DungeonTier=keyof typeof DUNGEON_POTION_CHARGES_BY_TIER;
export function dungeonConsumablePolicy(tier:number){
 if(!Number.isFinite(tier))throw new Error('invalid_dungeon_tier');
 const safe=Math.max(1,Math.min(5,Math.floor(tier))) as DungeonTier;
 return {foodAllowed:DUNGEON_FOOD_ALLOWED,potionCharges:DUNGEON_POTION_CHARGES_BY_TIER[safe]};
}

/**
 * Portable, side-effect-free transaction plan. Production MUST load character
 * inventory and run state on the server and atomically persist both results with
 * a version/CAS check. Never trust a client-supplied DungeonPotionCharacterState or call this from
 * a public route without verifying the authenticated run membership.
 */
export interface DungeonPotionTransaction{
 runId:string;
 tier:number;
 phase:'awaiting_choice'|'completed'|'failed'|string;
 actorId:string;
 ownerCharacterId:string;
 requestId:string;
 persistentState:PersistentRunState;
 characterState:DungeonPotionCharacterState;
 maxHp:number;
}
export interface DungeonPotionReceipt{
 requestId:string;
 actorId:string;
 itemId:string;
 healedHp:number;
 chargesUsed:number;
}
export interface DungeonPotionTransactionResult{
 persistentState:PersistentRunState;
 characterState:DungeonPotionCharacterState;
 receipt:DungeonPotionReceipt;
 replayed:boolean;
 remainingCharges:number;
}
const MAX_RECEIPT_ID_LENGTH=120;
function verifiedInventoryTake(stacks:readonly DungeonPotionItemStack[],itemId:string):DungeonPotionItemStack[]{
 const available=stacks.reduce((n,row)=>n+(row.itemId===itemId&&Number.isSafeInteger(row.quantity)&&row.quantity>0?row.quantity:0),0);
 if(available<1)throw new Error('dungeon_potion_out_of_stock');
 let left=1;
 return stacks.flatMap(row=>{
  if(row.itemId!==itemId||left===0)return [row];
  const used=Math.min(left,row.quantity);left-=used;
  return row.quantity>used?[{...row,quantity:row.quantity-used}]:[];
 });
}
export function planDungeonPotionUse(input:DungeonPotionTransaction):DungeonPotionTransactionResult{
 const {runId,phase,actorId,ownerCharacterId,requestId,persistentState,characterState,maxHp}=input;
 if(!runId.trim()||!actorId.trim()||!ownerCharacterId.trim()||!requestId.trim()||requestId.length>MAX_RECEIPT_ID_LENGTH)throw new Error('invalid_dungeon_potion_request');
 const character=characterState.character;
 if(!character||character.id!==ownerCharacterId||actorId!==ownerCharacterId)throw new Error('dungeon_potion_character_mismatch');
 const actor=persistentState.actors[actorId];if(!actor)throw new Error('dungeon_potion_actor_not_found');
 const cap=dungeonConsumablePolicy(input.tier).potionCharges;
 const already=persistentState.dungeonPotionReceipts?.[requestId];
 const used=persistentState.dungeonPotionChargesUsed??0;
 if(!Number.isSafeInteger(used)||used<0||used>cap)throw new Error('invalid_dungeon_potion_budget');
 if(already){
  if(already.actorId!==actorId||!already.itemId||!Number.isFinite(already.healedHp))throw new Error('dungeon_potion_receipt_conflict');
  return {persistentState,characterState,receipt:already,replayed:true,remainingCharges:cap-used};
 }
 if(phase!=='awaiting_choice')throw new Error('dungeon_potion_run_not_active');
 if(used>=cap)throw new Error('dungeon_potion_charges_exhausted');
 if(actor.downed||!Number.isFinite(actor.hp)||actor.hp<=0)throw new Error('dungeon_potion_actor_downed');
 if(!Number.isFinite(maxHp)||maxHp<=0||actor.hp>=maxHp)throw new Error('dungeon_potion_health_full');
 const itemId=character.equippedHealingPotionId;
 const healFraction=itemId?healingPotionFraction(itemId):undefined;
 if(!itemId||healFraction===undefined)throw new Error('dungeon_healing_potion_not_selected');
 const stacks=verifiedInventoryTake(characterState.inventory.stacks,itemId);
 const heal=Math.min(maxHp-actor.hp,Math.max(1,Math.ceil(maxHp*healFraction)));
 const receipt:DungeonPotionReceipt={requestId,actorId,itemId,healedHp:heal,chargesUsed:used+1};
 const nextState:PersistentRunState={
  ...persistentState,
  actors:{...persistentState.actors,[actorId]:{...actor,hp:actor.hp+heal}},
  dungeonPotionChargesUsed:used+1,
  dungeonPotionReceipts:{...persistentState.dungeonPotionReceipts,[requestId]:receipt},
 };
 const nextCharacter:DungeonPotionCharacterState={...characterState,inventory:{...characterState.inventory,stacks}};
 return {persistentState:nextState,characterState:nextCharacter,receipt,replayed:false,remainingCharges:cap-used-1};
}

/** Only the authenticated run and an idempotency key may cross the public boundary.
 * The backing store MUST load trusted membership, both JSON states and the real
 * actor's max HP under the same database transaction / row locks, call apply(),
 * and commit BOTH changes or neither. */
export interface DungeonPotionAtomicStore{
 transact(
  request:{runId:string;accountId:string;requestId:string},
  apply:(verified:Omit<DungeonPotionTransaction,'requestId'>&{ownerAccountId:string})=>DungeonPotionTransactionResult
 ):Promise<DungeonPotionTransactionResult>;
}
export async function consumeAuthoritativeDungeonPotion(
 store:DungeonPotionAtomicStore,
 request:{runId:string;accountId:string;requestId:string}
):Promise<{receipt:DungeonPotionReceipt;replayed:boolean;remainingCharges:number}>{
 if(!request.accountId.trim()||!request.runId.trim())throw new Error('dungeon_potion_auth_required');
 const result=await store.transact(request,verified=>{
  if(verified.runId!==request.runId||verified.ownerAccountId!==request.accountId)throw new Error('dungeon_potion_owner_mismatch');
  return planDungeonPotionUse({...verified,requestId:request.requestId});
 });
 return {receipt:result.receipt,replayed:result.replayed,remainingCharges:result.remainingCharges};
}
