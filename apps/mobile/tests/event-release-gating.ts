import {COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {COLLECTIBLES} from '../src/content/collectibles';
import {EVENTS_RELEASED,FROSTFALL_REWARDS_RELEASED} from '../src/core/release-flags';
import {QUICK_NAV_DESTINATIONS} from '../src/core/quick-navigation';

const fail=(message:string):never=>{throw new Error(message)};
if(!EVENTS_RELEASED)fail('The live event framework must remain available.');
if(!FROSTFALL_REWARDS_RELEASED)fail('The approved Frostfall catalog must ship before the scheduled event.');
for(const id of ['EVT_PET_015','EVT_PET_017'])if(!COLLECTIBLES.some(entry=>entry.id===id))fail(`${id} must be packaged for account-gated discovery.`);
for(const id of ['EVT_UNIT_009','EVT_UNIT_012','EVT_UNIT_013'])if(!COMBAT_COMPANIONS.some(entry=>entry.id===id))fail(`${id} must be packaged for account-gated discovery.`);
if(!(QUICK_NAV_DESTINATIONS as readonly string[]).includes('Events'))fail('Released events must remain available in quick navigation.');

console.log('event release packaging PASS');
