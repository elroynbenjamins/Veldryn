const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {QUESTS,QUEST_ACTS}=require('../src/content/quests.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {chapterTwoActCopy,chapterTwoQuestCopy}=require('../src/i18n/quest-story-act-two.ts');
const {localizedQuestStoryText,localizedQuestActText,questMatchesLocalizedSearch}=require('../src/i18n/quest-story-copy.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
const fields=['name','description','story'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const chapter=QUESTS.filter(row=>row.act===2);
assert.equal(chapter.length,5,'five authored Act II quests expected');
assert.deepEqual(Object.keys(chapterTwoQuestCopy).sort(),chapter.map(q=>q.id).sort(),'only authoritative Act II quest IDs');
const params=text=>[...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(v=>v[1]).sort();
for(const quest of chapter){
 for(const field of fields){
  const variants=chapterTwoQuestCopy[quest.id][field];
  assert.equal(variants.length,8,quest.id+' '+field+' must cover eight languages');
  assert.equal(variants[0],quest[field],quest.id+' English source changed '+field);
  for(const [index,language] of languages.entries()){
   assert.ok(variants[index]?.trim(),quest.id+' empty '+language+' '+field);
   assert.deepEqual(params(variants[index]),params(quest[field]),quest.id+' mismatched placeholder '+language+' '+field);
   assert.equal(localizedQuestStoryText(language,quest,field),variants[index],quest.id+' wrong '+language+' '+field);
   if(language!=='en')assert.notEqual(variants[index],quest[field],quest.id+' untranslated '+language+' '+field);
  }
 }
 const amount=quest.description.match(/\d+/)?.[0];
 if(amount)for(const language of languages){
  assert.ok(localizedQuestStoryText(language,quest,'description').includes(amount),quest.id+' objective count changed in '+language);
 }
 const targetName={
  QST_006:'Thornlings',QST_007:'River Eels',QST_008:'Cave Skitters',QST_009:'Ancient Treants',QST_010:'Lantern Wretches',
 }[quest.id];
 for(const language of languages)assert.ok(localizedQuestStoryText(language,quest,'description').includes(targetName),quest.id+' monster/resource identity changed in '+language);
}
const act=QUEST_ACTS[2];
for(const field of ['name','subtitle']){
 const values=chapterTwoActCopy[2][field];
 assert.equal(values.length,8,'Act II '+field+' locale parity');
 assert.equal(values[0],act[field], 'Act II source changed '+field);
 for(const [i,language]of languages.entries()){
  assert.ok(values[i]?.trim(),'missing Act II '+field+' '+language);
  assert.equal(localizedQuestActText(language,act,field),values[i],'Act II '+field+' wrong '+language);
 }
}
assert.equal(localizedQuestStoryText('nl',{...chapter[1],name:'Updated game text'},'name'),'Updated game text','source-match guard');
assert.equal(localizedQuestStoryText('es',{...chapter[0],id:'QST_FAKE'},'name'),chapter[0].name,'unknown ID guard');
assert.equal(localizedQuestActText('tr',{...act,subtitle:'Updated subtitle'},'subtitle'),'Updated subtitle','changed act copy guard');
assert.notEqual(localizedQuestStoryText('ru',QUESTS[10],'description'),QUESTS[10].description,'Act III should be translated');
assert.equal(questMatchesLocalizedSearch('de',chapter[0],'Dornen unter den'),true,'translated title searchable');
assert.equal(questMatchesLocalizedSearch('fr',chapter[1],'passeurs de Silverbrook'),true,'localized lore searchable');
assert.equal(questMatchesLocalizedSearch('tr',chapter[4],'Sisteki Fenerler'),true,'Turkish story title searchable');
assert.equal(questMatchesLocalizedSearch('nl',chapter[4],'Lanterns in Fog'),true,'English search preserved');
assert.equal(questMatchesLocalizedSearch('it',chapter[0],'not a quest here'),false,'search excludes irrelevant strings');
const adapter=fs.readFileSync(path.join(__dirname,'../src/i18n/quest-story-copy.ts'),'utf8');
for(const marker of ["chapterTwoActCopy[2]","...chapterTwoQuestCopy","row[0]===quest[field]","row[0]===act[field]"])
 assert.ok(adapter.includes(marker),'shared quest localization router missing '+marker);
for(const file of ['QuestRefinedScreen.tsx','QuestScreen.tsx']){
 const ui=fs.readFileSync(path.join(__dirname,'../src/screens',file),'utf8');
 assert.ok(ui.includes('localizedQuestStoryText(language,'),file+' lost localized title/objective/lore');
 assert.ok(ui.includes('localizedQuestActText(language,'),file+' lost act heading');
 assert.ok(ui.includes('questMatchesLocalizedSearch(language,def,query)'),file+' lost localized search');
}
console.log('PASS: Act II 5 quests × 3 story fields and 2 act fields, eight languages, gameplay identities, source guards and Quest screen wiring');
