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
assert.ok(overlay.includes('useOnlinePlayerRoster(ONLINE_PLAYER_ROSTER_RELEASED&&visible&&chatEnabled)'),'refresh only while chat is open and the release gate is on');
assert.ok(overlay.includes('ONLINE_PLAYER_ROSTER_RELEASED&&onlineConfigured'),'hide the header until the reviewed production RPC ships');
assert.ok(read('src/core/release-flags.ts').includes('ONLINE_PLAYER_ROSTER_RELEASED=false'),'the online roster stays off by default');
assert.ok(overlay.includes('<ChatOnlinePlayersPanel'),'the header opens the existing modal-based roster');
assert.ok(overlay.includes('accessibilityState={{expanded:onlinePlayersOpen}}'),'the header pill advertises its expanded state');
assert.ok(panel.includes('<ChatPlayerSheet'),'reuse existing secure player/profile actions');
assert.ok(panel.includes('FlatList')&&panel.includes('TextInput'),'searchable scrollable roster');
assert.ok(panel.includes("filter==='friends'")&&panel.includes("filter!=='all'"),'friend/guild list filters');
assert.ok(heartbeat.includes('heartbeat();')&&heartbeat.includes('2*60_000'),'foreground heartbeat begins immediately');
assert.ok(moduleSource.includes("supabase.rpc('online_player_roster_v1')"),'read from server-authoritative presence');

console.log('PASS: online roster response, chat integration, search, safety and presence cadence');
