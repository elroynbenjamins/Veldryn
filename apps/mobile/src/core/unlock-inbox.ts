import type {GameState} from './types';
export type CosmeticUnlockKind='background'|'border'|'title'|'profile_icon';
export interface CosmeticUnlockNotice{key:string;kind:CosmeticUnlockKind;name:string;detail?:string;}
import {profileRewardSource} from './profile-customization';
import {profileIconCollection} from './profile-icons';
import {PROFILE_TITLES} from './profile-unlocks';
import {JOURNAL_TITLES_V42} from './adventurers-journal-v42';

export type UnlockInboxEntry=CosmeticUnlockNotice&{unlockedAtMs:number;seen:boolean};
export const UNLOCK_INBOX_LIMIT=100;
const kinds=new Set(['title','background','border','profile_icon']);
function valid(row:unknown):row is UnlockInboxEntry{
 if(!row||typeof row!=='object')return false;
 const value=row as Partial<UnlockInboxEntry>;
 return typeof value.key==='string'&&value.key.length>0&&value.key.length<=200&&
   typeof value.name==='string'&&value.name.length>0&&value.name.length<=250&&kinds.has(value.kind??'')&&
   typeof value.unlockedAtMs==='number'&&Number.isFinite(value.unlockedAtMs)&&value.unlockedAtMs>0&&typeof value.seen==='boolean';
}
/** Account-local presentation history only; never grants an unlock or mutates player saves. */
export function normalizeUnlockInbox(values:unknown):UnlockInboxEntry[]{
 if(!Array.isArray(values))return [];
 const entries=new Map<string,UnlockInboxEntry>();
 for(const item of values){
  if(!valid(item))continue;
  // Preserve the most recently merged read state; already-earned cosmetics never get re-announced.
  entries.set(item.key,{key:item.key,kind:item.kind,name:item.name,detail:typeof item.detail==='string'?item.detail.slice(0,300):undefined,unlockedAtMs:item.unlockedAtMs,seen:item.seen});
 }
 return [...entries.values()].sort((a,b)=>b.unlockedAtMs-a.unlockedAtMs).slice(0,UNLOCK_INBOX_LIMIT);
}
export function mergeUnlockInbox(existing:readonly UnlockInboxEntry[],incoming:readonly UnlockInboxEntry[]){
 const map=new Map(normalizeUnlockInbox(existing).map(row=>[row.key,row]));
 for(const entry of normalizeUnlockInbox(incoming)){
  const previous=map.get(entry.key);
  if(previous){map.set(entry.key,{...previous,seen:previous.seen||entry.seen});continue;}
  map.set(entry.key,entry);
 }
 return normalizeUnlockInbox([...map.values()]);
}
export function markUnlockInboxSeen(entries:readonly UnlockInboxEntry[]){
 return entries.map(entry=>entry.seen?entry:{...entry,seen:true});
}
export function unreadUnlockCount(entries:readonly UnlockInboxEntry[]){return entries.filter(entry=>!entry.seen).length;}
export function newUnlockInboxEntries(entries:readonly CosmeticUnlockNotice[],atMs:number):UnlockInboxEntry[]{
 return normalizeUnlockInbox(entries.map(entry=>({...entry,unlockedAtMs:atMs,seen:false})));
}
/** Migrate unread keys from older app versions without inventing gameplay rewards. */
export function legacyUnreadUnlockEntries(keys:readonly string[],state:GameState,atMs:number):UnlockInboxEntry[]{
 const icons=new Map(profileIconCollection(state).filter(row=>row.unlocked).map(row=>[row.id,row]));
 const titles=new Map([...PROFILE_TITLES,...JOURNAL_TITLES_V42].map(row=>[row.id,row.name]));
 return normalizeUnlockInbox(keys.flatMap<UnlockInboxEntry>(key=>{
  const sep=key.indexOf(':');if(sep<1)return [];
  const kind=key.slice(0,sep),id=key.slice(sep+1);
  if(!kinds.has(kind)||!id)return [];
  if(kind==='profile_icon'){
   const icon=icons.get(id);
   return icon?[{key,kind:'profile_icon' as const,name:icon.name,detail:icon.source,unlockedAtMs:atMs,seen:false}]:[];
  }
  const source=profileRewardSource(state,kind as 'title'|'background'|'border',id);
  const name=source?.name??(kind==='title'?titles.get(id):undefined)??id.replace(/[_:-]+/g,' ');
  return [{key,kind:kind as 'title'|'background'|'border',name,detail:source?.label,unlockedAtMs:atMs,seen:false}];
 }));
}
