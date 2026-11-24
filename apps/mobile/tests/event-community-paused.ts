import {createCharacter,newGame} from '../src/core/game';
import {FROSTFALL_EVENT} from '../src/content/annual-events-v2';
import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {EVENT_COMMUNITY_ENABLED} from '../src/core/release-flags';
import {chooseEventProject,claimEventCommunityMilestone,contributeEventCurrency,eventCommunityMilestones,eventCommunityStage,eventCollectionJournal,eventCurrencyBalance,eventReadyClaimCount} from '../src/core/live-events';
import {annualEventCalendar} from '../src/content/annual-event-calendar';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);}
function rejects(operation:()=>unknown,message:string){let rejected=false;try{operation()}catch(error){rejected=error instanceof Error&&error.message.includes('temporarily unavailable');}ok(rejected,message);}

equal(FROSTFALL_EVENT.communityEnabled,false,'Frostfall global community track is replaced by guild Winter Hearth');
ok(FROSTFALL_EVENT.communityMilestones.length>0,'Keep historical authored definitions without enabling rewards');
const event=FROSTFALL_EVENT,now=Date.UTC(2026,11,10);
ok(event.communityEnabled===false,'Winter Hearth replaces the global Frostfall community track');
ok(event.communityMilestones.length>0,'Keep authored historic community reward definitions');
// A separate synthetic event proves the global pause still blocks even authored-enabled tracks.
const legacyEvent={...event,id:'QA_PAUSED_COMMUNITY',communityEnabled:true};
LIVE_EVENT_CATALOG.push(event,legacyEvent);
equal(EVENT_COMMUNITY_ENABLED,false,'Event-wide community goals are paused');
let state:GameState=createCharacter(newGame(now),'IRONWARDEN','PausedCommunity');
state={...state,account:{...state.account,
 liveEvent:{eventId:event.id,enabled:true,startsAtMs:Date.UTC(2026,11,3),endsAtMs:Date.UTC(2026,11,30),graceEndsAtMs:Date.UTC(2027,0,3)},
 eventCurrencyBalanceById:{[event.id]:1_500},
 eventCommunityProgressById:{[event.id]:100},
 eventContributionById:{[event.id]:500},
}};
const priorBalance=eventCurrencyBalance(state,event.id),priorClaims=eventReadyClaimCount(state,now);
equal(eventCommunityStage(state,now),0,'Existing progress is not displayed as an active community stage');
equal(eventCommunityMilestones(state,now).length,0,'Shared reward cards are not available');
ok(!eventCollectionJournal(state,now).some(row=>row.source.startsWith('Community')),'Community rewards are hidden from active collection');
const calendar=annualEventCalendar(state).find(row=>row.eventId===event.id)!;
ok(calendar.collectionTotal>0,'Normal personal collection rewards remain visible');
rejects(()=>contributeEventCurrency(state,100,now),'Cannot spend Guild/Event currency on paused community contributions');
rejects(()=>claimEventCommunityMilestone(state,100,now),'Cannot claim a previously earned but paused community reward');
equal(eventCurrencyBalance(state,event.id),priorBalance,'Blocked actions do not spend historic currency');
equal(eventReadyClaimCount(state,now),priorClaims,'Community progress does not add notification badges');
const focused=chooseEventProject(state,event.choices[0].id,now);
equal(focused.account.eventChoiceById?.[event.id],event.choices[0].id,'Personal event earning focus remains available');
equal(focused.account.eventContributionById?.[event.id],500,'Previously recorded contributions are retained for a future reopening');
const legacyState={...state,account:{...state.account,liveEvent:{...state.account.liveEvent!,eventId:legacyEvent.id}}};
rejects(()=>contributeEventCurrency(legacyState,100,now),'Global pause blocks even authored-enabled event');
rejects(()=>claimEventCommunityMilestone(legacyState,100,now),'Global pause blocks even authored-enabled reward');
console.log('PASS: shared annual event community paused; personal choices, currency, authored definitions and history preserved');
