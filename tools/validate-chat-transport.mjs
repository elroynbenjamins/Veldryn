import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.join(root,'apps/mobile/package.json'));
const ts=require('typescript');
function load(relative,imports){
 const source=fs.readFileSync(path.join(root,relative),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const module={exports:{}};
 new Function('require','module','exports',outputText)(name=>{
  if(!(name in imports))throw new Error(`Unexpected transport dependency: ${name}`);
  return imports[name];
 },module,module.exports);
 return module.exports;
}

const rows=Array.from({length:55},(_,index)=>({id:String(index+1).padStart(3,'0'),account_id:'reader',sender_name:'Server name',body:`message ${index+1}`,created_at:new Date(1000+index*1000).toISOString(),channel_type:'world',channel_id:'world-1'}));
const partyRows=rows.map(row=>({...row,channel_type:'party',channel_id:'party-a'}));
const guildRows=rows.map(row=>({...row,channel_type:'guild',channel_id:'guild-a'}));
let identityFails=false,activeCharacter='character-a',characterReads=0,sessionReads=0;
const queries=[],guildRequests=[];
const client={
 auth:{getSession:async()=>{sessionReads++;return {data:{session:{user:{id:'reader'}}},error:null};},getUser:()=>{throw new Error('Routine social reads must not call the remote Auth endpoint');}},
 from(table){
  const filters=[],orders=[];let limit=Infinity,single=false;
  const query={select(){return query;},eq(column,value){filters.push([column,value]);return query;},order(column,options={}){orders.push([column,options.ascending!==false]);return query;},limit(count){limit=count;return query;},maybeSingle(){single=true;return query;},then(resolve,reject){
   if(table==='characters')characterReads++;
   const all=table==='chat_messages'?[...rows,...partyRows,...guildRows]:table==='player_profiles'?[{account_id:'reader',active_character_id:activeCharacter}]:table==='characters'?[{account_id:'reader',id:'fallback-character'}]:[{account_id:'reader',guild_id:'guild-a',role:'member'}];
   const selected=all.filter(row=>filters.every(([column,value])=>row[column]===value)).sort((a,b)=>{for(const [column,ascending] of orders){const comparison=String(a[column]).localeCompare(String(b[column]));if(comparison)return ascending?comparison:-comparison;}return 0;}).slice(0,limit);
   queries.push({table,filters,orders,limit});
   return Promise.resolve({data:single?(selected[0]??null):selected,error:null}).then(resolve,reject);
  }};
  return query;
 },
 async rpc(name,args){
  const sendChannel={send_world_chat:[rows,'world',args?.p_channel_id],send_persistent_party_chat_v16:[partyRows,'party',args?.p_party_id],send_guild_chat_v1:[guildRows,'guild','guild-a']}[name];
  if(sendChannel){
   const [messages,channelType,channelId]=sendChannel,id=String(messages.length+1).padStart(3,'0');
   messages.push({id,account_id:'reader',sender_name:'Authoritative name',body:args.p_body.trim(),created_at:new Date(1000+messages.length*1000).toISOString(),channel_type:channelType,channel_id:channelId});
   return {data:id,error:null};
  }
  if(name==='guild_chat_state_v1'){
   guildRequests.push(args);
   // Match the checked-in RPC: select the latest bounded page, then aggregate
   // chronologically. Use the actual request limit rather than a fixed fixture.
   const messages=[...guildRows].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)).slice(0,Math.max(1,Math.min(args.p_limit??50,100))).reverse();
   return {data:{guild:{id:'guild-a',name:'Guild A'},messages,serverTime:new Date(60_000).toISOString()},error:null};
  }
  if(name==='guild_identities_v3')return identityFails?{data:null,error:{code:'503',message:'identity service temporarily unavailable'}}:{data:[{account_id:'reader',guild_tag:'TAG'}],error:null};
  throw new Error(`Unexpected RPC: ${name}`);
 },
};
// The shared social adapter also exports account-bound name-style writes. Load
// that pure dependency chain unchanged so this chat fixture follows the current
// production module without stubbing out its account-isolation behavior.
const entitlementHelpers=load('apps/mobile/src/core/account-entitlements.ts',{});
const nameStyleHelpers=load('apps/mobile/src/core/player-name-style.ts',{'./account-entitlements':entitlementHelpers});
const nameStyleSave=load('apps/mobile/src/core/player-name-style-save.ts',{'./player-name-style':nameStyleHelpers});
const chatHistory=load('apps/mobile/src/online/chat-history.ts',{});
const social=load('apps/mobile/src/online/social.ts',{'./supabase':{supabase:client},'./chat-history':chatHistory,'../core/player-badges':{normalizePlayerBadges:value=>value},'../core/identity-names':{},'../core/player-name-style-save':nameStyleSave});
const party=load('apps/mobile/src/online/party-social.ts',{'./supabase':{supabase:client},'./chat-history':chatHistory,'./social':social,'../core/party-social':{}});

