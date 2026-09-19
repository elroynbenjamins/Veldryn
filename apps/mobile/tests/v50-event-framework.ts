import {ROTATING_EVENT_CATALOG_V50} from '../src/content/rotating-event-catalog-v50';
import {applyRotatingEventTaskProgress,claimRotatingEventReward,newRotatingEventProgress,rotatingActiveEvents,validateRotatingEventCatalog} from '../src/core/rotating-events-v50';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
ok(validateRotatingEventCatalog(ROTATING_EVENT_CATALOG_V50),'Event authoring catalog validates');
equal(ROTATING_EVENT_CATALOG_V50.events.filter(row=>row.enabled).length,0,'Authoring templates stay disabled before canonical binding');
ok(ROTATING_EVENT_CATALOG_V50.events.every(row=>row.communityModuleEnabled===false),'Community campaigns stay deferred');
equal(rotatingActiveEvents(ROTATING_EVENT_CATALOG_V50,Date.UTC(2026,11,15)).length,0,'Disabled authoring events never activate');
const catalog={...ROTATING_EVENT_CATALOG_V50,events:ROTATING_EVENT_CATALOG_V50.events.map((row,i)=>i===0?{...row,enabled:true}:row)};
const progress=newRotatingEventProgress('a','frostfall',0);
const event=applyRotatingEventTaskProgress(progress,{eventId:'frostfall',accountId:'a',taskId:'frost_actions',amount:120,progressEventId:'p1',occurredAtMs:1},catalog);
ok(event.completed,'Generic event task completes');ok(event.newlyUnlockedRewardIds.includes('frost_preview_frame'),'Task unlocks configured reward');
equal(applyRotatingEventTaskProgress(progress,{eventId:'frostfall',accountId:'a',taskId:'frost_actions',amount:120,progressEventId:'p1',occurredAtMs:1},catalog).duplicate,true,'Progress events are idempotent');
const claim=claimRotatingEventReward(progress,'frost_preview_frame',2);ok(claim.grantKey.includes('frostfall'),'Claim has stable grant key');
console.log('PASS: reconciled V50 generic event framework, disabled authoring templates and deferred community module');
