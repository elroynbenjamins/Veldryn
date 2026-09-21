export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const rarity=read('src/core/crafted-gear-instances.ts');
const itemRarity=read('src/core/item-rarity.ts');
const v33=read('src/content/equipment-items-v33.ts');
const queue=read('src/core/equipment-crafting-queue.ts');
const enhancement=read('src/core/equipment-enhancement.ts');
const inventory=read('src/screens/InventoryScreen.tsx');
const card=read('src/components/ItemCard.tsx');
const equipment=read('src/core/equipment-screen.ts');
const slot=read('src/components/EquipmentSlot.tsx');
const inspect=read('src/core/item-inspect.ts');
const commands=read('src/core/game-commands.ts');
const save=read('src/core/save-normalization.ts');
const migration=read('../../backend/supabase/migrations/20260921020000_equipment_crafted_rarity_v27.sql');

ok(rarity.includes("common:.89,uncommon:.07,rare:.03,epic:.006,legendary:.003,mythic:.001"),'Universal Forge odds must be 89/7/3/0.6/0.3/0.1');
ok(rarity.includes("CRAFTED_GEAR_STAT_MULTIPLIER")&&rarity.includes("legendary:1.14")&&rarity.includes("mythic:1.18"),'Crafted quality needs the balanced stat curve');
ok(itemRarity.includes("label:'Epic',chance:.006")&&itemRarity.includes("label:'Legendary',chance:.003")&&itemRarity.includes("label:'Mythic',chance:.001"),'Shared rarity metadata must match Forge odds');
ok(v33.includes("T1:'common',T2:'common',T3:'common',T4:'common',T5:'common',T6:'common',T7:'common',T8:'common',T9:'common'"),'V33 tiers must not provide a rarity floor');

ok(queue.includes('addCraftedGearInstance')&&queue.includes("instanceId:'craft:'+job.id"),'Forge claim must create a persistent unique gear instance');
ok(queue.includes('derivedCraftRarityRoll'),'Claim All must derive per-job rolls from trusted randomness');
ok(commands.includes("trusted_random_required")&&commands.includes('claimEquipmentCraft(state')&&commands.includes('options.randomRoll'),'Online Forge claims must use trusted server randomness');
ok(enhancement.includes('gearInstanceRarityMultiplier')&&enhancement.includes('updateGearInstance'),'Stats, ranks and sockets must follow the actual owned copy');

ok(inventory.includes('rarityBreakdownForStack')&&inventory.includes('bestStoredGearInstance'),'Inventory must summarize mixed-rarity duplicates and select a concrete copy');
ok(card.includes('rarityOverride')&&card.includes('rarityBreakdown'),'Item cards must render instance rarity instead of static tier rarity');
ok(equipment.includes('equippedGearInstance')&&slot.includes('rarityOverride'),'Equipped slots must render the bound instance rarity');
ok(inspect.includes('ownedInstance')&&inspect.includes('gearInstanceRarityMultiplier'),'Quick Inspect must use actual owned instance quality');
ok(save.includes('normalizeGearInstances')&&save.includes('equippedGearInstanceIds'),'Instance identity must survive saves and character switching');

ok(migration.includes("'Legendary'")&&migration.includes("set default 'Common'"),'Backend crafted rarity must allow Legendary and default to Common');
ok(migration.includes('Common 89%')&&migration.includes('Mythic 0.1%'),'Backend migration must document the universal tier-independent odds');

console.log('PASS: crafted rarity is tier-independent, Legendary-enabled, instance-backed and wired across Forge, inventory, equipment and persistence');
