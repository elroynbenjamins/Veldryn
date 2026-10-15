import {merchantCaravanBracketForLevel,merchantCaravanEncounter,merchantCaravanBracket} from '../src/content/merchant-caravan-escort';

function equal<T>(actual:T,expected:T,label:string){if(actual!==expected)throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);}
function ok(value:unknown,label:string){if(!value)throw new Error(label);}

equal(merchantCaravanBracketForLevel(1).id,'local','level 1 uses the local route');
equal(merchantCaravanBracketForLevel(20).id,'local','level 20 uses the local route');
equal(merchantCaravanBracketForLevel(21).id,'trade','level 21 uses the trade route');
equal(merchantCaravanBracketForLevel(40).id,'trade','level 40 uses the trade route');
equal(merchantCaravanBracketForLevel(41).id,'guild','level 41 uses the guild route');

const first=merchantCaravanEncounter(18,'character-1:escort-1',0);
const repeat=merchantCaravanEncounter(18,'character-1:escort-1',0);
equal(first.baseMonsterId,repeat.baseMonsterId,'encounter selection is deterministic');
equal(first.monster.id,repeat.monster.id,'scaled combat target is deterministic');
equal(first.monster.level,10,'local route scales to its encounter level');
equal(first.monster.zone,'Merchant Caravan','event encounters do not require a normal region');
ok(first.displayName.includes(first.monster.name),'encounter has a merchant-themed display name');
equal(merchantCaravanBracket('guild').routeLength,5,'guild route has five stops');
console.log('PASS: Merchant Caravan Escort brackets and deterministic encounters');
