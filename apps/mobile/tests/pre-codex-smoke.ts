import { createCharacter, newGame } from '../src/core/game';
import { migrateSave, SAVE_SCHEMA_VERSION } from '../src/core/save-migrations';
import { debugAddGold, debugAdvanceActivity, debugSetLevel } from '../src/dev/debug-tools';

function ok(value: boolean, message: string){ if(!value) throw new Error(message); }
const now=10_000;
let state=createCharacter(newGame(now),'IRONWARDEN','CodexTest');
const migrated=migrateSave(JSON.parse(JSON.stringify(state)));
ok(migrated.version===state.version,'Legacy-compatible fresh save keeps its supported schema');
ok(migrateSave({...state,otherCharacters:[]}).version===SAVE_SCHEMA_VERSION,'Roster saves promote to the current schema');
let futureRejected=false;
try { migrateSave({...state,version:999}); } catch { futureRejected=true; }
ok(futureRejected,'Future save versions must be rejected safely');
state=debugSetLevel(state,25);
ok(state.character?.level===25,'Debug set level should work');
state=debugAddGold(state,500);
ok(state.character?.gold===600,'Debug gold should work');
state={...state,activity:{kind:'combat',targetId:'MOSS_RAT',startedAtMs:now,lastClaimAtMs:now}};
state=debugAdvanceActivity(state,3600);
ok(state.activity!.lastClaimAtMs===now-3600_000,'Debug time advance should adjust persisted timestamp');
console.log(JSON.stringify({status:'PASS',saveSchema:SAVE_SCHEMA_VERSION,debugLevel:state.character?.level,debugGold:state.character?.gold},null,2));
