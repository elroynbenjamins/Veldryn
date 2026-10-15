import {newGame} from '../src/core/game';
import {validateGameSettings} from '../src/core/game-commands';
import {DEFAULT_QUICK_NAV_DESTINATIONS} from '../src/core/quick-navigation';

function assert(ok:unknown,message:string){if(!ok)throw new Error(message)}
const state=newGame(0);
assert(state.settings.quickNavDestinations?.join(',')===DEFAULT_QUICK_NAV_DESTINATIONS.join(','),'New accounts should get five recommended shortcuts');
const legacy={...state.settings,retiredChatSetting:true,defaultWorldChat:2,chatDockLines:3};
const valid=validateGameSettings(legacy);
assert(valid.defaultWorldChat===2&&valid.chatDockLines===3,'Chat settings must survive legacy payload validation');
assert(!('retiredChatSetting' in valid),'Retired settings must not be persisted');
let rejected=false;
try{validateGameSettings({...legacy,defaultWorldChat:99})}catch{rejected=true}
assert(rejected,'Invalid supported chat settings must still be rejected');
console.log('PASS: legacy chat settings, strict validation, and default navigation');
