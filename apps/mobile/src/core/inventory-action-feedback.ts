import {itemDef} from '../content/items';
import type {GameState} from './types';

export type InventoryFeedbackRequest=
 | {kind:'deposit';itemId:string;quantity:number}
 | {kind:'withdraw';itemId:string;quantity:number}
 | {kind:'sell';itemId:string;quantity:number}
 | {kind:'salvage';itemId:string;quantity:number}
 | {kind:'bulk_transfer';direction:'deposit'|'withdraw';stacks:number;units:number}
 | {kind:'bulk_sell';stacks:number;units:number;gold:number}
 | {kind:'bulk_salvage';stacks:number;units:number};

export interface InventoryFeedbackIntent{
 request:InventoryFeedbackRequest;
 itemName?:string;
 expectedGold?:number;
 salvageRewardId?:string;
 salvageRewardName?:string;
 salvageRewardQuantity?:number;
 before:{inventoryItem:number;bankItem:number;gold:number;rewardTotal:number;inventoryUnits:number;bankUnits:number};
}
export interface InventoryActionFeedback{message:string;tone:'success'|'info';}

const itemQty=(state:GameState,location:'inventory'|'bank',itemId:string)=>state[location].stacks.filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0);
const totalQty=(state:GameState,itemId:string)=>itemQty(state,'inventory',itemId)+itemQty(state,'bank',itemId);
const units=(state:GameState,location:'inventory'|'bank')=>state[location].stacks.reduce((sum,row)=>sum+row.quantity,0);

export function inventoryFeedbackIntent(state:GameState,request:InventoryFeedbackRequest):InventoryFeedbackIntent{
 const itemId='itemId' in request?request.itemId:undefined,item=itemId?itemDef(itemId):undefined,salvage=item?.salvage;
 return {
  request,itemName:item?.name,expectedGold:request.kind==='sell'?(item?.value??0)*request.quantity:request.kind==='bulk_sell'?request.gold:undefined,salvageRewardId:salvage?.itemId,salvageRewardName:salvage?itemDef(salvage.itemId).name:undefined,salvageRewardQuantity:salvage?.quantity,
  before:{
   inventoryItem:itemId?itemQty(state,'inventory',itemId):0,
   bankItem:itemId?itemQty(state,'bank',itemId):0,
   gold:state.character?.gold??0,
   rewardTotal:salvage?totalQty(state,salvage.itemId):0,
   inventoryUnits:units(state,'inventory'),
   bankUnits:units(state,'bank'),
  },
 };
}

/** Returns feedback only after the requested inventory mutation is visible in committed state. */
export function resolveInventoryActionFeedback(intent:InventoryFeedbackIntent,state:GameState):InventoryActionFeedback|null{
 const request=intent.request;
 if(request.kind==='deposit'){
  const inv=itemQty(state,'inventory',request.itemId),bank=itemQty(state,'bank',request.itemId);
  if(inv>intent.before.inventoryItem-request.quantity||bank<intent.before.bankItem+request.quantity)return null;
  return {message:`Deposited ${request.quantity}× ${intent.itemName??'item'} to Bank.`,tone:'info'};
 }
 if(request.kind==='withdraw'){
  const inv=itemQty(state,'inventory',request.itemId),bank=itemQty(state,'bank',request.itemId);
  if(bank>intent.before.bankItem-request.quantity||inv<intent.before.inventoryItem+request.quantity)return null;
  return {message:`Withdrew ${request.quantity}× ${intent.itemName??'item'} to Inventory.`,tone:'info'};
 }
 if(request.kind==='sell'){
  const inv=itemQty(state,'inventory',request.itemId),gold=state.character?.gold??0,expected=intent.expectedGold??0;
  if(gold<intent.before.gold+expected&&inv>=intent.before.inventoryItem)return null;
  return {message:`Sold ${intent.itemName??'item'} · +${expected.toLocaleString()} Gold.`,tone:'success'};
 }
 if(request.kind==='salvage'){
  const inv=itemQty(state,'inventory',request.itemId);if(inv>=intent.before.inventoryItem)return null;
  const gained=intent.salvageRewardId?Math.max(0,totalQty(state,intent.salvageRewardId)-intent.before.rewardTotal):intent.salvageRewardQuantity??0;
  return {message:`Salvaged ${intent.itemName??'equipment'}${intent.salvageRewardName?` · +${gained||(intent.salvageRewardQuantity??0)} ${intent.salvageRewardName}`:''}.`,tone:'success'};
 }
 if(request.kind==='bulk_transfer'){
  const inv=units(state,'inventory'),bank=units(state,'bank'),deposit=request.direction==='deposit';
  const committed=deposit?inv<intent.before.inventoryUnits&&bank>intent.before.bankUnits:bank<intent.before.bankUnits&&inv>intent.before.inventoryUnits;
  if(!committed)return null;
  return {message:`Bulk ${deposit?'deposit':'withdrawal'} complete · ${request.stacks} stack${request.stacks===1?'':'s'} · ${request.units} item${request.units===1?'':'s'} moved.`,tone:'info'};
 }
 if(request.kind==='bulk_sell'){
  const gold=state.character?.gold??0,expected=intent.expectedGold??request.gold;if(gold<intent.before.gold+expected)return null;
  return {message:`Bulk sale complete · ${request.stacks} stack${request.stacks===1?'':'s'} · +${expected.toLocaleString()} Gold.`,tone:'success'};
 }
 if(units(state,'inventory')>=intent.before.inventoryUnits)return null;
 return {message:`Bulk salvage complete · ${request.stacks} stack${request.stacks===1?'':'s'} · ${request.units} item${request.units===1?'':'s'} processed.`,tone:'success'};
}
