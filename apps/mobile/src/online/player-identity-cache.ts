import AsyncStorage from '@react-native-async-storage/async-storage';
import type {PlayerBadgeIdentity} from '../core/player-badges';
import type {PlayerNameStylePreference} from '../core/player-name-style';

/**
 * Only already-authorized public identity projections are cached. Artwork is
 * bundled with the client; never download or persist image binaries per user.
 * The viewer-scoped key prevents identities crossing sign-in boundaries.
 */
export type CachedPlayerIdentity={
 profile_icon_id:string|null;class_id:string|null;guild_tag:string|null;
 guild_tag_color_id:string|null;player_name_style:PlayerNameStylePreference|null;
 player_badges:PlayerBadgeIdentity|undefined;
};
type Entry={value:CachedPlayerIdentity;fetchedAt:number};
type Saved={version:1;entries:[string,Entry][]};
export const PLAYER_IDENTITY_TTL_MS=24*60*60*1000;
const MAX_ENTRIES=500;
const STORAGE_PREFIX='veldryn:public-player-identities:v1:';
const entries=new Map<string,Entry>();
const listeners=new Set<(accountId:string)=>void>();
let currentViewer='',ready:Promise<void>=Promise.resolve(),saveTimer:ReturnType<typeof setTimeout>|undefined;

function trimCache(){
 while(entries.size>MAX_ENTRIES)entries.delete(entries.keys().next().value!);
}
function storageKey(viewer:string){return STORAGE_PREFIX+viewer;}
function scheduleSave(){
 if(!currentViewer||saveTimer)return;
 const viewer=currentViewer;
 saveTimer=setTimeout(()=>{
  saveTimer=undefined;
  if(viewer!==currentViewer)return;
  const snapshot:Saved={version:1,entries:[...entries]};
  void AsyncStorage.setItem(storageKey(viewer),JSON.stringify(snapshot)).catch(()=>{});
 },250);
}
export async function ensurePlayerIdentityViewer(viewer:string){
 if(viewer===currentViewer){await ready;return;}
 if(saveTimer){clearTimeout(saveTimer);saveTimer=undefined;}
 currentViewer=viewer;entries.clear();
 if(!viewer){ready=Promise.resolve();return;}
 ready=AsyncStorage.getItem(storageKey(viewer)).then(raw=>{
  if(viewer!==currentViewer||!raw)return;
  const data=JSON.parse(raw) as Saved;
  if(data?.version!==1||!Array.isArray(data.entries))return;
  for(const [id,entry] of data.entries){
   if(typeof id==='string'&&entry&&Number.isFinite(entry.fetchedAt)&&entry.value&&typeof entry.value==='object'){
    entries.set(id,entry);
   }
  }
  trimCache();
 }).catch(()=>{});
 await ready;
}
export function peekPlayerIdentity(id:string){
 const found=entries.get(id);
 if(found){entries.delete(id);entries.set(id,found);}
 return found?.value;
}
export function playerIdentityNeedsRefresh(id:string,now=Date.now()){
 const entry=entries.get(id);
 return !entry||now-entry.fetchedAt>=PLAYER_IDENTITY_TTL_MS||now<entry.fetchedAt;
}
export function storePlayerIdentities(rows:ReadonlyMap<string,CachedPlayerIdentity>,now=Date.now()){
 for(const [id,value] of rows){entries.delete(id);entries.set(id,{value,fetchedAt:now});}
 trimCache();scheduleSave();
}
export function subscribePlayerIdentityChanges(listener:(accountId:string)=>void){
 listeners.add(listener);return()=>{listeners.delete(listener);};
}
/** Called after the owner saves a new icon. Avoids waiting for any polling. */
export function publishOwnProfileIcon(accountId:string,profileIconId:string,classId:string){
 if(!accountId||!currentViewer||currentViewer!==accountId)return;
 const previous=entries.get(accountId)?.value;
 entries.delete(accountId);
 entries.set(accountId,{fetchedAt:Date.now(),value:{
  profile_icon_id:profileIconId,class_id:classId,
  guild_tag:previous?.guild_tag??null,guild_tag_color_id:previous?.guild_tag_color_id??null,
  player_name_style:previous?.player_name_style??null,player_badges:previous?.player_badges,
 }});
 trimCache();scheduleSave();
 for(const listener of listeners)listener(accountId);
}
/** Mark a row stale, e.g. after name-style/badge preference changes. */
export function invalidatePlayerIdentity(accountId:string){
 const previous=entries.get(accountId);
 if(previous)entries.set(accountId,{...previous,fetchedAt:0});
 for(const listener of listeners)listener(accountId);
}
