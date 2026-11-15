import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'package.json'));
const ts=require('typescript');
const cache=new Map();
function load(filename){
  filename=path.resolve(filename);
  if(cache.has(filename))return cache.get(filename).exports;
  const module={exports:{}};cache.set(filename,module);
  const source=fs.readFileSync(filename,'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const localRequire=id=>{
    if(!id.startsWith('.'))return require(id);
    const base=path.resolve(path.dirname(filename),id);
    const target=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile());
    assert.ok(target,'Missing import '+id);return load(target);
  };
  new Function('require','module','exports',output)(localRequire,module,module.exports);
  return module.exports;
}
const {gameplayCatalogs,gameplayDomains,gameplayTranslate,localizeGameplay,useGameplayText}=load(path.join(root,'src/i18n/gameplay.ts'));
const languages=['en','de','es','nl','it','fr']; // Fully populated legacy rows; RU/TR use English fallback.

// Alchemy copy must reflect current potion effects, not hard-coded obsolete percentages or boss-only rules.
assert.equal(gameplayTranslate('en','Food is disabled in bosses and dungeons. Boss fights use your selected Alchemy healing potion (up to 5 per fight); dungeon runs have their own limited potion charges.'),'Food is disabled in bosses and dungeons. Boss fights use your selected Alchemy healing potion (up to 5 per fight); dungeon runs have their own limited potion charges.');
assert.equal(gameplayTranslate('nl','Restores {percent}% maximum HP in boss fights or between dungeon rooms.',{percent:35}),'Herstelt 35% maximale HP bij bazen of tussen kerkerkamers.');
assert.equal(gameplayTranslate('de','Deals {percent}% more damage for {count} ordinary encounters.',{percent:10,count:45}),'Verursacht 10 % mehr Schaden für 45 normale Kämpfe.');
assert.equal(gameplayTranslate('es','Takes {percent}% less damage for {count} ordinary encounters.',{percent:15,count:60}),'Recibe un 15 % menos de daño durante 60 encuentros normales.');
assert.equal(gameplayTranslate('fr','+{damage}% damage · +{strength}% healing and shielding for {count} ordinary encounters.',{damage:6,strength:15,count:60}),'+6 % de dégâts · +15 % de soins et de boucliers pendant 60 combats ordinaires.');
assert.equal(gameplayTranslate('ru','Restores {percent}% maximum HP in boss fights or between dungeon rooms.',{percent:50}),'Восстанавливает 50% максимального здоровья в бою с боссом или между комнатами подземелья.');
assert.equal(gameplayTranslate('tr','Requires {skill} level {level}.',{skill:'Simya',level:25}),'Simya becerisi için seviye 25 gerekli.');
assert.equal(localizeGameplay('de','A heat-stable fixative for Sunscar equipment.'),'Hitzebeständiges Fixiermittel für Sunscar-Ausrüstung.');
const workshopSource=fs.readFileSync(path.join(root,'src/components/ConsumableWorkshop.tsx'),'utf8');
assert.ok(workshopSource.includes('Math.round(effect.maxHpFraction*100)')&&workshopSource.includes('Math.round(effect.damageReductionFraction*100)')&&workshopSource.includes('Math.round(effect.healingStrengthFraction*100)'),'Alchemy benefit labels must use the current potion magnitudes');
assert.ok(workshopSource.includes("gt('Healing potions work in boss fights and between dungeon rooms.")&&!workshopSource.includes("gt('Healing potions are for boss fights. Select one"),'Alchemy healing help must describe both boss and dungeon recovery');
assert.ok(workshopSource.includes("gt('Lv {level}'")&&workshopSource.includes("gt('Tap to start')"),'Alchemy level badges and actionable hints must be localized');

assert.equal(gameplayTranslate('ru','BOSS HEALING POTIONS'),'ЛЕЧЕБНЫЕ ЗЕЛЬЯ ДЛЯ БОССОВ');
assert.equal(gameplayTranslate('tr','Select for bosses'),'Bosslar için seç');
assert.equal(gameplayTranslate('ru','No healing potions carried. Brew them in Alchemy or withdraw from Bank.'),'При себе нет лечебных зелий. Создайте их в Алхимии или возьмите из банка.');
assert.equal(gameplayTranslate('tr','Health is full'),'Can dolu');
assert.equal(gameplayTranslate('ru','No recipes ready. Show locked to see requirements.'),'Нет доступных рецептов. Покажите закрытые, чтобы узнать требования.','Reviewed Russian recipe guidance must replace the obsolete English fallback');

