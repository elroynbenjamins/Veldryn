import {createCharacter,newGame} from '../src/core/game';
import {applyEventDiscoveries,claimEventDiscovery,eventCommunityMilestones,eventContractBoard,eventReadyClaimCount,setLocalEventEnabled} from '../src/core/live-events';

function equal(actual:number,expected:number,message:string){if(actual!==expected)throw new Error(`${message}: expected ${expected}, received ${actual}`);}

const now=2_000_000;
const eventId='EVT_ANNUAL_010_2026';
let state=setLocalEventEnabled(createCharacter(newGame(now),'IRONWARDEN','ClaimCounter'),true,now,eventId);
const initial=eventReadyClaimCount(state,now);

const discoveries=[
 {eventId,discoveryId:'gloam_cinder',name:'Gloam Cinder',quantity:5},
 {eventId,discoveryId:'waxen_sigil',name:'Waxen Sigil',quantity:3},
 {eventId,discoveryId:'breach_fragment',name:'Breach Fragment',quantity:1},
];
state=applyEventDiscoveries(state,discoveries);
equal(eventReadyClaimCount(state,now),initial+3,'Completed discoveries should each contribute one visible claim');
state=claimEventDiscovery(state,'gloam_cinder',now);
equal(eventReadyClaimCount(state,now),initial+2,'Claimed discoveries should immediately leave the navigation count');

const activity=eventContractBoard(state,now)[0];
if(!activity)throw new Error('Expected a weekly event activity.');
const week=activity.id.slice(eventId.length+1,activity.id.length-activity.objective.id.length-1);
const withActivity={...state,account:{...state.account,eventPeriodActivityById:{...(state.account.eventPeriodActivityById??{}),[`${eventId}:week:${week}`]:{[activity.objective.source]:activity.objective.required}}}};
equal(eventReadyClaimCount(withActivity,now),eventReadyClaimCount(state,now)+1,'A weekly activity reward must not be counted twice');

const communityEventId='EVT_ANNUAL_012_2026';
const communityState={...createCharacter(newGame(now),'IRONWARDEN','CommunityCounter'),account:{...newGame(now).account,liveEvent:{eventId:communityEventId,enabled:true,startsAtMs:now-60_000,endsAtMs:now+86_400_000},eventCommunityProgressById:{[communityEventId]:100},eventContributionById:{[communityEventId]:0}}};
const communityRows=eventCommunityMilestones(communityState,now);
const ineligibleCount=eventReadyClaimCount(communityState,now);
const unreachedState={...communityState,account:{...communityState.account,eventCommunityProgressById:{[communityEventId]:0}}};
equal(ineligibleCount,eventReadyClaimCount(unreachedState,now),'Reached community stages should not notify an ineligible player');
const eligibleState={...communityState,account:{...communityState.account,eventContributionById:{[communityEventId]:100}}};
equal(eventReadyClaimCount(eligibleState,now),ineligibleCount+communityRows.length,'Eligible community rewards should contribute visible claims');

console.log('PASS event claim count: discoveries are visible, activities count once, and community eligibility is respected');
