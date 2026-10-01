import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('../node_modules/typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Execute pure TS catalogs without writing build artifacts into the shared checkout.
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,filename);
const creation=require('../src/i18n/creation.ts'),profile=require('../src/i18n/profile.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {CLASSES}=require('../src/content/classes.ts');
const {CLASS_PLAYSTYLE,CLASS_COMBAT_TRAITS,classSelectionDetails}=require('../src/core/class-selection.ts');
const {firstSessionTutorialSteps}=require('../src/core/first-session-tutorial.ts');
const {PERSONAL_RECORDS_V43}=require('../src/core/personal-records-v43.ts');
const {NOVICE_SETS}=require('../src/content/novice-sets.ts');
const {JOURNAL_TITLES_V42}=require('../src/core/adventurers-journal-v42.ts');
const {EQUIPMENT_LOADOUT_GUIDES}=require('../src/content/loadouts.ts');
const equipment=require('../src/content/equipment_catalog_t1_t9_v33.json');
const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]).sort();
for(const [domain,catalogs,rows] of [['creation',creation.creationCatalogs,creation.creationTranslationRows],['profile',profile.profileCatalogs,profile.profileTranslationRows]]){
  const keys=Object.keys(rows).sort();
  assert.deepEqual(Object.keys(catalogs).sort(),[...SUPPORTED_LANGUAGES].sort());
  for(const language of SUPPORTED_LANGUAGES){
    assert.deepEqual(Object.keys(catalogs[language]).sort(),keys,domain+' '+language+' completeness');
    for(const key of keys){
      assert.ok(catalogs[language][key].trim(),domain+' '+language+' '+key);
      assert.deepEqual(placeholders(catalogs[language][key]),placeholders(catalogs.en[key]),domain+' '+language+' '+key+' placeholders');
    }
  }
}
const hasCreation=text=>assert.ok(Object.hasOwn(creation.creationTranslationRows,text),'Uncataloged creation copy: '+text);
const hasProfile=text=>assert.ok(Object.keys(profile.profileTranslationRows).some(key=>key.toLowerCase()===text.toLowerCase()),'Uncataloged profile copy: '+text);
for(const c of CLASSES){
  hasCreation(c.description);hasCreation(CLASS_PLAYSTYLE[c.id]);hasCreation(CLASS_COMBAT_TRAITS[c.id]);
  const details=classSelectionDetails(c.id);hasCreation(details.progression+' bonuses from combat XP.');
  for(const ability of details.abilities)hasCreation(ability.summary);
  for(const language of SUPPORTED_LANGUAGES){
    assert.equal(creation.creationText(language,c.name),c.name);
    for(const ability of details.abilities)assert.equal(creation.creationText(language,ability.name),ability.name);
  }
}
for(const step of firstSessionTutorialSteps())for(const field of ['eyebrow','title','body','hint','actionLabel'])hasCreation(step[field]);
for(const record of PERSONAL_RECORDS_V43)hasProfile(record.label);
for(const title of JOURNAL_TITLES_V42)hasProfile(title.description);
for(const guide of EQUIPMENT_LOADOUT_GUIDES)for(const field of ['useCase','weaponProfile','foodProfile'])hasProfile(guide[field]);
const preservedFocusNames=new Set(['Rootbound Vault','Lanternwatch','Oathglass','Fallen Procession','Ironback','Briar','Drowned Pilgrim','Echo Bat']);
for(const set of equipment.sets){
  for(const part of set['Build Focus'].split(/\s+\/\s+|\s+—\s+/))if(!preservedFocusNames.has(part))hasProfile(part);
  for(const language of SUPPORTED_LANGUAGES.filter(l=>l!=='en')){
    const result=profile.profileSourceText(language,set.Region+' · '+set['Build Focus']);
    assert.ok(result.startsWith(set.Region+' · '),'world name preserved');
    assert.notEqual(result,set.Region+' · '+set['Build Focus'],'set description translated');
  }
}
for(const language of SUPPORTED_LANGUAGES.filter(l=>l!=='en')){
  for(const set of NOVICE_SETS)assert.notEqual(profile.profileSourceText(language,set.setBonus.description),set.setBonus.description);
  assert.notEqual(profile.profileSourceText(language,'Character level 25 · Reach level 25 on this character.'),'Character level 25 · Reach level 25 on this character.');
  assert.ok(profile.profileSourceText(language,'Harvestwake · Event Shop').startsWith('Harvestwake · '));
  assert.ok(profile.profileError(language,new Error('Missing Gold in Inventory or Bank'),'Cannot equip set').includes('Gold'));
  assert.equal(profile.profileError(language,new Error('backend secret'),'Action failed. Please try again.'),profile.profileT(language,'Action failed. Please try again.'));
}
const playerText='Gold {name} $& <Player>';
for(const language of SUPPORTED_LANGUAGES){
  assert.ok(creation.creationT(language,'Create {name}?',{name:playerText}).includes(playerText));
  assert.ok(profile.profileT(language,'{name} equipped.',{name:playerText}).includes(playerText));
}
const owned=[
  'screens/ClassSelectScreen.tsx','screens/CharacterScreen.tsx','screens/ProfileScreen.tsx','screens/ProfileCustomizeScreen.tsx',
  ...['ClassCombatOverview','ClassHeroCarousel','CreationChrome','CreationLanguagePicker'].map(n=>'components/creation/'+n+'.tsx'),
  ...['ProfileEditor','ProfileAudiencePreviewModal','ProfileFavoriteHighlights','ProfileShowcaseSection','PlayerNameStyleEditor','PlayerProfileCard','PublicProfileScene','AccountRosterPanel','AsterfallWelcomeModal','FirstSessionTutorialPopup','FeatureUnlockPopup','CustomizationUnlockPopup','ClassSkillAffinityNote','OnlineProfileExtensionPanel','ProfileScenePreview'].map(n=>'components/'+n+'.tsx'),
];
const translateCall=/(?:profile(?:T|Text|SourceText)|creation(?:T|Text)|\bct)\(/;
const technical=new Set(['key','accessibilityRole','pointerEvents','animationType','resizeMode','keyboardType','autoCapitalize','returnKeyType','presentation','tone','slot','classId','skillId','regionId','backgroundId','testID']);
for(const file of owned){
  const source=fs.readFileSync(path.join(root,'src',file),'utf8');
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length,0,file+' parses');
  const walk=node=>{
    if(ts.isJsxAttribute(node)&&technical.has(node.name.getText(tree)))assert.ok(!translateCall.test(node.getText(tree)),file+' translated technical prop '+node.getText(tree));
    if(ts.isObjectLiteralExpression(node)){
      const names=node.properties.filter(ts.isPropertyAssignment).map(prop=>prop.name.getText(tree));
      assert.equal(new Set(names).size,names.length,file+' duplicate object property');
    }
    ts.forEachChild(node,walk);
  };
  walk(tree);
  assert.ok(!/Text\.render|createElement\s*=|prototype\s*\[/.test(source),'no global interception');
}
const source=file=>fs.readFileSync(path.join(root,'src',file),'utf8');
assert.ok(source('screens/ClassSelectScreen.tsx').includes('language=languageProp??gameLanguage'));
assert.ok(source('components/ClassSkillAffinityNote.tsx').includes('language=languageProp??gameLanguage'));
assert.ok(source('components/OnlineProfileExtensionPanel.tsx').includes('setBio(text.slice(0,160))'));
assert.ok(source('components/ProfileEditor.tsx').includes("profileTitle:title.trim()||'New Adventurer'"));
assert.ok(source('components/ProfileAudiencePreviewModal.tsx').includes('{profile.bio}'));
assert.ok(source('components/PublicProfileScene.tsx').includes('{profile.title}'));
assert.ok(source('components/ProfileShowcaseSection.tsx').includes("grid:{flexDirection:'row',flexWrap:'wrap'"));
assert.ok(source('components/ProfileFavoriteHighlights.tsx').includes('minWidth:220'));
console.log('PASS creation/profile localization: six complete catalogs, placeholders, class/tutorial descriptions, equipment fragments, name preservation and technical-prop boundaries');

