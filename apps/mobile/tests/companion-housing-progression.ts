import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {unlockCombatCompanion,sanitizeCombatCompanionState,purchaseCompanionLevel,applyCompanionXp,combatCompanionUiModel,grantCompanionBondFromUse,grantEquippedCompanionUse} from '../src/core/combat-companions';
import {companionHousingBonuses,companionHousingLevelEssenceCost,companionHousingTier,companionHousingUpgradeCost,upgradeCompanionHousing,normalizeCompanionHousingTiers} from '../src/core/companion-housing';
import {normalizeCompanionRuntimeSave} from '../src/core/companion-save';
import {combatCompanionDef} from '../src/content/combat-companions';
import {awardCompanionXpServer} from '../../../backend/src/server/companions/progression-v2';

function rejected(fn:()=>unknown,reason:string){
 let message='';try{fn();}catch(error){message=String(error);}
 assert.ok(message.includes(reason),'expected rejection '+reason+', got '+message);
}
const now=Date.UTC(2026,10,16),id='UNIT_004',def=combatCompanionDef(id)!;
let fresh=unlockCombatCompanion(createCharacter(newGame(now),'IRONWARDEN','Housing Bonus'),id,now);
fresh.character!.gold=100000;fresh.account.companionEssence=100000;
assert.equal(fresh.account.companionHousingMigratedV1,true);
assert.equal(companionHousingTier(id,fresh.account.companionHousingTiers),0);

// Ascension alone blocks training; Basic Quarters does not block an ascended companion.
fresh.account.combatCompanionProgress![id]={...fresh.account.combatCompanionProgress![id],level:10,ascensionTier:0,xp:0};
rejected(()=>purchaseCompanionLevel(fresh,id),'Ascension required');
fresh.account.combatCompanionProgress![id]={...fresh.account.combatCompanionProgress![id],ascensionTier:1};
const normalCost=combatCompanionUiModel(fresh,id)!.nextLevelCost!;
assert.ok(normalCost.gold>0&&normalCost.companionEssence>0);
assert.equal(combatCompanionUiModel(fresh,id)!.levelCap,20);
assert.equal(purchaseCompanionLevel(fresh,id).account.combatCompanionProgress![id].level,11);
assert.equal(applyCompanionXp(fresh.account.combatCompanionProgress![id],def,999999).level,20);
const serverCapped=awardCompanionXpServer({progress:{...fresh.account.combatCompanionProgress![id],companionId:id},amount:999999,companionEssence:0,serverNowMs:now});
assert.equal(serverCapped.progress.level,20);
assert.ok(serverCapped.droppedXp>0);

// Paid Housing upgrades are preserved and provide bonuses, not level unlocks.
fresh.inventory.stacks.push({itemId:'IRONWOOD_LOG',quantity:40},{itemId:'ASTER_IRON_INGOT',quantity:12});
fresh.bank.stacks.push({itemId:'REINFORCED_FITTING',quantity:3});
const upgraded=upgradeCompanionHousing(fresh,id);
assert.equal(companionHousingTier(id,upgraded.account.companionHousingTiers),1);
assert.deepEqual(companionHousingBonuses(0),{trainingXpPct:0,bondXpPct:0,essenceDiscountPct:0});
assert.deepEqual(companionHousingBonuses(1),{trainingXpPct:5,bondXpPct:5,essenceDiscountPct:3});
assert.deepEqual(companionHousingBonuses(3),{trainingXpPct:15,bondXpPct:15,essenceDiscountPct:10});
assert.equal(companionHousingLevelEssenceCost(100,1),97);
assert.equal(companionHousingLevelEssenceCost(1,3),1);
const upgradedCost=combatCompanionUiModel(upgraded,id)!.nextLevelCost!;
assert.equal(upgradedCost.gold,normalCost.gold);
assert.equal(upgradedCost.companionEssence,companionHousingLevelEssenceCost(normalCost.companionEssence,1));
assert.equal(combatCompanionUiModel(upgraded,id)!.levelCap,20);
assert.equal(purchaseCompanionLevel(upgraded,id).account.combatCompanionProgress![id].level,11);

const bondBasic=grantCompanionBondFromUse(fresh,id,'boss').account.combatCompanionProgress![id].bondXp;
const bondUpgraded=grantCompanionBondFromUse(upgraded,id,'boss').account.combatCompanionProgress![id].bondXp;
assert.ok(bondUpgraded>bondBasic);
const equippedBasic={...fresh,character:{...fresh.character!,equippedCombatCompanionId:id}};
const equippedUpgraded={...upgraded,character:{...upgraded.character!,equippedCombatCompanionId:id}};
const xpBasic=grantEquippedCompanionUse(equippedBasic,'boss').account.combatCompanionProgress![id].xp;
const xpUpgraded=grantEquippedCompanionUse(equippedUpgraded,'boss').account.combatCompanionProgress![id].xp;
assert.ok(xpUpgraded>=xpBasic);

// Save round-trip and one-time veteran grants do not reset purchased quarters.
const freshRestore=normalizeCompanionRuntimeSave(upgraded.account);
assert.equal(freshRestore.companionHousingMigratedV1,true);
assert.equal(companionHousingTier(id,freshRestore.companionHousingTiers),1);
let legacy=unlockCombatCompanion(createCharacter(newGame(now),'IRONWARDEN','Veteran Housing'),id,now);
legacy.account.combatCompanionProgress![id]={...legacy.account.combatCompanionProgress![id],level:20,ascensionTier:1};
legacy.account.companionHousingTiers={};legacy.account.companionHousingMigratedV1=false;
const migrated=sanitizeCombatCompanionState(legacy),again=sanitizeCombatCompanionState(migrated);
assert.equal(migrated.account.combatCompanionProgress![id].level,20);
assert.equal(companionHousingTier(id,migrated.account.companionHousingTiers),1);
assert.equal(companionHousingTier(id,again.account.companionHousingTiers),1);
assert.equal(migrated.account.companionHousingMigratedV1,true);
const tampered={...migrated,account:{...migrated.account,combatCompanionProgress:{...migrated.account.combatCompanionProgress,[id]:{...migrated.account.combatCompanionProgress![id],level:25,ascensionTier:2 as const}}}};
assert.equal(companionHousingTier(id,sanitizeCombatCompanionState(tampered).account.companionHousingTiers),1);
assert.deepEqual(normalizeCompanionHousingTiers({UNIT_004:99,OTHER:-1,WRONG:'3'}),{UNIT_004:3});
// Every rarity can buy tiers for bonuses even after its level maximum.
assert.ok(companionHousingUpgradeCost('UNIT_001',{UNIT_001:1}));
assert.ok(companionHousingUpgradeCost('UNIT_004',{UNIT_004:2}));
assert.ok(!companionHousingUpgradeCost('UNIT_004',{UNIT_004:3}));
console.log('PASS housing bonuses: ascension-only caps, XP/Bond/Essence boosts, legacy credit and save round-trip');
