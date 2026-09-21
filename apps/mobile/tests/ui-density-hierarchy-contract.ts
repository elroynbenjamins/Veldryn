export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const home=read('src/screens/HomeScreen.tsx');
ok(!home.includes('formatGameNumber'),'Home must not duplicate the Gold already visible in the top bar');
ok(!home.includes('title="Explore world"'),'Home must not duplicate the persistent World navigation action');
ok(!home.includes('title="Equipment & food"'),'Home must not duplicate the persistent Inventory navigation action');
ok(home.includes("completed>0?\`Claim \${completed}\`:'Journal'"),'Quest-ready state must stay integrated into the campaign strip');

const account=read('src/screens/MoreScreen.tsx');
ok(account.includes("minHeight:88"),'Account hub tiles must remain compact');
ok(account.includes('<Text numberOfLines={1} style={s.description}>'),'Account tile descriptions must remain single-line');

const skills=read('src/screens/SkillsScreen.tsx');
ok(skills.includes("minHeight:112"),'Skills hub cards must remain compact');
ok(skills.includes('skillTop:'),'Skills hub cards must keep the compact icon/copy row');
ok(!skills.includes('Tap to open'),'Skills cards must not waste a line on redundant tap instructions');

const snapshot=read('src/components/SkillDashboard.tsx');
ok(snapshot.includes('.slice(0,5)'),'Home skill snapshot must show only the five strongest non-combat skills');
ok(snapshot.includes('Skill snapshot'),'Home must label the condensed skill section clearly');
ok(snapshot.includes('useGameTheme'),'Home skill snapshot must use the active theme');

for(const path of [
 'src/components/ActivityCard.tsx',
 'src/components/ActionQueuePanel.tsx',
 'src/components/WorkingTowardSummary.tsx',
 'src/components/ContractBoardSummary.tsx',
 'src/components/DailySuppliesSummary.tsx',
 'src/components/NewUnlocksPanel.tsx',
 'src/components/EnvironmentBanner.tsx',
]){
 const source=read(path);
 ok(source.includes('useGameTheme'),path+' must use the active UI theme');
 ok(!source.includes("import {C,"),path+' must not regress to the static Veldryn palette');
}

const activity=read('src/components/ActivityCard.tsx');
ok(activity.includes('activityActions:{flexDirection:\'row\''),'Activity actions must remain on one compact row');
ok(activity.includes('backgroundColor:C.warningSurface'),'Activity warnings must use semantic theme surfaces');
ok(activity.includes('backgroundColor:C.infoSurface'),'Activity goal state must use semantic theme surfaces');

const queue=read('src/components/ActionQueuePanel.tsx');
ok(queue.includes('backgroundColor:C.warningSurface'),'Queue warnings must remain theme-safe');
ok(queue.includes('backgroundColor:C.goodSurface'),'Queue handoff success must remain theme-safe');

const inventory=read('src/screens/InventoryScreen.tsx');
ok(inventory.includes("root:{padding:spacing.md,gap:10}"),'Inventory should keep compact screen padding');
ok(inventory.includes("storageChip:{flex:1,minWidth:0,minHeight:48"),'Inventory storage selector should remain compact');
ok(inventory.includes("chip:{minHeight:44"),'Inventory filter chips must retain accessible touch height');

const world=read('src/screens/WorldScreen.tsx');
ok(world.includes('currentCard:{minHeight:150'),'World current-region card must remain compact');
ok(world.includes('destination:{minHeight:92'),'World destination cards must remain compact');

const character=read('src/screens/CharacterScreen.tsx');
ok(character.includes('disclosure:{minHeight:54'),'Character secondary disclosures must remain compact');

const empty=read('src/components/EmptyState.tsx');
ok(empty.includes('padding:spacing.lg'),'Empty states must avoid excessive vertical padding');

console.log('PASS: UI hierarchy stays compact, theme-aware, and free of redundant Home navigation');
