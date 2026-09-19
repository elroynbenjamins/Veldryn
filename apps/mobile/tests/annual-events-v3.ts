import {createCharacter,newGame} from '../src/core/game';
import {applyEventDrops,claimAllEventMilestones,eventShopOffers,purchaseEventOffer} from '../src/core/live-events';

function ok(condition:boolean,message:string){if(!condition)throw new Error(message)}

const now=10_000_000;
const cases=[
  {eventId:'EVT_ANNUAL_001_2026',currencyId:'AGE_TOKEN',currencyName:'Age Tokens',pet:'EVT_PET_001',shopPet:'EVT_PET_002',companion:'EVT_UNIT_001',shopId:'gilded_hourling',prestige:6},
  {eventId:'EVT_ANNUAL_002_2026',currencyId:'HEART_TOKEN',currencyName:'Heart Tokens',pet:'EVT_PET_003',shopPet:'EVT_PET_004',companion:'EVT_UNIT_002',shopId:'heartwing',prestige:6},
  {eventId:'EVT_ANNUAL_003_2026',currencyId:'BLOOM_TOKEN',currencyName:'Bloom Tokens',pet:'EVT_PET_005',shopPet:'EVT_PET_006',companion:'EVT_UNIT_003',shopId:'verdant_fawn',prestige:5},
] as const;

for(const row of cases){
  let state=createCharacter(newGame(now),'IRONWARDEN',row.eventId);
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

console.log('PASS: Turning, Heartbond, and Bloomwake rewards unlock through production event runtime');
