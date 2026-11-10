import AsyncStorage from '@react-native-async-storage/async-storage';
import {coopClient,type CoopEntryData} from './coop-client';
import {supabase,supabasePublicEndpoint} from './supabase';
import {CoopDungeonBrowseCache,coopEntryMutationRevision,type CoopBrowseCatalog} from '../core/coop-dungeon-browse-cache';
import {presentQModeRun} from '../core/coop-qmode';
import {presentEventExpeditionRun} from '../core/coop-event-expeditions';

export interface CoopEntryLoadOptions {characterId?:string;characterLevel?:number;force?:boolean}
/** Fixture sources remain network/cache independent; only the real source
 * provides a read-only browse snapshot for instant warm starts. */
export interface CoopEntrySource {
 kind:'real'|'fixture';
 load:(options?:CoopEntryLoadOptions)=>Promise<CoopEntryData>;
 cachedDungeons?:(characterId:string)=>Promise<CoopBrowseCatalog|undefined>;
}
const catalogCache=new CoopDungeonBrowseCache(AsyncStorage);
const ENTRY_MEMORY_TTL_MS=60_000;
const latest=new Map<string,{data:CoopEntryData;expiresAtMs:number;mutationRevision:number}>();
const inFlight=new Map<string,{task:Promise<CoopEntryData>;mutationRevision:number}>();
const generations=new Map<string,number>();

async function viewerScope(characterId?:string):Promise<string|undefined>{
 if(!characterId||!supabase)return undefined;
 const session=(await supabase.auth.getSession()).data.session;
 if(!session)return undefined;
 // The same account can have multiple characters and different dungeon locks.
 return [supabasePublicEndpoint??'unknown',session.user.id,characterId].join(':');
}
function cacheableEntry(value:CoopEntryData){
 // Never reuse a stored running/ready-check snapshot as a fresh live run.
 return !value.activeRun&&!value.activeRunProjection&&!value.activeEventRunProjection;
}
function rememberEntry(key:string,data:CoopEntryData){
 latest.delete(key);
 if(cacheableEntry(data))latest.set(key,{data,expiresAtMs:Date.now()+ENTRY_MEMORY_TTL_MS,mutationRevision:coopEntryMutationRevision()});
 while(latest.size>4)latest.delete(latest.keys().next().value!);
}
function presentEntry(entry:CoopEntryData):CoopEntryData{
 return {...entry,activeRun:entry.activeRunProjection?presentQModeRun(entry.activeRunProjection):entry.activeEventRunProjection?presentEventExpeditionRun(entry.activeEventRunProjection):entry.activeRun};
}
export const realCoopEntrySource:CoopEntrySource={
 kind:'real',
 cachedDungeons:async characterId=>{
  const scope=await viewerScope(characterId);
  if(!scope)return undefined;
  const catalog=await catalogCache.read(scope);
  // Don't hydrate a preview from the previous account after a sign-out.
  return scope===await viewerScope(characterId)?catalog:undefined;
 },
 load:async({characterId,characterLevel,force=false}={})=>{
  const scope=await viewerScope(characterId);
  const key=scope?scope+':level:'+String(characterLevel??0):undefined;
  const mutationRevision=coopEntryMutationRevision();
  if(!force&&key){
   const remembered=latest.get(key);
   if(remembered&&remembered.expiresAtMs>Date.now()&&remembered.mutationRevision===mutationRevision)return remembered.data;
   const pending=inFlight.get(key);
   if(pending?.mutationRevision===mutationRevision)return pending.task;
  }
  const generation=key?(generations.get(key)??0)+1:0;
  if(key)generations.set(key,generation);
  const task=(async()=>{
   const entry=presentEntry(await coopClient.entry());
   // If a forced refresh overtook this request, its older result must not
   // replace the newer browse/catalog snapshot.
   if(key&&generations.get(key)===generation&&mutationRevision===coopEntryMutationRevision()&&scope===await viewerScope(characterId)){
    rememberEntry(key,entry);
    void catalogCache.save(scope!,entry.dungeons);
   }
   return entry;
  })();
  if(key){
   inFlight.set(key,{task,mutationRevision});
   void task.finally(()=>{if(inFlight.get(key)?.task===task)inFlight.delete(key);}).catch(()=>{});
  }
  return task;
 },
};
