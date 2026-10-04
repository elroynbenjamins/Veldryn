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
const {SUPPORTED_LANGUAGES}=load('languages');
const {GameLanguageProvider}=load('GameLanguageProvider');
const keys=Object.keys(socialTranslationRows).sort();
const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]).sort();
const bossNames={en:'Rootbound Colossus',de:'Wurzelkoloss',es:'Coloso arraigado',nl:'Wortelkolos',it:'Colosso radicato',fr:'Colosse enraciné'};
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
const flat=fs.readdirSync(path.join(root,'src/components')).filter(name=>name.endsWith('.tsx')&&((/^(Guild|OnlineGuild|Party|OnlineParty|Social|Recruitment|LiveDungeon)/.test(name)&&name!=='SocialIdentity.tsx')||['ChatDock.tsx','ChatOverlay.tsx','ChatPlayerSheet.tsx','ChatEmotePicker.tsx','ChatMentionSuggestions.tsx','OnlineWorldChat.tsx','WorldChat.tsx','SharedWorldHubPanel.tsx','ArenaBattleStage.tsx','ChatLog.tsx'].includes(name)));
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
