export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const rarity=read('src/core/crafted-gear-rarity.ts');
const instances=read('src/core/crafted-gear-instances.ts');
const queue=read('src/core/equipment-crafting-queue.ts');
const enhancement=read('src/core/equipment-enhancement.ts');
const decisions=read('src/core/equipment-decision.ts');
const inspect=read('src/core/item-inspect.ts');
const inventory=read('src/screens/InventoryScreen.tsx');
const card=read('src/components/ItemCard.tsx');
const copies=read('src/components/GearCopiesModal.tsx');
const commands=read('src/core/game-commands.ts');
const app=read('App.tsx');
const forgeFeedback=read('src/components/ForgeResultFeedback.tsx');
const save=read('src/core/save-normalization.ts');

ok(rarity.includes('CRAFTED_MYTHIC_CHANCE=.001')&&rarity.includes('CRAFTED_EPIC_CHANCE=.006'),'Forge quality odds must remain exactly 0.10% Mythic / 0.60% Epic');
ok(rarity.includes('return base'),'Missed Forge quality proc must preserve authored rarity');
ok(instances.includes("acquireSource:'craft'"),'Crafted equipment must persist acquisition provenance');
ok(instances.includes('sourceReceiptKey:args.jobId'),'Forge job receipt must make settlement idempotent');
ok(!instances.includes('bestCraftedInstanceForItem'),'The best-copy compatibility bridge must be removed');
ok(instances.includes('equippedGearInstanceId')&&instances.includes('inventoryGearCopies'),'Exact equipped and carried copy identity must be first-class');
ok(queue.includes('createCraftedGearInstance'),'Forge claim must create the owned equipment instance');
ok(queue.includes('craftClaimSubRoll'),'Claim All must derive per-job rolls from trusted randomness');

ok(enhancement.includes('equippedGearInstanceId')&&enhancement.includes('updateGearInstanceEnhancement'),'Upgrade and gem state must resolve and write the exact equipped copy');
ok(enhancement.includes('craftedRarityStatMultiplier'),'Forged rarity must affect live equipment stats');
ok(decisions.includes('effectiveOwnedGearRarity(state,itemId)'),'Character equipment decisions must show forged rarity');
ok(inspect.includes('craftedCopies')&&inspect.includes('craftedRarities'),'Quick Inspect must expose duplicate crafted-copy context');
ok(inventory.includes('GearCopiesModal')&&inventory.includes('inventoryGearCopies'),'Inventory gear actions must route through exact-copy selection');
ok(copies.includes('COPY A / B COMPARISON')&&copies.includes('Equip this copy'),'Duplicate picker must support direct same-piece comparison and exact equip');
ok(copies.includes('Stat Gem')&&copies.includes('Effect Gem'),'Duplicate picker must surface per-copy gem identity');
ok(card.includes('rarityOverride'),'ItemCard can still support explicit rarity styling where a concrete instance is supplied');

ok(commands.includes("if(options.randomRoll===undefined)throw new Error('trusted_random_required')"),'Online Forge settlement must require trusted randomness');
ok(commands.includes('quality proc'),'Authoritative claim messaging must surface quality procs');
ok(app.includes('setForgeResults(result.forgeResults)')&&app.includes('ForgeRarityRevealModal'),'Mobile online claims must present authoritative structured Forge rarity results');
ok(app.includes('setForgeResults([claimed.result])'),'Mobile offline claims must use the same structured Forge rarity result path');
ok(forgeFeedback.includes('EXCEPTIONAL FORGE RESULT')&&forgeFeedback.includes('qualityProc'),'Quality procs must use the dedicated rarity-aware Forge reveal');
ok(save.includes('normalizeCraftedGearInstances'),'Crafted instances must persist through save normalization');

console.log('PASS: exact equipment-instance result/economy UI and authority wiring are protected');
