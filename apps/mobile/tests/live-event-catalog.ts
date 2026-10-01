import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {VEILBREAK_EVENT,FROSTFALL_EVENT} from '../src/content/annual-events-v2';
import {TURNING_OF_THE_AGE_EVENT,HEARTBOND_EVENT,BLOOMWAKE_EVENT} from '../src/content/annual-events-v3';
import {SUNCREST_GAMES_EVENT,STARFALL_NIGHTS_EVENT,MERCHANT_GUILD_FESTIVAL_EVENT} from '../src/content/annual-events-v4';
// Validate future authored metadata without promoting it into the runtime catalog.
const AUTHORED_EVENT_CATALOG=[...LIVE_EVENT_CATALOG,VEILBREAK_EVENT,FROSTFALL_EVENT,TURNING_OF_THE_AGE_EVENT,HEARTBOND_EVENT,BLOOMWAKE_EVENT,SUNCREST_GAMES_EVENT,STARFALL_NIGHTS_EVENT,MERCHANT_GUILD_FESTIVAL_EVENT];
import {eventUiCopy,validateLiveEventCatalog} from '../src/content/live-event-ui';
import {seasonalEventExpeditionInfo} from '../src/core/coop-event-expeditions';
import {isLiveEventVisualKey,LIVE_EVENT_VISUAL_KEYS} from '../src/content/live-event-visual-keys';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

equal(LIVE_EVENT_CATALOG.length,1,'Only the active release pack belongs in the runtime catalog');
equal(LIVE_EVENT_CATALOG[0].visualKey,'harvestwake','Harvestwake is the active release pack');
const errors=validateLiveEventCatalog(AUTHORED_EVENT_CATALOG);
equal(errors.length,0,`Live event catalog validation failed: ${errors.join(' | ')}`);

const ids=AUTHORED_EVENT_CATALOG.map(event=>event.id);
equal(new Set(ids).size,ids.length,'Live event ids must be unique');
equal(AUTHORED_EVENT_CATALOG.length,9,'Nine annual festivals have authored definitions');
equal(new Set(AUTHORED_EVENT_CATALOG.map(event=>event.signature.title)).size,9,'Every annual event should have a distinct signature identity');
ok(AUTHORED_EVENT_CATALOG.every(event=>event.signature.highlights.length>=2),'Every annual event should explain its signature loop');
const communityEvents=AUTHORED_EVENT_CATALOG.filter(event=>event.communityEnabled===true).map(event=>event.name).sort();
equal(communityEvents.join('|'),['Bloomwake','Frostfall Festival','Harvestwake','Merchant & Guild Festival'].sort().join('|'),'Only the four communal festivals should use shared progression');


ok(AUTHORED_EVENT_CATALOG.every(event=>isLiveEventVisualKey(event.visualKey)),'Every annual event should resolve to a registered visual key');
equal(new Set(AUTHORED_EVENT_CATALOG.map(event=>event.visualKey)).size,LIVE_EVENT_VISUAL_KEYS.length,'Every authored annual event should have its own explicit visual key');


