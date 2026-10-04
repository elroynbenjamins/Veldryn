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
let identityFails=false,activeCharacter='character-a',characterReads=0,sessionReads=0;
const queries=[];
const client={
 auth:{getSession:async()=>{sessionReads++;return {data:{session:{user:{id:'reader'}}},error:null};},getUser:()=>{throw new Error('Routine social reads must not call the remote Auth endpoint');}},
 from(table){
  const filters=[],orders=[];let limit=Infinity,single=false;
  const query={select(){return query;},eq(column,value){filters.push([column,value]);return query;},order(column,options={}){orders.push([column,options.ascending!==false]);return query;},limit(count){limit=count;return query;},maybeSingle(){single=true;return query;},then(resolve,reject){
   if(table==='characters')characterReads++;
   const all=table==='chat_messages'?[...rows,...partyRows]:table==='player_profiles'?[{account_id:'reader',active_character_id:activeCharacter}]:table==='characters'?[{account_id:'reader',id:'fallback-character'}]:[{account_id:'reader',guild_id:'guild-a',role:'member'}];
   const selected=all.filter(row=>filters.every(([column,value])=>row[column]===value)).sort((a,b)=>{for(const [column,ascending] of orders){const comparison=String(a[column]).localeCompare(String(b[column]));if(comparison)return ascending?comparison:-comparison;}return 0;}).slice(0,limit);
   queries.push({table,filters,orders,limit});
   return Promise.resolve({data:single?(selected[0]??null):selected,error:null}).then(resolve,reject);
  }};
  return query;
 },
 async rpc(name,args){
  if(name==='send_world_chat'){
   const id=String(rows.length+1).padStart(3,'0');rows.push({id,account_id:'reader',sender_name:'Authoritative name',body:args.p_body,created_at:new Date(1000+rows.length*1000).toISOString(),channel_type:'world',channel_id:args.p_channel_id});
   return {data:id,error:null};
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
const social=load('apps/mobile/src/online/social.ts',{'./supabase':{supabase:client},'../core/player-badges':{normalizePlayerBadges:value=>value},'../core/identity-names':{},'../core/player-name-style-save':nameStyleSave});
const party=load('apps/mobile/src/online/party-social.ts',{'./supabase':{supabase:client},'./social':social,'../core/party-social':{}});

const initial=await social.worldMessages('world-1');
assert.equal(initial.length,50);assert.equal(initial[0].id,'006');assert.equal(initial.at(-1).id,'055');
assert.deepEqual(queries[0].orders,[['created_at',false],['id',false]],'Latest page must be selected before limiting, with a stable tie-breaker');
assert.equal(await social.postWorldMessage('world-1',' new message ','Client name'),'056');
const afterSend=await social.worldMessages('world-1');
assert.equal(afterSend.at(-1).body,'new message');assert.equal(afterSend.at(-1).sender_name,'Authoritative name');
assert.equal(new Set(afterSend.map(row=>row.id)).size,50,'A confirmed message appears once in chronological history');
rows.at(-1).created_at=rows.at(-2).created_at;
const tied=await social.worldMessages('world-1');
assert.deepEqual(tied.slice(-2).map(row=>row.id),['055','056'],'Equal timestamps retain a stable order');
identityFails=true;
assert.equal((await social.worldMessages('world-1')).at(-1).id,'056','Cosmetic lookup failure must not hide an accepted message');
const partyHistory=await party.partyChatMessages('party-a');
assert.equal(partyHistory.length,50);assert.equal(partyHistory[0].id,'006');assert.equal(partyHistory.at(-1).id,'055');
assert.ok(queries.filter(query=>query.table==='chat_messages').every(query=>query.filters.length===2),'History queries must retain channel type and channel ID restrictions');

assert.equal((await social.myGuild()).guild_id,'guild-a');
assert.equal((await party.partySocialIdentity()).characterId,'character-a');
assert.equal(characterReads,0,'An active profile character avoids the fallback character query');
activeCharacter=null;
assert.equal((await party.partySocialIdentity()).characterId,'fallback-character');
assert.equal(characterReads,1);assert.equal(sessionReads,3);
console.log('PASS: actual chat transports load newest 50, include accepted sends, order ties, tolerate cosmetic failures and avoid redundant Auth/character reads');
