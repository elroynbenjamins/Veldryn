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
const {companionObjectiveRows,companionObjectiveText}=require('../src/i18n/companion-objectives.ts');
const {companionGuidanceRows,companionGuidanceText}=require('../src/i18n/companion-guidance.ts');
const {companionDynamicRows,companionDynamicText}=require('../src/i18n/companion-dynamic.ts');
assert.equal(companionContent('de','Defeat 100 Old Mines enemies'),'Besiege 100 Gegner in den Old Mines');
assert.equal(companionContent('es','Reach Fishing 8'),'Alcanza Pesca 8');
assert.equal(companionContent('nl','Rare discovery while mapping Silverbrook'),'Zeldzame ontdekking bij het in kaart brengen van Silverbrook');
assert.equal(companionContent('it','vulnerability'),'vulnerabilità');
assert.equal(companionContent('fr','below 50% HP'),'sous 50 % des PV');
assert.equal(companionContent('ru','Rare discovery while following the Frostmarch bells'),'Редкая находка по следам колоколов Frostmarch');
assert.equal(companionContent('tr','defensive stance'),'savunma duruşu');
assert.equal(companionContent('en','Rare discovery while mapping Silverbrook'),'Rare discovery while mapping Silverbrook');
const starterScreen=fs.readFileSync(path.join(root,'apps/mobile/src/screens/CompanionsScreen.tsx'),'utf8');
assert.ok(starterScreen.includes("t('FIRST COMPANION')")&&starterScreen.includes("t('Choose your combat partner')"),'Starter Companion onboarding must localize its visible heading');
assert.ok(starterScreen.includes("companionContent(language,choice.description)")&&starterScreen.includes("companionLabel(language,choice.role)"),'Starter choices must localize authored descriptions and role labels, not IDs or player text');
assert.ok(starterScreen.includes("t('Choose {name}, {role}'")&&starterScreen.includes("t('Recruiting…')"),'Starter choice action and accessibility label must use translated text');
assert.equal(companionContent('de','FIRST COMPANION'),'ERSTER BEGLEITER');
assert.equal(companionContent('ru','FIRST COMPANION'),'ПЕРВЫЙ СПУТНИК');
assert.equal(companionContent('tr','Choose your combat partner'),'Savaş yoldaşını seç');
const bondNotice='BOND REWARD CLAIMED · Ironwood Wolf · Bond 4 · 35 Essence.';
assert.equal(companionMessage('de',bondNotice),'BINDUNGSBELOHNUNG ABGEHOLT · Ironwood Wolf · Bindung 4 · 35 × Essenz.');
assert.equal(companionMessage('nl',bondNotice),'BANDBELONING GECLAIMD · Ironwood Wolf · Band 4 · 35 × Essentie.');
assert.equal(companionMessage('ru',bondNotice),'НАГРАДА ЗА СВЯЗЬ ПОЛУЧЕНА · Ironwood Wolf · Связь 4 · 35 × Эссенция.');
assert.equal(companionMessage('tr',bondNotice),'BAĞ ÖDÜLÜ ALINDI · Ironwood Wolf · Bağ 4 · 35 × Öz.');
const oldCompanionPanel=fs.readFileSync(path.join(root,'apps/mobile/src/components/CombatCompanionPanel.tsx'),'utf8');
assert.ok(oldCompanionPanel.includes('monthlyChallengeCompletion[id]')&&oldCompanionPanel.includes("Clear Floor {floor}+ this month with the required team")&&oldCompanionPanel.includes("Floor reached, but this month's required team conditions"),'Monthly Companion claims must explain why verification has not unlocked the reward');
assert.ok(oldCompanionPanel.includes('Progress target reached; waiting for verified challenge completion.')&&oldCompanionPanel.includes('{remaining} more progress needed for this weekly reward.'),'Weekly Companion claims must not mistake reached progress for verified completion');
assert.ok(oldCompanionPanel.includes("trainingLast===undefined?t('Ready to claim')")&&oldCompanionPanel.includes("essenceLast===undefined?t('Ready to claim')"),'First Sanctuary claims must not misleadingly say Start timer');
const newCompanionTraining=fs.readFileSync(path.join(root,'apps/mobile/src/components/CompanionTrainingV50Panel.tsx'),'utf8');
assert.ok(oldCompanionPanel.includes('COMPANION_BOND_ESSENCE_REWARDS')&&newCompanionTraining.includes('COMPANION_BOND_ESSENCE_REWARDS'),'Both companion flows must use the same authoritative Bond Essence reward map');
assert.ok(!oldCompanionPanel.includes("'35 Essence + portrait'")&&!oldCompanionPanel.includes("'80 Essence + title'")&&!oldCompanionPanel.includes("'55 Essence + Bond Resonance'"),'No current Bond claim confirmation may promise obsolete portrait, title or Resonance rewards');

