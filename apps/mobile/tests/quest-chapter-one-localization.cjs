const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(
 fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,filename);
const {QUESTS,QUEST_ACTS}=require('../src/content/quests.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {
 chapterOneActCopy,chapterOneQuestCopy,
 localizedQuestStoryText,localizedQuestActText,questMatchesLocalizedSearch,
}=require('../src/i18n/quest-story-copy.ts');
const locales=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],locales,'all selectable UI languages');
const act=QUEST_ACTS[1];
const fields=['name','description','story'];
const firstAct=QUESTS.filter(q=>q.act===1);
assert.equal(firstAct.length,5,'current Chapter I quest source count');
assert.deepEqual(Object.keys(chapterOneQuestCopy).sort(),firstAct.map(x=>x.id).sort(),'exact Chapter I IDs');
const tokens=x=>[...x.matchAll(/\\{([A-Za-z][A-Za-z0-9_]*)\\}/g)].map(m=>m[1]).sort();
for(const quest of firstAct)for(const field of fields){
 const variants=chapterOneQuestCopy[quest.id][field];
 assert.equal(variants.length,8,quest.id+field+' locale count');
 assert.equal(variants[0],quest[field],quest.id+' authoritative English source mismatch '+field);
 for(const [index,language] of locales.entries()){
  assert.ok(variants[index]?.trim(),quest.id+' missing '+language+' '+field);
  assert.deepEqual(tokens(variants[index]),tokens(quest[field]),quest.id+' placeholder mismatch '+language+' '+field);
  assert.equal(localizedQuestStoryText(language,quest,field),variants[index],quest.id+' runtime translation '+language+' '+field);
  if(language!=='en')assert.notEqual(variants[index],quest[field],quest.id+' untranslated '+language+' '+field);
 }
}
for(const field of ['name','subtitle']){
 const variants=chapterOneActCopy[1][field];
 assert.equal(variants.length,8,'act copy language parity');
 assert.equal(variants[0],act[field]);
 for(const [i,language] of locales.entries())assert.equal(localizedQuestActText(language,act,field),variants[i],language+' act '+field);
}
assert.equal(localizedQuestStoryText('de',{...firstAct[0],name:'New server name'},'name'),'New server name','source text must match before translating');
assert.equal(localizedQuestStoryText('ru',{...firstAct[0],story:'Updated author text'},'story'),'Updated author text','unknown revised lore untouched');
assert.equal(localizedQuestStoryText('nl',QUESTS[5],'name'),QUESTS[5].name,'Acts II and III intentionally fall back');
assert.equal(localizedQuestActText('es',QUEST_ACTS[2],'name'),QUEST_ACTS[2].name,'unknown act unchanged');
assert.equal(localizedQuestStoryText('tr',{...firstAct[0],id:'UNRECOGNIZED'},'name'),firstAct[0].name,'unknown quest ID unchanged');
assert.equal(questMatchesLocalizedSearch('nl',firstAct[3],'gereedschap'),true,'localized title search');
assert.equal(questMatchesLocalizedSearch('de',firstAct[1],'Quartiermeister'),true,'localized lore search');
assert.equal(questMatchesLocalizedSearch('ru',firstAct[0],'реестре'),true,'Cyrillic search');
assert.equal(questMatchesLocalizedSearch('tr',firstAct[2],'patikaları'),true,'Turkish story search');
assert.equal(questMatchesLocalizedSearch('nl',firstAct[3],'Tools of the Trade'),true,'existing English search still works');
assert.equal(questMatchesLocalizedSearch('de',firstAct[3],'Asterfall Workshop'),true,'location names remain searchable');
assert.equal(questMatchesLocalizedSearch('ru',firstAct[0],'no match here'),false,'reject unrelated queries');
assert.equal(questMatchesLocalizedSearch('ru',firstAct[0],'  '),true,'empty search returns full journal');
assert.ok(localizedQuestStoryText('fr',firstAct[1],'story').includes('Asterfall'),'region name remains exact');
assert.ok(localizedQuestStoryText('es',firstAct[2],'description').includes('Ironwood Forest'),'route name remains exact');
assert.ok(localizedQuestStoryText('tr',firstAct[2],'description').includes('Ironwood Wolf'),'monster name remains exact');
for(const file of ['QuestRefinedScreen.tsx','QuestScreen.tsx']){
 const source=fs.readFileSync(path.join(__dirname,'../src/screens',file),'utf8');
 for(const marker of [
  "localizedQuestActText(language,",
  "localizedQuestStoryText(language,",
  "journalEntries(state,filter,'').filter(({def})=>questMatchesLocalizedSearch(language,def,query))",
  "'name')","'description')","'story')",
 ])assert.ok(source.includes(marker),file+' missing Chapter I localization wiring: '+marker);
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0,file+' JSX must remain valid');
}
console.log('PASS: Chapter I 5 quests x 3 source-guarded fields + 2 act fields x 8 languages; both Quest screens, localized search and unknown-source fallbacks');
