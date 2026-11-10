import AsyncStorage from '@react-native-async-storage/async-storage';
import {coopClient,type CoopEntryData} from './coop-client';
import {supabase,supabasePublicEndpoint} from './supabase';
import {CoopDungeonBrowseCache,type CoopBrowseCatalog} from '../core/coop-dungeon-browse-cache';
import {presentQModeRun} from '../core/coop-qmode';
import {presentEventExpeditionRun} from '../core/coop-event-expeditions';

export interface CoopEntryLoadOptions {characterId?:string;force?:boolean}
/** Fixture sources remain network/cache independent; only the real source
 * provides a read-only browse snapshot for instant warm starts. */
export interface CoopEntrySource {
 kind:'real'|'fixture';
 load:(options?:CoopEntryLoadOptions)=>Promise<CoopEntryData>;
 cachedDungeons?:(characterId:string)=>Promise<CoopBrowseCatalog|undefined>;
}
const catalogCache=new CoopDungeonBrowseCache(AsyncStorage);
const ENTRY_MEMORY_TTL_MS=60_000;
const latest=new Map<string,{data:CoopEntryData;expiresAtMs:number}>();
const inFlight=new Map<string,Promise<CoopEntryData>>();

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
 if(cacheableEntry(data))latest.set(key,{data,expiresAtMs:Date.now()+ENTRY_MEMORY_TTL_MS});
 while(latest.size>4)latest.delete(latest.keys().next().value!);
}
function presentEntry(entry:CoopEntryData):CoopEntryData{
 return {...entry,activeRun:entry.activeRunProjection?presentQModeRun(entry.activeRunProjection):entry.activeEventRunProjection?presentEventExpeditionRun(entry.activeEventRunProjection):entry.activeRun};
}
export const realCoopEntrySource:CoopEntrySource={
 kind:'real',
 cachedDungeons:async characterId=>{
  const scope=await viewerScope(characterId);
  return scope?catalogCache.read(scope):undefined;
 },
 load:async({characterId,force=false}={})=>{
  const scope=await viewerScope(characterId);
  if(!force&&scope){
   const remembered=latest.get(scope);
   if(remembered&&remembered.expiresAtMs>Date.now())return remembered.data;
   const pending=inFlight.get(scope);
   if(pending)return pending;
  }
  const task=(async()=>{
   const entry=presentEntry(await coopClient.entry());
   // The request() transport independently checks that the authorization
   // account did not change. Don't persist an old character's projection.
   if(scope&&scope===await viewerScope(characterId)){
    rememberEntry(scope,entry);
    void catalogCache.save(scope,entry.dungeons);
   }
   return entry;
  })();
  if(scope){
   inFlight.set(scope,task);
   void task.finally(()=>{if(inFlight.get(scope)===task)inFlight.delete(scope);}).catch(()=>{});
  }
  return task;
 },
};
