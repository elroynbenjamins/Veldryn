import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {eventUiCopy,validateLiveEventCatalog} from '../src/content/live-event-ui';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const errors=validateLiveEventCatalog(LIVE_EVENT_CATALOG);
equal(errors.length,0,`Live event catalog validation failed: ${errors.join(' | ')}`);

const ids=LIVE_EVENT_CATALOG.map(event=>event.id);
equal(new Set(ids).size,ids.length,'Live event ids must be unique');
equal(LIVE_EVENT_CATALOG.length,6,'Six annual events are now production catalog events');


const turning=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_001_2026');
ok(turning,'Turning of the Age definition should exist');
equal(turning!.visualKey,'turning_of_the_age','Turning of the Age uses its visual theme');
ok(turning!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_001'),'Turning grants Chronicle Wisp');
ok(turning!.shop.some(row=>row.reward.id==='EVT_PET_002'),'Turning prestige stock grants Gilded Hourling');
ok(turning!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_001'),'Turning grants Keeper of First Dawn');

const heartbond=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_002_2026');
ok(heartbond,'Heartbond definition should exist');
equal(heartbond!.visualKey,'heartbond','Heartbond uses its dedicated visual theme');
ok(heartbond!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_003'),'Heartbond grants Rosebud Bun');
ok(heartbond!.shop.some(row=>row.reward.id==='EVT_PET_004'),'Heartbond prestige stock grants Heartwing');
ok(heartbond!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_002'),'Heartbond grants Vowbound Cherub');

const bloomwake=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_003_2026');
ok(bloomwake,'Bloomwake definition should exist');
equal(bloomwake!.visualKey,'bloomwake','Bloomwake uses its dedicated visual theme');
ok(bloomwake!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_005'),'Bloomwake grants Pollenpuff');
ok(bloomwake!.shop.some(row=>row.reward.id==='EVT_PET_006'),'Bloomwake prestige stock grants Verdant Fawn');
ok(bloomwake!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_003'),'Bloomwake grants Bloomwarden');

const harvest=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_009_2026');
ok(harvest,'Harvestwake definition should exist');
equal(harvest!.visualKey,'harvestwake','Harvestwake should resolve through the centralized visual registry');
ok(harvest!.shop.some(offer=>offer.reward.kind==='companion'&&offer.reward.id==='EVT_UNIT_006'),'Harvest Guardian should use the generic companion reward path');
ok(harvest!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_011'),'Pumpkin Piglet should be a Harvestwake milestone reward');
ok(harvest!.discoveries.some(row=>row.reward.id==='EVT_PET_012'),'Golden Sheafling should be a Harvestwake discovery reward');
ok(harvest!.shop.filter(offer=>offer.legacy).some(offer=>offer.reward.id==='pet_harvest_fox'),'Prototype Harvest Fox remains explicitly available as legacy stock');

const veil=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_010_2026');
ok(veil,'Veilbreak definition should exist');
equal(veil!.visualKey,'veilbreak','Veilbreak uses its dedicated visual theme');
ok(veil!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_013'),'Veilbreak grants Gloomkin');
ok(veil!.discoveries.some(row=>row.reward.id==='EVT_PET_014'),'Veilbreak discovery grants Lantern Mimic');
ok(veil!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_007'),'Veilbreak grants Veil Hound');
ok(veil!.shop.some(row=>row.reward.id==='EVT_UNIT_008'),'Veilbreak prestige stock grants Hollow Knightling');

const frost=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_012_2026');
ok(frost,'Frostfall definition should exist');
equal(frost!.visualKey,'frostfall','Frostfall uses its dedicated visual theme');
ok(frost!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_015'),'Frostfall grants Snowbell Pup');
ok(frost!.discoveries.some(row=>row.reward.id==='EVT_PET_016'),'Frostfall discovery grants Gift Mimic');
ok(frost!.shop.some(row=>row.reward.id==='EVT_PET_017'),'Frostfall prestige stock grants Aurora Fox');
ok(frost!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_009'),'Frostfall grants Frostbell Herald');

const harvestCopy=eventUiCopy(harvest!);
equal(harvestCopy.shopTitle,'HARVEST SHOP','Harvestwake uses event-shop wording');
ok(!harvestCopy.shopTitle.includes('MARKET'),'Player-facing event copy should not reintroduce Market terminology');

const generic=eventUiCopy({name:'Example Event'});
equal(generic.collectionTitle,'Example Event collection','Generic event collection title should derive from event name');
equal(generic.shopTitle,'EVENT SHOP','Generic event UI should default to Shop wording');
equal(generic.projectNoun,'event project','Generic event UI should not assume a winter project');

console.log('PASS: live event catalog metadata, generic copy and shop terminology validate');
