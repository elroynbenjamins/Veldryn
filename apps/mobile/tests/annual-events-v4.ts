import {createCharacter,newGame} from '../src/core/game';
import {applyEventDrops,claimAllEventMilestones,eventShopOffers,purchaseEventOffer} from '../src/core/live-events';

function ok(condition:boolean,message:string){if(!condition)throw new Error(message)}

const now=20_000_000;
const cases=[
  {eventId:'EVT_ANNUAL_006_2026',currencyId:'SUNCREST_MEDAL',currencyName:'Suncrest Medals',pet:'EVT_PET_007',shopPet:'EVT_PET_008',companion:'EVT_UNIT_004',shopId:'golden_gryphlet',prestige:7},
  {eventId:'EVT_ANNUAL_008_2026',currencyId:'STAR_SHARD',currencyName:'Star Shards',pet:'EVT_PET_009',shopPet:'EVT_PET_010',companion:'EVT_UNIT_005',shopId:'comet_moth',prestige:6},
  {eventId:'EVT_ANNUAL_011_2026',currencyId:'GUILD_SCRIP',currencyName:'Guild Scrip',pet:'EVT_PET_018',shopPet:'EVT_PET_019',companion:'EVT_UNIT_010',shopId:'guildcrest_drakelet',prestige:6},
] as const;

for(const row of cases){
  let state=createCharacter(newGame(now),'IRONWARDEN','Event Tester');
  state={...state,account:{...state.account,liveEvent:{eventId:row.eventId,enabled:true,startsAtMs:now-1000,endsAtMs:now+7*86400_000}}};
  state=applyEventDrops(state,[{eventId:row.eventId,currencyId:row.currencyId,name:row.currencyName,quantity:10000}]);
  state=claimAllEventMilestones(state,now);
  ok(state.account.unlockedCosmeticPetIds?.includes(row.pet)===true,`${row.eventId} milestone pet should unlock`);
  ok(state.account.unlockedCombatCompanionIds?.includes(row.companion)===true,`${row.eventId} milestone companion should unlock`);
  ok(!!state.account.combatCompanionProgress?.[row.companion],`${row.eventId} companion progression should initialize`);

  state={...state,account:{...state.account,eventPrestigeBalanceById:{...(state.account.eventPrestigeBalanceById??{}),[row.eventId]:row.prestige}}};
  ok(eventShopOffers(state,now).some(offer=>offer.id===row.shopId),`${row.eventId} prestige pet should be in event shop`);
  state=purchaseEventOffer(state,row.shopId,now);
  ok(state.account.unlockedCosmeticPetIds?.includes(row.shopPet)===true,`${row.eventId} prestige pet should unlock`);
}

console.log('PASS: Suncrest, Starfall, and Merchant Guild rewards unlock through production event runtime');
