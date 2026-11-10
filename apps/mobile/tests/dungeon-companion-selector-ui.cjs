const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const app=read('App.tsx'),screen=read('src/screens/CoopExpeditionScreen.tsx');
const loadout=read('src/components/coop/CoopLoadoutSelection.tsx');
const setup=read('src/components/coop/CoopCombatSetupPanel.tsx');
const picker=read('src/components/coop/CoopDungeonCompanionSelector.tsx');
const browse=read('src/core/coop-dungeon-browsing.ts');

assert.match(app,/onRunActiveChange=\{setDungeonFlowActive\} onCommand=\{runCompanionCommand\}/,'Dungeon uses the existing trusted command path');
assert.match(screen,/setShowLoadouts\(true\);\s*\};\s*const selectDungeonCompanion=/,'Existing single verified loadout must not bypass companion selection');
assert.match(screen,/onCommand\(id\?\{type:'companion_equip',args:\{id\}\}:\{type:'companion_unequip'\}\)/,'Companion changes use canonical equip and unequip commands');
assert.match(screen,/setEntry\(undefined\);\s*await load\(\);/,'Stale server verification is cleared and refreshed after a selection');
assert.match(screen,/possibleCounterIds=\{selected\.companionCounterIds\}/,'Matchup hints must come from the server dungeon projection');
assert.match(loadout,/onChooseCompanion=\{onEquipCompanion\?\(\)=>setShowCompanions\(true\):undefined\}/,'The current companion tile is clickable inside preparation');
assert.match(loadout,/CoopDungeonCompanionSelector state=\{state\}/,'Owned companion selector must actually render');
assert.match(setup,/onPress=\{onChooseCompanion\?\?\(\(\)=>toggle\('companion'\)\)\}/,'Read-only setup uses an explicit selector callback when available');
assert.match(picker,/canEquipCompanion\(role,def\.role\)/,'Same-class-role companions cannot be chosen');
assert.match(picker,/companionTrialProgress.*activeRun.*teamCompanionIds/,'Companion Trials reserve their team');
assert.match(picker,/companionAssignments\?\.some/,'Sanctuary Expeditions reserve companions');
assert.match(picker,/dungeonCompanionOpportunity\(id,possibleCounterIds\)/,'Recommendations reuse the canonical counter matcher');
assert.match(picker,/onSelect\(id\);onClose\(\);/,'Selector closes only after the command resolves');
assert.match(browse,/companionCounterIds\?:readonly DungeonCompanionCounterId\[\]/);
console.log('PASS dungeon companion selection, server refresh and matchup guidance UI contract');
