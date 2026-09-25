import {COLLECTIBLES,validateCollectibleCatalog} from '../src/content/collectibles';
import {CORE_PET_COLLECTIBLES,validateCorePetCatalog} from '../src/content/core-pets';
import {EVENT_PET_COLLECTIBLES} from '../src/content/event-collectible-content';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {EVENT_COMPANIONS} from '../src/content/event-companions-v2';
import {EVENTS_RELEASED} from '../src/core/release-flags';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)fail(message)}

validateCollectibleCatalog();
validateCorePetCatalog();

equal(CORE_PET_COLLECTIBLES.length,33,'core pet count');
equal(EVENT_PET_COLLECTIBLES.length,19,'event pet count');

const releasedEventCompanions=COMBAT_COMPANIONS.filter(row=>row.id.startsWith('EVT_UNIT_'));
equal(EVENT_COMPANIONS.length,10,'authored event companion count');
equal(releasedEventCompanions.length,EVENTS_RELEASED?10:0,'released event companion count follows release gate');

const allPetIds=COLLECTIBLES.filter(row=>row.kind==='pet').map(row=>row.id);
equal(new Set(allPetIds).size,allPetIds.length,'all pet ids remain unique');

ok(CORE_PET_COLLECTIBLES.every(row=>row.collectionGroup==='core'),'all permanent pets use the core collection group');
ok(EVENT_PET_COLLECTIBLES.every(row=>row.collectionGroup==='event'),'all event pets use the event collection group');
ok(EVENT_COMPANIONS.every(row=>row.origin.type==='event'),'all authored EVT_UNIT companions use event origin');

for(let index=1;index<=33;index++){
  const id=`PET_${String(index).padStart(3,'0')}`;
  ok(CORE_PET_COLLECTIBLES.some(row=>row.id===id),`missing canonical ${id}`);
}
for(let index=1;index<=19;index++){
  const id=`EVT_PET_${String(index).padStart(3,'0')}`;
  ok(EVENT_PET_COLLECTIBLES.some(row=>row.id===id),`missing event ${id}`);
}
for(let index=1;index<=10;index++){
  const id=`EVT_UNIT_${String(index).padStart(3,'0')}`;
  ok(EVENT_COMPANIONS.some(row=>row.id===id),`missing authored event companion ${id}`);
}

console.log('PASS: canonical and event collectible catalogs validate');
