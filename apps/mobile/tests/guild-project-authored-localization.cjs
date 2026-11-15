const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'../../..');
const projectFile=path.resolve(__dirname,'../src/i18n/guild-project-authored.ts');
const source=fs.readFileSync(projectFile,'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module(projectFile,module);mod.filename=projectFile;mod.paths=Module._nodeModulePaths(path.dirname(projectFile));mod._compile(compiled,projectFile);
const {AUTHORED_GUILD_PROJECT_COPY,guildProjectAuthoredCopy}=mod.exports;
const languages=['en','de','es','nl','it','fr','ru','tr'];
const dbSource=fs.readFileSync(path.join(root,'backend/src/server/guild/guild-projects.ts'),'utf8');
const legacyDefinitions=[...dbSource.matchAll(/\bid:'([^']+)',version:1,name:(?:'([^']*)'|"([^"]*)"),description:'([^']*)'/g)]
 .map(match=>({id:match[1],name:match[2]??match[3],description:match[4]}));
const weeklySQL=fs.readFileSync(path.join(root,'backend/supabase/migrations/20261001072757_guild_weekly_projects_and_event_rewards.sql'),'utf8');
const sharedMatch=weeklySQL.match(/'guild_weekly_shared_effort',1,'(\{[^\n]+?\})','shared-effort-v1'/);
assert.ok(sharedMatch,'Active weekly shared effort is still defined by the authoritative SQL');
const shared=JSON.parse(sharedMatch[1]);
const definitions=[{id:'guild_weekly_shared_effort',name:shared.name,description:shared.description},...legacyDefinitions];
assert.equal(definitions.length,14,'Review when the backend Guild Project definition pool changes');
assert.equal(legacyDefinitions.filter(row=>row.id.startsWith('guild_weekly_')).length,9);
assert.equal(legacyDefinitions.filter(row=>row.id.startsWith('guild_dev_')).length,4);
assert.deepEqual(Object.keys(AUTHORED_GUILD_PROJECT_COPY).sort(),definitions.map(d=>d.id).sort(),'No extra/missing templates');
for(const row of definitions){
 const translations=AUTHORED_GUILD_PROJECT_COPY[row.id];
 assert.deepEqual(Object.keys(translations).sort(),languages.slice().sort(),'Complete 8-language translation tuple '+row.id);
 assert.deepEqual(translations.en,[row.name,row.description],'Must match the authoritative immutable source exactly: '+row.id);
 for(const language of languages){
  assert.equal(translations[language].length,2);
  assert.ok(translations[language].every(value=>typeof value==='string'&&value.trim()),'Empty translation '+row.id+' '+language);
  assert.deepEqual(guildProjectAuthoredCopy(language,row.id,row.name,row.description),{
   name:translations[language][0],description:translations[language][1],
  },language+' did not translate '+row.id);
 }
}
const unchanged={name:'United for Veldryn',description:'Changed rules by the server'};
assert.deepEqual(guildProjectAuthoredCopy('ru','guild_weekly_shared_effort',unchanged.name,unchanged.description),unchanged,'Modified server rules must remain verbatim');
assert.deepEqual(guildProjectAuthoredCopy('nl','unknown_project','Player-written project','Personal note'),{name:'Player-written project',description:'Personal note'},'Never translate unknown content');
assert.deepEqual(guildProjectAuthoredCopy('de','guild_weekly_shared_effort','Someone renamed this project',shared.description),{name:'Someone renamed this project',description:shared.description},'Must not mix localized name with revised source');
assert.deepEqual(guildProjectAuthoredCopy('en','guild_weekly_shared_effort',shared.name,shared.description),{name:shared.name,description:shared.description});
for(const file of ['OnlineGuildProjectsPanel.tsx','GuildProjectsPanel.tsx']){
 const ui=fs.readFileSync(path.resolve(__dirname,'../src/components',file),'utf8');
 assert.ok(ui.includes('guildProjectAuthoredCopy(language,candidate.templateId,candidate.name,candidate.description)'),file+' must localize only authoritative candidate copy');
 assert.ok(ui.includes('{authored.name}')&&ui.includes('{authored.description}'),file+' must render both translated name and description');
}
const posting=fs.readFileSync(path.resolve(__dirname,'../src/components/OnlineGuildProjectsPanel.tsx'),'utf8');
assert.ok(posting.includes('guildProjectAuthoredCopy(language,project.templateId,project.name,project.description)'),'Active and completed online projects must use their verified template id');
const contributions=fs.readFileSync(path.resolve(__dirname,'../src/components/GuildProjectContributionsPanel.tsx'),'utf8');
assert.ok(posting.includes('<GuildProjectContributionsPanel projects={active}/>')&&contributions.includes('guildProjectAuthoredCopy(language,project.templateId,project.name,project.description)'),'Inline Guild contribution panel must localize selected project names and descriptions');
assert.ok(posting.includes('project.templateId')&&posting.includes('project.status'),'No change to project mechanics');

// Project progress, donation copy, and leaderboards share locale-aware numbers
// and only translate authored Guild material labels by exact ID and source text.
const projectDetail=fs.readFileSync(path.resolve(__dirname,'../src/components/GuildProjectDetailPanel.tsx'),'utf8');
const supplyDonation=fs.readFileSync(path.resolve(__dirname,'../src/components/GuildProjectSupplyDonationPanel.tsx'),'utf8');
for(const [name,content] of [
 ['Project posts',posting],
 ['Contributor breakdown',contributions],
 ['Project detail',projectDetail],
 ['Supply donations',supplyDonation],
]){
 assert.ok(!content.includes('.toLocaleString()'),name+': numeric content must use player language');
}
for(const [name,content] of [['Contributor breakdown',contributions],['Project detail',projectDetail]]){
 assert.ok(content.includes('guildBankResourceName(language,goal.resourceId,goal.label)'),name+': Guild Project resource labels must be locale-guarded');
}
assert.ok(contributions.includes('sourceSummary(member,ui,language)'), 'activity breakdown must share the selected locale');
assert.ok(projectDetail.includes('socialLabel(language,member.role)'), 'Guild Project member roles should reuse reviewed translations');
assert.ok(supplyDonation.includes('item.available.toLocaleString(language)'), 'supply counts must respect German grouping');

console.log('PASS: 14 authored Guild Project title/description pairs in 8 languages (196 non-English translations), exact server/SQL matching, fallback and both board surfaces');
