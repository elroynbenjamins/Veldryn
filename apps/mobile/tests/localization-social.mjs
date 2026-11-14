import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(import.meta.dirname,'..');
const cache=new Map();
function load(name){
 const file=path.join(root,'src/i18n',name+'.'+(name==='GameLanguageProvider'?'tsx':'ts'));
 if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',source)(id=>id.startsWith('./')?load(id.slice(2)):require(id),module,module.exports);
 return module.exports;
}
const {socialTranslationRows,socialCatalogs,socialText,socialLabel,socialExpiry,useSocialText}=load('social');
const {socialEarlyRows}=load('social-early-coverage');
const {earlyLocaleText}=load('early-locales');
const {SUPPORTED_LANGUAGES}=load('languages');
const {GameLanguageProvider}=load('GameLanguageProvider');
const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]).sort();
const keys=Object.keys(socialTranslationRows).sort();
const sourceAdditions=[
  "Uses your verified role and sends you to the eligible dungeon where your role helps matchmaking most. The matched party still uses Auto Tier.",
  "Short-lived dungeon adverts only. Posts disappear after 30 minutes and never create a second Party system.",
  "{count} LIVE",
  "{count}/140 · expires 30 minutes after posting",
  "Your post · {name} · {time}",
  "Auto Tier ≤ {tier}",
  "Combat details for {name}",
  "Focus → {name}",
  "+{count} more active effects",
  "Effect Gem",
  "Damage over time",
  "Healing over time",
  "Debuff",
  "Buff",
  "Final Boss",
  "Dungeon Enemy",
  "Your expedition rewards are secured. Return when you are ready.",
  "Final encounter cleared. Collect the expedition reward below.",
  "Final encounter cleared. Your reward entitlement is being prepared.",
  "This expedition has ended. Review any available rewards before returning."
];
assert.equal(Object.keys(socialEarlyRows).length,180,'RU/TR Dungeon and Social copy includes the latest battle UI labels');
assert.equal(sourceAdditions.length,20,'Live Dungeon, combat inspect and terminal states require 20 new messages');
for(const [key,values] of Object.entries(socialEarlyRows)){
 assert.ok(Object.prototype.hasOwnProperty.call(socialTranslationRows,key),'RU/TR overlay key must exist in base Social catalog: '+key);
 assert.equal(values.length,2,'RU/TR overlay must provide both languages: '+key);
 for(const [index,language] of ['ru','tr'].entries()){
  assert.ok(values[index].trim(),language+' empty overlay '+key);
  assert.deepEqual(placeholders(values[index]),placeholders(key),language+' overlay placeholders '+key);
  assert.equal(socialText(language,key),earlyLocaleText(language,key)??values[index],language+' overlay runtime and established starter-copy precedence '+key);
 }
}
for(const key of sourceAdditions){
 assert.ok(Object.prototype.hasOwnProperty.call(socialTranslationRows,key),'Missing localized Dungeon display string: '+key);
 assert.ok(Object.prototype.hasOwnProperty.call(socialEarlyRows,key),'Missing RU/TR Dungeon display string: '+key);
}

