import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {companionHousingUpgradeAffordability,upgradeCompanionHousing,companionHousingTier} from '../src/core/companion-housing';

let state=createCharacter(newGame(0),'IRONWARDEN','Housing Test');
state.account.unlockedCombatCompanionIds=['UNIT_001'];
state.character!.gold=20000;
// Split material stacks must be added together across both storage locations.
state.inventory.stacks.push({itemId:'IRONWOOD_LOG',quantity:15},{itemId:'IRONWOOD_LOG',quantity:25},{itemId:'ASTER_IRON_INGOT',quantity:12});
state.bank.stacks.push({itemId:'REINFORCED_FITTING',quantity:3});
const check=companionHousingUpgradeAffordability(state as any,'UNIT_001');
assert.equal(check.ready,true);
const next=upgradeCompanionHousing(state as any,'UNIT_001');
assert.equal(companionHousingTier('UNIT_001',(next.account as any).companionHousingTiers),1);
assert.equal(next.character!.gold,12000);
assert.equal(next.inventory.stacks.some((x:any)=>x.itemId==='IRONWOOD_LOG'),false);
assert.equal(next.bank.stacks.some((x:any)=>x.itemId==='REINFORCED_FITTING'),false);
assert.throws(()=>upgradeCompanionHousing({...state,account:{...state.account,unlockedCombatCompanionIds:[]}} as any,'UNIT_001'),/companion_not_owned/);
console.log('PASS companion Housing upgrade spends mixed stacks and rejects unowned upgrades');
