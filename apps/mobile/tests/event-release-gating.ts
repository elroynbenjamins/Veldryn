import {COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {COLLECTIBLES} from '../src/content/collectibles';
import {eventLifecycle} from '../src/core/live-events';
import {EVENTS_RELEASED} from '../src/core/release-flags';
import {QUICK_NAV_DESTINATIONS} from '../src/core/quick-navigation';
import {createCharacter,newGame} from '../src/core/game';

const fail=(message:string):never=>{throw new Error(message)};
if(EVENTS_RELEASED)fail('Event content must stay unreleased until a launch is explicitly enabled.');
if(COLLECTIBLES.some(entry=>entry.collectionGroup==='event'))fail('Unreleased event collectibles must not contribute to collection totals.');
if(COMBAT_COMPANIONS.some(entry=>entry.origin.type==='event'))fail('Unreleased event companions must not contribute to companion totals.');
if((QUICK_NAV_DESTINATIONS as readonly string[]).includes('Events'))fail('Events must not appear in quick navigation before release.');

const state=createCharacter(newGame(0),'IRONWARDEN','Release Gate');
if(state.account.liveEvent)fail('Normal new games must not contain an active event runtime before Live-Ops schedules one.');
state.account.liveEvent={eventId:'EVT_ANNUAL_001_2026',enabled:true,startsAtMs:0,endsAtMs:86_400_000};
if(eventLifecycle(state,1)?.phase!=='active')fail('The authored event engine must remain testable even while production event content is unreleased.');

console.log('event release gating PASS');