const dungeonFlowRuTrScreens=[
  'DungeonRoomResolution.tsx','DungeonRoomOutcomeBanner.tsx','DungeonMerchantPanel.tsx',
  'CoopRunOverview.tsx','SeasonalBossTelegraphPanel.tsx',
];
for(const fileName of dungeonFlowRuTrScreens){
 const src=fs.readFileSync(path.join(root,'src/components/coop',fileName),'utf8');
 const keysFromScreen=[...src.matchAll(/\bst\(\s*(['"])([^'"]+)\1/g)].map(match=>match[2]);
 for(const key of new Set(keysFromScreen)){
  assert.ok(Object.prototype.hasOwnProperty.call(socialEarlyRows,key),'Missing RU/TR authored Dungeon flow copy: '+fileName+' / '+key);
  for(const lang of ['ru','tr'])if(key!=='NPC')assert.notEqual(socialText(lang,key),key,'Untranslated '+lang+' Dungeon flow copy: '+key);
 }
}
assert.equal(socialText('ru','Bought {item}',{item:'Player $&'}),'Куплено: Player $&');
assert.equal(socialText('tr','Live Fellowship bonus: +{marks} Marks',{marks:27}),'Canlı Yoldaşlık bonusu: +27 Nişan');
assert.equal(socialLabel('tr','Unknown merchant server note'),'Unknown merchant server note');

assert.equal(socialText('ru','Auto Tier ≤ {tier}',{tier:3}),'Авторанг ≤ 3');
assert.equal(socialText('tr','{count}/140 · expires 30 minutes after posting',{count:15}),'15/140 · yayımlandıktan 30 dakika sonra sona erer');
assert.equal(socialText('nl','Your post · {name} · {time}',{name:'Ironwood Wolf',time:'5m'}),'Jouw oproep · Ironwood Wolf · 5m');
assert.equal(socialText('de','Combat details for {name}',{name:'Person {count}'}),'Kampfdetails für Person {count}');
assert.equal(socialLabel('tr','Unrecognized player post const keys=Object.keys(socialTranslationRows).sort();'),'Unrecognized player post const keys=Object.keys(socialTranslationRows).sort();');

assert.equal(socialText('ru','Your week'),'Ваша неделя');
assert.equal(socialText('tr','Your week'),'Bu hafta');
assert.equal(socialText('ru','Boss room'),'Комната босса');
assert.equal(socialText('tr','Boss room'),'Boss odası');
assert.equal(socialText('ru','Party ready check'),'Проверка готовности группы');
assert.equal(socialText('tr','Vote ends in {seconds}s',{seconds:8}),'Oylama 8 sn sonra bitiyor');
assert.equal(socialText('ru','Enhanced: {charges} charges · {weekly} weekly rewards left',{charges:2,weekly:4}),'Усиленные заряды: 2 · Недельных наград осталось: 4');
assert.equal(socialText('tr','Your vote is saved. Waiting for your party…'),'Verdiğin oy kaydedildi. Grubun bekleniyor…');
assert.equal(socialText('ru','A verified Live-ready loadout is required.'),'Нужен подтверждённый набор снаряжения для живого похода.');
assert.equal(socialText('tr','Update Echo from current gear'),'Yankıyı mevcut ekipmanla güncelle');
assert.equal(socialText('ru','Boss room'),socialLabel('ru','Boss room'));
assert.equal(socialText('tr','Room cleared'),'Oda tamamlandı');
assert.equal(socialText('de','Activity level'),'Aktivitätsniveau');
assert.equal(socialText('es','How active are you?'),'¿Cuánto juegas?');
assert.equal(socialText('nl','Preferred language'),'Voorkeurstaal');
assert.equal(socialText('it','Tryhard'),'Competitivo');
assert.equal(socialText('fr','{count} open',{count:3}),'3 places');
assert.equal(socialText('ru','Preferred language'),'Предпочитаемый язык');
assert.equal(socialText('tr','My Posts'),'İlanlarım');
assert.equal(socialText('ru','{count} results',{count:4}),'Результатов: 4');
assert.equal(socialText('tr','{count} compatible recruitment adverts',{count:2}),'2 uygun ilan');
assert.equal(socialText('de','Only the Party leader can invite friends.'),'Nur der Gruppenleiter kann Freunde einladen.');
assert.equal(socialText('fr','No matching friends.'),'Aucun ami correspondant.');
assert.equal(socialText('ru','{count} open slots',{count:2}),'Свободно мест: 2');
assert.equal(socialText('tr','PRIVATE PARTY INVITATIONS'),'ÖZEL GRUP DAVETLERİ');
assert.equal(socialLabel('nl','Your Party is full.'),'Je groep zit vol.');
assert.equal(socialLabel('nl','Unrecognized server error'),'Unrecognized server error');
assert.equal(socialText('de','{current} OF {goal}',{current:2,goal:4}),'2 VON 4');
assert.equal(socialText('es','{percent}% Guild Activity',{percent:60}),'60 % de actividad del gremio');
assert.equal(socialText('nl','{count} members',{count:12}),'12 leden');
assert.equal(socialText('it','{percent}% NEXT',{percent:80}),'PROSSIMO: 80%');
assert.equal(socialText('fr','RALLY III'),'RALLYE III');
assert.equal(socialText('ru','{current} OF {goal}',{current:1,goal:4}),'1 ИЗ 4');
assert.equal(socialText('tr','Earn 1 Rally Mark at {count} points today.',{count:25}),'Bugün 25 puanda 1 Ralli İşareti kazan.');
assert.equal(socialLabel('de','Gathering Momentum'),'Sammel-Schwung');
assert.equal(socialLabel('nl','+5% crafting and processing speed.'),'+5% maak- en verwerkingssnelheid.');
const bossNames={en:'Rootbound Colossus',de:'Wurzelkoloss',es:'Coloso arraigado',nl:'Wortelkolos',it:'Colosso radicato',fr:'Colosse enraciné',ru:'Rootbound Colossus',tr:'Rootbound Colossus'};
for(const language of SUPPORTED_LANGUAGES){
 assert.deepEqual(Object.keys(socialCatalogs[language]).sort(),keys);
 for(const key of keys){
  const text=socialCatalogs[language][key];
  assert.equal(typeof text,'string',language+': '+key);
  assert.ok(text.trim(),language+': '+key);
  assert.deepEqual(placeholders(text),placeholders(key),language+': '+key);
  const params=Object.fromEntries(placeholders(key).map(name=>[name,'VALUE']));
  assert.equal(placeholders(socialText(language,key,params)).length,0);
 }
 const name='Friends $& {count}',message='Guild {marks}';
 const rendered=socialText(language,'Open chat. Latest World message from {name}: {message}',{name,message});
 assert.ok(rendered.includes(name));assert.ok(rendered.includes(message));
 // Authored content labels use the catalog; unknown labels retain their spelling.
 assert.equal(socialLabel(language,'Rootbound Colossus'),bossNames[language]);
 assert.equal(socialLabel(language,'Uncatalogued boss $& {count}'),'Uncatalogued boss $& {count}');
 assert.equal(socialExpiry(language,0,1).urgency,'expired');
 assert.equal(socialExpiry(language,6*3_600_000,0).urgency,'soon');
 assert.equal(socialExpiry(language,7*3_600_000,0).urgency,'normal');
 assert.equal(socialExpiry(language,25*3_600_000,0).text,socialText(language,'{count}d left',{count:2}));
 function Label(){const st=useSocialText();return React.createElement('span',null,st('Friends'));}
 assert.equal(renderToStaticMarkup(React.createElement(GameLanguageProvider,{language},React.createElement(Label))),'<span>'+socialText(language,'Friends')+'</span>');
}

const screens=['FriendsScreen','GuildScreen','SocialScreen','RankingsScreen','ArenaScreen','CoopExpeditionScreen'];
const flat=fs.readdirSync(path.join(root,'src/components')).filter(name=>name.endsWith('.tsx')&&((/^(Guild|OnlineGuild|Party|OnlineParty|Social|Recruitment|LiveDungeon)/.test(name)&&name!=='SocialIdentity.tsx')||['ChatComposer.tsx','ChatDock.tsx','ChatOverlay.tsx','ChatPlayerSheet.tsx','ChatEmotePicker.tsx','ChatMentionSuggestions.tsx','OnlineWorldChat.tsx','WorldChat.tsx','SharedWorldHubPanel.tsx','ArenaBattleStage.tsx','ChatLog.tsx'].includes(name)));
const files=[...screens.map(name=>'src/screens/'+name+'.tsx'),...flat.map(name=>'src/components/'+name),...fs.readdirSync(path.join(root,'src/components/coop')).filter(name=>name.endsWith('.tsx')&&!name.includes('Gallery')).map(name=>'src/components/coop/'+name)];
const technical=new Set(['type','kind','mode','icon','id','key','testID','tone','accessibilityRole','keyboardType','autoCapitalize','resizeMode','pointerEvents','statusTone']);
function hasTranslation(node){
 if(ts.isArrowFunction(node)||ts.isFunctionExpression(node))return false;
 if(ts.isCallExpression(node)&&['st','socialText','socialLabel'].includes(node.expression.getText()))return true;
 return !!ts.forEachChild(node,child=>hasTranslation(child)||undefined);
}
for(const name of files){
 const file=ts.createSourceFile(name,fs.readFileSync(path.join(root,name),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(file.parseDiagnostics.length,0,'Syntax: '+name);
 function visit(node){
  if(ts.isJsxAttribute(node)&&technical.has(node.name.text)&&node.initializer)assert.equal(hasTranslation(node.initializer),false,'Technical JSX attribute: '+name+' '+node.name.text);
  if(ts.isPropertyAssignment(node)&&technical.has(node.name.getText(file)))assert.equal(hasTranslation(node.initializer),false,'Technical property: '+name+' '+node.name.getText(file));
  if(ts.isCallExpression(node)&&node.expression.getText(file)==='st'&&node.arguments.length&&ts.isStringLiteral(node.arguments[0]))assert.ok(keys.includes(node.arguments[0].text),'Unknown key: '+name+' '+node.arguments[0].text);
  ts.forEachChild(node,visit);
 }
 visit(file);
}
const chatLog=fs.readFileSync(path.join(root,'src/components/ChatLog.tsx'),'utf8');
assert.ok(chatLog.includes('{renderItem(item)}'));
assert.ok(chatLog.includes('{emptyText}'));
console.log('social localization: '+keys.length+' keys x '+SUPPORTED_LANGUAGES.length+' languages; placeholders, provider, authored interpolation, expiry and '+files.length+' files passed');
