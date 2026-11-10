const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(
 fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}
).outputText,file);
const {gemPouchUiRows,gemPouchText}=require('../src/i18n/gem-pouch-ui.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],languages);
const keys=Object.keys(gemPouchUiRows);
assert.ok(keys.length>=67,'original Gem Pouch templates and the complete gem-roll glossary must remain available');
for(const key of [
 'POSSIBLE SOCKET ROLL','AFTER REFINING','Maximum roll','Reroll unavailable','Roll quality',
 'One of nine equally likely rolls. Higher rolls give stronger bonuses.',
 'One duplicate gem is consumed; the higher roll is kept.',
 'The old gem returns to storage without its socket roll.',
 'Returned to Gem Pouch or available storage.',
]){
 assert.ok(Object.hasOwn(gemPouchUiRows,key),'missing localized grindstone mechanic: '+key);
}
const placeholders=s=>[...s.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
for(const key of keys){
 const row=gemPouchUiRows[key];
 assert.equal(row.length,7,key+' must have DE/ES/NL/IT/FR/RU/TR');
 assert.equal(gemPouchText('en',key),key,'English remains canonical');
 for(const [i,language] of languages.slice(1).entries()){
  assert.ok(row[i].trim(),key+' missing '+language);
  assert.deepEqual(placeholders(row[i]),placeholders(key),key+' mismatched interpolations '+language);
  const values={used:4,capacity:30,name:'OPAQUE',count:3,level:7,gold:'123',grade:2,materials:'OPAQUE'};
  const expected=row[i].replace(/\{(\w+)\}/g,(_,name)=>String(values[name]));
  assert.equal(gemPouchText(language,key,values),expected,key+' translation '+language);
 }
}
assert.equal(gemPouchText('tr','Unknown online gem message'),'Unknown online gem message','unknown server text unchanged');
const source=fs.readFileSync(path.join(__dirname,'../src/components/GemPouchPanel.tsx'),'utf8');
const anchors=[
 "gemPouchText(language,source,params)",
 "p('Gem Pouch')",
 "p('Tap a gem to inspect or manage it. Shared across characters; socketing and Enchanting use stored gems automatically.')",
 "p('Next: {count} slots'",
 "p('GEM POUCH · ACCOUNT STORAGE')",
 "p('★ Protected: remove Favorite and Lock before selling or dismantling.')",
 "p('Requires Lv {level} · {gold} Gold · {materials}'",
 "p('Sell gems from Gem Pouch?')",
 "p('Convert 1× {name} into Gem Dust? This cannot be undone.'",
 "p('Dismantle this gem?')",
 "localizedItemName(language,pendingSell.itemId)",
 "localizedItemName(language,pendingDismantle)",
];
for(const marker of anchors)assert.ok(source.includes(marker),'Gem Pouch UI missing '+marker);
for(const command of ["type:'gem_pouch_sell'","type:'gem_refine'","type:'gem_dismantle'"]){
 assert.ok(source.includes(command),'server-authoritative gem command must be preserved '+command);
}
assert.ok(source.includes('protectedGem||selectedItem.value<=0'),'protected gems must still block selling');
assert.ok(source.includes('onFavorite?.(selectedStack.itemId)')&&source.includes('onLock?.(selectedStack.itemId)'),'identity updates remain ID based');
const parsed=ts.createSourceFile('GemPouchPanel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(parsed.parseDiagnostics.length,0,'Gem Pouch JSX must parse');
console.log('PASS: '+keys.length+' Gem Pouch templates × 7 translations, including rolled-gem safety; preserved commands and fallback');
