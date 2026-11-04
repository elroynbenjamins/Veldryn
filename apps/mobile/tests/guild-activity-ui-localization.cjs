const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
function compile(mod,filename){
 const input=fs.readFileSync(filename,'utf8');
 const source=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 mod._compile(source,filename);
}
require.extensions['.ts']=compile;
require.extensions['.tsx']=compile;
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {guildActivityUiRows,guildActivityUiText,guildMilestoneText}=require('../src/i18n/guild-activity-ui.ts');
const {socialTranslationRows}=require('../src/i18n/social.ts');
const {EARLY_LOCALE_ROWS}=require('../src/i18n/early-locales.ts');
const {GUILD_ACTIVITY_MILESTONE_DEFS}=require('../src/core/guild-activity.ts');
const expected=30,legacy=['de','es','nl','it','fr','ru','tr'],placeholders=value=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]).sort();
assert.equal(Object.keys(guildActivityUiRows).length,expected,'All current authored Guild Quest/Activity labels covered');
assert.deepEqual([...SUPPORTED_LANGUAGES],['en',...legacy]);
for(const [key,row] of Object.entries(guildActivityUiRows)){
 assert.equal(row.length,7,'Every Guild UI key must cover all non-English languages: '+key);
 for(const [index,language] of legacy.entries()){
  const value=row[index];
  assert.ok(value&&value.trim(),language+' empty Guild UI copy: '+key);
  assert.deepEqual(placeholders(value),placeholders(key),language+' placeholder mismatch: '+key);
  assert.equal(guildActivityUiText(language,key),value,language+' runtime mismatch: '+key);
  const sample=Object.fromEntries(placeholders(key).map(name=>[name,'SENTINEL_'+name]));
  const translated=guildActivityUiText(language,key,sample);
  for(const name of placeholders(key))assert.ok(translated.includes('SENTINEL_'+name),'Changed interpolated value '+language+': '+key);
 }
 assert.equal(guildActivityUiText('en',key),key,'English source must remain unchanged: '+key);
}
assert.equal(guildActivityUiText('nl','{completed}/{total} completed · +{activity} Activity earned',{completed:2,total:5,activity:40}),'2/5 voltooid · +40 activiteit verdiend');
assert.equal(guildActivityUiText('ru','{percent}% Guild Activity',{percent:80}),'Активность гильдии: 80%');
assert.equal(guildActivityUiText('tr','-{percent}% if inactive',{percent:10}),'Etkinlik olmazsa -%10');
assert.equal(guildActivityUiText('fr','Objective breakdown · {quest}',{quest:'Quest $& {count}'}),'Détail des objectifs · Quest $& {count}');
assert.equal(guildActivityUiText('en','Guild Activity details'),'Guild Activity details');
const milestoneSource=GUILD_ACTIVITY_MILESTONE_DEFS.flatMap(row=>[row.name,row.description]);
assert.equal(milestoneSource.length,10);
assert.deepEqual(Object.keys(guildMilestoneEarlyRows).sort(),milestoneSource.sort(),'RU/TR milestone keys must match authoritative content');
for(const row of GUILD_ACTIVITY_MILESTONE_DEFS){
 for(const language of legacy){
  assert.ok(guildMilestoneText(language,row.name).trim());
  assert.ok(guildMilestoneText(language,row.description).trim());
  assert.notEqual(guildMilestoneText(language,row.name),row.name,language+' milestone title still English');
 }
}
assert.equal(guildMilestoneText('en','Unknown player-authored name'),'Unknown player-authored name','Unknown strings stay untouched');
const root=path.resolve(__dirname,'../src/components');
const board=fs.readFileSync(path.join(root,'GuildQuestPanel.tsx'),'utf8'),meter=fs.readFileSync(path.join(root,'GuildActivitySummaryPanel.tsx'),'utf8');
assert.ok(board.includes("ui('Objective breakdown · {quest}'")||board.includes('ui("Objective breakdown · {quest}"'),'Guild Quest accessibility must be translated');
assert.ok(board.includes('q.title')&&board.includes('q.description'),'Authoritative quest content must be preserved');
assert.ok(meter.includes('milestone(row.name)')&&meter.includes('milestone(row.description)'),'Guild Activity milestone names/descriptions must be localized');
assert.ok(meter.includes('ui("Guild Activity details")'),'Guild Activity accessibility label must be localized');
console.log('PASS: 30 Guild Quest/Activity labels across seven target languages, 10 milestone strings in RU/TR and safe runtime interpolation');
