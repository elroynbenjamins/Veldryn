const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const root=path.resolve(__dirname,'..');
const prior=require.extensions['.ts'];
require.extensions['.ts']=(module,filename)=>{
 const source=fs.readFileSync(filename,'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 module._compile(compiled,filename);
};
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const {AUTHORED_GUILD_QUEST_COPY,guildQuestAuthoredCopy}=require('../src/i18n/guild-quest-authored.ts');
require.extensions['.ts']=prior;
assert.equal(AUTHORED_GUILD_QUEST_COPY.length,15);
assert.deepEqual([...SUPPORTED_LANGUAGES],['en','de','es','nl','it','fr','ru','tr']);
const count={combat_front:1,skilling_drive:1,special:6,extended:7};
const sets=Object.groupBy(AUTHORED_GUILD_QUEST_COPY,row=>row.family);
for(const [family,n] of Object.entries(count))assert.equal(sets[family]?.length,n,'Authoritative quest family '+family);
const authoritativeSQL=[
 'backend/supabase/migrations/20261018000168_guild_quest_state_v5.sql',
 'backend/supabase/migrations/20261018000161_guild_quest_rarity_objectives_v3.sql',
 'backend/supabase/migrations/20261018000164_guild_quest_extended_pool_v4.sql',
].map(file=>fs.readFileSync(path.resolve(root,'../../',file),'utf8')).join('\n');
const unique=new Set();
for(const row of AUTHORED_GUILD_QUEST_COPY){
 assert.equal(row.title.length,8);
 assert.equal(row.description.length,8);
 const name=row.title[0],desc=row.description[0];
 assert.ok(authoritativeSQL.includes("'"+name+"'"),'Title not grounded in authoritative SQL: '+name);
 assert.ok(authoritativeSQL.includes("'"+desc+"'"),'Description not grounded in authoritative SQL: '+name);
 assert.ok(!unique.has(row.family+name),'Duplicate authored Guild Quest title '+name);
 unique.add(row.family+name);
 const key=row.family==='special'?'special_2':row.family==='extended'?'extended_3':row.family;
 for(const [index,language] of SUPPORTED_LANGUAGES.entries()){
  assert.ok(row.title[index]?.trim(),language+' title empty '+name);
  assert.ok(row.description[index]?.trim(),language+' description empty '+name);
  assert.deepEqual(guildQuestAuthoredCopy(language,key,name,desc),
   {title:row.title[index],description:row.description[index]},language+' content mismatch '+name);
 }
}
assert.deepEqual(guildQuestAuthoredCopy('ru','special_3','Player Guild','User created description.'),{title:'Player Guild',description:'User created description.'});
assert.deepEqual(guildQuestAuthoredCopy('tr','special_7','River Run','Complete Fishing actions through normal verified skilling.'),{title:'River Run',description:'Complete Fishing actions through normal verified skilling.'});
assert.deepEqual(guildQuestAuthoredCopy('de','special_1','River Run','Mine things.'),{title:'River Run',description:'Mine things.'},'Do not mix authored titles with different descriptions');
assert.deepEqual(guildQuestAuthoredCopy('fr','guild_custom','Guild Vanguard','Contribute through verified combat play.'),{title:'Guild Vanguard',description:'Contribute through verified combat play.'},'Quest key must belong to reviewed server pool');
const board=fs.readFileSync(path.join(root,'src/components/GuildQuestPanel.tsx'),'utf8');
assert.ok(board.includes('guildQuestAuthoredCopy(language,q.questKey,q.title,q.description)'),'Guild Quest display must localize only verified source pairs');
assert.ok(board.includes('{authored.title}')&&board.includes('{authored.description}'),'Visible Quest title/description must use localized verified content');
assert.ok(board.includes('{quest:authored.title,activity:q.activityReward}')&&board.includes('{quest:authored.title})'),'Completion alerts and accessibility must use localized quest titles');
console.log('PASS 15 authored Guild Quest pairs (30 source strings x 7 locales = 210 translations), authoritative SQL source parity, strict fallback and view wiring');