assert.equal(chatHistory.CHAT_RECENT_MESSAGE_LIMIT,25);
const expectedIds=first=>Array.from({length:25},(_,index)=>String(first+index).padStart(3,'0'));
for(const channel of [
 {name:'World',rows,read:()=>social.worldMessages('world-1'),send:()=>social.postWorldMessage('world-1',' new message ','Client name')},
 {name:'Party',rows:partyRows,read:()=>party.partyChatMessages('party-a'),send:()=>party.sendPartyChat('party-a',' new message ','party-message-056')},
 {name:'Guild',rows:guildRows,read:async()=>(await social.guildChatState()).messages,send:()=>social.sendGuildChat(' new message ','guild-message-056')},
]){
 const initial=await channel.read();
 assert.deepEqual(initial.map(row=>row.id),expectedIds(31),`${channel.name}: newest 25 of 55 messages appear chronologically`);
 assert.equal(await channel.send(),'056');
 const afterSend=await channel.read();
 assert.deepEqual(afterSend.map(row=>row.id),expectedIds(32),`${channel.name}: confirmed send replaces the oldest message without duplication`);
 assert.equal(afterSend.at(-1).body,'new message');assert.equal(afterSend.at(-1).sender_name,'Authoritative name');
 channel.rows.at(-1).created_at=channel.rows.at(-2).created_at;
 const tied=await channel.read();
 assert.deepEqual(tied.map(row=>row.id),expectedIds(32),`${channel.name}: equal timestamps retain a stable order and page size`);
 identityFails=true;
 assert.deepEqual((await channel.read()).map(row=>row.id),expectedIds(32),`${channel.name}: cosmetic lookup failure must not hide an accepted message`);
 identityFails=false;
}
for(const query of queries.filter(query=>query.table==='chat_messages')){
 assert.equal(query.limit,25,'World and Party must request at most 25 messages');
 assert.deepEqual(query.orders,[['created_at',false],['id',false]],'Latest page must be selected before limiting, with a stable tie-breaker');
 const channelType=query.filters[0]?.[1];
 assert.ok(['world','party'].includes(channelType));
 assert.deepEqual(query.filters,[['channel_type',channelType],['channel_id',channelType==='world'?'world-1':'party-a']],'History queries must retain channel type and channel ID restrictions');
}
assert.equal(guildRequests.length,4);
assert.ok(guildRequests.every(args=>args.p_limit===25),'Guild must explicitly request the default 25, overriding the server default');
assert.deepEqual((await social.guildChatState(7)).messages.map(row=>row.id),['050','051','052','053','054','055','056'],'An explicit Guild limit remains supported');
assert.equal(guildRequests.at(-1).p_limit,7);

assert.equal((await social.myGuild()).guild_id,'guild-a');
assert.equal((await party.partySocialIdentity()).characterId,'character-a');
assert.equal(characterReads,0,'An active profile character avoids the fallback character query');
activeCharacter=null;
assert.equal((await party.partySocialIdentity()).characterId,'fallback-character');
assert.equal(characterReads,1);assert.equal(sessionReads,3);
console.log('PASS: actual World, Party and Guild transports load newest 25, include accepted sends, order ties, tolerate cosmetic failures, preserve explicit Guild limits and avoid redundant Auth/character reads');
