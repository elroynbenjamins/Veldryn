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
let identityFails=false,activeCharacter='character-a',activeAccount='reader',characterReads=0,sessionReads=0,loseWorldResponse=false,failReadMarker=false;
const queries=[],guildRequests=[],rpcCalls=[],readRequests=[],worldReceipts=new Map();
const client={
 auth:{getSession:async()=>{sessionReads++;return {data:{session:{user:{id:activeAccount}}},error:null};},getUser:()=>{throw new Error('Routine social reads must not call the remote Auth endpoint');}},
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
  rpcCalls.push({name,args,account:activeAccount});
  const sendChannel={send_world_chat_v2:[rows,'world',args?.p_channel_id],send_persistent_party_chat_v16:[partyRows,'party',args?.p_party_id],send_guild_chat_v1:[guildRows,'guild','guild-a']}[name];
  if(sendChannel){
   let receiptKey;
   if(name==='send_world_chat_v2'){
    assert.equal(typeof args.p_idempotency_key,'string','World transport must send a persistent request identity');
    assert.ok(args.p_idempotency_key.length>0);
    receiptKey=`${activeAccount}:${args.p_idempotency_key}`;
    const accepted=worldReceipts.get(receiptKey);
    if(accepted){
     if(accepted.channelId!==args.p_channel_id||accepted.body!==args.p_body.trim())return{data:null,error:{code:'P0001',message:'idempotency_key_conflict'}};
     return {data:accepted.id,error:null};
    }
   }
   const [messages,channelType,channelId]=sendChannel,id=String(messages.length+1).padStart(3,'0');
   messages.push({id,account_id:activeAccount,sender_name:'Authoritative name',body:args.p_body.trim(),created_at:new Date(1000+messages.length*1000).toISOString(),channel_type:channelType,channel_id:channelId});
   if(receiptKey){
    worldReceipts.set(receiptKey,{id,body:args.p_body.trim(),channelId});
    // Transport-level failure after the server accepted the row. The actual
    // migration's replay/authority semantics are exercised by the SQL fixture.
    if(loseWorldResponse){loseWorldResponse=false;return{data:null,error:{code:'NETWORK_ERROR',message:'Acknowledgement response lost'}};}
   }
   return {data:id,error:null};
  }
  if(name==='mark_social_chat_read_v2'){
   readRequests.push(args);
   if(failReadMarker)return{data:null,error:{code:'NETWORK_ERROR',message:'Read acknowledgement unavailable'}};
   return{data:{channelType:args.p_channel_type,channelId:args.p_channel_id,readAt:'2026-10-05T06:00:00Z',readMessageId:args.p_message_id},error:null};
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
 {name:'World',rows,read:()=>social.worldMessages('world-1'),send:()=>social.postWorldMessage('world-1',' new message ','Client name','world-message-056')},
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

const beforeRetry=rows.length,retryKey=social.worldChatCommandKey();
loseWorldResponse=true;
await assert.rejects(()=>social.postWorldMessage('world-1',' retry safely ','Client hint',retryKey),error=>error.message==='Acknowledgement response lost');
const accepted=rows.at(-1);
assert.equal(rows.length,beforeRetry+1,'the fixture accepted the original send even though its response was lost');
assert.equal(accepted.body,'retry safely');
assert.equal(await social.postWorldMessage('world-1','retry safely','Changed cosmetic hint',retryKey),accepted.id,'the real adapter carries the same request identity on retry and returns the original accepted message');
assert.equal(rows.length,beforeRetry+1,'retrying an accepted request cannot append another fixture row');
for(const [channel,body] of [['world-1','Different body'],['world-2','retry safely']]){
 await assert.rejects(()=>social.postWorldMessage(channel,body,'Client hint',retryKey),error=>error.message==='idempotency_key_conflict','changing body or channel must propagate a replay conflict');
}
assert.equal(rows.length,beforeRetry+1);
const newKey=social.worldChatCommandKey();assert.notEqual(newKey,retryKey,'another message receives a fresh identity');
assert.notEqual(await social.postWorldMessage('world-1','retry safely','Client hint',newKey),accepted.id,'the same words can be intentionally sent again after a new request identity');
activeAccount='another-reader';
assert.notEqual(await social.postWorldMessage('world-1','retry safely','Another player',retryKey),accepted.id,'the transport preserves account-scoped receipt ownership');
assert.equal(rows.at(-1).account_id,'another-reader');activeAccount='reader';
const retryCalls=rpcCalls.filter(call=>call.name==='send_world_chat_v2'&&call.args.p_idempotency_key===retryKey);
assert.ok(retryCalls.length>=2);
assert.deepEqual(retryCalls[0].args,{p_channel_id:'world-1',p_body:'retry safely',p_sender_name:'Client hint',p_idempotency_key:retryKey},'World v2 payload carries the trimmed body, channel and explicit request identity');

for(const kind of ['guild','party']){
 const channelId=`${kind}-a`,messageId=`${kind}-visible-cursor`;
 const marked=await social.markSocialChatRead(kind,channelId,messageId);
 assert.deepEqual(readRequests.at(-1),{p_channel_type:kind,p_channel_id:channelId,p_message_id:messageId},'read acknowledgement passes an exact displayed message and conversation rather than server-now semantics');
 assert.deepEqual(marked,{channelType:kind,channelId,readAt:'2026-10-05T06:00:00Z',readMessageId:messageId},'the caller receives the server-confirmed cursor');
}
failReadMarker=true;
await assert.rejects(()=>social.markSocialChatRead('guild','guild-a','guild-visible-cursor'),error=>error.message==='Read acknowledgement unavailable','a read transport failure must reach the caller so it remains retryable');
assert.ok(rpcCalls.every(call=>!['send_world_chat','mark_social_chat_read_v1'].includes(call.name)),'updated clients must not downgrade to legacy duplicate-prone send or time-based mark-read calls');

assert.equal((await social.myGuild()).guild_id,'guild-a');
assert.equal((await party.partySocialIdentity()).characterId,'character-a');
assert.equal(characterReads,0,'An active profile character avoids the fallback character query');
activeCharacter=null;
assert.equal((await party.partySocialIdentity()).characterId,'fallback-character');
assert.equal(characterReads,1);assert.equal(sessionReads,3);
console.log('PASS: actual World/Party/Guild transports retain newest25 and stable ties, cosmetic failures and explicit limits; World v2 lost-ACK receipt/conflict/account payloads; scoped read-cursor confirmation and retryable errors; no redundant Auth/character reads');
