import {newGame} from '../src/core/game';
import {validateGameSettings} from '../src/core/game-commands';
import {DEFAULT_QUICK_NAV_DESTINATIONS,normalizeQuickNavDestinations,QUICK_NAV_DESTINATIONS} from '../src/core/quick-navigation';

function assert(ok:unknown,message:string){if(!ok)throw new Error(message)}
const state=newGame(0);
assert(state.settings.quickNavDestinations?.join(',')===DEFAULT_QUICK_NAV_DESTINATIONS.join(','),'New accounts should get five recommended shortcuts');
assert(DEFAULT_QUICK_NAV_DESTINATIONS.join(',')==='Guild,Quests,ResourceCodex,Party,Activity','New More shortcut default order');
assert(normalizeQuickNavDestinations(['Quests','Dungeon','Companions','Guild','Settings']).join(',')===DEFAULT_QUICK_NAV_DESTINATIONS.join(','),'Old default moves to new default');
assert(normalizeQuickNavDestinations(['Dungeon','Character','Party','Inventory','Forge']).join(',')==='Dungeon,Guild,Party,Quests,Forge','Keep valid customization in its slots');
assert(normalizeQuickNavDestinations(['Forge','Forge','Account','Empty','Settings']).join(',')==='Forge,Guild,Quests,ResourceCodex,Settings','Replace duplicates and retired entries with unique defaults');
assert(!QUICK_NAV_DESTINATIONS.some(id=>['Home','Character','Skills','World','Inventory','More','Account','Empty'].includes(id)),'Permanent navigation and empty entries are not selectable');
assert(normalizeQuickNavDestinations(['Guild','Quests','ResourceCodex','Party','Activity']).join(',')===DEFAULT_QUICK_NAV_DESTINATIONS.join(','),'Normalization is idempotent');
const legacy={...state.settings,retiredChatSetting:true,defaultWorldChat:2,chatDockLines:3};
const valid=validateGameSettings(legacy);
assert(valid.defaultWorldChat===2&&valid.chatDockLines===3,'Chat settings must survive legacy payload validation');
assert(!('retiredChatSetting' in valid),'Retired settings must not be persisted');
let rejected=false;
try{validateGameSettings({...legacy,defaultWorldChat:99})}catch{rejected=true}
assert(rejected,'Invalid supported chat settings must still be rejected');
console.log('PASS: legacy chat settings, strict validation, and default navigation');
