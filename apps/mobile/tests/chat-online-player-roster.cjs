'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const moduleSource=read('src/online/online-player-roster.ts');
const code=ts.transpileModule(moduleSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandbox={exports:{},require:()=>({})};
vm.runInNewContext(code,sandbox);
const parse=sandbox.exports.parseOnlineRoster;

assert.equal(parse({count:0,players:[]}).count,0);
const roster=parse({count:2,players:[
 {account_id:'a',sender_name:'Semux',level:25,total_character_level:65,class_id:'warrior',is_friend:true,is_guildmate:false},
 null,{account_id:'b',sender_name:'Drai',level:38,class_id:'mage',is_friend:false,is_guildmate:true}
]});
assert.equal(roster.count,2);
assert.deepEqual(roster.players.map(row=>row.sender_name).join(','),'Semux,Drai');
assert.equal(roster.players[0].is_friend,true);
assert.equal(roster.players[1].is_guildmate,true);
assert.equal(roster.players[0].total_character_level,65);
assert.equal(roster.players[1].total_character_level,null,'legacy response must not mislabel active character level as total');
for(const bad of [0,-1,1.5,NaN,Infinity,'65'])assert.equal(parse({count:1,players:[{account_id:'a',sender_name:'Name',level:25,total_character_level:bad}]}).players[0].total_character_level,null);
assert.equal(parse({count:1,players:[{account_id:'a',sender_name:'Name',level:25,total_character_level:25}]}).players[0].total_character_level,25);
assert.equal(parse({count:1,players:[{account_id:'a',sender_name:'Name',level:25,total_character_level:24}]}).players[0].total_character_level,null,'impossible account total stays unknown');
assert.equal(parse({count:1,players:[{account_id:'a',sender_name:'Name',level:Infinity,total_character_level:25}]}).players[0].level,1);
assert.equal(parse({count:1,players:[{account_id:'',sender_name:'Name',level:1}]}).players.length,0);
assert.equal(parse({count:1,players:[{account_id:'a',sender_name:'Name',level:25,total_character_level:65},{account_id:'a',sender_name:'Duplicate',level:25,total_character_level:65}]}).players.length,1,'duplicate account rows cannot produce duplicate list keys');
assert.equal(parse({count:1,players:[{account_id:'a',sender_name:'  ',level:2}]}).players.length,0);
assert.throws(()=>parse({count:'2',players:[]}),/Invalid online player response/);
assert.throws(()=>parse(null),/Invalid online player response/);

const overlay=read('src/components/ChatOverlay.tsx');
const panel=read('src/components/ChatOnlinePlayersPanel.tsx');
const heartbeat=read('src/online/useOnlineGame.ts');
assert.ok(overlay.includes('useOnlinePlayerRoster(ONLINE_PLAYER_ROSTER_RELEASED&&visible&&chatEnabled&&!partyOnly,onlinePlayersOpen)'),'refresh only while chat is open, roster release gate is on and Party-only modal is closed');
assert.ok(overlay.includes('ONLINE_PLAYER_ROSTER_RELEASED&&onlineConfigured'),'show the header only when the verified release gate is on');
assert.ok(read('src/core/release-flags.ts').includes('ONLINE_PLAYER_ROSTER_RELEASED=true'),'the verified online roster is enabled for release');
assert.ok(overlay.includes('<ChatOnlinePlayersPanel'),'the header opens the existing modal-based roster');
assert.ok(overlay.includes('accessibilityState={{expanded:onlinePlayersOpen}}'),'the header pill advertises its expanded state');
assert.ok(panel.includes('<ChatPlayerSheet'),'reuse existing secure player/profile actions');
assert.ok(panel.includes('FlatList')&&panel.includes('TextInput'),'searchable scrollable roster');
assert.ok(panel.includes("filter==='friends'")&&panel.includes("filter!=='all'"),'friend/guild list filters');
assert.ok(heartbeat.includes('heartbeat();')&&heartbeat.includes('2*60_000'),'foreground heartbeat begins immediately');
assert.ok(moduleSource.includes("rpc('online_player_roster_v2')"),'read from server-authoritative presence');
assert.ok(moduleSource.includes("rpc('online_player_count_v1')"),'header count has independent projection');

const migration=fs.readFileSync(path.join(root,'../../backend/supabase/migrations/20261121170000_chat_active_30m_roster_v2.sql'),'utf8');
assert.match(migration,/create or replace function public\.online_player_roster_v2\(\)/);
assert.match(migration,/p\.last_seen_at >= now\(\) - interval '30 minutes'/);
assert.match(migration,/p\.bucket_start >= now\(\) - interval '35 minutes'/);
assert.match(migration,/revoke all on function public\.online_player_roster_v2\(\) from public, anon;/);
assert.match(migration,/grant execute on function public\.online_player_roster_v2\(\) to authenticated;/);
assert.ok(!migration.includes('create or replace function public.online_player_roster_v1()'),'legacy seven-minute RPC is not changed');
assert.ok(overlay.includes("compactActivityPill?'30m':st('Active (30m)')"),'30-minute header has compact small-screen variant');
assert.ok(overlay.includes("st('Active in Last 30 Minutes')"),'header accessibility identifies the correct window');
assert.ok(panel.includes("st('Active in Last 30 Minutes')"),'player list uses the same explicit activity window');
assert.ok(panel.includes("st('Recently active, not necessarily online now')"),'30-minute presence is not mislabeled as live online');
assert.ok(panel.includes("st('No recently active players')"),'empty state is accurate');
for(const key of ['Active (30m)','Active in Last 30 Minutes','Recently active, not necessarily online now','No recently active players']){
 assert.ok(read('src/i18n/social.ts').includes(JSON.stringify(key)+':'),'main locales translate '+key);
 assert.ok(read('src/i18n/social-early-coverage.ts').includes(JSON.stringify(key)+':'),'Russian and Turkish locales translate '+key);
}

const accountMigration=fs.readFileSync(path.join(root,'../../backend/supabase/migrations/20261124222700_chat_roster_account_total_level.sql'),'utf8');
assert.match(accountMigration,/coalesce\(nullif\(profile\.social_name,''\)/);
assert.match(accountMigration,/sum\(greatest\(1, owned\.level\)\)/);
assert.match(accountMigration,/owned\.account_id=p\.account_id/);
assert.match(accountMigration,/from page p/);
assert.match(accountMigration,/not has_social_name and count\(\*\) over \(partition by lower\(base_name\)\)>1/);
assert.match(accountMigration,/right\(md5\(account_id::text\),8\)/);
assert.match(accountMigration,/from named/);
assert.match(accountMigration,/revoke all on function public\.online_player_roster_v2\(\) from public, anon;/);
assert.match(accountMigration,/grant execute on function public\.online_player_roster_v2\(\) to authenticated;/);
assert.ok(!accountMigration.includes('create or replace function public.online_player_roster_v1()'));
assert.ok(panel.includes("st('Total character level')")&&!panel.includes('classLabel(')&&!panel.includes('item.level'),'roster presents account total, not active class or level');
assert.ok(panel.includes('numberOfLines={2} style={s.playerName}')&&panel.includes("flexWrap:'wrap'")&&panel.includes('style={s.playerLevel}'),'long names, translated labels and total values retain readable space');
assert.ok(panel.includes("[name,levelLabel+': '+level,relationship].filter(Boolean).join(', ')")&&panel.includes("st(' (You)')"),'accessible identity includes self and relationship context');
assert.ok(panel.includes('setSelected(null);setSearch(\'\');setFilter(\'all\')'),'clear viewer-specific selection on account switch');
for(const file of ['src/i18n/social.ts','src/i18n/social-early-coverage.ts'])assert.ok(read(file).includes('"Total character level":'));

console.log('PASS: 30-minute activity roster RPC, backward compatibility, UI labels, translations and presence cadence');

async function projectionTests(){
 const readProjection=sandbox.exports.readOnlinePlayerProjection;
 const calls=[],cap={missing:false};
 const response={count:1,players:[{account_id:'a',sender_name:'Adventurer',level:10}]};
 const rpc=async name=>{calls.push(name);return {data:name==='online_player_count_v1'?1:response,error:null};};
 const count=await readProjection(rpc,false,cap);assert.equal(count.count,1);assert.equal(count.players.length,0);assert.deepEqual(calls,['online_player_count_v1']);
 const full=await readProjection(rpc,true,cap);assert.equal(full.players.length,1);assert.deepEqual(calls,['online_player_count_v1','online_player_roster_v2']);
 calls.length=0;const legacy={missing:false};
 const oldRpc=async name=>{calls.push(name);return name==='online_player_count_v1'?{data:null,error:{code:'PGRST202'}}:{data:response,error:null};};
 assert.equal((await readProjection(oldRpc,false,legacy)).players.length,0);assert.equal(legacy.missing,true);
 await readProjection(oldRpc,false,legacy);assert.deepEqual(calls,['online_player_count_v1','online_player_roster_v2','online_player_roster_v2']);
 calls.length=0;await assert.rejects(readProjection(async name=>{calls.push(name);return {data:null,error:{code:'42501'}};},false,{missing:false}));assert.deepEqual(calls,['online_player_count_v1']);
 await assert.rejects(readProjection(async()=>({data:-1,error:null}),false,{missing:false}),/Invalid online player count/);
 console.log('PASS count-only, on-demand details, missing-RPC fallback and access error isolation');
}
void projectionTests().catch(error=>{console.error(error);process.exitCode=1;});
