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
const {recentScreenTranslationRows:rows,recentScreenText,journalAchievementDisplayTitle}=load('i18n/recent-screens.ts');
const {accountTranslationRows,accountText}=load('i18n/account.ts');
const {PLAYER_BADGE_LABELS,PLAYER_BADGE_UNLOCK_HINTS,SUPPORTER_BADGE_UNLOCK_HINTS}=load('core/player-badges.ts');
const languages=['en','de','es','nl','it','fr','ru','tr'];
const paramsFor=text=>Object.fromEntries([...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>[m[1],'VALUE_'+m[1]]));
const placeholders=text=>Object.keys(paramsFor(text)).sort();

assert.ok(Object.keys(rows).length >=165,'new UI coverage');
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
 'components/RegionalJournalPanel.tsx',
 'components/MarketPriceHistoryChart.tsx',
 'screens/RewardsInboxScreen.tsx',
 'screens/SettingsScreen.tsx',
 'components/HomeCommandDeck.tsx',
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
// Regional goals are a fixed authored progression enum, so source changes require new translations.
const regionSource=fs.readFileSync(path.join(root,'core/region-content-v21.ts'),'utf8');
const goalStart=regionSource.indexOf('export function nextRegionalGoalV21(');
assert.ok(goalStart>=0,'regional goal function exists');
const goalText=regionSource.slice(goalStart,regionSource.indexOf('import type {GameState}',goalStart));
const goals=[...goalText.matchAll(/return '([^']+)'/g)].map(match=>match[1]);
assert.equal(goals.length,8,'regional goal states');
for(const goal of goals)assert.ok(Object.hasOwn(rows,goal),'untranslated regional goal '+goal);
assert.equal(recentScreenText('nl','Echoes'),"Echo's");
assert.equal(recentScreenText('tr','Region complete'),'Bölge tamamlandı');

// Journal ladder names are generated from nine authored bases and five tiers.
const journal=load('core/adventurers-journal-v42.ts').JOURNAL_ACHIEVEMENTS_V42;
assert.equal(journal.length,45,'authored Journal ladder length');
for(const achievement of journal){
 assert.equal(journalAchievementDisplayTitle('en',achievement.title),achievement.title);
 for(const language of ['nl','ru','tr'])assert.notEqual(journalAchievementDisplayTitle(language,achievement.title),achievement.title,language+' Journal title '+achievement.title);
}
assert.equal(journalAchievementDisplayTitle('nl','Unreviewed — Custom'),'Unreviewed — Custom');
const journalScreen=fs.readFileSync(path.join(root,'screens/AdventurersJournalScreen.tsx'),'utf8');
assert.ok(journalScreen.includes('journalAchievementDisplayTitle(language,nextAchievement.row.title)'));

// The future market must use the already reviewed item registry and localized numbers.
const marketScreen=fs.readFileSync(path.join(root,'screens/MarketInboxPanel.tsx'),'utf8');
assert.ok(marketScreen.includes('localizedItemName(state.settings.language,row.itemId)'));
assert.ok(marketScreen.includes('formatLocalizedNumber(state.settings.language,value)'));

// Market price histories keep gaps visible and translate accessibility text without changing the data.
const chart=fs.readFileSync(path.join(root,'components/MarketPriceHistoryChart.tsx'),'utf8');
assert.ok(chart.includes("formatLocalizedNumber(language,n)"),'chart uses selected language for all price units');
assert.ok(chart.includes("a('{date}: {price} Gold median, {sales} completed sales'"),'chart screen-reader text localized');
assert.equal(recentScreenText('fr','Price history'),'Historique des prix');
assert.equal(recentScreenText('ru','No verified daily price'),'Нет подтверждённой цены за день');
assert.equal(recentScreenText('tr','{date}: {price} Gold median, {sales} completed sales',{date:'2026-11-13',price:1200,sales:4}),
 '2026-11-13: medyan 1200 altın, 4 tamamlanan satış');
assert.equal(recentScreenText('nl','Market'),'Markt');
assert.equal(recentScreenText('ru','QUICK ACTIONS'),'БЫСТРЫЕ ДЕЙСТВИЯ');
assert.equal(recentScreenText('tr','Your next moves'),'Sonraki adımların');
assert.equal(recentScreenText('nl','{count} / {capacity} queued',{count:2,capacity:4}),'2 / 4 in wachtrij');
const homeDeck=fs.readFileSync(path.join(root,'components/HomeCommandDeck.tsx'),'utf8');
assert.ok(homeDeck.includes("accessibilityLabel={member?a('Open Guild Hall'):a('Find a Guild')}"),'guild accessibility labels translated');
assert.ok(homeDeck.includes('numberOfLines={2}'),'compact labels can wrap');
assert.equal(recentScreenText('fr',"What's New & Updates"),'Nouveautés et mises à jour');

// Roadmap titles/descriptions come from verified SQL definitions, not guessed client copy.
const migrationNames=[
 '20261110233600_community_roadmap_dungeons_in_progress.sql',
 '20261110234500_community_roadmap_seasonal_companion_in_development.sql',
 '20261110235000_community_roadmap_planned_features.sql',
 '20261110235900_community_roadmap_major_workstreams.sql',
];
let verifiedRoadmapEntries=0;
for(const migrationName of migrationNames){
 const sql=fs.readFileSync(path.resolve(__dirname,'../../../backend/supabase/migrations',migrationName),'utf8');
 for(const match of sql.matchAll(/\('([a-z_]+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g)){
  const [,id,title,description]=match;
  assert.ok(Object.hasOwn(rows,title),'roadmap title missing: '+id+' / '+title);
  assert.ok(Object.hasOwn(rows,description),'roadmap description missing: '+id+' / '+description);
  verifiedRoadmapEntries++;
 }
}
assert.equal(verifiedRoadmapEntries,10,'reviewed Roadmap migrations must have ten feature rows');

console.log('Recent screen localization passed: '+Object.keys(rows).length+' strings x 8 languages, badges and key screens.');
