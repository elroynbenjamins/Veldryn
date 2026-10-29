import {itemDef} from '../content/items';
import {TARGET_CRAFTED_GEAR_COPIES_PER_ITEM} from './crafted-gear-instances';
import type {CraftedGearInstance} from './types';
import {
  craftedGearCanAutoSell,
  planCraftedGearRetention,
  type CraftedGearAutoSellMode,
  type CraftedGearRetentionDecision,
  type CraftedGearRetentionEntry,
} from './crafted-gear-retention';

export interface CraftedGearSaleCredit {
  amount:number;
  /** If the sold copy was in Bank, its proceeds remain in Bank. */
  destination:'bank'|'character';
  /** Required for Character Gold; do not credit the active character by default. */
  characterId?:string;
}

export interface CraftedGearRetentionReceipt {
  receiptKey:string;
  incomingInstanceId:string;
  action:'keep'|'sell_incoming'|'sell_existing';
  soldInstanceId?:string;
  credit?:CraftedGearSaleCredit;
}

/** A proposed authoritative write, not a client-side inventory mutation. */
export type CraftedGearSettlementProposal=
  |{status:'ready';instances:CraftedGearInstance[];receipt:CraftedGearRetentionReceipt;retention:CraftedGearRetentionDecision}
  |{status:'blocked';instances:CraftedGearInstance[];retention:CraftedGearRetentionDecision};

/**
 * Prepare a deterministic exact-instance replacement proposal. The caller MUST
 * verify the source entries against current authoritative inventory, Bank,
 * equipped slots, loadouts, enhancement and lock state under a transaction lock.
 *
 * The proposal does not update any legacy itemId stacks, award Gold or commit a
 * claim. Never apply it directly to GameState while legacy paths remain active.
 */
export function proposeCraftedGearSettlement(args:{
  existing:readonly CraftedGearRetentionEntry[];
  incoming:CraftedGearInstance;
  incomingStorage:'inventory'|'bank';
  /** Verified character receiving the fresh item, when not delivered to Bank. */
  incomingHolderCharacterId?:string;
  mode:CraftedGearAutoSellMode;
  committedReceiptKeys:readonly string[];
}):CraftedGearSettlementProposal{
  const {existing,incoming,incomingStorage,mode,committedReceiptKeys}=args;
  if(incomingStorage==='inventory'&&(!args.incomingHolderCharacterId||!args.incomingHolderCharacterId.trim()))
    throw new Error('Missing verified incoming inventory owner');
  if(!incoming.id||!incoming.sourceReceiptKey||!incoming.ownerCharacterId)
    throw new Error('Invalid Forge instance receipt');
  if(committedReceiptKeys.includes(incoming.sourceReceiptKey)
    ||existing.some(entry=>entry.instance.sourceReceiptKey===incoming.sourceReceiptKey))
    throw new Error('Forge receipt already settled');
  if(existing.some(entry=>!entry.instance.id||!entry.instance.sourceReceiptKey)
    ||new Set(existing.map(entry=>entry.instance.sourceReceiptKey)).size!==existing.length)
    throw new Error('Duplicate or malformed owned Forge receipts');
  if(existing.some(entry=>entry.instance.itemId!==incoming.itemId))
    throw new Error('Cannot compare equipment from different item definitions');
  if(!['inventory','bank'].includes(incomingStorage))
    throw new Error('Unknown incoming item delivery location');

  const owned=existing.map(entry=>entry.instance);
  const retention=planCraftedGearRetention(existing,incoming,mode);
  if(retention.action==='manual_review')return {status:'blocked',instances:owned,retention};
  if(retention.action==='keep')
    return {status:'ready',instances:[...owned,incoming],retention,receipt:{receiptKey:incoming.sourceReceiptKey,incomingInstanceId:incoming.id,action:'keep'}};

  const sold=retention.action==='sell_incoming'
    ?incoming
    :existing.find(entry=>entry.instance.id===retention.instanceId)?.instance;
  if(!sold)throw new Error('Selected auto-sale copy is missing');
  if(retention.action==='sell_existing'){
    const candidate=existing.find(entry=>entry.instance.id===sold.id);
    if(!candidate||!craftedGearCanAutoSell(candidate))throw new Error('Selected auto-sale copy is not verified or protected');
  }
  const def=itemDef(sold.itemId);
  if(def.type!=='gear'||!Number.isSafeInteger(def.value)||def.value<0)throw new Error('Invalid vendor value');
  const location=retention.action==='sell_incoming'?incomingStorage:existing.find(entry=>entry.instance.id===sold.id)!.location;
  const currentHolder=retention.action==='sell_incoming'
    ?args.incomingHolderCharacterId
    :existing.find(entry=>entry.instance.id===sold.id)?.holderCharacterId;
  if(location==='inventory'&&!currentHolder)throw new Error('Missing verified sale recipient');
  const credit:CraftedGearSaleCredit=location==='bank'
    ?{amount:def.value,destination:'bank'}
    :{amount:def.value,destination:'character',characterId:currentHolder};
  const instances=retention.action==='sell_incoming'
    ?owned
    :[...owned.filter(row=>row.id!==sold.id),incoming];
  if(instances.length>TARGET_CRAFTED_GEAR_COPIES_PER_ITEM)throw new Error('Retention proposal exceeds crafted equipment limit');

  return {status:'ready',instances,retention,receipt:{
    receiptKey:incoming.sourceReceiptKey,incomingInstanceId:incoming.id,
    action:retention.action,soldInstanceId:sold.id,credit,
  }};
}
