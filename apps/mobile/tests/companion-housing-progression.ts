import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {unlockCombatCompanion,sanitizeCombatCompanionState,purchaseCompanionLevel,applyCompanionXp,combatCompanionUiModel} from '../src/core/combat-companions';
import {companionHousingTier,companionHousingLevelCap,upgradeCompanionHousing,normalizeCompanionHousingTiers} from '../src/core/companion-housing';
import {normalizeCompanionRuntimeSave} from '../src/core/companion-save';
import {combatCompanionDef} from '../src/content/combat-companions';
import {awardCompanionXpServer} from '../../../backend/src/server/companions/progression-v2';

function rejected(fn:()=>unknown,reason:string){
 let message='';try{fn();}catch(error){message=String(error);}
 assert.ok(message.includes(reason),'expected rejection '+reason+', got '+message);
}
const now=Date.UTC(2026,10,15),id='UNIT_004',def=combatCompanionDef(id)!;
let fresh=unlockCombatCompanion(createCharacter(newGame(now),'IRONWARDEN','Housing Cap'),id,now);
fresh.character!.gold=100000;fresh.account.companionEssence=10000;
assert.equal(fresh.account.companionHousingMigratedV1,true);
assert.equal(companionHousingTier(id,fresh.account.companionHousingTiers),0);
fresh.account.combatCompanionProgress![id]={...fresh.account.combatCompanionProgress![id],level:10,ascensionTier:1,xp:0};
rejected(()=>purchaseCompanionLevel(fresh,id),'Upgrade Companion Quarters');
assert.equal(combatCompanionUiModel(fresh,id)?.nextLevelCost,undefined);
const capped=applyCompanionXp(fresh.account.combatCompanionProgress![id],def,999999,10);
assert.equal(capped.level,10);
const serverCapped=awardCompanionXpServer({progress:{...fresh.account.combatCompanionProgress![id],companionId:id},amount:999999,companionEssence:0,serverNowMs:now,maxLevelCap:10});
assert.equal(serverCapped.progress.level,10);
assert.ok(serverCapped.droppedXp>0);
fresh.inventory.stacks.push({itemId:'IRONWOOD_LOG',quantity:40},{itemId:'ASTER_IRON_INGOT',quantity:12});
fresh.bank.stacks.push({itemId:'REINFORCED_FITTING',quantity:3});
const upgraded=upgradeCompanionHousing(fresh,id);
assert.equal(companionHousingLevelCap(companionHousingTier(id,upgraded.account.companionHousingTiers)),20);
assert.equal(purchaseCompanionLevel(upgraded,id).account.combatCompanionProgress![id].level,11);
const freshRestore=normalizeCompanionRuntimeSave(upgraded.account);
assert.equal(freshRestore.companionHousingMigratedV1,true);
assert.equal(companionHousingTier(id,freshRestore.companionHousingTiers),1);

let legacy=unlockCombatCompanion(createCharacter(newGame(now),'IRONWARDEN','Veteran Housing'),id,now);
legacy.account.combatCompanionProgress![id]={...legacy.account.combatCompanionProgress![id],level:20,ascensionTier:1};
legacy.account.companionHousingTiers={};
legacy.account.companionHousingMigratedV1=false;
const migrated=sanitizeCombatCompanionState(legacy),again=sanitizeCombatCompanionState(migrated);
assert.equal(migrated.account.combatCompanionProgress![id].level,20);
assert.equal(companionHousingTier(id,migrated.account.companionHousingTiers),1);
assert.equal(companionHousingTier(id,again.account.companionHousingTiers),1);
assert.equal(migrated.account.companionHousingMigratedV1,true);
// No repeat grants after migration, even if an unusually high level appears in an imported record.
const tampered={...migrated,account:{...migrated.account,combatCompanionProgress:{...migrated.account.combatCompanionProgress,[id]:{...migrated.account.combatCompanionProgress![id],level:25,ascensionTier:2}}}};
assert.equal(companionHousingTier(id,sanitizeCombatCompanionState(tampered).account.companionHousingTiers),1);
assert.deepEqual(normalizeCompanionHousingTiers({UNIT_004:99,OTHER:-1,WRONG:'3'}),{UNIT_004:3});
console.log('PASS quarters progression: XP caps, paid training, legacy credit, and save round-trip');
