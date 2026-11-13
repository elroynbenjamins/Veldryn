const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'../src');
const cache=new Map();

function load(relative){
 const filename=path.resolve(root,relative);
 if(cache.has(filename))return cache.get(filename);
 const source=fs.readFileSync(filename,'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};cache.set(filename,exports);
 const localRequire=id=>load(path.relative(root,path.resolve(path.dirname(filename),id+'.ts')));
 vm.runInNewContext('(function(exports,require){'+code+'\n})',{console})(exports,localRequire);
 return exports;
}
const {recentScreenTranslationRows:rows,recentScreenText}=load('i18n/recent-screens.ts');
const {accountTranslationRows,accountText}=load('i18n/account.ts');
const {PLAYER_BADGE_LABELS,PLAYER_BADGE_UNLOCK_HINTS,SUPPORTER_BADGE_UNLOCK_HINTS}=load('core/player-badges.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
const paramsFor=text=>Object.fromEntries([...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>[m[1],'VALUE_'+m[1]]));
const placeholders=text=>Object.keys(paramsFor(text)).sort();

assert.ok(Object.keys(rows).length>=70,'new UI coverage');
for(const [source,translations] of Object.entries(rows)){
 assert.equal(translations.length,7,source+' must cover seven target languages');
 for(const [index,translation] of translations.entries()){
  assert.ok(translation.trim(),source+' empty translation '+languages[index+1]);
  assert.deepEqual(placeholders(translation),placeholders(source),source+' placeholder mismatch '+languages[index+1]);
 }
 for(const language of languages){
  const params=paramsFor(source);
  const result=recentScreenText(language,source,params);
  assert.ok(result.trim(),language+' empty '+source);
  for(const value of Object.values(params))assert.ok(result.includes(value),language+' missing interpolation '+source);
 }
}
assert.equal(recentScreenText('nl','Updates every 2 hours'),'Wordt elke 2 uur bijgewerkt');
assert.equal(recentScreenText('tr','No badge equipped'),'Kuşanılmış rozet yok');
assert.equal(recentScreenText('nl','Verified {months}-month Supporter milestone',{months:6}),'Geverifieerde supportermijlpaal: 6 maanden');
assert.equal(recentScreenText('es','Player badges'),accountText('es','Player badges'),'reuse legacy account catalog');
for(const source of [
 ...Object.values(PLAYER_BADGE_LABELS),
 ...Object.values(PLAYER_BADGE_UNLOCK_HINTS),
 ...Object.values(SUPPORTER_BADGE_UNLOCK_HINTS),
])assert.ok(Object.hasOwn(rows,source)||Object.hasOwn(accountTranslationRows,source),'untranslated badge source '+source);
for(const relative of [
 'screens/CommunityRoadmapScreen.tsx',
 'screens/MarketInboxPanel.tsx',
 'components/PlayerBadgeSettings.tsx',
 'components/PlayerBadges.tsx',
]){
 const source=fs.readFileSync(path.join(root,relative),'utf8');
 const tree=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(tree.parseDiagnostics.length,0,relative+' parses');
 assert.ok(source.includes('recentScreenText'),relative+' uses new translations');
 function visit(node){
  if(ts.isCallExpression(node)&&['r','a'].includes(node.expression.getText(tree))&&node.arguments.length&&ts.isStringLiteral(node.arguments[0])){
   const value=node.arguments[0].text;
   assert.ok(Object.hasOwn(rows,value)||Object.hasOwn(accountTranslationRows,value),relative+' missing '+value);
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);
}
console.log('Recent screen localization passed: '+Object.keys(rows).length+' strings x 8 languages, badges and key screens.');
