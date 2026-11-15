import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(import.meta.dirname,'..');
const cache=new Map();
function load(name){
  const file=path.join(root,'src/i18n',name+'.'+(name==='GameLanguageProvider'?'tsx':'ts'));
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}
  }).outputText;
  new Function('require','module','exports',source)(id=>id.startsWith('./')?load(id.slice(2)):require(id),module,module.exports);
  return module.exports;
}
const {socialTranslationRows,socialText}=load('social');
const {socialEarlyRows}=load('social-early-coverage');
const {SUPPORTED_LANGUAGES}=load('languages');
const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
const keys=[
  'No further ranked entries',
  'Return to the previous page to view ranked entries.',
  'Previous','Next','Page',
  'Entries {first}–{last}',
  'Live rankings can change while players progress.',
];
for(const key of keys){
  assert.ok(Object.hasOwn(socialTranslationRows,key),'Missing DE/ES/NL/IT/FR ranking copy: '+key);
  assert.ok(Object.hasOwn(socialEarlyRows,key),'Missing RU/TR ranking copy: '+key);
  assert.equal(socialTranslationRows[key].length,5,'Five base translations expected: '+key);
  assert.equal(socialEarlyRows[key].length,2,'RU/TR translation pair expected: '+key);
  for(const translation of [...socialTranslationRows[key],...socialEarlyRows[key]]){
    assert.ok(translation.trim(),'Empty Rankings translation: '+key);
    assert.deepEqual(placeholders(translation),placeholders(key),'Translation placeholder mismatch: '+key);
  }
  for(const language of SUPPORTED_LANGUAGES){
    const output=socialText(language,key,key.startsWith('Entries ')?{first:'1',last:'50'}:undefined);
    assert.ok(output.trim(),'Empty rendered Rankings copy: '+language+' / '+key);
    if(key.startsWith('Entries '))assert.ok(output.includes('1')&&output.includes('50'),'Ranking range not interpolated: '+language);
  }
}
assert.equal(socialText('nl','Entries {first}–{last}',{first:'1',last:'50'}),'Posities 1–50');
console.log('rankings localization PASS: '+keys.length+' messages in '+SUPPORTED_LANGUAGES.length+' languages');