const {itemDetailRows,itemDetailText,itemDetailContent}=load(path.join(root,'src/i18n/item-details.ts'));
const {craftingDetailRows,craftingDetailText,craftingDetailContent}=load(path.join(root,'src/i18n/crafting-details.ts'));
for(const language of languages){
 const content=value=>itemDetailContent(language,value,text=>localizeGameplay(language,text));
 for(const [rows,translate] of [[itemDetailRows,itemDetailText],[craftingDetailRows,craftingDetailText]]){
  for(const key of Object.keys(rows)){
   const params=Object.fromEntries([...key.matchAll(/\{(\w+)\}/g)].map(match=>[match[1],'VALUE $& {untrusted}']));
   const result=translate(language,key,params);
   assert.ok(result.trim());
   for(const name of Object.keys(params))assert.ok(!result.includes('{'+name+'}'),key);
   if(Object.keys(params).length)assert.ok(result.includes('VALUE $& {untrusted}'),key);
   if(language!=='en'&&rows[key][languages.indexOf(language)-1]!==key)assert.notEqual(result,key,key);
  }
 }
 assert.ok(content('Salvage: 2× Tempering Dust').includes('2× Tempering Dust'));
 assert.ok(content('Mining Lv 10 · Asterfall').includes('Asterfall'));
 assert.ok(content('Asterfall · Lv 5 · 2.5% drop').includes('Asterfall'));
 assert.ok(content('Open Redwood Bow in Asterfall.').includes('Redwood Bow'));
 assert.ok(content('Stat Gem · +8% Attack when socketed').includes('8'));
 assert.equal(content('Uncatalogued passive {player}'),'Uncatalogued passive {player}');
 assert.ok(itemDetailText(language,'Next attempt · {gold} gold · {dust} × Tempering Dust',{gold:20,dust:3}).includes('3 × Tempering Dust'));
 assert.ok(craftingDetailText(language,'Craft {count}× {item}',{count:2,item:'Redwood Bow'}).includes('2× Redwood Bow'));
}
assert.equal(itemDetailContent('nl','Asterfall · Lv 5 · 2.5% drop',value=>localizeGameplay('nl',value)),'Asterfall · niv. 5 · 2.5% buitkans');
assert.equal(itemDetailContent('de','Stat Gem · +8% Attack when socketed',value=>localizeGameplay('de',value)),'Werteedelstein · +8% Angriff beim Einsetzen');
assert.equal(craftingDetailContent('de','+2% XP · +5% yield · +3% speed',value=>value),'+2% EP · +5% Ertrag · +3% Tempo');
assert.equal(craftingDetailContent('nl','+2% skill XP',value=>value),'+2% vaardigheids-XP');
assert.equal(craftingDetailContent('fr','Player text · +2% XP',value=>value),'Player text · +2% XP');
const placeholders=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
for(const [domain,rows] of Object.entries(gameplayDomains)){
  for(const [key,row] of Object.entries(rows)){
    assert.equal(row.length,6,domain+': '+key);
    for(const value of row){assert.ok(value.trim(),domain+': '+key);assert.deepEqual(placeholders(value),placeholders(row[0]),domain+': '+key);}
  }
}
for(const language of languages){
  assert.deepEqual(Object.keys(gameplayCatalogs[language]),Object.keys(gameplayCatalogs.en));
  const params={name:'Marksmanship {untrusted}',kind:'Tracking',level:42};
  const result=gameplayTranslate(language,'{name}, {kind}, level {level}',params);
  assert.ok(result.includes(params.name));assert.ok(result.includes(params.kind));assert.ok(result.includes('42'));
  assert.equal(localizeGameplay(language,'My loadout {name}'),'My loadout {name}');
  assert.equal(localizeGameplay(language,'Marksmanship'),language==='de'?'Schießkunst':'Marksmanship');
  const blocked=localizeGameplay(language,'Requires mining level 42 in Asterfall.');
  assert.ok(blocked.includes('42'));assert.ok(blocked.includes('Asterfall'));
  assert.ok(!blocked.includes('{level}'));
}
assert.equal(localizeGameplay('nl','combat skill'),'Gevechtsvaardigheid');
assert.equal(localizeGameplay('nl','sanctuary progression'),'Heiligdomvoortgang');
assert.ok(!gameplayTranslate('nl','In {levels} skill levels · {count} unlocks at Lv {level} · current level {percent}% complete',{levels:1,count:1,level:2,percent:40}).includes('1 niveaus'));
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {GameLanguageProvider}=load(path.join(root,'src/i18n/GameLanguageProvider.tsx'));
function Probe(){const {gt}=useGameplayText();return React.createElement('span',null,gt('Queue activity'));}
for(const language of languages){
  const rendered=renderToStaticMarkup(React.createElement(GameLanguageProvider,{language},React.createElement(Probe)));
  assert.ok(rendered.includes(gameplayCatalogs[language]['Queue activity']));
}
const owned=["screens/SkillsScreen.tsx","screens/CombatScreen.tsx","screens/InventoryScreen.tsx","components/ActivityQueuePlanner.tsx","components/ActionQueuePanel.tsx","components/ActivityQueueResults.tsx","components/RewardPopup.tsx","components/CombatXpSplit.tsx","components/CraftingRecipeBrowser.tsx","components/EnchantingRefineryPanel.tsx","components/EquipmentCraftQueuePanel.tsx","components/EquipmentEnhancementModal.tsx","components/EquipmentPreview.tsx","components/EquipmentSetProgressPanel.tsx","components/FaithPanel.tsx","components/ForgeResultFeedback.tsx","components/GatheringActivityList.tsx","components/GemCodexModal.tsx","components/HerbalismMethodPanel.tsx","components/InventoryCraftingPanel.tsx","components/ItemQuickInspect.tsx","components/NoviceWorkshop.tsx","components/RecipeCard.tsx","components/RegionalCombatPanel.tsx","components/SavedLoadoutsPanel.tsx","components/SkillDashboard.tsx","components/SkillMilestoneStrip.tsx","components/ProfessionMasteryPanel.tsx","components/StoryBossBattleModal.tsx","components/ActiveActivityBar.tsx","components/ActivityCard.tsx","components/IngredientList.tsx","components/ItemCard.tsx","components/EquipmentSlot.tsx","i18n/gameplay.ts"];
for(const relative of owned){
  const filename=path.join(root,'src',relative),source=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,relative.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(source.parseDiagnostics.length,0,relative+' must parse');
  function visit(node){
    if(ts.isJsxAttribute(node)&&['id','icon','name','mode','pointerEvents','animationType','accessibilityRole'].includes(node.name.getText(source))&&node.initializer){
      // Human-facing name properties are not used on these owned JSX surfaces.
      assert.ok(!/\b(?:gt|gl)\(/.test(node.initializer.getText(source)),relative+': translated technical prop '+node.name.getText(source));
    }
    if(ts.isAsExpression(node)&&node.type.getText(source)==='const')assert.ok(!/^gt\(/.test(node.expression.getText(source)),relative+': translated const identifier');
    if(ts.isPropertyAssignment(node)&&['id','skillId','mode','direction','icon'].includes(node.name.getText(source)))assert.ok(!/\b(?:gt|gl)\(/.test(node.initializer.getText(source)),relative+': translated command identifier '+node.name.getText(source));
    ts.forEachChild(node,visit);
  }
  visit(source);
}
const queueSource=fs.readFileSync(path.join(root,'src/components/ActionQueuePanel.tsx'),'utf8');
assert.ok(queueSource.includes('gl(readiness.blocker)||gt("Blocked")'),'Queue readiness blockers must be localized before fallback');
const loadoutSource=fs.readFileSync(path.join(root,'src/components/SavedLoadoutsPanel.tsx'),'utf8');
assert.ok(loadoutSource.includes('value={name}'),'Player-authored loadout names must remain untouched');
if(process.argv.includes('--typecheck')){
  const config=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
  const program=ts.createProgram(parsed.fileNames,parsed.options),ownedPaths=new Set(owned.map(file=>path.resolve(root,'src',file))),diagnostics=[];
  for(const file of program.getSourceFiles())if(ownedPaths.has(path.resolve(file.fileName)))diagnostics.push(...program.getSyntacticDiagnostics(file),...program.getSemanticDiagnostics(file));
  if(diagnostics.length)console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:file=>file,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
  assert.equal(diagnostics.length,0,'Owned gameplay files must typecheck');
}
console.log('Gameplay localization: '+Object.keys(gameplayCatalogs.en).length+' messages, six languages, placeholders, provider rendering, and technical identifier guards passed.');
