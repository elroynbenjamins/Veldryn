import {supabase} from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
export interface GuildShopOffer{id:string;name:string;itemId:string;quantity:number;cost:number;weeklyLimit:number;purchased:number;regionId:string;regionName:string;requiredLevel:number;requiredRouteId:string|null;lockReason:string|null}
export interface GuildShopSnapshot{joined:boolean;balance:number;earned:number;spent:number;credited:number;weekKey:string;resetsAt:string;offers:GuildShopOffer[]}
function client(){if(!supabase)throw new Error('Online services are not configured.');return supabase;}
export async function loadGuildShop():Promise<GuildShopSnapshot>{
 const {data,error}=await client().rpc('guild_shop_state_v1');if(error)throw new Error(error.message);return data as GuildShopSnapshot;
}
export interface PendingGuildPurchase{offerId:string;requestId:string}
async function purchaseKey(){const {data}=await client().auth.getSession();if(!data.session)throw new Error('Sign in to use the guild shop.');return 'guild-shop-pending:'+data.session.user.id;}
export async function pendingGuildPurchase():Promise<PendingGuildPurchase|null>{const value=await AsyncStorage.getItem(await purchaseKey());return value?JSON.parse(value):null;}
// Persist the request before sending it: even closing the app during a timeout is safe.
export async function buyGuildShopOffer(offerId:string):Promise<void>{
 const key=await purchaseKey(),saved=await AsyncStorage.getItem(key);
 const pending:PendingGuildPurchase=saved?JSON.parse(saved):{offerId,requestId:'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return (c==='x'?n:(n&3)|8).toString(16);})};
 if(pending.offerId!==offerId)throw new Error('Resolve your pending purchase before buying another supply pack.');
 await AsyncStorage.setItem(key,JSON.stringify(pending));
 const {error}=await client().rpc('guild_shop_buy_v1',{p_offer_id:offerId,p_request_id:pending.requestId});
 if(error){if(error.code==='P0001')await AsyncStorage.removeItem(key);throw new Error(error.message);}
 await AsyncStorage.removeItem(key);
}
