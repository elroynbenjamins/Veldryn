const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('../node_modules/typescript');
const read=path=>fs.readFileSync(path,'utf8');
const screen=read('src/screens/SkillsScreen.tsx');
const core=read('src/core/skill-hub-navigator.ts');

const ast=ts.createSourceFile('SkillsScreen.tsx',screen,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length,0,'Skill Navigator JSX parses');
assert.match(screen,/navigatorToolbar:\{flexDirection:'row'/,'search and category selector must share one row');
assert.match(screen,/width:'42%',maxWidth:180,minWidth:100/,'selector has a constrained width');
assert.match(screen,/<SearchField style=\{hubStyles.navigatorSearch\}/,'search remains inline and accessible');
assert.match(screen,/categoryPickerOpen/,'category selector opens a compact sheet');
assert.match(screen,/<GameModalSurface visible=\{categoryPickerOpen\} presentation="sheet"/,'filter list opens only on demand');
assert.match(screen,/categoryOptions\.map\(option=>/,'one picker replaces multi-row category chips');
assert.doesNotMatch(screen,/TRAINING FOCUS · RECOMMENDED|skillTrainingFocus\(state\)|Recommended Next/i,'no recommended training card');
assert.match(screen,/navigatorRow:\{minHeight:72/,'compact skill rows remain touch-friendly');
assert.match(screen,/accessibilityRole="button"/,'rows and filters use accessible button roles');
assert.match(screen,/accessibilityState=\{\{selected:category===option.id\}\}/,'filter choice has accessible selection state');
assert.match(screen,/setCategory\('all'\);setSearchQuery\(''\)/,'clear filters clears both category and search');
assert.match(screen,/skillMilestoneOverview\(state,skillRow\.skillId\)/,'per-profession upcoming milestones retained');
assert.match(screen,/classCombatSkillProgressWithinLevel\(entry\.xp,level\)/,'class discipline XP curve preserved');
assert.match(screen,/progressWithinLevel\(entry\.xp,level\)/,'profession XP curve preserved');
for(const route of ["case 'combat'","case 'discipline'","case 'companion-mastery'","case 'sanctuary'"]){
 assert.ok(screen.includes(route),'missing existing skill route '+route);
}
assert.match(screen,/default:onSelect\(entry\.id\)/,'profession detail routing retained');
assert.match(screen,/skillNavigatorCategoryFor\(row\.skillId\)/,'future trainable skills use the category registry');
assert.match(core,/return 'other';/,'unknown profession ids stay visible in Other rather than disappearing');
assert.doesNotMatch(core,/talents?.*?:.*?profession|abilities?.*?:.*?profession/i,'2.0 abilities are not masquerading as XP professions');
assert.match(screen,/onCommand\(\{type:'companion_training'\}\)/,'Companion Training claim preserved');
assert.match(screen,/classSkillBonuses\(state\.character,classSkillId\)/,'class discipline detail remains available');
console.log('PASS: Skills Navigator has one-row controls, no recommendation card, preserved progress and distinct 2.0 boundaries');
