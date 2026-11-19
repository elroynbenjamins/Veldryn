'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/core/party-event-reward-readonly-v62.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,
}}).outputText;
const sandbox={exports:{},Date,Number,Math,Object,Set};
vm.runInNewContext(js,sandbox);
const decode=sandbox.exports.decodePartyEventRewardReadOnlyV62;
const account='11111111-1111-4111-8111-111111111111';
const week=Date.UTC(2026,10,16);
const now=week+604800000+3600000+2000;
const slot=(id,name)=>({id:id+'_'+name.toUpperCase(),slot:name,owned:false});
const base={
 schema:'party-event-reward-readonly-v62',
 accountId:account,eventStartsAtUtcMs:week,serverTimeUtcMs:now,
 family:'broken_caravan',difficulty:'veteran',
 chests:[
  {kind:'participation',title:'Adventure Chest',state:'claimed',
   gearChanceBps:1400,unlockHint:'Earn 15 verified personal Event Points',
   canClaim:false,canOpen:false},
  {kind:'preparation',title:'Preparation Chest',state:'earned',
   gearChanceBps:1800,unlockHint:'Personal contribution and optional goal',
   canClaim:false,canOpen:false},
  {kind:'finale',title:'Victory Chest',state:'locked',
   gearChanceBps:2700,unlockHint:'Win a verified Party Event finale',
   canClaim:false,canOpen:false},
 ],
 sets:[
  {id:'PE_WAYFARERS_PACT',name:"Wayfarer's Pact",size:3,collected:1,
   pieces:[{...slot('PE_WAYFARERS_PACT','boots'),owned:true},
    slot('PE_WAYFARERS_PACT','gloves'),slot('PE_WAYFARERS_PACT','cape')]},
  {id:'PE_SMUGGLERS_GUILE',name:"Smuggler's Guile",size:2,collected:0,
   pieces:[slot('PE_SMUGGLERS_GUILE','ring'),slot('PE_SMUGGLERS_GUILE','amulet')]},
 ],
 partySigilsBalance:60,exchangeCost:60,exchangeAvailable:false,
 settlementClaimAvailable:false,previewOnly:true,rewardsGrantedByThisRead:0,
};
test('short leased rewards reflect authentic claim progress, never enable an action',()=>{
 assert.equal(sandbox.exports.PARTY_EVENT_REWARD_MOBILE_V62_RELEASED,false);
 const actual=decode(base,account,week,now);
 assert.ok(actual);
 assert.deepEqual(Array.from(actual.chests.map(x=>x.state)),['claimed','earned','locked']);
 assert.deepEqual(Array.from(actual.chests.map(x=>x.gearChancePercent)),[14,18,27]);
 assert.equal(actual.sets[0].collected,1);
 assert.equal(actual.partySigilsBalance,60);
 assert.equal(actual.settledReadOnly,true);
});
test('stale, cross-user, cross-week and forged write capabilities are rejected',()=>{
 const bad=[
  {...base,accountId:'22222222-2222-4222-8222-222222222222'},
  {...base,eventStartsAtUtcMs:week+604800000},
  {...base,serverTimeUtcMs:now-120001},
  {...base,serverTimeUtcMs:now+30001},
  {...base,exchangeAvailable:true},
  {...base,previewOnly:false},
  {...base,rewardsGrantedByThisRead:1},
  {...base,chests:[...base.chests.slice(0,2)]},
  {...base,chests:[{...base.chests[0],canClaim:true},...base.chests.slice(1)]},
  {...base,chests:[{...base.chests[0],gearChanceBps:10000},...base.chests.slice(1)]},
  {...base,chests:[base.chests[1],base.chests[0],base.chests[2]]},
  {...base,sets:[{...base.sets[0],collected:3},base.sets[1]]},
  {...base,sets:[{...base.sets[0],pieces:[
    base.sets[0].pieces[0],base.sets[0].pieces[0],base.sets[0].pieces[2]]},base.sets[1]]},
  {...base,partySigilsBalance:-1},
  {...base,family:'unknown'},
 ];
 for(const candidate of bad)assert.equal(decode(candidate,account,week,now),null);
 assert.equal(decode(base,account,week+604800000,now),null);
 assert.equal(decode(base,'22222222-2222-4222-8222-222222222222',week,now),null);
 assert.equal(decode(null,account,week,now),null);
});
test('developer-only Results rendering cannot issue chest claims or mint wallet value',()=>{
 const screen=fs.readFileSync(path.join(__dirname,'../src/screens/FeaturePreviewScreen.tsx'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../App.tsx'),'utf8');
 assert.match(screen,/decodePartyEventRewardReadOnlyV62/);
 assert.match(screen,/rewardStatus\?\.chests\[i\]/);
 assert.match(screen,/No authenticated entitlement loaded/);
 assert.match(screen,/Party Sigils: \{rewardStatus\?/);
 assert.match(screen,/Open chest · Not available/);
 assert.match(screen,/Exchange gear · Not available/);
 assert.doesNotMatch(app,/partyEventRewardStatus=/,'production app does not inject a private reward provider');
});
