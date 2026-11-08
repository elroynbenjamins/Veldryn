import {PLAYER_MARKET_RELEASED} from '../core/release-flags';
import {supabase} from './supabase';

/** Market-related inbox data is completely separate from guild/event rewards.
 * Server-side account ownership, Gold settlement and delivery claims must be
 * activated together before PLAYER_MARKET_RELEASED may be switched on.
 */
export type MarketInboxKind='purchased'|'sold'|'returned';
export type MarketInboxStatus='ready'|'claimed'|'credited';
export type MarketInboxDestination='inventory'|'bank'|'gem_pouch';
export interface MarketInboxEntry{
  id:string;
  kind:MarketInboxKind;
  deliveryId:string|null;
  itemId:string;
  assetKind:'resource'|'gem';
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
  if(!PLAYER_MARKET_RELEASED)throw new Error('Player Market is not released.');
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
  if(!deliveryId||!['purchased','returned'].includes(kind))
    throw new Error('Invalid market delivery.');
  // A future authenticated server wrapper will resolve expected state
  // revision and active character atomically; the client supplies neither.
  const {data,error}=await client.rpc('market_inbox_claim_v4',{
    p_kind:kind,p_delivery_id:deliveryId,p_destination:destination,
  });
  if(error)throw new Error(error.message);
  return data as {claimed:boolean;blocked?:boolean;message?:string};
}
