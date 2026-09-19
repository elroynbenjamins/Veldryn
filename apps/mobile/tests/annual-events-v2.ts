import {createCharacter,newGame} from '../src/core/game';
import type {GameState} from '../src/core/types';
import {applyEventDiscoveries,applyEventDrops,claimEventDiscovery,claimEventReward,eventLifecycle,eventShopOffers,purchaseEventOffer} from '../src/core/live-events';

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
veil=applyEventDrops(veil,[{eventId:'EVT_ANNUAL_010_2026',currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:2250}]);
veil=claimEventReward(veil,'EVT_PET_013',now);
ok(veil.account.unlockedCosmeticPetIds?.includes('EVT_PET_013'),'Veilbreak milestone grants Gloomkin');
veil=applyEventDiscoveries(veil,[{eventId:'EVT_ANNUAL_010_2026',discoveryId:'lantern_mimic_key',name:'Crooked Lantern Key',quantity:5}]);
veil=claimEventDiscovery(veil,'lantern_mimic_key',now);
ok(veil.account.unlockedCosmeticPetIds?.includes('EVT_PET_014'),'Veilbreak discovery grants Lantern Mimic');
veil={...veil,account:{...veil.account,eventPrestigeBalanceById:{...(veil.account.eventPrestigeBalanceById??{}),EVT_ANNUAL_010_2026:8}}};
ok(eventShopOffers(veil,now).some(offer=>offer.id==='veil_hollow_knightling'),'Hollow Knightling is always in Veilbreak prestige stock');
veil=purchaseEventOffer(veil,'veil_hollow_knightling',now);
ok(veil.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_008'),'Veilbreak prestige purchase grants Hollow Knightling');
veil=applyEventDrops(veil,[{eventId:'EVT_ANNUAL_010_2026',currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:7750}]);
veil=claimEventReward(veil,'EVT_UNIT_007',now);
ok(veil.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_007'),'Veilbreak final milestone grants Veil Hound');

let frost=withEvent('EVT_ANNUAL_012_2026');
equal(eventLifecycle(frost,now)?.definition.name,'Frostfall Festival','Frostfall runtime resolves');
frost=applyEventDrops(frost,[{eventId:'EVT_ANNUAL_012_2026',currencyId:'FROSTBELL_TOKEN',name:'Frostbell Tokens',quantity:2250}]);
frost=claimEventReward(frost,'EVT_PET_015',now);
ok(frost.account.unlockedCosmeticPetIds?.includes('EVT_PET_015'),'Frostfall milestone grants Snowbell Pup');
frost=applyEventDiscoveries(frost,[{eventId:'EVT_ANNUAL_012_2026',discoveryId:'living_gift_tag',name:'Living Gift Tag',quantity:3}]);
frost=claimEventDiscovery(frost,'living_gift_tag',now);
ok(frost.account.unlockedCosmeticPetIds?.includes('EVT_PET_016'),'Frostfall discovery grants Gift Mimic');
frost={...frost,account:{...frost.account,eventPrestigeBalanceById:{...(frost.account.eventPrestigeBalanceById??{}),EVT_ANNUAL_012_2026:6}}};
ok(eventShopOffers(frost,now).some(offer=>offer.id==='frostfall_aurora_fox'),'Aurora Fox is always in Frostfall prestige stock');
frost=purchaseEventOffer(frost,'frostfall_aurora_fox',now);
ok(frost.account.unlockedCosmeticPetIds?.includes('EVT_PET_017'),'Frostfall prestige purchase grants Aurora Fox');
frost=applyEventDrops(frost,[{eventId:'EVT_ANNUAL_012_2026',currencyId:'FROSTBELL_TOKEN',name:'Frostbell Tokens',quantity:7750}]);
frost=claimEventReward(frost,'EVT_UNIT_009',now);
ok(frost.account.unlockedCombatCompanionIds?.includes('EVT_UNIT_009'),'Frostfall final milestone grants Frostbell Herald');

console.log('PASS: Veilbreak and Frostfall activate and grant their canonical event collectibles');
