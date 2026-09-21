export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const rarity=read('src/core/crafted-gear-rarity.ts');
const instances=read('src/core/gear-instances.ts');
const crafted=read('src/core/crafted-gear-instances.ts');
const queue=read('src/core/equipment-crafting-queue.ts');
const enhancement=read('src/core/equipment-enhancement.ts');
const decisions=read('src/core/equipment-decision.ts');
const inspect=read('src/core/item-inspect.ts');
const inventory=read('src/screens/InventoryScreen.tsx');
const card=read('src/components/ItemCard.tsx');
const commands=read('src/core/game-commands.ts');
const app=read('App.tsx');
const save=read('src/core/save-normalization.ts');
const types=read('src/core/types.ts');

ok(rarity.includes('CRAFTED_MYTHIC_CHANCE=.001')&&rarity.includes('CRAFTED_EPIC_CHANCE=.006'),'Forge quality odds must remain exactly 0.10% Mythic / 0.60% Epic');
ok(rarity.includes('return base'),'Missed Forge quality proc must preserve authored rarity');
ok(types.includes('equipmentInstanceIds?:Partial<Record<GearSlot,string>>'),'Character equipment must persist exact copy IDs per slot');
ok(types.includes('gearInstances?:GearInstance[]'),'Account save must own the canonical equipment instance registry');
ok(instances.includes('location:GearInstanceLocation'),'Every equipment copy must persist its storage/equipped location');
ok(instances.includes('equipmentInstanceIds:equipmentIdsByOwner'),'Legacy equipment must migrate to exact equipped IDs');
ok(!crafted.includes('bestCraftedInstanceForItem')&&!crafted.includes('effectiveOwnedGearRarity'),'Best-copy compatibility helpers must be removed');
ok(queue.includes('createCraftedGearInstance')&&queue.includes('location:granted.location'),'Forge claims must create the exact copy in its real destination');
ok(queue.includes('craftClaimSubRoll'),'Claim All must derive per-job rolls from trusted randomness');

ok(enhancement.includes('updateGearInstance(state,instanceId'),'Upgrades and gems must mutate only the selected instance');
ok(enhancement.includes('requireEquipped(state:GameState,instanceId:string)'),'Enhancement mutations must require the exact equipped copy');
ok(decisions.includes('equipmentDecisionModel(state:GameState,itemId:string,instanceId?:string)'),'Character decisions must accept exact equipment IDs');
ok(inspect.includes('itemInspectModel(state:GameState,itemId:string,instanceId?:string)'),'Quick Inspect must accept an exact selected copy');
ok(inventory.includes('gearInstancesForStorage(state,location,item.id'),'Inventory must expand a gear definition into owned copy rows');
ok(inventory.includes('copyLabel:')&&inventory.includes('COPY '),'Duplicate equipment cards must visibly identify the selected copy');
ok(card.includes('copyLabel?:string'),'ItemCard must support per-copy identity labels');
ok(inventory.includes('onSellInstance')&&inventory.includes('onDepositInstance')&&inventory.includes('onWithdrawInstance'),'Inventory destructive/transfer actions must carry exact instance identity');

ok(commands.includes("game.equipGearInstance(state,text(a,'instanceId'"),'Authoritative equip must require instanceId');
ok(commands.includes("game.sellGearInstance(state,text(a,'instanceId'"),'Authoritative gear selling must target instanceId');
ok(commands.includes("attemptEquipmentUpgrade(state,text(a,'instanceId'"),'Authoritative upgrading must target instanceId');
ok(commands.includes("socketGem(state,text(a,'instanceId'"),'Authoritative socketing must target instanceId');
ok(commands.includes("if(options.randomRoll===undefined)throw new Error('trusted_random_required')"),'Online Forge settlement must require trusted randomness');
ok(app.includes('args:{instanceId}'),'Mobile gear actions must forward exact instance IDs');
ok(save.includes('migrateToPerInstanceGear(normalized)'),'Save normalization must complete the one-time per-instance migration');
ok(save.includes('gearInstances:normalizeGearInstances'),'Exact instances must persist through save normalization');

console.log('PASS: final per-instance equipment UI, authority and migration wiring are protected');
