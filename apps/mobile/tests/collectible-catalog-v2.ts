import {COLLECTIBLES,validateCollectibleCatalog} from '../src/content/collectibles';
import {CORE_PET_COLLECTIBLES,validateCorePetCatalog} from '../src/content/core-pets';
import {EVENT_PET_COLLECTIBLES} from '../src/content/event-collectible-content';
import {ALL_COMBAT_COMPANIONS} from '../src/content/combat-companions';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)fail(message)}

validateCollectibleCatalog();
validateCorePetCatalog();

equal(CORE_PET_COLLECTIBLES.length,33,'core pet count');
equal(EVENT_PET_COLLECTIBLES.length,18,'released event pet count');

const eventCompanions=ALL_COMBAT_COMPANIONS.filter(row=>row.id.startsWith('EVT_UNIT_'));
equal(eventCompanions.length,11,'released event companion count');

const allPetIds=COLLECTIBLES.filter(row=>row.kind==='pet').map(row=>row.id);
equal(new Set(allPetIds).size,allPetIds.length,'all pet ids remain unique');

ok(CORE_PET_COLLECTIBLES.every(row=>row.collectionGroup==='core'),'all permanent pets use the core collection group');
ok(EVENT_PET_COLLECTIBLES.every(row=>row.collectionGroup==='event'),'all event pets use the event collection group');
ok(eventCompanions.every(row=>row.origin.type==='event'),'all EVT_UNIT companions use event origin');

for(let index=1;index<=33;index++){
  const id=`PET_${String(index).padStart(3,'0')}`;
  ok(CORE_PET_COLLECTIBLES.some(row=>row.id===id),`missing canonical ${id}`);
}
ok(!EVENT_PET_COLLECTIBLES.some(row=>row.id==='EVT_PET_016'),'unreleased Gift Mimic stays out of the event catalog');
ok(EVENT_PET_COLLECTIBLES.every(row=>/^EVT_PET_\d{3}$/.test(row.id)),'event pet ids use the canonical format');
ok(eventCompanions.some(row=>row.id==='EVT_UNIT_008'),'Veilbreak Gravebell Gargoyle is released in the event roster');
ok(eventCompanions.some(row=>row.id==='EVT_UNIT_011'),'Veilbreak Lanternwing is released in the event roster');
ok(eventCompanions.every(row=>/^EVT_UNIT_\d{3}$/.test(row.id)),'event companion ids use the canonical format');

console.log('PASS: canonical and event collectible catalogs validate');
