import {supabase} from './supabase';
export interface InboxAttachment{kind:string;resourceId:string;name:string;quantity:number}
export interface InboxEntry{id:string;source:'party'|'guild'|'dungeon'|'gift'|'event';title:string;body:string;attachments:InboxAttachment[];createdAt:string;claimedAt:string|null}
export interface InboxSnapshot{entries:InboxEntry[];pendingCount:number;total:number}
async function rpc<T>(name:string,args?:Record<string,unknown>):Promise<T>{if(!supabase)throw new Error('Sign in to open your rewards inbox.');const {data,error}=await supabase.rpc(name,args);if(error)throw new Error(error.message);return data as T;}
export const loadRewardInbox=(history=false,offset=0)=>rpc<InboxSnapshot>('reward_inbox_state_v1',{p_history:history,p_offset:offset});
export const claimInboxReward=(id:string)=>rpc<{alreadyClaimed?:boolean;blocked?:boolean;message?:string}>('reward_inbox_claim_v1',{p_id:id});
export const claimAllInboxRewards=()=>rpc<{claimed:number;blocked:number}>('reward_inbox_claim_all_v1');