const turning=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_001_2026');
ok(turning,'Turning of the Age definition should exist');
equal(turning!.visualKey,'turning_of_the_age','Turning of the Age uses its visual theme');
ok(turning!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_001'),'Turning grants Chronicle Wisp');
ok(turning!.shop.some(row=>row.reward.id==='EVT_PET_002'),'Turning prestige stock grants Gilded Hourling');
ok(turning!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_001'),'Turning grants Keeper of First Dawn');

const heartbond=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_002_2026');
ok(heartbond,'Heartbond definition should exist');
equal(heartbond!.visualKey,'heartbond','Heartbond uses its dedicated visual theme');
ok(heartbond!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_003'),'Heartbond grants Rosebud Bun');
ok(heartbond!.shop.some(row=>row.reward.id==='EVT_PET_004'),'Heartbond prestige stock grants Heartwing');
ok(heartbond!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_002'),'Heartbond grants Vowbound Cherub');

const bloomwake=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_003_2026');
ok(bloomwake,'Bloomwake definition should exist');
equal(bloomwake!.visualKey,'bloomwake','Bloomwake uses its dedicated visual theme');
ok(bloomwake!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_005'),'Bloomwake grants Pollenpuff');
ok(bloomwake!.shop.some(row=>row.reward.id==='EVT_PET_006'),'Bloomwake prestige stock grants Verdant Fawn');
ok(bloomwake!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_003'),'Bloomwake grants Bloomwarden');

const harvest=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_009_2026');
ok(harvest,'Harvestwake definition should exist');
equal(harvest!.visualKey,'harvestwake','Harvestwake should resolve through the centralized visual registry');
ok(harvest!.milestones('IRONWARDEN').some(row=>row.reward.kind==='companion'&&row.reward.id==='EVT_UNIT_006'),'Harvest Guardian should use the generic companion reward path');
ok(harvest!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_011'),'Pumpkin Piglet should be a Harvestwake milestone reward');
ok(harvest!.shop.some(row=>row.reward.id==='EVT_PET_012'),'Golden Sheafling should be Harvestwake prestige stock');
ok(!harvest!.shop.some(offer=>offer.legacy),'Harvestwake should not expose obsolete legacy pet stock');


const suncrest=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_006_2026');
ok(suncrest,'Suncrest Games definition should exist');
equal(suncrest!.visualKey,'suncrest','Suncrest uses its visual theme');
ok(suncrest!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_007'),'Suncrest grants Laurel Lynx');
ok(suncrest!.shop.some(row=>row.reward.id==='EVT_PET_008'),'Suncrest prestige stock grants Golden Gryphlet');
ok(suncrest!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_004'),'Suncrest grants Suncrest Champion');

const starfall=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_008_2026');
ok(starfall,'Starfall Nights definition should exist');
equal(starfall!.visualKey,'starfall','Starfall uses its dedicated visual theme');
ok(starfall!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_009'),'Starfall grants Starwhisker');
ok(starfall!.shop.some(row=>row.reward.id==='EVT_PET_010'),'Starfall prestige stock grants Comet Moth');
ok(starfall!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_005'),'Starfall grants Astral Wayfarer');

const merchantGuild=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_011_2026');
ok(merchantGuild,'Merchant & Guild Festival definition should exist');
equal(merchantGuild!.visualKey,'merchant_guild','Merchant & Guild Festival uses its visual theme');
ok(merchantGuild!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_018'),'Merchant & Guild Festival grants Ledger Ferret');
ok(merchantGuild!.shop.some(row=>row.reward.id==='EVT_PET_019'),'Merchant & Guild prestige stock grants Guildcrest Drakelet');
ok(merchantGuild!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_010'),'Merchant & Guild Festival grants Caravan Sentinel');

const veil=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_010_2026');
ok(veil,'Veilbreak definition should exist');
equal(veil!.visualKey,'veilbreak','Veilbreak uses its dedicated visual theme');
ok(veil!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_013'),'Veilbreak grants Gloomkin');
ok(veil!.shop.some(row=>row.reward.id==='EVT_PET_014'),'Veilbreak prestige stock grants Lantern Mimic');
ok(veil!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_007'),'Veilbreak grants Veil Hound');
ok(!veil!.shop.some(row=>row.reward.id==='EVT_UNIT_008'),'Veilbreak keeps one companion reward');

const frost=AUTHORED_EVENT_CATALOG.find(event=>event.id==='EVT_ANNUAL_012_2026');
ok(frost,'Frostfall definition should exist');
equal(frost!.visualKey,'frostfall','Frostfall uses its dedicated visual theme');
ok(frost!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_PET_015'),'Frostfall grants Snowbell Pup');
ok(!frost!.discoveries.some(row=>row.reward.id==='EVT_PET_016'),'Frostfall keeps two active pets');
ok(frost!.shop.some(row=>row.reward.id==='EVT_PET_017'),'Frostfall prestige stock grants Aurora Fox');
ok(frost!.milestones('IRONWARDEN').some(row=>row.reward.id==='EVT_UNIT_009'),'Frostfall grants Frostbell Herald');

const seasonalSeries=['EVT_ANNUAL_001_2027','EVT_ANNUAL_002_2027','EVT_ANNUAL_003_2027','EVT_ANNUAL_006_2027','EVT_ANNUAL_008_2027','EVT_ANNUAL_010_2027','EVT_ANNUAL_011_2027','EVT_ANNUAL_012_2027'];
for(const eventId of seasonalSeries){
  const expedition=seasonalEventExpeditionInfo(eventId);
  ok(expedition,`${eventId} should expose a seasonal expedition`);
  equal(expedition!.questline.length,3,`${eventId} should expose a three-step event questline`);
  equal(expedition!.enemies.length,3,`${eventId} should expose three named seasonal enemies`);
  equal(new Set(expedition!.enemies).size,3,`${eventId} enemy roster should be unique within the expedition`);
  ok(expedition!.finalBoss.length>0,`${eventId} should expose a named final boss`);
}

const harvestCopy=eventUiCopy(harvest!);
equal(harvestCopy.shopTitle,'HARVEST SHOP','Harvestwake uses event-shop wording');
ok(!harvestCopy.shopTitle.includes('MARKET'),'Player-facing event copy should not reintroduce Market terminology');

const generic=eventUiCopy({name:'Example Event'});
equal(generic.collectionTitle,'Example Event collection','Generic event collection title should derive from event name');
equal(generic.shopTitle,'EVENT SHOP','Generic event UI should default to Shop wording');
equal(generic.projectNoun,'event project','Generic event UI should not assume a winter project');

console.log('PASS: live event catalog metadata, generic copy and shop terminology validate');
