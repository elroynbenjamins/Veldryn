import AsyncStorage from '@react-native-async-storage/async-storage';
import {OnlineCommandError,OnlineGameRepository,type OnlineSnapshot,type PendingGameCommand} from '../core/online-game-repository';
import {supabase} from './supabase';
declare const process:{env:Record<string,string|undefined>};
export const serverGameplayEnabled=process.env.EXPO_PUBLIC_SERVER_GAMEPLAY==='true';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export function createOnlineGameRepository(accountId:string){
 const pendingKey=`veldryn.online.pending.${accountId}`;
 async function request(body?:PendingGameCommand):Promise<OnlineSnapshot>{
  if(!supabase||!url||!key)throw new Error('Online services are not configured.');
  const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;
  if(!session||session.user.id!==accountId)throw new Error('Please sign in again.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{const response=await fetch(`${url}/functions/v1/gameplay`,{method:body?'POST':'GET',signal:controller.signal,headers:{Authorization:`Bearer ${session.access_token}`,apikey:key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
   const payload=await response.json();if(!response.ok)throw new OnlineCommandError(payload.error??payload.message??'Online service unavailable.',response.status>=400&&response.status<500&&response.status!==408&&response.status!==429);return payload as OnlineSnapshot;
  }finally{clearTimeout(timeout);}
 }
 return new OnlineGameRepository(accountId,{read:()=>request(),send:request},{read:async()=>{const raw=await AsyncStorage.getItem(pendingKey);return raw?JSON.parse(raw):null;},write:async value=>{if(value)await AsyncStorage.setItem(pendingKey,JSON.stringify(value));else await AsyncStorage.removeItem(pendingKey);}},()=>`game-${Date.now()}-${Math.random().toString(36).slice(2,12)}`);
}
