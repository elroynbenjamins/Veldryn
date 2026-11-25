import {LIVE_EVENT_CATALOG} from '../src/content/live-events';
import {VEILBREAK_EVENT,FROSTFALL_EVENT} from '../src/content/annual-events-v2';
// Isolate historical event definitions in this isolated test, without enabling it in production.
LIVE_EVENT_CATALOG.splice(0,LIVE_EVENT_CATALOG.length,VEILBREAK_EVENT,FROSTFALL_EVENT);
import {createCharacter,newGame} from '../src/core/game';
import type {GameState} from '../src/core/types';
import {availableChatEmotes,chatUnavailableEmoteIds} from '../src/core/chat-emotes';
import {applyEventDiscoveries,applyEventDrops,claimEventDiscovery,claimEventReward,eventLifecycle,eventShopOffers,purchaseEventOffer,eventOfferPurchaseCount,eventCollectionJournal} from '../src/core/live-events';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const now=5_000_000;
const withEvent=(eventId:string):GameState=>{
  const state=createCharacter(newGame(now),'IRONWARDEN','SeasonTester');
  return {...state,account:{...state.account,liveEvent:{eventId,enabled:true,startsAtMs:now-60_000,endsAtMs:now+14*86400_000}}};
};

let veil=withEvent('EVT_ANNUAL_010_2026');
equal(eventLifecycle(veil,now)?.definition.name,'The Veilbreak','Veilbreak runtime resolves');
veil=applyEventDrops(veil,[{eventId:'EVT_ANNUAL_010_2026',currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:4000}]);
veil=claimEventReward(veil,'EVT_PET_013',now);
ok(veil.account.unlockedCosmeticPetIds?.includes('EVT_PET_013'),'Veilbreak milestone grants Gloomkin');
veil={...veil,account:{...veil.account,eventPrestigeBalanceById:{...(veil.account.eventPrestigeBalanceById??{}),EVT_ANNUAL_010_2026:10}}};
ok(eventShopOffers(veil,now).some(offer=>offer.id==='veil_lantern_mimic'),'Lantern Mimic is always in Veilbreak prestige stock');
veil=purchaseEventOffer(veil,'veil_lantern_mimic',now);
ok(veil.account.unlockedCosmeticPetIds?.includes('EVT_PET_014'),'Veilbreak prestige purchase grants Lantern Mimic');

veil=applyEventDrops(veil,[{eventId:'EVT_ANNUAL_010_2026',currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:6000}]);
veil=claimEventReward(veil,'EVT_UNIT_007',now);
ok(veil.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_007'),'Veilbreak 10k milestone grants Veil Hound');
veil=applyEventDrops(veil,[{eventId:'EVT_ANNUAL_010_2026',currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:10000}]);
veil=claimEventReward(veil,'EVT_UNIT_008',now);
ok(veil.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_008'),'Veilbreak 20k milestone grants Gravebell Gargoyle');
veil={...veil,account:{...veil.account,eventPrestigeBalanceById:{...(veil.account.eventPrestigeBalanceById??{}),EVT_ANNUAL_010_2026:14}}};
veil=purchaseEventOffer(veil,'lanternwing_companion',now);
ok(veil.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_011'),'Veilbreak prestige shop grants Lanternwing');

equal(FROSTFALL_EVENT.claimGraceDays,2,'Frostfall claim grace follows the Dec 27–28 plan');
let frost=withEvent('EVT_ANNUAL_012_2026');
equal(eventLifecycle(frost,now)?.definition.name,'Frostfall Festival','Frostfall runtime resolves');
frost=applyEventDrops(frost,[{eventId:'EVT_ANNUAL_012_2026',currencyId:'FROSTBELL_TOKEN',name:'Frostbell Tokens',quantity:4000}]);
frost=claimEventReward(frost,'EVT_PET_015',now);
ok(frost.account.unlockedCosmeticPetIds?.includes('EVT_PET_015'),'Frostfall milestone grants Snowbell Pup');
frost={...frost,account:{...frost.account,eventPrestigeBalanceById:{...(frost.account.eventPrestigeBalanceById??{}),EVT_ANNUAL_012_2026:12}}};
ok(eventShopOffers(frost,now).some(offer=>offer.id==='frostfall_aurora_fox'),'Aurora Fox is always in Frostfall prestige stock');
frost=purchaseEventOffer(frost,'frostfall_aurora_fox',now);
ok(frost.account.unlockedCosmeticPetIds?.includes('EVT_PET_017'),'Frostfall prestige purchase grants Aurora Fox');
frost=applyEventDrops(frost,[{eventId:'EVT_ANNUAL_012_2026',currencyId:'FROSTBELL_TOKEN',name:'FROSTBELL_TOKEN',quantity:6000}]);
frost=claimEventReward(frost,'EVT_UNIT_009',now);
ok(frost.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_009'),'Frostfall final milestone grants Frostbell Herald');

// Frostfall emotes are locked until an account earns or purchases them.
const emoteOffers=FROSTFALL_EVENT.shop.filter(row=>row.reward.kind==='emote');
equal(emoteOffers.length,5,'Five Frostfall emotes are purchasable');
let emoteState=withEvent('EVT_ANNUAL_012_2026');
emoteState=applyEventDrops(emoteState,[{eventId:'EVT_ANNUAL_012_2026',currencyId:'FROSTBELL_TOKEN',name:'Frostbell Tokens',quantity:10000}]);
const ids=emoteOffers.map(offer=>offer.reward.id);
ok(ids.every(id=>chatUnavailableEmoteIds(':'+id+':',[]).includes(id)),'All event emotes require ownership');
emoteState=claimEventReward(emoteState,'emote_snowbell_ring',now);
equal(eventOfferPurchaseCount(emoteState,'EVT_ANNUAL_012_2026','frostfall_frostbell_cheer',now),1,'Milestone unlock marks matching shop offer owned');
let blocked=false;
try{purchaseEventOffer(emoteState,'frostfall_frostbell_cheer',now);}catch{blocked=true;}
ok(blocked,'Already owned emote cannot consume tokens');
for(const offer of emoteOffers.filter(row=>row.reward.id!=='emote_snowbell_ring'))emoteState=purchaseEventOffer(emoteState,offer.id,now);
ok(ids.every(id=>availableChatEmotes(emoteState.account.unlockedEmoteIds??[]).some(row=>row.id===id)),'All five unlock in account chat picker');
equal(eventCollectionJournal(emoteState,now).filter(row=>ids.includes(row.reward.id)).length,5,'Alternate reward sources do not duplicate journal items');

console.log('PASS: Veilbreak and Frostfall activate and grant their canonical event collectibles');
