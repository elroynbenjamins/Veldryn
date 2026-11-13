const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(
 fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,filename);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {seasonalChallengeRows,seasonalChallengeText,seasonalChallengeName,seasonalChallengeDescription}=require('../src/i18n/seasonal-challenge-copy.ts');
const {QUEST_RARITIES}=require('../src/core/seasonal-quests.ts');
const lang=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],lang,'eight existing selectable languages');
const archivedNames=['Hold the Line','Iron Ration','Marching Vigil','Roadwarden Survey','Light the Way','Mercy in Motion','Dawn Patrol','Safe Passage','Predator’s Circuit','Edge of Mastery','The Long Hunt','Forward Scout','Steel Discipline','Unbroken Wall','Chain of Command','Sunlamp Offering','Cartographer’s Eye','Break Their Line','Runic Survey','Steps Unseen','Stone and Storm'];
const names=['Field Patrol','Gathering Run','Crafting Orders','Trail Survey','Faith Practice','Kitchen Duties','Alchemist Orders','Forge Work','Tailoring Commission','Enchanter Practice','Boss Hunt','Companion Expeditions','Festival Service'];
const templates=['Defeat {n} monsters this period.','Complete {n} gathering actions this period.','Complete {n} crafts this period.','Complete {n} exploration route actions this period.','Complete {n} Faith practices this period.','Complete {n} Cooking recipes this period.','Complete {n} Alchemy recipes this period.','Complete {n} Smithing recipes this period.','Complete {n} Tailoring recipes this period.','Complete {n} Enchanting recipes this period.','Defeat {n} bosses this period.','Claim {n} completed companion expeditions this period.','Claim {n} completed event objective this period.'];
const cacheNames=Object.values(QUEST_RARITIES).map(v=>v.cache);
const rarityNames=Object.values(QUEST_RARITIES).map(v=>v.label);
const tags=['COMBAT','GATHERING','CRAFTING','EXPLORATION','FAITH','EQUIPMENT','BOSS','COOKING','ALCHEMY','SMITHING','TAILORING','ENCHANTING','EXPEDITION','EVENT'];
const all=[...archivedNames,...names,...templates,...cacheNames,...rarityNames,...tags,'CACHE CLAIMED'];
assert.equal(all.length,72,'expected 72 localized current and legacy challenge strings');
assert.deepEqual(Object.keys(seasonalChallengeRows).sort(),all.slice().sort(),'no missing or unreviewed keys');
const source=fs.readFileSync(path.join(__dirname,'../src/core/seasonal-quests.ts'),'utf8');
for(const key of names.concat(templates,cacheNames,rarityNames)){
 assert.ok(source.includes(key),'source catalog no longer emits '+key);
}
const placeholders=v=>[...v.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(x=>x[1]).sort();
for(const key of all){
 const values=seasonalChallengeRows[key];assert.equal(values.length,7,key+' seven translations');
 assert.equal(seasonalChallengeText('en',key),key,'English source untouched '+key);
 for(const [i,language]of lang.slice(1).entries()){
  assert.ok(values[i].trim(),key+' empty translation '+language);
  assert.deepEqual(placeholders(values[i]),placeholders(key),key+' placeholder mismatch '+language);
  // Identical words such as French 'Rare' and loanword 'BOSS' are valid translations.
  assert.equal(seasonalChallengeText(language,key,{n:17}),values[i].replace(/\{n\}/g,'17'),key+' wrong '+language);
 }
}
for(const [tag,template]of Object.entries({combat:templates[0],gathering:templates[1],crafting:templates[2],exploration:templates[3],faith:templates[4],cooking:templates[5],alchemy:templates[6],smithing:templates[7],tailoring:templates[8],enchanting:templates[9],boss:templates[10],expedition:templates[11],event:templates[12]})){
 for(const language of lang){
  const quest={tag,required:37,description:template.replace('{n}','37')};
  assert.equal(seasonalChallengeDescription(language,quest),seasonalChallengeText(language,template,{n:37}),tag+' '+language+' valid objective');
  assert.equal(seasonalChallengeDescription(language,{...quest,description:'Custom action 37 by player'}),'Custom action 37 by player',tag+' changed author copy preserved');
  assert.equal(seasonalChallengeDescription(language,{...quest,required:40}),quest.description,tag+' required count guard');
 }
}
assert.equal(seasonalChallengeDescription('tr',{tag:'boss',required:1,description:'Defeat 1 unique boss.'}),'Defeat 1 unique boss.','unsupported tag untouched');
assert.equal(seasonalChallengeName('nl',{name:'Unbroken Wall'}),seasonalChallengeRows['Unbroken Wall'][2]);
assert.equal(seasonalChallengeName('ru',{name:'Custom class goal'}),'Custom class goal','unknown names never guessed');
assert.equal(seasonalChallengeText('fr','unknown server notice'),'unknown server notice','server text untouched');
for(const pathName of ['QuestRefinedScreen.tsx','QuestScreen.tsx']){
 const src=fs.readFileSync(path.join(__dirname,'../src/screens',pathName),'utf8');
 for(const marker of ['seasonalChallengeName(language,','seasonalChallengeDescription(language,','seasonalChallengeText(language,']){
  assert.ok(src.includes(marker),pathName+' missing '+marker);
 }
 assert.ok(src.includes('onClaim(')||src.includes('onClaimContract('),pathName+' still needs authoritative claims');
 const ast=ts.createSourceFile(pathName,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0,pathName+' invalid JSX');
}
console.log('PASS: 72 localized challenge entries, source parity and both Quest screens');
