const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {QUESTS,QUEST_ACTS}=require('../src/content/quests.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {chapterThreeActCopy,chapterThreeQuestCopy}=require('../src/i18n/quest-story-act-three.ts');
const {localizedQuestStoryText,localizedQuestActText,questMatchesLocalizedSearch}=require('../src/i18n/quest-story-copy.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
const fields=['name','description','story'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const quests=QUESTS.filter(q=>q.act===3);
assert.equal(quests.length,5,'expected five main-story quests in Act III');
assert.deepEqual(Object.keys(chapterThreeQuestCopy).sort(),quests.map(q=>q.id).sort(),'source IDs');
const tokens=s=>[...s.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>m[1]).sort();
for(const quest of quests)for(const field of fields){
 const translations=chapterThreeQuestCopy[quest.id][field];
 assert.equal(translations.length,8,quest.id+' '+field+' languages');
 assert.equal(translations[0],quest[field],quest.id+' original English source changed');
 for(const [i,language]of languages.entries()){
  assert.ok(translations[i]?.trim(),quest.id+' '+field+' missing '+language);
  assert.deepEqual(tokens(translations[i]),tokens(quest[field]),quest.id+' '+field+' placeholder parity '+language);
  assert.equal(localizedQuestStoryText(language,quest,field),translations[i],quest.id+' '+field+' runtime '+language);
  if(language!=='en')assert.notEqual(translations[i],quest[field],quest.id+' '+field+' English fallback in '+language);
 }
}
const identities={QST_012:'Oathbound Squires',QST_013:'Fallen Sentinels',QST_014:'Fallen Knight',QST_015:'Fallen Knight'};
for(const quest of quests){
 const amount=quest.description.match(/\d+/)?.[0];
 for(const language of languages){
  const description=localizedQuestStoryText(language,quest,'description');
  if(amount)assert.ok(description.includes(amount),quest.id+' changed required level/count '+language);
  if(identities[quest.id])assert.ok(description.includes(identities[quest.id]),quest.id+' changed canonical encounter name '+language);
 }
}
const act=QUEST_ACTS[3];
for(const field of ['name','subtitle']){
 const values=chapterThreeActCopy[3][field];
 assert.equal(values.length,8,'act text eight languages');
 assert.equal(values[0],act[field],'act original English source');
 for(const [i,language] of languages.entries()){
  assert.ok(values[i]?.trim(),'act missing '+language+' '+field);
  assert.equal(localizedQuestActText(language,act,field),values[i],'act '+field+' '+language);
 }
}
assert.equal(localizedQuestStoryText('de',{...quests[0],name:'Server author changed this name'},'name'),'Server author changed this name','source guard');
assert.equal(localizedQuestStoryText('ru',{...quests[1],story:'Unknown new story'},'story'),'Unknown new story','revised server source fallback');
assert.equal(localizedQuestStoryText('fr',{...quests[1],id:'UNRELEASED_999'},'name'),quests[1].name,'unknown ID fallback');
assert.equal(localizedQuestActText('nl',{...act,name:'Changed act name'},'name'),'Changed act name','act source guard');
assert.equal(questMatchesLocalizedSearch('de',quests[1],'Zug der Gefallenen'),true,'localized title searchable');
assert.equal(questMatchesLocalizedSearch('ru',quests[3],'Павший рыцарь'),true,'Cyrillic title searchable');
assert.equal(questMatchesLocalizedSearch('tr',quests[4],'Yeşilliğin Ötesinde'),true,'Turkish title searchable');
assert.equal(questMatchesLocalizedSearch('nl',quests[2],'Oathglass Road'),true,'English chapter search preserved');
assert.equal(questMatchesLocalizedSearch('es',quests[2],'Oathglass Causeway'),true,'world location still searchable');
assert.equal(questMatchesLocalizedSearch('fr',quests[4],'not applicable'),false,'unrelated terms excluded');
for(const id of ['QST_001','QST_006','QST_011']){
 const quest=QUESTS.find(q=>q.id===id);
 assert.notEqual(localizedQuestStoryText('de',quest,'name'),quest.name,'previous/current acts available: '+id);
}
const adapter=fs.readFileSync(path.join(__dirname,'../src/i18n/quest-story-copy.ts'),'utf8');
assert.ok(adapter.includes('...chapterThreeQuestCopy')&&adapter.includes('3:chapterThreeActCopy[3]'),'shared Quest UI adapter must include Act III');
for(const file of ['QuestRefinedScreen.tsx','QuestScreen.tsx']){
 const s=fs.readFileSync(path.join(__dirname,'../src/screens',file),'utf8');
 assert.ok(s.includes('localizedQuestStoryText(language,'),file+' story localization lost');
 assert.ok(s.includes('localizedQuestActText(language,'),file+' act localization lost');
 assert.ok(s.includes('questMatchesLocalizedSearch(language,def,query)'),file+' localized search lost');
}
console.log('PASS: Act III 5 story quests × 3 fields plus act heading and subtitle × 8 languages; gameplay invariants and Quest layout wiring');
