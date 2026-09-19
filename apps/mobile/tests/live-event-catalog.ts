import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {eventUiCopy,validateLiveEventCatalog} from '../src/content/live-event-ui';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const errors=validateLiveEventCatalog(LIVE_EVENT_CATALOG);
equal(errors.length,0,`Live event catalog validation failed: ${errors.join(' | ')}`);

const ids=LIVE_EVENT_CATALOG.map(event=>event.id);
equal(new Set(ids).size,ids.length,'Live event ids must be unique');

const harvest=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_009_2026');
ok(harvest,'Harvestwake definition should exist');
equal(harvest!.visualKey,'harvestwake','Harvestwake should resolve through the centralized visual registry');
ok(harvest!.shop.some(offer=>offer.reward.kind==='companion'&&offer.reward.id==='EVT_UNIT_006'),'Harvest Guardian should use the generic companion reward path');
ok(harvest!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_011'),'Pumpkin Piglet should be a Harvestwake milestone reward');
ok(harvest!.discoveries.some(row=>row.reward.id==='EVT_PET_012'),'Golden Sheafling should be a Harvestwake discovery reward');
ok(harvest!.shop.filter(offer=>offer.legacy).some(offer=>offer.reward.id==='pet_harvest_fox'),'Prototype Harvest Fox remains explicitly available as legacy stock');

const harvestCopy=eventUiCopy(harvest!);
equal(harvestCopy.shopTitle,'HARVEST SHOP','Harvestwake uses event-shop wording');
ok(!harvestCopy.shopTitle.includes('MARKET'),'Player-facing event copy should not reintroduce Market terminology');

const generic=eventUiCopy({name:'Example Event'});
equal(generic.collectionTitle,'Example Event collection','Generic event collection title should derive from event name');
equal(generic.shopTitle,'EVENT SHOP','Generic event UI should default to Shop wording');
equal(generic.projectNoun,'event project','Generic event UI should not assume a winter project');

console.log('PASS: live event catalog metadata, generic copy and shop terminology validate');
