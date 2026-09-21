import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {eventUiCopy,validateLiveEventCatalog} from '../src/content/live-event-ui';
import {hasLiveEventVisualBundle,liveEventVisualCoverage} from '../src/ui/live-event-visuals';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const errors=validateLiveEventCatalog(LIVE_EVENT_CATALOG);
equal(errors.length,0,`Live event catalog validation failed: ${errors.join(' | ')}`);

const ids=LIVE_EVENT_CATALOG.map(event=>event.id);
equal(new Set(ids).size,ids.length,'Live event ids must be unique');
equal(LIVE_EVENT_CATALOG.length,9,'Nine annual events are now production catalog events');
equal(new Set(LIVE_EVENT_CATALOG.map(event=>event.signature.title)).size,9,'Every annual event should have a distinct signature identity');
ok(LIVE_EVENT_CATALOG.every(event=>event.signature.highlights.length>=2),'Every annual event should explain its signature loop');
const communityEvents=LIVE_EVENT_CATALOG.filter(event=>event.communityEnabled===true).map(event=>event.name).sort();
equal(communityEvents.join('|'),['Bloomwake','Frostfall Festival','Harvestwake','Merchant & Guild Festival'].sort().join('|'),'Only the four communal festivals should use shared progression');


ok(LIVE_EVENT_CATALOG.every(event=>hasLiveEventVisualBundle(event.visualKey)),'Every annual event should resolve to an explicit visual bundle instead of the generic fallback');
const harvestVisuals=liveEventVisualCoverage('harvestwake',LIVE_EVENT_CATALOG.find(event=>event.visualKey==='harvestwake')!.discoveries.map(row=>row.id));
ok(harvestVisuals.commonCurrencyArt&&harvestVisuals.prestigeCurrencyArt,'Harvestwake should retain both bespoke currency icons');
equal(harvestVisuals.discoveryArtCount,harvestVisuals.discoveryTotal,'Harvestwake should retain bespoke art for every discovery');


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


const suncrest=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_006_2026');
ok(suncrest,'Suncrest Games definition should exist');
equal(suncrest!.visualKey,'suncrest','Suncrest uses its visual theme');
ok(suncrest!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_007'),'Suncrest grants Laurel Lynx');
ok(suncrest!.shop.some(row=>row.reward.id==='EVT_PET_008'),'Suncrest prestige stock grants Golden Gryphlet');
ok(suncrest!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_004'),'Suncrest grants Suncrest Champion');

const starfall=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_008_2026');
ok(starfall,'Starfall Nights definition should exist');
equal(starfall!.visualKey,'starfall','Starfall uses its dedicated visual theme');
ok(starfall!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_009'),'Starfall grants Starwhisker');
ok(starfall!.shop.some(row=>row.reward.id==='EVT_PET_010'),'Starfall prestige stock grants Comet Moth');
ok(starfall!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_005'),'Starfall grants Astral Wayfarer');

const merchantGuild=LIVE_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_011_2026');
ok(merchantGuild,'Merchant & Guild Festival definition should exist');
equal(merchantGuild!.visualKey,'merchant_guild','Merchant & Guild Festival uses its visual theme');
ok(merchantGuild!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_018'),'Merchant & Guild Festival grants Ledger Ferret');
ok(merchantGuild!.shop.some(row=>row.reward.id==='EVT_PET_019'),'Merchant & Guild prestige stock grants Guildcrest Drakelet');
ok(merchantGuild!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_010'),'Merchant & Guild Festival grants Caravan Sentinel');

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
