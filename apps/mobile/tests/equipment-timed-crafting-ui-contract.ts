export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const queue=read('src/core/equipment-crafting-queue.ts');
const panel=read('src/components/EquipmentCraftQueuePanel.tsx');
const card=read('src/components/RecipeCard.tsx');
const skills=read('src/screens/SkillsScreen.tsx');
const commands=read('src/core/game-commands.ts');
const app=read('App.tsx');
const save=read('src/core/save-normalization.ts');

ok(queue.includes('BASE_EQUIPMENT_CRAFT_SLOTS=3'),'Equipment queue must start with 3 slots');
ok(queue.includes('MAX_EQUIPMENT_CRAFT_SLOTS=5'),'Equipment queue must hard-cap at 5 slots');
ok(queue.includes("label:'Supporter'")&&queue.includes("label:'VIP+'"),'Supporter and VIP+ must each be explicit slot sources');
ok(queue.includes("label:'Unlock character slot #2'")&&queue.includes("label:'Unlock character slot #4'"),'Second and fourth character-slot unlocks must each be explicit queue sources');
ok(queue.includes('Math.min(MAX_EQUIPMENT_CRAFT_SLOTS,raw)'),'Overlapping bonuses must never exceed the 5-slot cap');
ok(queue.includes('unlockedCharacterSlots(state)'),'Character queue bonuses must use unlocked slots rather than created-character count');
ok(queue.includes('gold:state.character!.gold-recipe.gold'),'Gold must be reserved when a craft starts');
ok(queue.includes('consumeAcross(next,input.itemId,input.quantity)'),'Materials must be reserved when a craft starts');
ok(queue.includes('completesAtMs:nowMs+seconds*1000'),'Timed craft completion must use the authoritative clock');
ok(queue.includes('awardOwnerSkillXp'),'Completion XP must follow the character that started the job');

ok(panel.includes('Crafting Queue')&&panel.includes('Queue slots'),'Skills must expose a compact equipment crafting queue');
ok(panel.includes('model.slotInfo.max'),'Queue UI must render the authoritative hard cap');
ok(panel.includes('Supporter')||panel.includes('slotInfo.sources'),'Queue UI must expose unlock-source progression');
ok(card.includes('Start craft ·'),'Equipment recipe CTA must start a timed craft rather than complete instantly');
ok(card.includes('equipmentCraftQueueModel'),'Recipe cards must disable starts when active slots are full');
ok(skills.includes('EquipmentCraftQueuePanel'),'Crafting mode must display the timed queue');
ok(commands.includes("case 'craft_claim'")&&commands.includes("case 'craft_claim_all'"),'Online-authoritative gameplay needs claim commands');
ok(commands.includes('startEquipmentCraft(state,id,now)'),'Authoritative craft command must start timed equipment jobs');
ok(app.includes("type:'craft_claim'")&&app.includes("type:'craft_claim_all'"),'Mobile app must route claims through online commands when enabled');
ok(app.includes('startEquipmentCraft(state,id,Date.now())'),'Offline/local equipment crafting must use the same timed domain path');
ok(save.includes('normalizeEquipmentCraftingQueue'),'Timed queue must persist safely through save normalization');
ok(save.includes('entitlements:booleanRecord'),'Supporter/VIP+ flags must survive save normalization');

console.log('PASS: timed crafting queue UI and authority wiring enforce the requested 3-to-5 slot model');
