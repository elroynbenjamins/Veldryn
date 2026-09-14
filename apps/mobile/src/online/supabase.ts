import * as SecureStore from 'expo-secure-store';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {chunkedAuthStorage} from '../core/auth-callback';

declare const process:{env:Record<string,string|undefined>};

const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const secureStorage={
  getItem:(storageKey:string)=>SecureStore.getItemAsync(storageKey),
  setItem:(storageKey:string,value:string)=>SecureStore.setItemAsync(storageKey,value),
  removeItem:(storageKey:string)=>SecureStore.deleteItemAsync(storageKey),
};

/** Undefined until the public Expo environment variables have been supplied. */
export const supabase:SupabaseClient|undefined=url&&key?createClient(url,key,{
  auth:{storage:Platform.OS==='web'?AsyncStorage:chunkedAuthStorage(secureStorage),flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:false},
}):undefined;

export const onlineConfigured=Boolean(supabase);
