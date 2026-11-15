const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'..');
function compile(mod,filename){
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 mod._compile(source,filename);
}
require.extensions['.ts']=compile;
require.extensions['.tsx']=compile;
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {guildFlowUiRows,guildFlowUiText,guildFlowFocusText}=require('../src/i18n/guild-flow-ui.ts');
const {dungeonCombatUiRows,dungeonCombatUiText}=require('../src/i18n/dungeon-combat-ui.ts');
const locales=['de','es','nl','it','fr','ru','tr'];
const fields=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
for(const [rows,label,translate,count] of [
 [guildFlowUiRows,'guild',guildFlowUiText,46],
 [dungeonCombatUiRows,'combat',dungeonCombatUiText,12],
]){
 assert.equal(Object.keys(rows).length,count,'Missing '+label+' translations');
 for(const [en,values] of Object.entries(rows)){
  assert.equal(values.length,7,en+' must cover seven target languages');
  assert.equal(translate('en',en),en,'English must stay intact: '+en);
  const params=Object.fromEntries(fields(en).map(key=>[key,'SENTINEL_'+key]));
  const expectedSource=en.replace(/\{(\w+)\}/g,(_,key)=>params[key]??'{'+key+'}');
  assert.equal(translate('en',en,params),expectedSource);
  for(const [index,language] of locales.entries()){
   assert.ok(values[index]&&values[index].trim(),language+' empty translation: '+en);
   assert.deepEqual(fields(values[index]),fields(en),language+' lost placeholder '+en);
   assert.equal(translate(language,en),values[index],language+' translation mismatch: '+en);
   const output=translate(language,en,params);
   for(const field of fields(en))assert.ok(output.includes('SENTINEL_'+field),language+' lost '+field+' in '+en);
  }
 }
}
assert.equal(guildFlowUiText('nl','{count} votes',{count:4}),'4 stemmen');
assert.equal(guildFlowUiText('tr','{count}/{minimum} meaningful contributors',{count:2,minimum:3}),'2/3 etkin katkıcı');
assert.equal(guildFlowUiText('fr','No bulletin posted.'),'Aucune annonce publiée.');
assert.equal(guildFlowFocusText('de','development'),'Ausbau');
assert.equal(guildFlowFocusText('ru','skilling'),'Навыки');
assert.equal(dungeonCombatUiText('nl','{count} more effects',{count:3}),'3 extra effecten');
assert.equal(dungeonCombatUiText('ru','BARRIER +{amount}',{amount:125}),'БАРЬЕР +125');
assert.equal(dungeonCombatUiText('tr','Inspect {name} combat details',{name:'NPC $& {name}'}),'NPC $& {name} savaş ayrıntılarını incele');
const base=path.resolve(root,'src/components');
const sources=Object.fromEntries(['GuildHubPanel.tsx','GuildProjectsPanel.tsx','GuildProjectDetailPanel.tsx','GuildDecreePanel.tsx','GuildMemberRosterPanel.tsx'].map(file=>[file,fs.readFileSync(path.join(base,file),'utf8')]));
const checks={
 'GuildHubPanel.tsx':["useGuildFlowUiText()","ui(value)","ui('No bulletin posted.')","ui('{count} active'","ui('GUILD · LEVEL {level}'"],
 'GuildProjectsPanel.tsx':["guildFlowFocusText(language,p.focus)","guildProjectAuthoredCopy(language,candidate.templateId,candidate.name,candidate.description)","ui('{count} choices'","ui(candidate.votes===1?'{count} vote':'{count} votes'"],
 'GuildProjectDetailPanel.tsx':["guildFlowFocusText(language,project.focus)","ui(project.status)","ui('{count}/{minimum} meaningful contributors'","ui('Today {current}/{cap}'","ui('reward eligible')"],
 'GuildDecreePanel.tsx':["ui('until {date}'","toLocaleDateString(language)","ui('A completed eligible weekly Project can open the next decree window.')"],
 'GuildMemberRosterPanel.tsx':["ui('{count} weekly contribution'","ui(m.onlineState)"]
};
for(const [file,markers] of Object.entries(checks))for(const marker of markers)assert.ok(sources[file].includes(marker),file+' missing localized UI: '+marker);
assert.ok(sources['GuildHubPanel.tsx'].includes('guild.bulletin||'),'Player-written Guild bulletin must stay verbatim');
assert.ok(sources['GuildProjectsPanel.tsx'].includes('{authored.description}'),'Known Guild Project descriptions must use exact-authoritative translator');
assert.ok(sources['GuildDecreePanel.tsx'].includes('{decree.name}')&&sources['GuildDecreePanel.tsx'].includes('{decree.description}'),'Unreviewed server decree text must stay unchanged');
const combat=fs.readFileSync(path.join(base,'coop/CombatantProfileCard.tsx'),'utf8');
for(const marker of [
 "ui('{name}, {className}, {role}, {percent}% health'",
 "ui('Inspect {name} combat details'",
 "ui('{count} stacks'",
 "ui('Effect Gem proc')",
 "ui('{count} more effects'",
 "ui('BARRIER +{amount}'",
 "ui('FOCUS → {target}'",
 "ui(boss?'Boss {name}':'Dungeon enemy {name}'",
 "localizedDungeonEffectLabel(language,status)",
])assert.ok(combat.includes(marker),'Dungeon combat UI missing localization: '+marker);
assert.ok(combat.includes('statusCode(status)'),'Combat gem status codes must remain intact');
console.log('PASS: 46 Guild and 12 Dungeon combat keys x 7 target locales; placeholder parity, UI wiring, unknown server copy and authoritative replay values');
