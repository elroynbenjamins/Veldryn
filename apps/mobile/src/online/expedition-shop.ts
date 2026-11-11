import {supabase} from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExpeditionShopCategory='cosmetic_border'|'cosmetic_icon'|'consumable'|'currency_pack'|'utility';
export type ExpeditionShopLockReason='account_level_locked'|'already_owned'|'weekly_limit_reached';

export interface ExpeditionShopOffer{
 itemId:string;
 category:ExpeditionShopCategory;
 markCost:number;
 requiredAccountLevel:number;
 weeklyLimit:number;
 owned:boolean;
 weeklyPurchased:number;
 lockedReason:ExpeditionShopLockReason|null;
}

export interface ExpeditionShopSnapshot{
 balance:number;
 weekKey:string;
 offers:ExpeditionShopOffer[];
}

function client(){
 if(!supabase)throw new Error('Online services are not configured.');
 return supabase;
}

export async function loadExpeditionShop():Promise<ExpeditionShopSnapshot>{
 const {data,error}=await client().rpc('expedition_shop_state_v1');
 if(error)throw new Error(error.message);
 return data as ExpeditionShopSnapshot;
}

export interface PendingExpeditionPurchase{itemId:string;requestId:string}

async function purchaseKey():Promise<string>{
 const {data}=await client().auth.getSession();
 if(!data.session)throw new Error('Sign in to use the Expedition shop.');
 return 'expedition-shop-pending:'+data.session.user.id;
}

export async function pendingExpeditionPurchase():Promise<PendingExpeditionPurchase|null>{
 const value=await AsyncStorage.getItem(await purchaseKey());
 return value?JSON.parse(value) as PendingExpeditionPurchase:null;
}

function newRequestId():string{
 return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
  const n=Math.floor(Math.random()*16);
  return (c==='x'?n:(n&3)|8).toString(16);
 });
}

/** Persist the request before sending: closing the app mid-flight is safe,
 * the server keyed receipt returns on replay instead of double-charging. */
export async function buyExpeditionShopOffer(itemId:string):Promise<void>{
 const key=await purchaseKey(),saved=await AsyncStorage.getItem(key);
 const pending:PendingExpeditionPurchase=saved?JSON.parse(saved):{itemId,requestId:newRequestId()};
 if(pending.itemId!==itemId)throw new Error('Resolve your pending Expedition purchase before buying another item.');
 await AsyncStorage.setItem(key,JSON.stringify(pending));
 const {error}=await client().rpc('expedition_shop_purchase_v1',{p_item_id:itemId,p_request_id:pending.requestId});
 if(error){
  if(error.code==='P0001')await AsyncStorage.removeItem(key);
  throw new Error(error.message);
 }
 await AsyncStorage.removeItem(key);
}
