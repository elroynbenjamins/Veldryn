const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(
 fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,file);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {QUESTS}=require('../src/content/quests.ts');
const {questLockHint,questDestination}=require('../src/core/quest-journal.ts');
const {localizedQuestStoryText}=require('../src/i18n/quest-story-copy.ts');
const {questUnlockCopyRows,questUnlockText,localizedQuestLockHint,localizedQuestDestinationText,localizedWeeklyOrderLockReason}=require('../src/i18n/quest-unlock-copy.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const keys=Object.keys(questUnlockCopyRows);
assert.equal(keys.length,29,'source-owned quest unlock and destination labels');
const tokens=s=>[...s.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(z=>z[1]).sort();
for(const key of keys){
 const entries=questUnlockCopyRows[key];
 assert.equal(entries.length,7,key+' seven non-English languages');
 for(const [i,language]of languages.slice(1).entries()){
  assert.ok(entries[i].trim(),key+' missing '+language);
  assert.deepEqual(tokens(entries[i]),tokens(key),key+' placeholders '+language);
  assert.equal(questUnlockText(language,key,{level:7,chapter:'OPAQUE',name:'OPAQUE',region:'OPAQUE',zone:'OPAQUE',monster:'OPAQUE',action:'OPAQUE',skill:'OPAQUE',route:'OPAQUE'}),entries[i].replace(/\{(\w+)\}/g,(_,k)=>k==='level'?'7':'OPAQUE'),key+' interpolation '+language);
 }
 assert.equal(questUnlockText('en',key),key,'English source preserved: '+key);
}
assert.equal(questUnlockText('ru','Unknown live server text'),'Unknown live server text','unknown text unchanged');
const byId=id=>{const q=QUESTS.find(x=>x.id===id);assert.ok(q,id+' absent');return q};
const initial={character:{level:1},quests:[]};
const third=byId('QST_003'),second=byId('QST_002'),first=byId('QST_001');
assert.ok(third.requiredCharacterLevel,'level-gated quest expected');
for(const language of languages){
 const expected=questUnlockText(language,'Reach character level {level} through Combat to unlock this objective.',{level:third.requiredCharacterLevel});
 assert.equal(localizedQuestLockHint(language,initial,third),expected,'level unlock '+language);
 assert.equal(localizedQuestLockHint(language,{...initial,character:{level:99}},second),
  questUnlockText(language,'Claim “{chapter}” to unlock this objective. Progress is not tracked while locked.',{chapter:localizedQuestStoryText(language,first,'name')}),'prior quest name translation '+language);
 assert.equal(localizedQuestDestinationText(language,first,'label'),questUnlockText(language,'Visit {zone}',{zone:'Greenfields'}),'monster destination '+language);
 assert.equal(localizedQuestDestinationText(language,byId('QST_004'),'label'),questUnlockText(language,'Open equipment'),'equipment action '+language);
 const guide=localizedQuestDestinationText(language,third,'hint');
 assert.ok(guide.includes('Ironwood')||language==='en','exploration region retained '+language);
 assert.ok(guide.includes('SCOUT')===false,'route should remain human-readable '+language);
}
const old=questLockHint({...initial,character:{level:1}},third);
assert.equal(old,`Reach character level ${third.requiredCharacterLevel} through Combat to unlock this objective.`,'quest lock uses the rebased level consistently');
assert.equal(localizedQuestDestinationText('fr',first,'hint'),questUnlockText('fr','{monster} · character level {level}. Collect hunt rewards on Home to update kill objectives.',{monster:'Moss Rat',level:1}),'monster hint source guard');
const order={claimed:false,progress:0,target:10,kind:'hunt',targetId:'MOSS_RAT',id:'2026-W45:hunt:MOSS_RAT',source:{id:'MOSS_RAT',kind:'monster',label:'Moss Rat',available:true},reward:{rewardRef:'weekly_order_hunt_standard',label:'Hunt Order reward'}};
assert.equal(localizedWeeklyOrderLockReason('de',{character:null},order),questUnlockText('de','Create a character first.'),'contract cannot be used without a character');
assert.equal(localizedWeeklyOrderLockReason('en',{character:null},order),'Create a character first.','English original lock semantics');
for(const file of ['QuestRefinedScreen.tsx','QuestScreen.tsx']){
 const source=fs.readFileSync(path.join(__dirname,'../src/screens',file),'utf8');
 for(const name of ['localizedQuestLockHint(language,state,','localizedQuestDestinationText(language,','localizedWeeklyOrderLockReason(language,state,'])
  assert.ok(source.includes(name),file+' missing '+name);
 assert.ok(source.includes('onNavigate(')&&source.includes('weeklyOrderLockReason(state,'),file+' must retain navigation and authoritative lock check');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0,file+' JSX parses');
}
console.log('PASS: 29 quest unlock/destination text templates in all eight languages; lore name substitution, required level, original navigation and weekly locks');
