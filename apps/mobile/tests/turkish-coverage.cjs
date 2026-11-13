const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText,filename
);

const {TURKISH_COVERAGE}=require('../src/i18n/turkish-coverage.ts');
const {EARLY_LOCALE_ROWS,earlyLocaleText}=require('../src/i18n/early-locales.ts');
const {createSourceTranslator}=require('../src/i18n/source-catalog.ts');
const {createTranslator}=require('../src/i18n/translator.ts');
const keys=Object.keys(TURKISH_COVERAGE);
assert.ok(keys.length>=1006,'Turkish core coverage should retain the 1006-string baseline');

const placeholders=text=>[...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
 .map(match=>match[1]).sort();
const i18nDir=path.resolve(__dirname,'../src/i18n');
const coveredSources=['navigation.ts','app-shell.ts','account.ts','companions.ts',
 'gameplay.ts','profile.ts','social.ts','battle.ts','creation.ts','guild-hall-ui.ts','progression.ts'];
const source=coveredSources.map(file=>fs.readFileSync(path.join(i18nDir,file),'utf8')).join('\n');

for(const [english,turkish] of Object.entries(TURKISH_COVERAGE)){
 assert.ok(english.trim()&&turkish.trim(),'Empty Turkish translation: '+english);
 assert.ok(!Object.hasOwn(EARLY_LOCALE_ROWS,english),'Duplicate early translation: '+english);
 assert.deepEqual(placeholders(turkish),placeholders(english),'Placeholder mismatch: '+english);
 assert.equal(earlyLocaleText('tr',english),turkish,'Turkish runtime lookup: '+english);
 assert.ok(source.includes(JSON.stringify(english))||source.includes("'"+english+"'"),
  'Missing source catalog entry: '+english);
}

assert.equal(earlyLocaleText('ru','Secured'),undefined,'Do not change Russian fallbacks');
assert.equal(earlyLocaleText('de','Secured'),undefined,'Do not affect completed locales');
assert.equal(earlyLocaleText('tr','Combat Power'),'Savaş gücü','Keep established Turkish translations');
assert.equal(earlyLocaleText('tr','Unknown server detail'),undefined,'Unknown player/server data stays untranslated');

const sourceTranslator=createSourceTranslator({
 'No companions unlocked yet.':['DE','ES','NL','IT','FR']
});
assert.equal(sourceTranslator('tr','No companions unlocked yet.'),'Henüz yoldaş açılmadı.');
assert.equal(sourceTranslator('en','No companions unlocked yet.'),'No companions unlocked yet.');

const keyed=createTranslator({
 en:{'Weekly rewards ready to claim: {count}':'Weekly rewards ready to claim: {count}'},
 tr:{'Weekly rewards ready to claim: {count}':'Wrong catalog fallback'}
});
assert.equal(keyed('tr','Weekly rewards ready to claim: {count}',{count:3}),
 'Alınmaya hazır haftalık ödüller: 3');
assert.equal(keyed('en','Weekly rewards ready to claim: {count}',{count:3}),
 'Weekly rewards ready to claim: 3');

console.log('PASS: '+keys.length+' Turkish strings, domain source keys, placeholders, and runtime fallbacks.');
