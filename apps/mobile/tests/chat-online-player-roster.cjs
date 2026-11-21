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
 {account_id:'a',sender_name:'Semux',level:25,class_id:'warrior',is_friend:true,is_guildmate:false},
 null,{account_id:'b',sender_name:'Drai',level:38,class_id:'mage',is_friend:false,is_guildmate:true}
]});
assert.equal(roster.count,2);
assert.deepEqual(roster.players.map(row=>row.sender_name).join(','),'Semux,Drai');
assert.equal(roster.players[0].is_friend,true);
assert.equal(roster.players[1].is_guildmate,true);
assert.equal(parse({count:1,players:[{account_id:'a',sender_name:'  ',level:2}]}).players.length,0);
assert.throws(()=>parse({count:'2',players:[]}),/Invalid online player response/);
assert.throws(()=>parse(null),/Invalid online player response/);

const overlay=read('src/components/ChatOverlay.tsx');
const panel=read('src/components/ChatOnlinePlayersPanel.tsx');
const heartbeat=read('src/online/useOnlineGame.ts');
assert.ok(overlay.includes('useOnlinePlayerRoster(ONLINE_PLAYER_ROSTER_RELEASED&&visible&&chatEnabled&&!partyOnly)'),'refresh only while chat is open, roster release gate is on and Party-only modal is closed');
assert.ok(overlay.includes('ONLINE_PLAYER_ROSTER_RELEASED&&onlineConfigured'),'show the header only when the verified release gate is on');
assert.ok(read('src/core/release-flags.ts').includes('ONLINE_PLAYER_ROSTER_RELEASED=true'),'the verified online roster is enabled for release');
assert.ok(overlay.includes('<ChatOnlinePlayersPanel'),'the header opens the existing modal-based roster');
assert.ok(overlay.includes('accessibilityState={{expanded:onlinePlayersOpen}}'),'the header pill advertises its expanded state');
assert.ok(panel.includes('<ChatPlayerSheet'),'reuse existing secure player/profile actions');
assert.ok(panel.includes('FlatList')&&panel.includes('TextInput'),'searchable scrollable roster');
assert.ok(panel.includes("filter==='friends'")&&panel.includes("filter!=='all'"),'friend/guild list filters');
assert.ok(heartbeat.includes('heartbeat();')&&heartbeat.includes('2*60_000'),'foreground heartbeat begins immediately');
assert.ok(moduleSource.includes("supabase.rpc('online_player_roster_v2')"),'read from server-authoritative presence');

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

console.log('PASS: 30-minute activity roster RPC, backward compatibility, UI labels, translations and presence cadence');
