import type {LiveEventRuntime} from './types';

/** Announcement is shown only once per event edition. */
export interface LiveEventAnnouncementReceipt{eventId:string;startsAtMs:number;shownAtMs:number;}
interface AnnouncementStorage{getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>;}
const storagePrefix='veldryn.live-event-announcement.v1.';

export function normalizeLiveEventAnnouncementReceipt(value:unknown):LiveEventAnnouncementReceipt|undefined{
 if(!value||typeof value!=='object')return undefined;
 const row=value as Partial<LiveEventAnnouncementReceipt>;
 if(typeof row.eventId!=='string'||!row.eventId||!Number.isFinite(row.startsAtMs)||!Number.isFinite(row.shownAtMs))return undefined;
 return {eventId:row.eventId,startsAtMs:Number(row.startsAtMs),shownAtMs:Number(row.shownAtMs)};
}

export function shouldShowLiveEventAnnouncement(runtime:LiveEventRuntime,receipt:LiveEventAnnouncementReceipt|undefined,nowMs=Date.now()){
 if(!runtime.enabled||nowMs<runtime.startsAtMs||nowMs>=runtime.endsAtMs)return false;
 if(!receipt||receipt.eventId!==runtime.eventId||receipt.startsAtMs!==runtime.startsAtMs)return true;
 return false;
}

export function createEventAnnouncementStore(storage:AnnouncementStorage){
 const memory=new Map<string,LiveEventAnnouncementReceipt|undefined>(),queues=new Map<string,Promise<unknown>>();
 const key=(scope:string)=>storagePrefix+encodeURIComponent(scope||'device');
 return {claim(scope:string,runtime:LiveEventRuntime,nowMs=Date.now()):Promise<boolean>{
  const storageKey=key(scope),previous=queues.get(storageKey)??Promise.resolve();
  const task=previous.catch(()=>undefined).then(async()=>{
   let receipt=memory.get(storageKey);
   if(!memory.has(storageKey)){
    try{const raw=await storage.getItem(storageKey);receipt=normalizeLiveEventAnnouncementReceipt(raw?JSON.parse(raw):undefined);}catch{receipt=undefined;}
    memory.set(storageKey,receipt);
   }
   if(!shouldShowLiveEventAnnouncement(runtime,receipt,nowMs))return false;
   const next:LiveEventAnnouncementReceipt={eventId:runtime.eventId,startsAtMs:runtime.startsAtMs,shownAtMs:nowMs};
   memory.set(storageKey,next);
   try{await storage.setItem(storageKey,JSON.stringify(next));}catch{/* The in-memory receipt still prevents repeated prompts during this session. */}
   return true;
  });
  queues.set(storageKey,task);
  void task.finally(()=>{if(queues.get(storageKey)===task)queues.delete(storageKey)});
  return task;
 },markSeen(scope:string,runtime:LiveEventRuntime,nowMs=Date.now()):Promise<void>{
  const storageKey=key(scope),previous=queues.get(storageKey)??Promise.resolve();
  const task=previous.catch(()=>undefined).then(async()=>{
   if(!runtime.enabled||nowMs<runtime.startsAtMs||nowMs>=runtime.endsAtMs)return;
   let previousReceipt=memory.get(storageKey);
   if(!memory.has(storageKey)){
    try{const raw=await storage.getItem(storageKey);previousReceipt=normalizeLiveEventAnnouncementReceipt(raw?JSON.parse(raw):undefined);}catch{previousReceipt=undefined;}
   }
   if(previousReceipt?.eventId===runtime.eventId&&previousReceipt.startsAtMs===runtime.startsAtMs){memory.set(storageKey,previousReceipt);return;}
   const receipt:LiveEventAnnouncementReceipt={eventId:runtime.eventId,startsAtMs:runtime.startsAtMs,shownAtMs:nowMs};
   memory.set(storageKey,receipt);
   try{await storage.setItem(storageKey,JSON.stringify(receipt));}catch{/* In-session viewing still suppresses the reminder. */}
  });
  queues.set(storageKey,task);
  void task.finally(()=>{if(queues.get(storageKey)===task)queues.delete(storageKey)});
  return task;
 }};
}
