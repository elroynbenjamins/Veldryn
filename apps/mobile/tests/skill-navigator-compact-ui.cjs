const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('../node_modules/typescript');
const read=path=>fs.readFileSync(path,'utf8');
const screen=read('src/screens/SkillsScreen.tsx');
const core=read('src/core/skill-hub-navigator.ts');
const copy=read('src/i18n/skill-navigator.ts');

const ast=ts.createSourceFile('SkillsScreen.tsx',screen,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length,0,'Skill Navigator JSX parses');
assert.match(screen,/navigatorToolbar:\{flexDirection:'row'/,'search and category selector must share one row');
assert.match(screen,/narrowNavigator=width<380\|\|fontScale>=1\.3\|\|state\.settings\.textScale>=1\.3/,'large fonts and narrow screens collapse only search into an icon');
assert.match(screen,/<UiIcon name="search" size=\{22\}\/>/,'search is reachable from the toolbar on narrow screens');
assert.match(screen,/narrowNavigator&&searchExpanded\?<SearchField/,'search field opens only when needed on narrow screens');
assert.match(screen,/width:'42%',maxWidth:180,minWidth:100/,'selector has a constrained width');
assert.match(screen,/<SearchField style=\{hubStyles.navigatorSearch\}/,'search remains inline and accessible');
assert.match(screen,/categoryPickerOpen/,'category selector opens a compact sheet');
assert.match(screen,/<GameModalSurface visible=\{categoryPickerOpen\} presentation="sheet"/,'filter list opens only on demand');
assert.match(screen,/categoryOptions\.map\(option=>/,'one picker replaces multi-row category chips');
assert.doesNotMatch(screen,/TRAINING FOCUS · RECOMMENDED|skillTrainingFocus\(state\)|Recommended Next/i,'no recommended training card');
assert.match(screen,/navigatorRow:\{width:'48%',minWidth:138,minHeight:122/,'skill cards restore the compact two-column layout');
assert.match(screen,/cardGrid:\{flexDirection:'row',flexWrap:'wrap'/,'skill groups display cards in a wrapping grid');
assert.match(screen,/stackCards=width<350\|\|fontScale>=1\.25\|\|state\.settings\.textScale>=1\.25/,'small screens and larger text stack full-width skill cards');
assert.match(screen,/<Text style=\{hubStyles\.navigatorTotal\}>\{gt\('SKILL TOTAL'\)\}/,'existing Skills header and total remain unchanged');
assert.doesNotMatch(screen,/<View style=\{hubStyles\.summary\}>/,'do not introduce extra summary content');
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
assert.match(screen,/route:skillNavigatorRouteFor\(row\.skillId\)/,'real skills with missing views use safe fallback');
assert.match(screen,/case 'overview':setOverviewSkillId\(entry\.id\)/,'fallback opens a real progress overview');
assert.match(screen,/<GameModalSurface visible=\{!!overviewSkill\}/,'fallback overview stays separate from live crafting or combat commands');
assert.match(core,/return 'other';/,'unknown profession ids stay visible in Other rather than disappearing');
assert.doesNotMatch(core,/talents?.*?:.*?profession|abilities?.*?:.*?profession/i,'2.0 abilities are not masquerading as XP professions');
assert.match(screen,/onCommand\(\{type:'companion_training'\}\)/,'Companion Training claim preserved');
assert.match(screen,/classSkillBonuses\(state\.character,classSkillId\)/,'class discipline detail remains available');
for(const label of ['Filter','Other','No matching skills','Account-wide companion skill','Sanctuary facility','Skill overview','This skill has no dedicated activity screen. Its earned XP and levels are still tracked.']){
 const start=copy.indexOf("'"+label+"':{");
 assert.ok(start>=0,'Missing localized navigator label '+label);
 const row=copy.slice(start,copy.indexOf('}',start)+1);
 for(const language of ['en','de','es','nl','it','fr','ru','tr'])assert.ok(row.includes(language+':'),'Missing '+language+' for '+label);
}
console.log('PASS: Skills restores compact two-column cards only; existing header, toolbar, routes and 2.0 boundaries preserved');
