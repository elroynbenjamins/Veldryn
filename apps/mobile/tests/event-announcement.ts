import {createEventAnnouncementStore,LIVE_EVENT_ANNOUNCEMENT_INTERVAL_MS,normalizeLiveEventAnnouncementReceipt,shouldShowLiveEventAnnouncement} from '../src/core/event-announcement';
import type {LiveEventRuntime} from '../src/core/types';

function equal(actual:unknown,expected:unknown,message='Unexpected value'){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`)}
function deepEqual(actual:unknown,expected:unknown,message='Unexpected value'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)}

const DAY=24*60*60*1000,now=Date.parse('2026-10-24T12:00:00Z');
const runtime:LiveEventRuntime={enabled:true,eventId:'EVT_ANNUAL_010_2026',startsAtMs:now-DAY,endsAtMs:now+7*DAY};
equal(LIVE_EVENT_ANNOUNCEMENT_INTERVAL_MS,3*DAY);
equal(shouldShowLiveEventAnnouncement(runtime,undefined,now),true,'a live event announces on first sight');
equal(shouldShowLiveEventAnnouncement(runtime,{eventId:runtime.eventId,startsAtMs:runtime.startsAtMs,shownAtMs:now-DAY},now),false,'the same event stays quiet inside three days');
equal(shouldShowLiveEventAnnouncement(runtime,{eventId:runtime.eventId,startsAtMs:runtime.startsAtMs,shownAtMs:now-3*DAY},now),true,'the same live event may announce again after three days');
equal(shouldShowLiveEventAnnouncement({...runtime,startsAtMs:now+1},undefined,now),false,'upcoming events do not announce');
equal(shouldShowLiveEventAnnouncement({...runtime,endsAtMs:now},undefined,now),false,'ended events do not announce');
equal(shouldShowLiveEventAnnouncement({...runtime,eventId:'NEW_EVENT',startsAtMs:now-DAY/2},{eventId:runtime.eventId,startsAtMs:runtime.startsAtMs,shownAtMs:now},now),true,'a new event announces immediately');
equal(normalizeLiveEventAnnouncementReceipt({eventId:'x',startsAtMs:1,shownAtMs:2})?.shownAtMs,2);
equal(normalizeLiveEventAnnouncementReceipt({eventId:'x',startsAtMs:'bad',shownAtMs:2}),undefined);

const values=new Map<string,string>();
const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
const store=createEventAnnouncementStore(storage);
async function run(){
 equal(await store.claim('account-a',runtime,now),true);
 equal(await store.claim('account-a',runtime,now+DAY),false);
 equal(await store.claim('account-b',runtime,now+DAY),true,'accounts keep independent announcement receipts');
 equal(await store.claim('account-a',runtime,now+3*DAY),true);
 const simultaneous=createEventAnnouncementStore({getItem:async()=>null,setItem:async()=>undefined});
 const results=await Promise.all([simultaneous.claim('same-account',runtime,now),simultaneous.claim('same-account',runtime,now)]);
 deepEqual(results,[true,false],'overlapping runtime refreshes show only one popup');
 console.log('PASS live-event announcements persist per account and repeat at most once every three days');
}
void run();
