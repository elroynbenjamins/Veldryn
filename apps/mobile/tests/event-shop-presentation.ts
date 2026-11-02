import {eventShopPurchaseStatus} from '../src/core/event-shop-presentation';
import {eventOfferPurchaseCount,eventShopOffers,purchaseEventOffer,setLocalEventEnabled} from '../src/core/live-events';
import {createCharacter,newGame} from '../src/core/game';
import {playerFacingGameplayError} from '../src/core/feature-unlocks';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
ok(/server needs an update/i.test(playerFacingGameplayError('Unknown event-shop offer.')),'older backend rejection is explained as a deployment mismatch');
const now=Date.UTC(2026,9,30),eventId='EVT_ANNUAL_010_2026';
let state=setLocalEventEnabled(createCharacter(newGame(now),'IRONWARDEN','EventShopTest'),true,now,eventId);
state={...state,character:{...state.character!,level:20},account:{...state.account,
 eventPrestigeBalanceById:{...state.account.eventPrestigeBalanceById,[eventId]:50},
 eventCurrencyBalanceById:{...state.account.eventCurrencyBalanceById,[eventId]:40000},
}};
const offers=eventShopOffers(state,now);
const one=offers.find(x=>x.id==='laughing_crow'),candy=offers.find(x=>x.id==='prestige_candy_pet');
ok(one&&candy,'Shop includes permanent and Pet Luck offers');
ok(eventShopPurchaseStatus(one,0).label==='1 AVAILABLE','one-time item shows available initially');
ok(eventShopPurchaseStatus(one,1).label==='✓ OWNED','purchased permanent reward visibly owned');
ok(eventShopPurchaseStatus(one,1).complete,'permanent ownership disables repeat buying');
ok(eventShopPurchaseStatus(candy,0).label==='5 AVAILABLE','consumable starts with visible per-event quantity');
ok(eventShopPurchaseStatus(candy,2).label==='2 / 5 BOUGHT','partial purchases show purchase count');
ok(eventShopPurchaseStatus(candy,5).label==='✓ LIMIT REACHED','capped consumable visibly at limit');
ok(eventShopPurchaseStatus(candy,999).remaining===0,'erroneously large count cannot unlock more purchases');
ok(eventShopPurchaseStatus(candy,-5).bought===0,'negative count is clamped');
state=purchaseEventOffer(state,one.id,now);
ok(eventShopPurchaseStatus(one,eventOfferPurchaseCount(state,eventId,one.id)).label==='✓ OWNED','actual permanent purchase reflected in status');
for(let i=0;i<5;i++)state=purchaseEventOffer(state,candy.id,now);
const status=eventShopPurchaseStatus(candy,eventOfferPurchaseCount(state,eventId,candy.id));
ok(status.complete&&status.bought===5&&status.remaining===0,'five actual Pet Luck purchases marked completed');
ok((state.account.eventCandyChargesById?.[`${eventId}:candy:pet`]??0)===5,'Pet Luck charges granted');
let rejected=false;try{purchaseEventOffer(state,candy.id,now);}catch(e){rejected=true;ok((e as Error).message==='Purchase limit reached.','server-authoritative sixth buy rejected');}
ok(rejected,'purchase limit is enforced');
console.log('PASS Event Shop: distinct owned/capped/partly purchased statuses and authoritative Pet Luck allowance');
