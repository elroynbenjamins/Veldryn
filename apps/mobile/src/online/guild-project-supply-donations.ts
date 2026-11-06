import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './supabase';

export interface PendingGuildProjectSupplyDonation{
 projectId:string;itemId:string;quantity:number;requestKey:string;
}
export interface GuildProjectSupplyDonationReceipt{
 alreadyProcessed:boolean;itemId:string;quantity:number;supplyValue?:number;remaining?:number;category?:string;
}

const keyFor=async()=>{
 if(!supabase)throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in to donate supplies to your Guild.');
 return 'guild-project-supply-pending:'+session.user.id;
};

const readableErrors:Readonly<Record<string,string>>={
 GUILD_MEMBERSHIP_REQUIRED:'Join a Guild to donate.',
 GUILD_PROJECT_DONATION_CLOSED:'This Guild Project no longer accepts donations.',
 GUILD_PROJECT_SUPPLY_NOT_ACCEPTED:'Only common wood, fish and ores are accepted.',
 GUILD_PROJECT_SUPPLY_CATEGORY_NOT_REQUIRED:'This project does not need that resource.',
 GUILD_PROJECT_SUPPLY_TARGET_EXCEEDED:'The project already has enough of this resource.',
 GUILD_PROJECT_PERSONAL_SUPPLY_CAP:'You have reached your share of this supply goal. Other guildmates can contribute.',
 GUILD_PROJECT_ITEM_LOCKED:'Unlock this item in your inventory before donating it.',
 GUILD_PROJECT_INSUFFICIENT_ITEMS:'You do not have enough unlocked items.',
 GUILD_PROJECT_DONATION_REQUEST_CONFLICT:'Your saved donation no longer matches. Review it before retrying.',
 CHARACTER_REQUIRED:'Select a character before donating.',
 INVALID_GUILD_PROJECT_DONATION:'Choose a valid donation amount.',
};

export async function pendingGuildProjectSupplyDonation():Promise<PendingGuildProjectSupplyDonation|null>{
 const raw=await AsyncStorage.getItem(await keyFor());
 if(!raw)return null;
 let value:unknown;
 try{value=JSON.parse(raw)}catch{throw new Error('Saved Guild Project donation is unreadable.')}
 if(!value||typeof value!=='object')throw new Error('Saved Guild Project donation is invalid.');
 const v=value as Record<string,unknown>;
 if(typeof v.projectId!=='string'||!/^[0-9a-f-]{36}$/i.test(v.projectId)
 ||typeof v.itemId!=='string'||v.itemId.length>80
 ||!Number.isSafeInteger(v.quantity)||Number(v.quantity)<1||Number(v.quantity)>10000
 ||typeof v.requestKey!=='string'||!/^[A-Za-z0-9_-]{8,96}$/.test(v.requestKey))
 throw new Error('Saved Guild Project donation is invalid.');
 return v as unknown as PendingGuildProjectSupplyDonation;
}
export async function discardPendingGuildProjectSupplyDonation(){
 await AsyncStorage.removeItem(await keyFor());
}

/** Persist the receipt before the RPC. A timeout can only retry the same request,
 * never spend the same inventory twice. The server enforces all limits atomically. */
export async function donateOnlineGuildProjectSupplies(input:{
 projectId:string;itemId:string;quantity:number;
}):Promise<GuildProjectSupplyDonationReceipt>{
 if(!supabase)throw new Error('Online services are unavailable.');
 if(!Number.isSafeInteger(input.quantity)||input.quantity<1||input.quantity>10000)
 throw new Error('Enter a valid quantity.');
 const storageKey=await keyFor();
 const pending=await pendingGuildProjectSupplyDonation();
 if(pending&&(pending.projectId!==input.projectId||pending.itemId!==input.itemId||pending.quantity!==input.quantity))
 throw new Error('Resolve your previous Guild donation before starting another.');
 const request:PendingGuildProjectSupplyDonation=pending??{
  ...input,requestKey:'choice-'+Date.now()+'-'+Math.random().toString(36).slice(2,14),
 };
 if(!pending)await AsyncStorage.setItem(storageKey,JSON.stringify(request));
 let data:unknown,error:unknown;
 try{
  const response=await supabase.rpc('guild_project_supply_donate_v1',{
   p_project:request.projectId,p_item_id:request.itemId,
   p_quantity:request.quantity,p_request_key:request.requestKey,
  });
  data=response.data;error=response.error;
 }catch(reason){throw new Error('Donation confirmation unavailable. Retry your saved donation.')}
 if(error){
  const message=typeof (error as {message?:unknown}).message==='string'?(error as {message:string}).message:'';
  const found=Object.entries(readableErrors).find(([code])=>message.includes(code));
  if(found){await AsyncStorage.removeItem(storageKey);throw new Error(found[1]);}
  throw new Error('Donation confirmation unavailable. Retry your saved donation.');
 }
 if(!data||typeof data!=='object'
 ||typeof (data as Record<string,unknown>).alreadyProcessed!=='boolean'
 ||(data as Record<string,unknown>).itemId!==request.itemId
 ||Number((data as Record<string,unknown>).quantity)!==request.quantity)
 throw new Error('Donation receipt is incomplete. Retry your saved donation.');
 await AsyncStorage.removeItem(storageKey);
 return data as GuildProjectSupplyDonationReceipt;
}
