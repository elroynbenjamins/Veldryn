import {visibleCombatCompanions} from '../src/content/combat-companions';
import {FROSTFALL_PETS} from '../src/content/event-collectible-content-active';
import {collectibleCatalogForState,collectibleJournal,collectionBonusBreakdown} from '../src/core/collectibles';
import {frostfallRewardsDiscoverable,FROSTFALL_2026_EVENT_ID} from '../src/core/frostfall-reward-visibility';
import {createCharacter,newGame} from '../src/core/game';
import type {GameState} from '../src/core/types';
const check=(v:unknown,message:string)=>{if(!v)throw new Error(message);};
const start=Date.UTC(2026,11,3),end=Date.UTC(2026,11,27),grace=Date.UTC(2026,11,29);
const runtime={eventId:FROSTFALL_2026_EVENT_ID,enabled:true,startsAtMs:start,endsAtMs:end,graceEndsAtMs:grace};
const base=createCharacter(newGame(start-1),'IRONWARDEN','Frostfall lifecycle QA');
const state:GameState={...base,account:{...base.account,liveEvent:runtime}};
const ids=['EVT_UNIT_009','EVT_UNIT_012','EVT_UNIT_013'],pets=FROSTFALL_PETS.map(row=>row.id);
for(const [now,open] of [[start-1,false],[start,true],[end-1,true],[end,true],[grace-1,true],[grace,false]] as const){
 check(frostfallRewardsDiscoverable(state.account,now)===open,'Exact server window boundary '+now);
 const roster=visibleCombatCompanions(state.account,now);
 check(ids.every(id=>roster.some(row=>row.id===id)===open),'Companion discovery at '+now);
 const catalog=collectibleCatalogForState(state,now);
 check(pets.every(id=>catalog.some(row=>row.id===id)===open),'Pet discovery at '+now);
}
for(const liveEvent of [undefined,{...runtime,enabled:false},{...runtime,eventId:'other'},{...runtime,startsAtMs:NaN},{...runtime,endsAtMs:start}]){
 const account={...state.account,liveEvent};check(!frostfallRewardsDiscoverable(account,start),'Missing, disabled, other or malformed runtime must fail closed');
}
const owned:GameState={...state,account:{...state.account,liveEvent:undefined,unlockedCombatCompanionIds:[...(state.account.unlockedCombatCompanionIds??[]),ids[0]],unlockedCosmeticPetIds:[...(state.account.unlockedCosmeticPetIds??[]),pets[0]]}};
check(visibleCombatCompanions(owned.account,grace).some(row=>row.id===ids[0]),'Owned companion remains visible offline after event');
check(!visibleCombatCompanions(owned.account,grace).some(row=>row.id===ids[1]),'Unowned reward remains hidden');
check(collectibleJournal(owned).some(row=>row.id===pets[0]&&row.owned),'Owned pet remains in journal after closure');
check(collectionBonusBreakdown(owned).some(row=>row.target===FROSTFALL_PETS[0].target&&row.ownedAppliedBps>=50),'Owned pet retains its passive bonus');
check(!visibleCombatCompanions(base.account,grace).some(row=>row.id===ids[0]),'No account-global roster leakage');
console.log('PASS: Frostfall exact boundaries, fail-closed discovery, offline ownership and account isolation');
