const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
function compile(mod,filename){
 const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 mod._compile(output,filename);
}
require.extensions['.ts']=compile;
require.extensions['.tsx']=compile;
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {liveDungeonUiRows,liveDungeonUiText,liveDungeonRoleText,liveDungeonRiskText}=require('../src/i18n/live-dungeon-ui.ts');
const {onlineGuildProjectUiRows,onlineGuildProjectUiText}=require('../src/i18n/online-guild-project-ui.ts');
const locales=['de','es','nl','it','fr','ru','tr'];
assert.deepEqual([...SUPPORTED_LANGUAGES],['en',...locales]);
const placeholders=text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
for(const [name,rows,translate,count] of [
 ['Live Dungeon',liveDungeonUiRows,liveDungeonUiText,14],
 ['Online Guild Projects',onlineGuildProjectUiRows,onlineGuildProjectUiText,129],
]){
 assert.ok(name==='Online Guild Projects'?Object.keys(rows).length>=count:Object.keys(rows).length===count,name+': reviewed key count reduced or changed');
 for(const [key,values] of Object.entries(rows)){
  assert.equal(values.length,7,name+': missing locale values for '+key);
  const params=Object.fromEntries(placeholders(key).map(k=>[k,'KEEP_$&_{'+k+'}']));
  assert.equal(translate('en',key),key,name+': English source changed');
  const englishOutput=translate('en',key,params);
  for(const placeholder of placeholders(key))assert.ok(englishOutput.includes('KEEP_$&_{'+placeholder+'}'));
  for(const [i,locale] of locales.entries()){
   assert.ok(values[i]&&values[i].trim(),locale+': empty '+key);
   assert.deepEqual(placeholders(values[i]),placeholders(key),locale+': placeholder mismatch in '+key);
   assert.equal(translate(locale,key),values[i],locale+': translation mismatch '+key);
   const translated=translate(locale,key,params);
   for(const placeholder of placeholders(key))assert.ok(translated.includes('KEEP_$&_{'+placeholder+'}'),locale+': changed server value in '+key);
  }
 }
}
assert.equal(liveDungeonRoleText('nl','support'),'STEUN');
assert.equal(liveDungeonRoleText('ru','tank'),'ТАНК');
assert.equal(liveDungeonRiskText('nl','Medium'),'Gemiddeld');
assert.equal(liveDungeonRiskText('ru','High'),'Высокий');
assert.equal(liveDungeonUiText('fr','READY CHECK · {seconds}s',{seconds:8}),'PRÊT ? · 8 s');
assert.equal(liveDungeonUiText('tr','Route option {name}, {risk}, {votes} votes',{name:'A $&',risk:'Yüksek',votes:3}),'Rota A $&, Yüksek, 3 oy');
assert.equal(onlineGuildProjectUiText('nl','{completed} completed · {events} events',{completed:2,events:4}),'2 voltooid · 4 gebeurtenissen');
assert.equal(onlineGuildProjectUiText('tr','Claim 500 Gold'),'500 Altın al');
assert.equal(onlineGuildProjectUiText('ru','{count}/{minimum} contributors',{count:2,minimum:3}),'Участники: 2/3');
assert.equal(onlineGuildProjectUiText('es','Voting closes {date}',{date:'1/2/2027 00:00'}),'Votación cierra 1/2/2027 00:00');
const root=path.resolve(__dirname,'../src/components');
const file=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const queue=file('LiveDungeonQueuePanel.tsx');
const ready=file('LiveDungeonReadyCheck.tsx');
const run=file('LiveDungeonRunPanel.tsx');
const guild=file('OnlineGuildProjectsPanel.tsx');
const contributionBoard=file('GuildProjectContributionsPanel.tsx');
for(const [source,checks] of [
 [queue,["liveDungeonRoleText(language,queue.role)","ui('Team: 1 Tank · 2 Damage · 1 Support. Loadout locks at ready check.')","{queue.contentName}","formatWait(queue.waitSeconds)"]],
 [ready,["ui('READY CHECK · {seconds}s'","ui('{ready}/4 ready'","liveDungeonRoleText(language,m.role)","{m.displayName}","readyCount(check)"]],
 [run,["ui('LIVE EXPEDITION · NODE {current}/{total}'","ui('CHOOSE NEXT ROUTE · {seconds}s'","liveDungeonRiskText(language,o.risk)","ui('Route option {name}, {risk}, {votes} votes'","{o.rewardHint}","{o.name}","{run.connectionWarning}","{run.bossName}"]],
 [guild,["guildProjectAuthoredCopy(language,candidate.templateId,candidate.name,candidate.description)","guildProjectAuthoredCopy(language,project.templateId,project.name,project.description)","ui('Voting closes {date}'","guildFlowFocusText(language,project.focus)","project.rewardDestination==='guild_bank'","project.personalRewardThreshold>0","claimOpen"]]
])for(const marker of checks)assert.ok(source.includes(marker),'Missing localized wiring or original server fields: '+marker);
assert.ok(guild.includes('<GuildProjectContributionsPanel projects={active}/>'),'Live project screen delegates contributor details to compact board');
for(const token of [
 "guildProjectAuthoredCopy(language,project.templateId,project.name,project.description)",
 "ui('Member contributions')",
 "ui('Top 5 contributors')",
 "member.displayName",
 "guildBankResourceName(language,goal.resourceId,goal.label)",
 "300 effort for Guild Bank reward · Claim within 7 days.",
 "300 effort for 500 Gold · Claim within 7 days.",
])assert.ok(contributionBoard.includes(token),'Guild contributor details or localized rewards missing in new compact panel: '+token);
assert.ok(!run.includes('Run state is checkpointed between nodes so a server restart'),'The verbose internal-server note should be replaced with concise localized copy');
assert.ok(!guild.includes('Project contributions: ${authored.name}'),'Accessibility label should no longer hardcode English.');
assert.ok(guild.includes('Date.now()<claimDeadline')&&guild.includes("project.status==='completed'"),'Claim eligibility rules must remain intact');
console.log('PASS: 14 Live Dungeon and at least 129 Online Guild Project keys in seven target languages, with strict interpolation and preserved gameplay/identity fields');
