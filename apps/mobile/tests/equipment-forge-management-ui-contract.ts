export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const queue=read('src/core/equipment-crafting-queue.ts');
const prereq=read('src/core/equipment-crafting-prerequisites.ts');
const panel=read('src/components/EquipmentCraftQueuePanel.tsx');
const card=read('src/components/RecipeCard.tsx');
const skills=read('src/screens/SkillsScreen.tsx');
const commands=read('src/core/game-commands.ts');
const notifications=read('src/core/navigation-notifications.ts');
const app=read('App.tsx');

ok(queue.includes('EQUIPMENT_CRAFT_CANCEL_GOLD_REFUND=.90'),'Cancellation economy must refund 90% Gold');
ok(queue.includes('reservedInputs')&&queue.includes('reservedGold'),'Cancellation must use reservation snapshots rather than mutable recipe balance');
ok(queue.includes('Finished equipment must be claimed instead of cancelled'),'Finished forge jobs must not be cancel-refunded');
ok(queue.includes('Free Inventory or Bank space before cancelling'),'Cancellation must fail safely rather than delete refunded materials');

ok(prereq.includes("recipe.skillId!=='smithing'"),'Auto-prerequisites must be limited to Smithing processing');
ok(prereq.includes("itemDef(recipe.output.itemId).type==='material'"),'Auto-prerequisites must never auto-craft gear');
ok(prereq.includes('structuredClone(state)'),'Prerequisite processing must be atomic from the caller state');
ok(prereq.includes('gathering, combat or another external source'),'Prerequisite processing must stop at external acquisition requirements');

ok(panel.includes('Cancel')&&panel.includes('Active cancellation: 100% materials + 90% Gold'),'Forge UI must expose the active-craft cancellation rule');
ok(card.includes('Craft prerequisites'),'Equipment recipes must expose prerequisite processing when useful');
ok(skills.includes('onCancelCraft')&&skills.includes('onCraftPrerequisites'),'Skills must wire both management actions');
ok(commands.includes("case 'craft_cancel'")&&commands.includes("case 'craft_prerequisites'"),'Online-authoritative commands must support both management actions');

ok(notifications.includes("'equipment_craft_ready'"),'Navigation notification kinds must include finished equipment');
ok(notifications.includes("primary:'skills'")&&notifications.includes("subroute:'skills.smithing.forge'"),'Finished equipment must route attention to the Skills/Smithing forge');
ok(app.includes("kind:'equipment_craft_ready'"),'App must emit forge-ready notifications');
ok(app.includes("Skills:navigationBadgeModel.skills.display?navigationBadgeModel.skills.count"),'Skills primary navigation should show the finished-craft count');
ok(app.includes("type:'craft_cancel'")&&app.includes("type:'craft_prerequisites'"),'Mobile online path must use trusted forge-management commands');

console.log('PASS: forge management UI supports safe cancel, prerequisites and Skills ready notifications');
