const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(
 fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,filename);
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {progressionTranslationRows,progressionText}=require('../src/i18n/progression.ts');
const {questJournalUiRows,questJournalText}=require('../src/i18n/quest-journal-ui.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages,'supported languages changed');
const keys=Object.keys(questJournalUiRows);
assert.ok(keys.length>=60,'Journal includes existing translated controls and new Chronicle copy');
const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
for(const key of keys){
 const rows=questJournalUiRows[key];
 assert.equal(rows.length,7,key+' missing a translation');
 for(const [i,language]of languages.slice(1).entries()){
  const value=rows[i];
  assert.ok(value.trim(),language+' missing '+key);
  assert.deepEqual(placeholders(value),placeholders(key),language+' placeholder mismatch '+key);
  const params=Object.fromEntries(placeholders(key).map(name=>[name,'OPAQUE_'+name]));
  const result=questJournalText(language,key,params);
  assert.equal(result,value.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(_,name)=>params[name]),language+' mismatched translation '+key);
  assert.notEqual(value,key,language+' still using English '+key);
 }
 assert.equal(questJournalText('en',key),key,'English source preserved '+key);
}
const src=fs.readFileSync(path.join(__dirname,'../src/screens/QuestRefinedScreen.tsx'),'utf8');
const allKeys=[...new Set([...src.matchAll(/\bp\(\s*(['"])([^'"]+)\1/g)].map(m=>m[2]))];
const missing=allKeys.filter(k=>!Object.hasOwn(progressionTranslationRows,k));
const notCovered=missing.filter(k=>!Object.hasOwn(questJournalUiRows,k));
assert.deepEqual(notCovered,[],'all missing fixed Quest Journal UI keys must be translated');
assert.ok(missing.length>=45,'all additional Quest Journal text must remain localized');
assert.ok(src.includes('const p=(value:string)=>questJournalText(language,value)'),'Quest Journal must use local catalog with progression fallback');
assert.ok(src.includes('language:Language'),'quest row needs explicit language for screen-reader copy');
assert.ok(src.includes("questJournalText(language,'{title}, {status}, {current} of {max}'"),'progress accessibility label must be localized');
assert.ok(src.includes('questJournalText(language,key)'),'status pills must use translated status copy');
assert.ok(src.includes('statusText(status,language)')&&src.includes('statusText(selectedStatus,language)'),'rows and sheets must localize status');
for(const id of ['def.id','order.id','q.id'])assert.ok(src.includes(id),'all quest types remain represented');
assert.equal(questJournalText('de','Gold'),progressionText('de','Gold'),'keep existing progression translation');
assert.equal(questJournalText('nl','Unknown player-authored guild message'),'Unknown player-authored guild message','unknown text never guessed');
assert.equal(questJournalText('ru','Server changed contract title'),'Server changed contract title','server text untouched');
const original='Mira {status}, <PLAYER>';
assert.ok(questJournalText('fr','{title}, {status}, {current} of {max}',{title:original,status:'ACTIVE',current:2,max:7}).includes(original),'player-authored names are opaque');
const compiled=ts.createSourceFile('QuestRefinedScreen.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(compiled.parseDiagnostics.length,0,'Quest Journal JSX parses');
console.log('PASS: '+keys.length+' Quest Journal authored UI keys in eight languages, including Chronicle labels and screen-reader wiring');
