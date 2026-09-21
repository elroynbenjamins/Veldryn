export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const screen=read('src/screens/ActivityOverviewScreen.tsx');
const commands=read('src/core/game-commands.ts');
const actions=read('src/core/account-actions.ts');
const app=read('App.tsx');
const account=read('src/screens/MoreScreen.tsx');

ok(screen.includes('Delete & choose new class'),'Character management must expose an explicit reroll flow');
ok(screen.includes('Delete character only'),'Multi-character accounts must be able to free a slot without immediately recreating');
ok(screen.includes('characterDeleteConfirmation'),'Delete UI must use the shared typed-confirmation contract');
ok(screen.includes('Character deletion confirmation'),'Delete confirmation input must have an accessibility label');
ok(screen.includes('ACCOUNT PROGRESS STAYS'),'Delete UI must distinguish account-wide progress from character-bound progress');
ok(screen.includes('enhancement/temper ranks and pity progress are also removed'),'Delete UI must explicitly disclose that recovered gear loses character-bound upgrade progress');
ok(screen.includes('characterDeleteBlockReason'),'Delete UI must surface authoritative safety blockers');
ok(screen.includes('equipmentCraftingQueue'),'Delete UI must explain character-linked crafting jobs');
ok(actions.includes('unlockedCharacterSlots:Math.max'),'Deletion must bank earned slot unlocks before character skill progress disappears');
ok(actions.includes('arenaSquadCharacterIds')&&actions.includes('filter(id=>id!==character.id)'),'Deletion must clean Arena references');
ok(actions.includes('statGemId')&&actions.includes('effectGemId'),'Socketed gems must be recovered before character enhancement state is discarded');
ok(commands.includes("roster_delete:['id','confirmation']"),'Character deletion must be a validated gameplay command');
ok(commands.includes("command.type==='roster_delete'"),'Character deletion must not auto-settle unrelated activity before safety validation');
ok(app.includes("type:'roster_delete'"),'App must route character deletion through authoritative gameplay');
ok(app.includes("case 'Activity':return 'Characters'"),'Character management route must have a clear Account-facing label');
ok(account.includes("title:'Characters'")&&account.includes('Switch, reroll or safely delete characters'),'Account navigation must advertise character management rather than a hidden destructive action');

console.log('PASS character management UI exposes explicit, guarded reroll/delete flow');
