import {createCharacter,newGame} from '../src/core/game';
import {activeLiveEvent,eventLifecycle} from '../src/core/live-events';
import {executeGameCommand} from '../src/core/game-commands';
import {EVENTS_RELEASED} from '../src/core/release-flags';
import {COLLECTIBLES} from '../src/content/collectibles';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {QUICK_NAV_DESTINATIONS} from '../src/core/quick-navigation';

function fail(message:string):never{throw new Error(message);}

if(EVENTS_RELEASED)fail('Event gameplay must stay unreleased until a launch is explicitly enabled.');
if(COLLECTIBLES.some(entry=>entry.collectionGroup==='event'))fail('Unreleased event collectibles must not contribute to collection totals.');
if(COMBAT_COMPANIONS.some(entry=>entry.origin.type==='event'))fail('Unreleased event companions must not contribute to companion totals.');
if((QUICK_NAV_DESTINATIONS as readonly string[]).includes('Events'))fail('Events must not occupy quick navigation before a live season.');

const state=createCharacter(newGame(0),'IRONWARDEN','Release Gate');
state.account.liveEvent={eventId:'EVT_ANNUAL_001_2026',enabled:true,startsAtMs:86_400_000,endsAtMs:2*86_400_000};
if(eventLifecycle(state,1)?.phase!=='upcoming')fail('The pure event engine must still understand scheduled events for calendar/admin testing.');
if(activeLiveEvent(state,1))fail('An upcoming event must not be treated as active.');
let commandBlocked=false;try{executeGameCommand(state,{type:'event_daily'},1)}catch(error){commandBlocked=String(error).includes('events_unreleased')}if(!commandBlocked)fail('Live event gameplay commands must remain blocked while EVENTS_RELEASED is false.');

console.log('event release gating PASS: gameplay unreleased, engine testable, calendar/history can remain visible');
