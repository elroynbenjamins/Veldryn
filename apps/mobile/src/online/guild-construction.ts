import {versionedFetch as fetch} from './versioned-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase,supabasePublicEndpoint,supabasePublicKey} from './supabase';

export interface PendingGuildDonation{
 templateId:string;resourceId:string;amount:number;requestKey:string;
}
type DonationResult={alreadyProcessed:boolean;completed:boolean};
const knownDonationsRejections:Readonly<Record<string,string>>={
 insufficient_gold:'You do not have enough Gold to contribute that amount.',
 insufficient_construction_materials:'You do not have enough of that material in your inventory.',
 insufficient_guild_bank_balance:'Not enough of this resource is available in the Guild Bank. Deposit more supplies first.',
 construction_resource_target_exceeded:'Another member completed this resource goal. Refresh and choose a smaller amount.',
 construction_already_completed:'Your guild has already finished this project.',
 construction_donations_not_released:'This construction project is not open for donations yet.',
 guild_level_locked:'Your guild has not unlocked this construction project.',
 guild_membership_required:'You must be in a guild to contribute.',
 guild_construction_request_conflict:'That saved donation receipt no longer matches. Refresh the project before donating.',
};

async function currentSession(){
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)
  throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in to contribute to Guild Construction.');
 return session;
}
async function pendingKey(){
 const session=await currentSession();
 return `guild-construction-pending:${session.user.id}`;
}
function validPending(value:unknown):value is PendingGuildDonation{
 if(!value||typeof value!=='object')return false;
 const row=value as Record<string,unknown>;
 return typeof row.templateId==='string'&&row.templateId.length<=100
  &&typeof row.resourceId==='string'&&row.resourceId.length<=100
  &&typeof row.requestKey==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(row.requestKey)
  &&Number.isSafeInteger(row.amount)&&Number(row.amount)>0&&Number(row.amount)<=1000000;
}
export async function pendingGuildConstructionDonation():Promise<PendingGuildDonation|null>{
 const stored=await AsyncStorage.getItem(await pendingKey());
 if(!stored)return null;
 let candidate:unknown;
 try{candidate=JSON.parse(stored);}catch{throw new Error('Saved Guild donation is damaged. Clear the local request before donating again.');}
 if(!validPending(candidate))throw new Error('Saved Guild donation is invalid.');
 return candidate;
}
export async function discardPendingGuildConstructionDonation(){
 await AsyncStorage.removeItem(await pendingKey());
}
/** The same receipt survives retries, app closures and network timeouts.
 * A new donation cannot silently replace a receipt that may have succeeded.
 */
export async function donateOnlineGuildConstruction(
 input:{templateId:string;resourceId:string;amount:number}
):Promise<DonationResult>{
 if(!Number.isSafeInteger(input.amount)||input.amount<=0||input.amount>1000000)
  throw new Error('Choose a valid donation amount.');
 const session=await currentSession(),key=await pendingKey();
 const saved=await pendingGuildConstructionDonation();
 if(saved&&(saved.templateId!==input.templateId||saved.resourceId!==input.resourceId||saved.amount!==input.amount))
  throw new Error('Resolve the previous donation request before contributing more resources.');
 const receipt:PendingGuildDonation=saved??{
  ...input,requestKey:`guild-donate-${Date.now()}-${Math.random().toString(36).slice(2,15)}`,
 };
 if(!saved)await AsyncStorage.setItem(key,JSON.stringify(receipt));
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-shop&action=donate`,{
   method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey!,'Content-Type':'application/json'},
   body:JSON.stringify(receipt),
  });
  const result=await response.json();
  if(!response.ok){
   const code=typeof result?.error==='string'?result.error:'';
   if(Object.prototype.hasOwnProperty.call(knownDonationsRejections,code)){
    // Authoritative SQL rejected the transaction, so nothing was deducted.
    // Clear the failed receipt; network failures still preserve theirs.
    await AsyncStorage.removeItem(key);
    throw new Error(knownDonationsRejections[code]);
   }
   throw new Error('Guild donation status unknown. Retry the same receipt.');
  }
  if(typeof result?.alreadyProcessed!=='boolean'||typeof result?.completed!=='boolean')
   throw new Error('Guild donation status unknown. Retry the same receipt.');
  await AsyncStorage.removeItem(key);
  return {alreadyProcessed:result.alreadyProcessed,completed:result.completed};
 }finally{clearTimeout(timeout);}
}
