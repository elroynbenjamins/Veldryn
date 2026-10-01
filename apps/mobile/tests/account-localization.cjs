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
const {accountCatalogs,accountTranslationRows,accountT,accountText,accountError,accountDuration}=load('i18n/account.ts');
const languages=['en','de','es','nl','it','fr'];
const placeholders=text=>Array.from(text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g),m=>m[1]).sort();
const keys=Object.keys(accountTranslationRows);
for(const language of languages){
 assert.deepEqual(Object.keys(accountCatalogs[language]).sort(),keys.slice().sort(),language+' keys');
 for(const [key,row] of Object.entries(accountTranslationRows)){
  assert.equal(row.length,6,key+' row');
  assert.equal(row[0],key,key+' English source');
  assert.ok(accountCatalogs[language][key].trim(),language+' empty '+key);
  assert.deepEqual(placeholders(accountCatalogs[language][key]),placeholders(key),language+' placeholders '+key);
  const params=Object.fromEntries(placeholders(key).map(name=>[name,'VALUE_'+name]));
  const output=accountT(language,key,params);
  for(const value of Object.values(params))assert.ok(output.includes(value),language+' interpolation '+key);
 }
 const name='Home <&> {count} $1';
 assert.ok(accountT(language,'Signed in as {identity}.',{identity:name}).includes(name));
 assert.ok(accountT(language,'Type {confirmation} to unlock the delete actions.',{confirmation:'DELETE '+name}).includes('DELETE '+name));
 assert.equal(accountText(language,'Fallen Knight'),'Fallen Knight');
 assert.equal(accountText(language,'VIP + VIP+'),'VIP + VIP+');
 assert.equal(accountText(language,'9,99 EUR'),'9,99 EUR');
}
for(const text of [
 '+1 saved loadout','+2 hours offline reserve',
 '+2h · +10% Gathering Yield','+10% Crafting / Processing Output',
 'Collection · Maximum HP','Equipment Forge · Unlock character slot #2',
 '1 reward stack is waiting. Move them before the 72-hour hold expires.',
 'Only 1 carried food portion remains. Withdraw cooked food before a long hunt; auto-eat only uses Inventory.',
 'Reach character level 25 · 1 level remaining. Keep collecting combat rewards and improving your gear.',
 'Complete First Blood, First Skill.','Reach Level 20 and complete Place Among Guilds.',
 'Step 1/3','Gather 4× Copper Ore',
]){
 assert.notEqual(accountText('es',text),text,'runtime source untranslated: '+text);
}
assert.ok(accountText('de','Banked +2h Gathering Yield on Home.').endsWith('Home gespeichert.'));
assert.equal(accountError('de','unknown backend detail'),accountT('de','The request could not be completed. Please try again.'));
assert.equal(accountError('de','Enter a valid email address.'),accountT('de','Enter a valid email address.'));
assert.equal(accountDuration('de',3661),'1 Std. 1 Min.');
assert.equal(accountDuration('nl',-1),'0 s');
const guides=load('core/onboarding.ts').GAME_GUIDE;
for(const guide of guides)for(const field of ['title','summary','unlockHint'])assert.notEqual(accountText('es',guide[field]),guide[field],guide.id+' '+field);
const records=load('core/personal-records-v43.ts').PERSONAL_RECORDS_V43;
for(const record of records)for(const field of ['label','description'])assert.notEqual(accountText('es',record[field]),record[field],record.id+' '+field);
const bonuses=load('content/commerce-products.ts').COMMERCE_PRODUCT_BONUSES;
for(const value of Object.values(bonuses))for(const text of [value.note,...value.items])assert.notEqual(accountText('es',text),text,'commerce '+text);
const files=["components/PlayerBadgeSettings.tsx","screens/DailySuppliesScreen.tsx","screens/HomeScreen.tsx","screens/AccountBonusesScreen.tsx","screens/SettingsScreen.tsx","components/CommerceProductRow.tsx","screens/MoreScreen.tsx","components/CommerceCatalog.tsx","screens/ActivityOverviewScreen.tsx","components/SaveTransferPanel.tsx","components/OnlineAccountPanel.tsx","components/AccountWelcomeScreen.tsx","components/DailySuppliesSummary.tsx","components/NewUnlocksPanel.tsx","components/SettingToggle.tsx","components/HomeSessionOverview.tsx","components/GuideTopicModal.tsx","components/PersonalRecordsPanel.tsx","components/GooglePlayCommercePanel.tsx","components/GameGuidePanel.tsx"];
let displayCalls=0;
const technical=new Set(['source','productId','kind','mode','type','tone','name','accessibilityRole','keyboardType','autoComplete','autoCapitalize','presentation']);
for(const relative of files){
 const source=fs.readFileSync(path.join(root,relative),'utf8');
 const tree=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(tree.parseDiagnostics.length,0,relative+' parses');
 function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(tree)==='a'){
   displayCalls++;
   if(ts.isStringLiteral(node.arguments[0]))assert.ok(Object.hasOwn(accountTranslationRows,node.arguments[0].text),relative+' missing '+node.arguments[0].text);
  }
  if(ts.isJsxAttribute(node)&&technical.has(node.name.getText(tree)))assert.ok(!/\ba\(/.test(node.initializer?.getText(tree)||''),relative+' translated technical '+node.name.getText(tree));
  ts.forEachChild(node,visit);
 }
 visit(tree);
}
const more=fs.readFileSync(path.join(root,'screens/MoreScreen.tsx'),'utf8');
assert.ok(more.includes("const attentionPriority:MoreDestination[]=['DailySupplies','Progression','Companions','Social','Friends','Guild','Profile'];"));
console.log('Account localization passed: '+keys.length+' keys x 6 languages; '+guides.length+' guides; '+records.length+' records; '+files.length+' owned files; '+displayCalls+' display calls.');
