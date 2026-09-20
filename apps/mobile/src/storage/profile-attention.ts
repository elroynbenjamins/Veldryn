import AsyncStorage from '@react-native-async-storage/async-storage';
import {mergeProfileAttentionKeys,normalizeProfileAttentionKeys} from '../core/profile-attention';

const PREFIX='veldryn.profile.attention.v1:';
const storageKey=(scope:string)=>PREFIX+scope;

export async function loadProfileAttentionKeys(scope:string){
 const raw=await AsyncStorage.getItem(storageKey(scope));
 if(!raw)return [] as string[];
 try{
  const parsed=JSON.parse(raw);
  return Array.isArray(parsed)?normalizeProfileAttentionKeys(parsed):[];
 }catch{return [];}
}

export async function addProfileAttentionKeys(scope:string,keys:readonly string[]){
 if(!keys.length)return;
 const current=await loadProfileAttentionKeys(scope);
 const next=mergeProfileAttentionKeys(current,keys);
 await AsyncStorage.setItem(storageKey(scope),JSON.stringify(next));
}

export async function clearProfileAttentionKeys(scope:string){
 await AsyncStorage.removeItem(storageKey(scope));
}
