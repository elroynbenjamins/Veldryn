import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {companionHousingUpgradeAffordability,upgradeCompanionHousing,companionHousingTier} from '../src/core/companion-housing';

let state=createCharacter(newGame(0),'IRONWARDEN','Housing Test');
state.character!.gold=20000;
state.inventory.stacks.push({itemId:'IRONWOOD_LOG',quantity:80},{itemId:'ASTER_IRON_INGOT',quantity:30});
state.bank.stacks.push({itemId:'REINFORCED_FITTING',quantity:8});
const check=companionHousingUpgradeAffordability(state as any,'UNIT_001');
assert.equal(check.ready,true);
const next=upgradeCompanionHousing(state as any,'UNIT_001');
assert.equal(companionHousingTier('UNIT_001',(next.account as any).companionHousingTiers),1);
assert.equal(next.character!.gold,8000);
assert.equal(next.inventory.stacks.some((x:any)=>x.itemId==='IRONWOOD_LOG'),false);
assert.equal(next.bank.stacks.some((x:any)=>x.itemId==='REINFORCED_FITTING'),false);
console.log('PASS companion Housing upgrade spends bank/inventory materials and Gold');
