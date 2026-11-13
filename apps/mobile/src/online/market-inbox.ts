import {PLAYER_MARKET_RELEASED,MARKET_AUTHENTICATED_SERVICE_READY} from '../core/release-flags';
import {supabase} from './supabase';

/** Market-related inbox data is completely separate from guild/event rewards.
 * Server-side account ownership, Gold settlement and delivery claims must be
 * activated together before PLAYER_MARKET_RELEASED may be switched on.
 */
export type MarketInboxKind='purchased'|'sold'|'returned';
export type MarketInboxStatus='ready'|'claimed'|'credited';
export type MarketInboxDestination='inventory'|'bank'|'gem_pouch'|'equipment_pouch';
export interface MarketInboxEntry{
  id:string;
  kind:MarketInboxKind;
  deliveryId:string|null;
  itemId:string;
  assetKind:'resource'|'gem'|'equipment';
  quantity:number;
  goldChange:number;
  status:MarketInboxStatus;
  createdAt:string;
  claimedAt:string|null;
}
export interface MarketInboxSnapshot{
  entries:MarketInboxEntry[];
  pendingCount:number;
  total:number;
}

function requireMarket(){
  if(!PLAYER_MARKET_RELEASED||!MARKET_AUTHENTICATED_SERVICE_READY)throw new Error('Player Market is not released.');
  if(!supabase)throw new Error('Sign in to open your market inbox.');
  return supabase;
}

export async function loadMarketInbox(history=false,offset=0):Promise<MarketInboxSnapshot>{
  const client=requireMarket();
  // Future authenticated RPC must use auth.uid(), not a user-provided account ID.
  const {data,error}=await client.rpc('market_inbox_state_v4',{
    p_history:history,p_offset:offset,
  });
  if(error)throw new Error(error.message);
  return data as MarketInboxSnapshot;
}

export async function claimMarketInboxDelivery(
  kind:'purchased'|'returned',
  deliveryId:string,
  destination:MarketInboxDestination,
):Promise<{claimed:boolean;blocked?:boolean;message?:string}>{
  const client=requireMarket();
  if(!deliveryId||!['purchased','returned'].includes(kind)||destination==='equipment_pouch')
    throw new Error('Invalid market delivery.');
  // A future authenticated server wrapper will resolve expected state
  // revision and active character atomically; the client supplies neither.
  const {data,error}=await client.rpc('market_inbox_claim_v4',{
    p_kind:kind,p_delivery_id:deliveryId,p_destination:destination,
  });
  if(error)throw new Error(error.message);
  return data as {claimed:boolean;blocked?:boolean;message?:string};
}

/** Exact Forge gear claims require a target character and a dedicated
 * server-authoritative wrapper; ordinary stack claims cannot accept them.
 * Service remains disabled until that wrapper has been audited and deployed.
 */
export async function claimMarketInboxEquipmentDelivery(
 kind:'purchased'|'returned',deliveryId:string,
 destination:'inventory'|'bank'|'equipment_pouch',characterId:string,
):Promise<{claimed:boolean;blocked?:boolean;message?:string}>{
 const client=requireMarket();
 if(!deliveryId||!characterId||!['purchased','returned'].includes(kind)
   ||!['inventory','bank','equipment_pouch'].includes(destination))
   throw new Error('Invalid equipment delivery.');
 // V19: keep acquired Forge copies out of shared storage until an audited
 // cross-character transfer path exists. The server enforces this independently.
 if(kind==='purchased'&&destination==='bank')
   throw new Error('Purchased equipment cannot enter the shared bank yet.');
 const {data,error}=await client.rpc('market_equipment_inbox_claim_v12',{
   p_kind:kind,p_delivery_id:deliveryId,
   p_destination:destination,p_destination_character_id:characterId,
 });
 if(error)throw new Error(error.message);
 return data as {claimed:boolean;blocked?:boolean;message?:string};
}