assert.ok(!Object.values(knownGaps.untranslatedCatalogStrings).flat().includes('Defeat 100 Old Mines enemies'),'Completed companion unlock translations must not remain incorrectly marked as gaps');

const objectiveKeys=Object.keys(companionObjectiveRows).sort();
assert.equal(objectiveKeys.length,42,'All 42 authored Companion objective and bonus descriptions must be translated');
assert.deepEqual(objectiveKeys,[...knownGaps.completedObjectiveDescriptions].sort(),'Objective QA snapshot must match implemented translations');
assert.deepEqual(knownGaps.untranslatedCatalogStrings,{},'Remove translated objectives from the outstanding backlog');
const backendObjectiveSource=fs.readFileSync(path.join(root,'backend/src/server/companions/content.ts'),'utf8');
for(const key of objectiveKeys){
 assert.ok(backendObjectiveSource.includes(key),'Translation no longer matches authored backend content: '+key);
 assert.equal(companionObjectiveText('en',key),key);
 for(const language of SUPPORTED_LANGUAGES.filter(l=>l!=='en')){
  const translated=companionContent(language,key);
  assert.ok(translated&&translated!==key,language+' objective untranslated: '+key);
  assert.equal(translated,companionObjectiveText(language,key),language+' objective routing: '+key);
  assert.deepEqual(placeholders(translated),placeholders(key),language+' objective placeholders: '+key);
  if(key.startsWith('Complete '))assert.equal(companionUnlockRequirement(language,key),translated,language+' objective must not be mistaken for a quest title');
 }
}
const guidanceKeys=Object.keys(companionGuidanceRows).sort();
assert.equal(guidanceKeys.length,29,'Current Companion guidance and material-source coverage');
assert.deepEqual(guidanceKeys,[...knownGaps.completedGuidanceDescriptions].sort(),'Guidance QA coverage snapshot must match its catalog');
for(const key of guidanceKeys){
 assert.ok(!Object.values(knownGaps.untranslatedDynamicTemplates).flat().includes(key),'Translated guidance must not remain in the gap list: '+key);
 assert.equal(companionGuidanceText('en',key),key);
 for(const language of SUPPORTED_LANGUAGES.filter(l=>l!=='en')){
  const translated=companionContent(language,key);
  assert.ok(translated&&translated!==key,language+' guidance untranslated: '+key);
  assert.deepEqual(placeholders(translated),placeholders(key),language+' guidance placeholders: '+key);
  if(key.startsWith('Complete '))assert.equal(companionUnlockRequirement(language,key),translated,'Guidance must not be misclassified as a quest title');
 }
}
const dynamicKeys=Object.keys(companionDynamicRows).sort();
assert.equal(dynamicKeys.length,38,'Current dynamic Companion presentation and availability coverage');
assert.deepEqual(dynamicKeys,[...knownGaps.completedDynamicDescriptions].sort(),'Dynamic QA snapshot must match the translated source strings');
assert.equal(knownGaps.partiallyTranslatedCatalogStrings.length,0,'Translated ownership goals must not remain partially covered');
assert.equal(knownGaps.untranslatedDynamicTemplates['apps/mobile/src/core/companion-presentation.ts'].length,0,'All tracked Companion presentation templates should be accounted for');
assert.equal(knownGaps.untranslatedDynamicTemplates['apps/mobile/src/core/companion-runtime.ts'].length,0,'All tracked Companion status labels should be accounted for');
for(const key of dynamicKeys){
 assert.equal(companionDynamicText('en',key),key,'English authored template must remain unchanged');
 for(const language of SUPPORTED_LANGUAGES.filter(l=>l!=='en')){
  const sample=key.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(_,name)=>'SENTINEL_'+name.toUpperCase());
  const result=companionContent(language,sample),localized=companionDynamicText(language,sample);
  assert.ok(result&&result!==sample,language+' untranslated dynamic text: '+key);
  assert.equal(result,localized,language+' dynamic routing: '+key);
  for(const name of placeholders(key))assert.ok(result.includes('SENTINEL_'+name.toUpperCase()),language+' interpolated name changed: '+key);
  assert.deepEqual(placeholders(companionDynamicText(language,key)),placeholders(key),language+' dynamic placeholders: '+key);
 }
}
assert.equal(companionContent('nl','Defeat it 1 time.'),'Versla deze vijand 1 keer.');
assert.equal(companionContent('nl','Defeat it 3 times.'),'Versla deze vijand 3 keer.');
assert.equal(companionContent('de','Level cap 25 · Technique choice unlock'),'Stufenlimit 25 · Technikauswahl freigeschaltet');
assert.equal(companionContent('ru','Claim Bond 4 reward'),'Забрать награду за связь 4');
assert.equal(companionContent('tr','In Trial'),'Denemede');
assert.equal(companionUnlockRequirement('es','Own 5 Combat Companions.'),'Posee 5 compañeros de combate.');
assert.equal(companionContent('fr','Profile background · Ironwood Wolf'),'Fond de profil · Ironwood Wolf');
assert.equal(companionContent('de','Unlisted dynamic {player_name}'),'Unlisted dynamic {player_name}','Unknown player text must remain unchanged');
assert.equal(companionContent('de','Custom player text'),'Custom player text','Unknown player text must not be translated');
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
  "apps/mobile/src/screens/CompanionsScreen.tsx": [
    "onCommand({ type: 'companion_starter', args: { id: choice.id } })"
  ],
  "apps/mobile/src/screens/CollectionsScreen.tsx": [
    "selectCollectible(state,row.kind,row.id)"
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
    "setStatus('all')",
    "setStatus(value)",
    "setZone('all')",
    "setZone('all')",
    "setZone(value)"
  ],
  "apps/mobile/src/components/CombatCompanionPanel.tsx": [
    "act('companion_essence')",
    "act('companion_housing_upgrade',{ id: model.def.id })",
    "act('companion_training')",
    "act('companion_trial_start',{ ids: safeTeam, floor: 1 })",
    "act('companion_unequip')",
    "act(type,args)",
    "btn('companion_codex',{ id: m.id },m.claimed || !m.complete)",
    "btn('companion_equip',{ id: selection },!idle(selection))",
    "btn('companion_monthly',{ id },claimed || !completed)",
    "btn('companion_recruit',{ id: model.def.id })",
    "btn('companion_showcase',{ id, ids: view.codex.showcaseCompanionIds },view.codex.favoriteCompanionId === id)",
    "btn('companion_showcase',{ id: view.codex.favoriteCompanionId, ids: view.codex.showcaseCompanionIds.includes(id) ? view.codex.showcaseCompanionIds.filter(x => x !== id) : [...view.codex.showcaseCompanionIds, id] },!view.codex.showcaseCompanionIds.includes(id) && view.codex.showcaseCompanionIds.length >= view.codex.showcaseSlotsUnlocked)",
    "btn('companion_special',{ id: c.id, ids: safeTeam },!valid.ok || completed)",
    "btn('companion_supplies',undefined,e.gold < 250 || !(sanctuary?.expeditionPensLevel))",
    "btn('companion_trial_abandon',{ id: run.runId })",
    "btn('companion_trial_floor',{ id: run.runId, floor: run.currentFloor },recovery > 0)",
    "btn('companion_trial_start',{ ids: safeTeam })",
    "btn('companion_upgrade',{ id },!cost || !affordability(cost))",
    "btn('companion_weekly',{ id: d.id },!completed || claimed)",
    "onCommand({ type, args })",
    "setSection('Codex')",
    "setSection('Collection')",
    "setSection('Collection')",
    "setSection('Collection')",
    "setSection('Sanctuary')",
    "setSection('Training')",
    "setSection('Training')",
    "setSection('Training')",
    "setSection(source.section)",
    "setSection(source.section)",
    "setSection(tab)"
  ],
  "apps/mobile/src/components/CompanionExpeditionsV50Panel.tsx": [
    "onCommand(command)"
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
    "setTab('Materials')",
    "setTab('Roster')",
    "setTab(key)",
    "setTab(null)",
    "setTab(null)",
    "setTab(null)",
    "setTab(null)"
  ],
  "apps/mobile/src/components/CompanionTrialStage.tsx": [],
  "apps/mobile/src/components/CompanionProgressMoment.tsx": [],
  "apps/mobile/src/components/CollectionSetsPanel.tsx": [],
  "apps/mobile/src/components/MonsterMasteryPanel.tsx": [],
  "apps/mobile/src/components/RareDiscoveriesPanel.tsx": []
};
const contractDrift=[],untranslatedNodes=[];
for(const file of owned){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(sf.parseDiagnostics.length,0,file+' syntax');
 const actualCommands=commandContract(source,file);
 if(JSON.stringify(actualCommands)!==JSON.stringify(baseline[file]))contractDrift.push({file,expected:baseline[file],actual:actualCommands});
 assert.ok(source.includes('useGameLanguage()'),file+' language hook');
 const walk=node=>{
  if(ts.isJsxAttribute(node)&&['key','testID','accessibilityRole','accessibilityLiveRegion','keyboardShouldPersistTaps','resizeMode','animationType','tone'].includes(node.name.getText(sf))){
   assert.ok(!/\b(?:t|label|companionContent|translateCompanion)\(/.test(node.initializer?.getText(sf)??''),file+' translated technical prop');
  }
  if(ts.isJsxText(node)&&/[A-Za-z]/.test(node.text))untranslatedNodes.push({file,text:node.text.trim()});
  ts.forEachChild(node,walk);
 };walk(sf);
}
assert.deepEqual({contractDrift,untranslatedNodes},{contractDrift:[],untranslatedNodes:[]},'Companion localization source contracts changed');
console.log('Companion localization passed: '+keys.length+' keys × 6 languages; placeholders, names, errors, JSX, and gameplay command/filter contracts.');
