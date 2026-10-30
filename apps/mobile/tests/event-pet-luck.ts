import {createCharacter,newGame} from '../src/core/game';
import {setLocalEventEnabled,consumeEventCandy,eventCandyWindow} from '../src/core/live-events';
import {resolveCorePetCombatDrops,resolveCorePetActivityDrops,type PetDropBoostWindow} from '../src/core/core-pet-drops';
import {eventCandies} from '../src/content/live-events';

function ok(value:boolean,message:string){if(!value)throw Error(message);}
const now=Date.UTC(2026,9,30),id='EVT_ANNUAL_010_2026';
let state=setLocalEventEnabled(createCharacter(newGame(now),'IRONWARDEN','PetLuck'),true,now,id);
const pet=eventCandies({id,name:'The Veilbreak',visualKey:'veilbreak'}).find(c=>c.kind==='pet')!;
ok(pet.secondsPerUse===7200&&pet.maxSeconds===36000,'One pet candy grants two hours, with a ten-hour active cap');
state={...state,account:{...state.account,eventCandyChargesById:{[pet.id]:1}}};
state=consumeEventCandy(state,now,'pet');
const window=eventCandyWindow(state,'pet')!;
ok(window.startsAtMs===now&&window.endsAtMs===now+2*3600000,'Pet Luck window is precisely two hours');
const boosted:PetDropBoostWindow={startsAtMs:window.startsAtMs,endsAtMs:window.endsAtMs,settlementStartsAtMs:now,settlementEndsAtMs:now+3600000};
const expired:PetDropBoostWindow={...boosted,settlementStartsAtMs:now+7200000,settlementEndsAtMs:now+10800000};
const partlyBoosted:PetDropBoostWindow={...boosted,settlementEndsAtMs:now+4*3600000};
const unowned={...state,quests:state.quests.map(row=>row.questId==='QST_003'?{...row,status:'claimed' as const}:row),account:{...state.account,unlockedCosmeticPetIds:[]}};
ok(resolveCorePetCombatDrops(unowned,'IRONWOOD_WOLF',1,'wolf',()=>0.0015,boosted).includes('PET_004'),'Base 0.10% combat pet chance must double to 0.20%');
ok(resolveCorePetCombatDrops(unowned,'IRONWOOD_WOLF',1,'wolf',()=>0.0015,expired).length===0,'Pet luck must not work after expiry');
ok(resolveCorePetCombatDrops(unowned,'OATHGLASS_REVENANT',1,'oath',()=>0.00075,boosted).includes('PET_018'),'0.05% signature chance doubles to 0.10%');
ok(resolveCorePetActivityDrops(unowned,'gathering','COPPER_VEIN',1,'ore',()=>0.002,boosted).includes('PET_001'),'Gathering pet chance doubles from 0.12% to 0.24%');
ok(resolveCorePetActivityDrops(unowned,'exploration','SCOUT_GREENFIELDS',1,'scout',()=>0.003,boosted).includes('PET_010'),'Exploration pet chance doubles from 0.20% to 0.40%');
ok(resolveCorePetCombatDrops(unowned,'IRONWOOD_WOLF',4,'partial',(_,i)=>i===0?0.0015:1,partlyBoosted).includes('PET_004'),'Attempts in the first half of an offline settlement retain pet luck');
ok(resolveCorePetCombatDrops(unowned,'IRONWOOD_WOLF',4,'partial',(_,i)=>i===3?0.0015:1,partlyBoosted).length===0,'Attempts after pet candy expiry must remain at baseline chance');
console.log('PASS: timed Pet Luck doubles configured regional pet drop rates, including signature, gathering, exploration and offline time boundaries.');
