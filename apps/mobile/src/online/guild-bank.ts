import AsyncStorage from '@react-native-async-storage/async-storage';
import {versionedFetch as fetch} from './versioned-fetch';
import {supabase,supabasePublicEndpoint,supabasePublicKey} from './supabase';

export interface PendingGuildBankDeposit{
 resourceId:string;amount:number;requestKey:string;
}
export type GuildBankDepositReceipt={alreadyProcessed:boolean;amount:number;resourceId:string};
const allowedCodes:Readonly<Record<string,string>>={
 guild_membership_required:'Join a Guild before donating.',
 guild_bank_resource_unavailable:'This resource is not required by a released Guild project.',
 guild_bank_item_locked:'Unlock this inventory resource before depositing it.',
 insufficient_gold:'Not enough Gold to deposit.',
 insufficient_construction_materials:'Not enough unlocked material in your inventory.',
 guild_bank_capacity_reached:'This Guild Bank resource has reached its capacity.',
 guild_bank_request_conflict:'Saved deposit receipt does not match. Refresh before retrying.',
 character_required:'Select a character before depositing resources.',
};
async function auth(){
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in before using Guild Bank.');
 return session;
}
async function pendingKey(){
 const session=await auth();
 return 'guild-bank-pending:'+session.user.id;
}
export async function pendingGuildBankDeposit():Promise<PendingGuildBankDeposit|null>{
 const raw=await AsyncStorage.getItem(await pendingKey());
 if(!raw)return null;
 let obj:unknown;
 try{obj=JSON.parse(raw);}catch{throw new Error('Saved Guild Bank deposit is unreadable.');}
 if(!obj||typeof obj!=='object')throw new Error('Saved Guild Bank deposit is invalid.');
 const row=obj as Record<string,unknown>;
 if(typeof row.resourceId!=='string'||row.resourceId.length>100||
    !Number.isSafeInteger(row.amount)||Number(row.amount)<1||Number(row.amount)>1000000||
    typeof row.requestKey!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(row.requestKey))
   throw new Error('Saved Guild Bank deposit is invalid.');
 return row as unknown as PendingGuildBankDeposit;
}
export async function discardPendingGuildBankDeposit(){
 await AsyncStorage.removeItem(await pendingKey());
}
/** Persist before networking; retry keeps the same server receipt and cannot
 * deduct another copy when the original request timed out. */
export async function depositOnlineGuildBank(input:{resourceId:string;amount:number}):Promise<GuildBankDepositReceipt>{
 if(typeof input.resourceId!=='string'||!Number.isSafeInteger(input.amount)||
    input.amount<=0||input.amount>1000000)throw new Error('Enter a valid deposit amount.');
 const session=await auth(),key=await pendingKey();
 const old=await pendingGuildBankDeposit();
 if(old&&(old.resourceId!==input.resourceId||old.amount!==input.amount))
  throw new Error('Resolve the pending Guild Bank deposit first.');
 const request:PendingGuildBankDeposit=old??{
  ...input,requestKey:'guild-bank-'+Date.now()+'-'+Math.random().toString(36).slice(2,15),
 };
 if(!old)await AsyncStorage.setItem(key,JSON.stringify(request));
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
 try{
  const response=await fetch(supabasePublicEndpoint+'/functions/v1/gameplay?view=guild-shop&action=bank-deposit',{
   method:'POST',signal:abort.signal,
   headers:{Authorization:'Bearer '+session.access_token,apikey:supabasePublicKey!,'Content-Type':'application/json'},
   body:JSON.stringify(request),
  });
  const value=await response.json();
  if(!response.ok){
   const code=typeof value?.error==='string'?value.error:'';
   if(Object.prototype.hasOwnProperty.call(allowedCodes,code)){
    await AsyncStorage.removeItem(key);
    throw new Error(allowedCodes[code]);
   }
   throw new Error('Deposit confirmation unavailable. Retry the saved request.');
  }
  if(typeof value?.alreadyProcessed!=='boolean'||value?.resourceId!==input.resourceId||
     value?.amount!==input.amount)
   throw new Error('Deposit receipt is incomplete. Retry the saved request.');
  await AsyncStorage.removeItem(key);
  return value as GuildBankDepositReceipt;
 }finally{clearTimeout(timer);}
}
