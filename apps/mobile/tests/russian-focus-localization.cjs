const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText,f);
const {RUSSIAN_FOCUS_ROWS}=require('../src/i18n/russian-focus.ts');
const {earlyLocaleText}=require('../src/i18n/early-locales.ts');
const {createSourceTranslator}=require('../src/i18n/source-catalog.ts');
const {createTranslator}=require('../src/i18n/translator.ts');
const keys=Object.keys(RUSSIAN_FOCUS_ROWS);
assert.ok(keys.length>=280,'Expected broad Russian UI coverage');
const tokens=s=>[...s.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>m[1]).sort();
const modules=['account','app-shell','battle','companions','creation','gameplay','navigation','profile','progression','social'];
const sources=modules.map(name=>fs.readFileSync(path.join(__dirname,'../src/i18n/'+name+'.ts'),'utf8'));
const owned=new Set(sources.flatMap(source=>[...source.matchAll(/^\s*(['"])(.*?)\1\s*:\s*\[/gm)].map(match=>match[2])));
for(const key of keys){
  const translated=RUSSIAN_FOCUS_ROWS[key];
  assert.ok(owned.has(key),'Missing exact source key '+key);
  assert.ok(translated.trim(),'Empty Russian translation for '+key);
  assert.deepEqual(tokens(translated),tokens(key),'Placeholder mismatch: '+key);
  assert.equal(earlyLocaleText('ru',key),translated,'Unreachable Russian translation: '+key);
}
assert.equal(earlyLocaleText('ru','UNKNOWN LIVE SERVER COPY'),undefined,'Unknown server copy must remain untranslated');
assert.equal(earlyLocaleText('tr','Companion Index'),undefined,'Turkish catalog fallback must be unchanged');
assert.equal(earlyLocaleText('ru','Show breakdown'),'Показать подробности','Older Russian catalog entries still work');
const params={count:3,name:'PLAYER-007',amount:2};
const sourceTranslator=createSourceTranslator({'{name}, needs attention':['de','es','nl','it','fr']});
assert.equal(sourceTranslator('ru','{name}, needs attention',params),'PLAYER-007: требуется внимание');
assert.equal(sourceTranslator('en','{name}, needs attention',params),'PLAYER-007, needs attention');
const typedTranslator=createTranslator({en:{a:'{count}/10 equipped'},de:{a:'{count}/10 ausgerüstet'}});
assert.equal(typedTranslator('ru','a',params),'Надето: 3/10');
assert.equal(typedTranslator('de','a',params),'3/10 ausgerüstet');
assert.equal(typedTranslator('ru','a',{count:1}),'Надето: 1/10');
console.log('PASS: '+keys.length+' focused Russian UI translations, source keys, placeholders, and language fallback');
