import * as SecureStore from 'expo-secure-store';
import {createClient,processLock,type SupabaseClient} from '@supabase/supabase-js';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {chunkedAuthStorage} from '../core/auth-callback';
import {networkRequestCategory,networkRequestMetricsEnabled,recordNetworkRequest} from '../core/network-request-metrics';

declare const process:{env:Record<string,string|undefined>};

const PRODUCTION_SUPABASE_URL='https://nyjwigipamnvpdvpauuv.supabase.co';
const PRODUCTION_SUPABASE_ANON_KEY='sb_publishable_EBP2NTN1cNnwDFFg3idkwg_DiNu5zRo';
// EXPO_PUBLIC values are normally inlined by Metro. Release builds must not
// silently fall back to the demo/offline social UI if EAS fails to inject them.
const url=process.env.EXPO_PUBLIC_SUPABASE_URL??(!__DEV__?PRODUCTION_SUPABASE_URL:undefined);
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??(!__DEV__?PRODUCTION_SUPABASE_ANON_KEY:undefined);
/** Publishable client configuration for authenticated custom Edge GET routes. */
export const supabasePublicEndpoint=url;
export const supabasePublicKey=key;

const secureStorage={
  getItem:(storageKey:string)=>SecureStore.getItemAsync(storageKey),
  setItem:(storageKey:string,value:string)=>SecureStore.setItemAsync(storageKey,value),
  removeItem:(storageKey:string)=>SecureStore.deleteItemAsync(storageKey),
};

/** Counts actual Supabase HTTP requests during an explicitly enabled QA capture.
 * Category and aggregate latency only; never records endpoint parameters or payloads.
 */
const monitoredSupabaseFetch:typeof fetch=(input,init)=>{
 if(!networkRequestMetricsEnabled())return fetch(input,init);
 const source=typeof input==='string'?input:typeof input==='object'&&input&&'url'in input?String(input.url):String(input);
 const category=networkRequestCategory(source),started=Date.now();
 return fetch(input,init).then(response=>{
  recordNetworkRequest(category,Date.now()-started,response.ok);
  return response;
 },error=>{
  recordNetworkRequest(category,Date.now()-started,false);
  throw error;
 });
};

/** Undefined until the public Expo environment variables have been supplied. */
export const supabase:SupabaseClient|undefined=url&&key?createClient(url,key,{
  // In the pinned v2 SDK, updateUser can overwrite tokens from an overlapping
  // automatic refresh. This lock protects SDK-internal session writes; account.ts
  // also orders explicit auth intents, including sign-in paths that bypass it.
  auth:{storage:Platform.OS==='web'?AsyncStorage:chunkedAuthStorage(secureStorage),flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:false,lock:processLock},
  global:{fetch:monitoredSupabaseFetch},
}):undefined;

export const onlineConfigured=Boolean(supabase);
