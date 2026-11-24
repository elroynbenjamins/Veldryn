import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {supabase} from './supabase';
import {WINTER_HEARTH_GUILD_RELEASED} from '../core/release-flags';
import {winterHearthDonationTrack,winterHearthReceiptMatches} from '../core/winter-hearth-donations';
import type {WinterHearthDonationReceipt} from './winter-hearth-guild';

export type DonationContext={accountId:string;guildId:string;characterId:string;weekStartUtc:string};
export type PendingWinterHearthDonation=DonationContext&{itemId:string;quantity:number;requestKey:string};
const storageKey=(accountId:string)=>'winter-hearth-2026-donation:'+accountId;
const valid=(r:PendingWinterHearthDonation)=>!!r&&typeof r.accountId==='string'&&typeof r.guildId==='string'&&typeof r.characterId==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.weekStartUtc)&&!!winterHearthDonationTrack(r.itemId)&&Number.isSafeInteger(r.quantity)&&r.quantity>=1&&r.quantity<=(winterHearthDonationTrack(r.itemId)==='lights'?250:2500)&&typeof r.requestKey==='string'&&/^[A-Za-z0-9_-]{8,96}$/.test(r.requestKey);
const definite:Record<string,string>={
 WINTER_HEARTH_CONTEXT_CHANGED:'The guild, character or donation week changed. No new donation was made.',
 WINTER_HEARTH_NOT_RELEASED_OR_CLOSED:'The donation window is closed.',
 WINTER_HEARTH_TRACK_FULL:'The guild has enough of this resource. Refresh progress.',
 WINTER_HEARTH_WEEKLY_CAP:'Your weekly donation limit has been reached. Refresh progress.',
 WINTER_HEARTH_ITEM_LOCKED:'Unlock this resource in your inventory first.',
 WINTER_HEARTH_INSUFFICIENT_ITEMS:'Not enough unlocked resources in your inventory.',
 WINTER_HEARTH_GUILD_REQUIRED:'Guild membership is required.',
 WINTER_HEARTH_CHARACTER_REQUIRED:'Select a character first.',
 WINTER_HEARTH_INVALID_DONATION:'Invalid donation amount.',
 WINTER_HEARTH_INVALID_ITEM:'This resource is not accepted.',
};
export async function readPendingWinterHearthDonation(accountId:string):Promise<PendingWinterHearthDonation|null>{
 const raw=await AsyncStorage.getItem(storageKey(accountId));if(!raw)return null;
 const row=JSON.parse(raw) as PendingWinterHearthDonation;
 if(!valid(row)||row.accountId!==accountId)throw new Error('Saved donation is unreadable. Contact support before donating again.');
 return row;
}
let inFlight=false;
export async function submitWinterHearthDonation(context:DonationContext,itemId:string,quantity:number):Promise<WinterHearthDonationReceipt>{
 if(!WINTER_HEARTH_GUILD_RELEASED||!supabase)throw new Error('Winter Hearth is not available.');
 if(inFlight)throw new Error('A donation is already being confirmed.');
 inFlight=true;
 try{
  const {data:{session},error:authError}=await supabase.auth.getSession();
  if(authError||session?.user.id!==context.accountId)throw new Error('Sign in to the correct account before donating.');
  const key=storageKey(context.accountId),old=await readPendingWinterHearthDonation(context.accountId);
  const request=old??{...context,itemId,quantity,requestKey:'wh-'+Crypto.randomUUID()};
  if(!valid(request))throw new Error('Invalid donation.');
  if(old&&(old.itemId!==itemId||old.quantity!==quantity||old.guildId!==context.guildId||old.characterId!==context.characterId||old.weekStartUtc!==context.weekStartUtc))throw new Error('Retry the saved donation before starting another.');
  if(!old)await AsyncStorage.setItem(key,JSON.stringify(request));
  const {data,error}=await supabase.rpc('winter_hearth_2026_donate_v2',{
   p_item_id:request.itemId,p_quantity:request.quantity,p_request_key:request.requestKey,
   p_account_id:request.accountId,p_guild_id:request.guildId,p_character_id:request.characterId,p_week_start:request.weekStartUtc,
  });
  if(error){
   const msg=definite[error.message];
   if(msg&&error.code==='P0001'){await AsyncStorage.removeItem(key);throw new Error(msg);}
   throw new Error('Donation confirmation unavailable. Retry the saved donation.');
  }
  const receipt=data as WinterHearthDonationReceipt;
  if(!winterHearthReceiptMatches(receipt,request))throw new Error('Donation receipt incomplete. Retry the saved donation.');
  await AsyncStorage.removeItem(key);
  return receipt;
 }finally{inFlight=false;}
}
