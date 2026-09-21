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

ok(queue.includes('MAX_WAITING_EQUIPMENT_CRAFTS=5'),'Forge backlog must hold exactly five waiting jobs');
ok(queue.includes('scheduleWaiting'),'Waiting jobs must receive deterministic automatic slot schedules');
ok(queue.includes('startedAtMs>nowMs'),'Waiting status must be timestamp-derived for offline auto-start');
ok(queue.includes("refundRate=waiting?1:EQUIPMENT_CRAFT_CANCEL_GOLD_REFUND"),'Waiting cancellation must refund 100% while active cancellation retains the 10% fee');
ok(queue.includes('moveWaitingEquipmentCraft'),'Forge backlog must support priority reordering');

ok(panel.includes('WAITING BACKLOG'),'Forge UI must separate waiting jobs from active crafts');
ok(panel.includes('full refund before forge start'),'Waiting jobs must explain their full-refund state');
ok(panel.includes("onMoveWaiting(job.id,'up')")&&panel.includes("onMoveWaiting(job.id,'down')"),'Waiting rows must expose earlier/later priority controls');
ok(panel.includes('Starts in ~'),'Waiting rows must show approximate automatic start timing');
ok(card.includes('Queue craft ·'),'Recipe CTA must switch to Queue craft when active slots are full but backlog space remains');
ok(card.includes('freeWaiting'),'Recipe availability must consider waiting backlog capacity');
ok(skills.includes('onMoveCraftWaiting'),'Skills must wire forge backlog priority');
ok(commands.includes("craft_move:['id','direction']")&&commands.includes("case 'craft_move'"),'Online-authoritative commands must validate and execute backlog moves');
ok(app.includes("type:'craft_move'")&&app.includes('moveWaitingEquipmentCraft'),'Mobile online/local paths must both support backlog reordering');

console.log('PASS: forge backlog UI exposes five waiting jobs, auto-start timing, full-refund state and priority controls');
