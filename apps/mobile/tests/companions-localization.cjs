const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'../../..');
const owned=[
  "apps/mobile/src/screens/CompanionsScreen.tsx",
  "apps/mobile/src/screens/CollectionsScreen.tsx",
  "apps/mobile/src/screens/PetBonusOverviewScreen.tsx",
  "apps/mobile/src/screens/BestiaryScreen.tsx",
  "apps/mobile/src/components/CombatCompanionPanel.tsx",
  "apps/mobile/src/components/CompanionExpeditionsV50Panel.tsx",
  "apps/mobile/src/components/CompanionTrainingV50Panel.tsx",
  "apps/mobile/src/components/CompanionTrialStage.tsx",
  "apps/mobile/src/components/CompanionProgressMoment.tsx",
  "apps/mobile/src/components/CollectionSetsPanel.tsx",
  "apps/mobile/src/components/MonsterMasteryPanel.tsx",
  "apps/mobile/src/components/RareDiscoveriesPanel.tsx"
];
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,filename);
const {companionCatalogs,companionTranslationRows,companionContent,companionMessage,companionError,translateCompanion,companionUnlockRequirement}=require('../src/i18n/companions.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const placeholders=value=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]).sort();
const keys=Object.keys(companionTranslationRows).sort();
const knownGaps=require('./companions-localization-gaps.json');
for(const values of Object.values(knownGaps.untranslatedCatalogStrings))for(const value of values){
 assert.equal(companionContent('de',value),value,'Update the documented coverage gap after translating: '+value);
}
for(const language of SUPPORTED_LANGUAGES){
 assert.deepEqual(Object.keys(companionCatalogs[language]).sort(),keys);
 for(const key of keys){
  const value=companionCatalogs[language][key];
  assert.ok(typeof value==='string'&&value.trim(),language+': '+key);
  assert.deepEqual(placeholders(value),placeholders(key),language+': '+key);
  const params=Object.fromEntries(placeholders(key).map(name=>[name,'NAME_{untouched}']));
  assert.equal(translateCompanion(language,key,params).includes('{value'),false,language+': '+key);
 }
 assert.equal(companionContent(language,'Ironwood Wolf'),'Ironwood Wolf');
 assert.equal(companionContent(language,'PLAYER_{name}_CUSTOM'),'PLAYER_{name}_CUSTOM');
 assert.ok(companionContent(language,'Rare drop from Ironwood Wolf').includes('Ironwood Wolf'));
 assert.ok(companionMessage(language,"TRAINING COMPLETE · Player {level} reached Level 12.").includes('Player {level}'));
 assert.ok(!companionMessage(language,"TRAINING COMPLETE · Ironwood Wolf reached Level 12.").includes('{level}'));
 assert.equal(companionError(language,'mission_requirement_affinity_count'),translateCompanion(language,'The selected team does not meet every assignment requirement.'));
 assert.equal(companionError(language,new Error('unknown_server_code')),translateCompanion(language,'Unable to complete action.'));
 assert.equal(companionMessage(language,'unknown_server_code'),translateCompanion(language,'Unable to complete action.'));
}
assert.equal(companionContent('de','Rare drop from Ironwood Wolf'),'Seltener Fund von Ironwood Wolf');
assert.equal(companionUnlockRequirement('nl',"Complete A Hound's Trail"),"Voltooi A Hound's Trail");
assert.ok(fs.readFileSync(path.join(root,'apps/mobile/src/components/CombatCompanionPanel.tsx'),'utf8').includes("r.type==='affinity_unique'?t('All Affinities unique'):label(String(r.type))"),'Unknown restrictions must not be mislabeled as affinity uniqueness');
for(const screen of ['CompanionsScreen','PetBonusOverviewScreen'])assert.ok(fs.readFileSync(path.join(root,'apps/mobile/src/screens',screen+'.tsx'),'utf8').includes('companionUnlockRequirement(language,unlock.requirement)'),'Unlock copy must follow authoritative requirements');
assert.equal(companionMessage('de','companion_stamina_required'),companionError('de','companion_stamina_required'));
assert.equal(translateCompanion('fr','Lv {value0}',{value0:10}),'Niv. 10');
assert.notEqual(translateCompanion('en','Collections'),translateCompanion('de','Collections'));

const commandNames=new Set(['onCommand','act','btn','runCommand','choose','selectCollectible','setSection','setTab','setZone','setStatus','setViewFilter','setRegionFilter']);
const printer=ts.createPrinter({removeComments:true});
function commandContract(source,file){
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),calls=[];
 const visit=node=>{
  if(ts.isCallExpression(node)&&commandNames.has(node.expression.getText(sf))){
   const name=node.expression.getText(sf),args=name==='btn'?node.arguments.slice(1):[...node.arguments];
   calls.push(name+'('+args.map(arg=>printer.printNode(ts.EmitHint.Expression,arg,sf)).join(',')+')');
  }
  ts.forEachChild(node,visit);
 };visit(sf);return calls.sort();
}
const baseline={
  "apps/mobile/src/screens/CompanionsScreen.tsx": [],
  "apps/mobile/src/screens/CollectionsScreen.tsx": [
    "selectCollectible(state,'pet',row.id)",
    "selectCollectible(state,kind,row.id)"
  ],
  "apps/mobile/src/screens/PetBonusOverviewScreen.tsx": [
    "choose(row.id)",
    "choose(row.id)",
    "choose(undefined)",
    "selectCollectible(state,'pet',id)",
    "setRegionFilter(option)",
    "setViewFilter(option)"
  ],
  "apps/mobile/src/screens/BestiaryScreen.tsx": [
    "setStatus('all')",
    "setStatus(value)",
    "setZone('all')",
    "setZone(value)"
  ],
  "apps/mobile/src/components/CombatCompanionPanel.tsx": [
    "act('companion_housing_upgrade',{ id: model.def.id })",
    "act(type,args)",
    "btn('companion_boss_rematch',undefined,!state.defeatedBossIds.includes('FALLEN_KNIGHT') || fallenKnightWeekly.remaining <= 0)",
    "btn('companion_codex',{ id: m.id },m.claimed || !m.complete)",
    "btn('companion_equip',{ id: selection },!model.compatible || !idle(selection))",
    "btn('companion_essence',undefined,!(state.account.companionSanctuary?.essenceBasinLevel))",
    "btn('companion_monthly',{ id },claimed || !view.trial.progress.season.monthlyChallengeCompletion[id])",
    "btn('companion_showcase',{ id, ids: view.codex.showcaseCompanionIds },view.codex.favoriteCompanionId === id)",
    "btn('companion_showcase',{ id: view.codex.favoriteCompanionId, ids: view.codex.showcaseCompanionIds.includes(id) ? view.codex.showcaseCompanionIds.filter(x => x !== id) : [...view.codex.showcaseCompanionIds, id] },!view.codex.showcaseCompanionIds.includes(id) && view.codex.showcaseCompanionIds.length >= view.codex.showcaseSlotsUnlocked)",
    "btn('companion_special',{ id: c.id, ids: safeTeam },!valid.ok || completed)",
    "btn('companion_supplies',undefined,e.gold < 250 || !(state.account.companionSanctuary?.expeditionPensLevel))",
    "btn('companion_training',undefined,!(state.account.companionSanctuary?.trainingGroundLevel))",
    "btn('companion_trial_abandon',{ id: run.runId })",
    "btn('companion_trial_floor',{ id: run.runId, floor: run.currentFloor },recovery > 0)",
    "btn('companion_trial_start',{ ids: safeTeam },!trialTeamValid)",
    "btn('companion_trial_start',{ ids: safeTeam, floor: 1 },!trialTeamValid)",
    "btn('companion_unequip')",
    "btn('companion_upgrade',{ id },!cost || !affordability(cost))",
    "btn('companion_weekly',{ id: d.id },!view.proving.state.completedIds.includes(d.id) || view.proving.state.claimedIds.includes(d.id))",
    "onCommand({ type, args })",
    "setSection('Codex')",
    "setSection('Collection')",
    "setSection('Collection')",
    "setSection('Training')",
    "setSection(source.section)",
    "setSection(source.section)",
    "setSection(tab)"
  ],
  "apps/mobile/src/components/CompanionExpeditionsV50Panel.tsx": [
    "onCommand(command)",
    "runCommand({ type: 'companion_assignment_claim', args: { id: row.assignmentId } })",
    "runCommand({ type: 'companion_assignment_start', args: { id: mission.id, ids: safeTeam, food: foodSelection } })"
  ],
  "apps/mobile/src/components/CompanionTrainingV50Panel.tsx": [
    "act('companion_ascend',{ id: selection })",
    "act('companion_bond_reward',{ id: selection, level })",
    "act('companion_equip',{ id: selection })",
    "act('companion_level',{ id: selection })",
    "act('companion_master',{ id: selection })",
    "act('companion_technique',{ id: selection, technique: technique.id })",
    "act('companion_unequip')",
    "onCommand({ type, args })",
    "setTab(value)"
  ],
  "apps/mobile/src/components/CompanionTrialStage.tsx": [],
  "apps/mobile/src/components/CompanionProgressMoment.tsx": [],
  "apps/mobile/src/components/CollectionSetsPanel.tsx": [],
  "apps/mobile/src/components/MonsterMasteryPanel.tsx": [],
  "apps/mobile/src/components/RareDiscoveriesPanel.tsx": []
};
for(const file of owned){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(sf.parseDiagnostics.length,0,file+' syntax');
 assert.deepEqual(commandContract(source,file),baseline[file],file+' gameplay commands/filters changed');
 assert.ok(source.includes('useGameLanguage()'),file+' language hook');
 const walk=node=>{
  if(ts.isJsxAttribute(node)&&['key','testID','accessibilityRole','accessibilityLiveRegion','keyboardShouldPersistTaps','resizeMode','animationType','tone'].includes(node.name.getText(sf))){
   assert.ok(!/\b(?:t|label|companionContent|translateCompanion)\(/.test(node.initializer?.getText(sf)??''),file+' translated technical prop');
  }
  if(ts.isJsxText(node))assert.ok(!/[A-Za-z]/.test(node.text),file+' untranslated JSX text: '+node.text);
  ts.forEachChild(node,walk);
 };walk(sf);
}
console.log('Companion localization passed: '+keys.length+' keys × 6 languages; placeholders, names, errors, JSX, and gameplay command/filter contracts.');
