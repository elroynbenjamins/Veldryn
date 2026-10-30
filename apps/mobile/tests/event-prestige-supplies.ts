import {createCharacter,newGame} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {eventCandies} from '../src/content/live-events';
import {eventOfferPurchaseCount,eventShopOffers,eventPrestigeBalance,purchaseEventOffer,setLocalEventEnabled} from '../src/core/live-events';

function ok(value:boolean,message:string){if(!value)throw new Error(message);}
function rejects(action:()=>unknown,message:string){let failed=false;try{action();}catch{failed=true;}ok(failed,message);}

const now=Date.UTC(2026,9,30),eventId='EVT_ANNUAL_010_2026';
let state=setLocalEventEnabled(createCharacter(newGame(now),'IRONWARDEN','PrestigeShop'),true,now,eventId);
state={...state,character:{...state.character!,level:10},account:{...state.account,
 eventPrestigeBalanceById:{...state.account.eventPrestigeBalanceById,[eventId]:40},
 eventCurrencyBalanceById:{...state.account.eventCurrencyBalanceById,[eventId]:5000},
}};
const offers=eventShopOffers(state,now);
const premium=['prestige_bondstone','prestige_companion_essence','prestige_candy_skill','prestige_candy_combat'];
for(const id of premium)ok(offers.some(offer=>offer.id===id&&offer.currency==='prestige'),'Expected capped prestige offer: '+id);
ok(offers.find(row=>row.id==='prestige_candy_skill')?.limit===5,'Gathering candy cap must be five');
ok(offers.find(row=>row.id==='prestige_candy_combat')?.limit===5,'Battle candy cap must be five');

const startBondstones=state.account.bondstones??0,startEssence=state.account.companionEssence??0;
state=executeGameCommand(state,{type:'event_purchase',args:{id:'prestige_bondstone'}},now).state;
state=purchaseEventOffer(state,'prestige_bondstone',now);
state=purchaseEventOffer(state,'prestige_bondstone',now);
ok((state.account.bondstones??0)===startBondstones+3,'Bondstones credit to account');
rejects(()=>purchaseEventOffer(state,'prestige_bondstone',now),'Bondstone fourth purchase must fail');
for(let i=0;i<4;i++)state=purchaseEventOffer(state,'prestige_companion_essence',now);
ok((state.account.companionEssence??0)===startEssence+500,'Companion Essence credits the account');
rejects(()=>purchaseEventOffer(state,'prestige_companion_essence',now),'Essence fifth purchase must fail');

for(let i=0;i<3;i++)state=purchaseEventOffer(state,'gloam_candy_skill',now);
for(let i=0;i<2;i++)state=purchaseEventOffer(state,'prestige_candy_skill',now);
ok(eventOfferPurchaseCount(state,eventId,'prestige_candy_skill')===5,'Premium gathering candy reports combined purchases');
ok(eventOfferPurchaseCount(state,eventId,'gloam_candy_skill')===5,'Common gathering candy reports combined purchases');
rejects(()=>purchaseEventOffer(state,'prestige_candy_skill',now),'Premium currency must not bypass five-candy limit');
rejects(()=>purchaseEventOffer(state,'gloam_candy_skill',now),'Common currency must not bypass five-candy limit');

for(let i=0;i<5;i++)state=purchaseEventOffer(state,'prestige_candy_combat',now);
rejects(()=>purchaseEventOffer(state,'gloam_candy_battle',now),'Battle candy cap is shared across currencies');
const candies=eventCandies({id:eventId,name:'The Veilbreak',visualKey:'veilbreak'});
ok(candies.find(row=>row.kind==='combat')?.description.includes('No PvP')===true,'Battle candy must not inadvertently boost PvP');
ok((state.account.eventCandyChargesById?.[`${eventId}:candy:skill`]??0)===5,'Gathering candy charges are correctly awarded');
ok((state.account.eventCandyChargesById?.[`${eventId}:candy:combat`]??0)===5,'Combat candy charges are correctly awarded');
ok(eventPrestigeBalance(state,eventId)===40-3*2-4-2-5,'Prestige wallet is deducted by the exact offer costs');

const empty=setLocalEventEnabled(createCharacter(newGame(now),'IRONWARDEN','NoPrestige'),true,now,eventId);
rejects(()=>purchaseEventOffer(empty,'prestige_bondstone',now),'Insufficient prestige must reject purchase');
console.log('PASS: prestige event supply rewards, wallet accounting, dual-currency shared candy limits, insufficient funds and PvP safety.');
