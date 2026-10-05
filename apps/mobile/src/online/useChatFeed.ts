import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {AppState} from 'react-native';
import type {RealtimeChannel} from '@supabase/supabase-js';
import {ChatFeedCache} from '../core/chat-feed-cache';
import {useAuthSession} from './AuthSessionProvider';
import {supabase} from './supabase';

type FeedOptions<T>={key:string;read:()=>Promise<T>;initial:T;active?:boolean;channelType?:'world'|'party';channelId?:string;};
type FeedEntry<T>={accountId:string;cache:ChatFeedCache<T>;consumers:number;start:()=>()=>void;stop:(()=>void)|null;};
const feeds=new Map<string,FeedEntry<unknown>>();
const CHAT_FALLBACK_MS=15000,CHAT_WATCHDOG_MS=60000,CHAT_CHANGE_BATCH_MS=350;
let channelSequence=0;

/** Only active, foreground conversations hold a socket or run a fallback timer. */
function watchFeed<T>(entry:FeedEntry<T>,options:FeedOptions<T>){
 let closed=false,foreground=false,subscribed=false,connection=0;
 let channel:RealtimeChannel|undefined,timer:ReturnType<typeof setTimeout>|undefined,changed:ReturnType<typeof setTimeout>|undefined;
 const clearTimers=()=>{if(timer)clearTimeout(timer);if(changed)clearTimeout(changed);timer=undefined;changed=undefined;};
 const schedule=()=>{
  if(timer)clearTimeout(timer);
  if(closed||!foreground)return;
  const interval=subscribed?CHAT_WATCHDOG_MS:CHAT_FALLBACK_MS;
  // Start the next deadline from the completed read, not from socket startup.
  // Otherwise normal request latency makes every other timer look too early
  // to the cache. Joining an in-flight request must not queue another read.
  timer=setTimeout(()=>{timer=undefined;void entry.cache.refresh(false,interval).finally(schedule);},entry.cache.nextRefreshIn(interval));
 };
 const disconnect=()=>{
  foreground=false;subscribed=false;connection++;clearTimers();
  if(channel){const previous=channel;channel=undefined;void supabase?.removeChannel(previous);}
 };
 const connect=()=>{
  if(closed||foreground)return;
  foreground=true;const current=++connection;
  void entry.cache.refresh().finally(schedule);
  if(supabase&&options.channelType&&options.channelId){
   channel=supabase.channel(`chat:${entry.accountId}:${options.key}:${++channelSequence}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:`channel_id=eq.${options.channelId}`},payload=>{
     if(closed||!foreground||current!==connection||payload.new.channel_type!==options.channelType)return;
     // Re-read through RLS instead of displaying a raw payload. This keeps
     // blocks, moderation and identity presentation authoritative.
     if(!changed)changed=setTimeout(()=>{changed=undefined;void entry.cache.refresh(true);},CHAT_CHANGE_BATCH_MS);
    })
    .subscribe(status=>{
     if(closed||!foreground||current!==connection)return;
     subscribed=status==='SUBSCRIBED';
     // A subscription can reconnect after missed inserts. It can also become
     // ready after the initial HTTP read; both cases need a catch-up read.
     if(subscribed)void entry.cache.refresh(true);
     schedule();
    });
  }
  schedule();
 };
 const appState=AppState.addEventListener('change',next=>{if(next==='active')connect();else disconnect();});
 if(AppState.currentState==='active'||AppState.currentState===null)connect();
 return()=>{closed=true;appState.remove();disconnect();};
}

function getFeed<T>(accountId:string,options:FeedOptions<T>):FeedEntry<T>{
 const key=`${accountId}:${options.key}`;
 const existing=feeds.get(key) as FeedEntry<T>|undefined;
 if(existing)return existing;
 const entry:FeedEntry<T>={accountId,cache:new ChatFeedCache(options.read,options.initial),consumers:0,start:()=>watchFeed(entry,options),stop:null};
 feeds.set(key,entry as FeedEntry<unknown>);
 // World has four channels. Bound old Party histories without evicting a
 // mounted panel: an inactive panel still retains its cache reference.
 // Private chat is never persisted to device storage.
 if(feeds.size>16){for(const [oldKey,oldEntry] of feeds){if(oldEntry.consumers===0&&!oldEntry.cache.hasSubscribers&&oldEntry!==entry){oldEntry.cache.dispose();feeds.delete(oldKey);if(feeds.size<=16)break;}}}
 return entry;
}

export function useChatFeed<T>(options:FeedOptions<T>){
 const {session}=useAuthSession(),accountId=session?.user.id??'',active=options.active??true;
 const entry=useMemo(()=>accountId?getFeed(accountId,options):null,[accountId,options.key]);
 const empty=useMemo(()=>({value:options.initial,error:''}),[accountId,options.key]);
 const snapshot=useSyncExternalStore(entry?.cache.subscribe??(()=>()=>{}),entry?.cache.getSnapshot??(()=>empty),entry?.cache.getSnapshot??(()=>empty));
 useEffect(()=>{
  // Changing accounts and signing out invalidate even dormant cached panels.
  // In-flight reads retain their old entry and cannot populate a new account.
  for(const [key,cached] of feeds){if(cached.accountId!==accountId){cached.stop?.();cached.stop=null;cached.cache.dispose();feeds.delete(key);}}
 },[accountId]);
 useEffect(()=>{
  if(!entry||!active||!supabase)return;
  entry.consumers++;
  if(entry.consumers===1)entry.stop=entry.start();
  return()=>{entry.consumers--;if(entry.consumers===0){entry.stop?.();entry.stop=null;}};
 },[entry,active]);
 return {...snapshot,accountId,refresh:()=>entry?.cache.refresh(true)??Promise.resolve(),setValue:entry?.cache.setValue??((_update:T|((previous:T)=>T))=>{})};
}
