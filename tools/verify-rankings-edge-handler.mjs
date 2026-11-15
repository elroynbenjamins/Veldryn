import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const ts=require('typescript');
const source=readFileSync(new URL('../backend/online/rankings-handler.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText;
const exports={};
new Function('exports','require',compiled)(exports,require);
const {rankingsHandler,RANKINGS_RELEASED,FROZEN_RANKINGS_RELEASED,
 ARENA_HISTORY_RELEASED,WORLD_BOSS_HISTORY_RELEASED,
 PARTY_EVENT_HISTORY_RELEASED,GUILD_PVE_HISTORY_RELEASED}=exports;
assert.equal(RANKINGS_RELEASED,false);
assert.equal(FROZEN_RANKINGS_RELEASED,false);
assert.equal(ARENA_HISTORY_RELEASED,false);
assert.equal(WORLD_BOSS_HISTORY_RELEASED,false);
assert.equal(PARTY_EVENT_HISTORY_RELEASED,false);
assert.equal(GUILD_PVE_HISTORY_RELEASED,false);

const account='11111111-1111-4111-8111-111111111111';
const cursor='22222222-2222-4222-8222-222222222222';
const boss='33333333-3333-4333-8333-333333333333';
const calls=[];
const services={
 authenticate:async token=>token==='valid'?account:null,
 rpc:async (name,args)=>{calls.push({name,args});return {
   board:'mining',frozen:true,prestigeOnly:true,cursor,
   pageSize:50,nextCursor:null,hasNext:false,expiresAtMs:5000,
   accountId:account,internalDiagnostics:{secret:'not-for-client'},
   entries:[{rank:1,entityType:'account',displayName:'Safe Player',
     value:42,isSelf:false,accountId:account,entityId:boss,
     playerBadges:{staff:null,supporter:true,validUntilMs:1234,internalRole:'secret'}}],
   self:{listed:true,rank:1,value:42,accountId:account}
 };}
};
const get=(action,query='')=>new Request('https://example.test/gameplay?view=rankings&action='+action+query,{
 method:'GET',headers:{authorization:'Bearer valid'}
});
const post=(body)=>new Request('https://example.test/gameplay?view=rankings&action=snapshot-start',{
 method:'POST',headers:{authorization:'Bearer valid','content-type':'application/json'},body:JSON.stringify(body)
});
const both={rankings:true,frozen:true,arena:true,worldBoss:true,partyEvent:true,guildPve:true};
const test=async()=>{
 assert.equal((await rankingsHandler(services)(get('snapshot-page','&cursor='+cursor))).status,404);
 assert.equal(calls.length,0,'disabled routes cannot access DB');
 assert.equal((await rankingsHandler(services,{...both,frozen:false})(get('snapshot-page','&cursor='+cursor))).status,404);
 assert.equal(calls.length,0);
 const handler=rankingsHandler(services,both);
 assert.equal((await handler(post({board:'invalid'}))).status,400);
 assert.equal((await handler(get('snapshot-page','&cursor=invalid'))).status,400);
 assert.equal((await handler(get('world-boss-history','&bossId=invalid'))).status,400);
 assert.equal((await handler(get('arena-history','&seasonId=test&metric=invalid'))).status,400);
 assert.equal(calls.length,0);
 const firstResponse=await handler(post({board:'mining',limit:50,accountId:boss}));
 assert.equal(firstResponse.status,200);
 const published=await firstResponse.json();
 assert.equal(published.entries[0].displayName,'Safe Player');
 assert.equal(published.entries[0].rank,1);
 assert.equal(published.entries[0].playerBadges.supporter,true);
 for(const secret of ['accountId','entityId','internalDiagnostics','internalRole'])
   assert.ok(!JSON.stringify(published).includes(secret),'projection leaked private key '+secret);
 assert.equal(published.self.listed,true);
 assert.deepEqual(calls[0],{name:'rankings_frozen_start_server_v1',args:{
   p_requester:account,p_board:'mining',p_page_size:50
 }},'always use authenticated account instead of body spoof');
 assert.equal((await handler(get('snapshot-page','&cursor='+cursor))).status,200);
 assert.deepEqual(calls[1],{name:'rankings_frozen_page_server_v1',args:{
   p_requester:account,p_cursor:cursor
 }});
 assert.equal((await handler(get('arena-history','&seasonId=closed&metric=arena_rating'))).status,200);
 assert.equal(calls[2].name,'rankings_arena_final_history_server_v1');
 assert.equal((await handler(get('world-boss-history','&bossId='+boss))).status,200);
 assert.equal(calls[3].name,'leaderboards_world_boss_event_server_v1');
 assert.equal((await handler(get('party-event-history',
 '&eventKey=event8&metric=damage&bracket=standard:4'))).status,200);
 assert.equal(calls[4].name,'rankings_final_mode_history_server_v1');
 assert.equal(calls[4].args.p_mode,'party_event');
 assert.equal((await handler(get('guild-pve-history',
 '&eventKey=campaign&metric=campaign_score&bracket=tier1'))).status,200);
 assert.equal(calls[5].args.p_mode,'guild_pve');
 const partyHidden=rankingsHandler(services,{...both,partyEvent:false});
 assert.equal((await partyHidden(get('party-event-history',
 '&eventKey=event8&metric=damage&bracket=standard:4'))).status,404);
 const guildHidden=rankingsHandler(services,{...both,guildPve:false});
 assert.equal((await guildHidden(get('guild-pve-history',
 '&eventKey=campaign&metric=campaign_score&bracket=tier1'))).status,404);

 assert.equal((await handler(new Request('https://example.test/gameplay?view=rankings&action=snapshot-page&cursor='+cursor))).status,401);
 const malformed=rankingsHandler({...services,rpc:async()=>({
   board:'mining',entries:[{rank:0,entityType:'account',displayName:'Tampered',value:5}]
 })},both);
 assert.equal((await malformed(post({board:'mining'}))).status,503,
   'invalid official ranks must fail closed');
 const overlong=rankingsHandler({...services,rpc:async()=>({
   board:'mining',entries:Array.from({length:101},()=>({
     rank:1,entityType:'account',displayName:'Flood',value:1}))
 })},both);
 assert.equal((await overlong(post({board:'mining'}))).status,503,
   'oversized leaderboard response must fail closed');
 console.log('Ranks Edge auth, all gates, cursor parsing and server-only caller checks PASS');
};
void test();
