'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/core/party-event-readonly-snapshot.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandbox={exports:{},Date,Math,Set};
vm.runInNewContext(js,sandbox);
const {decodePartyEventReadOnlySnapshot:decode,partyEventSupplyProgress:progress,PARTY_EVENT_STATUS_MOBILE_RELEASED}=sandbox.exports;
const base={
 schema:'party-event-readonly-status-v33',
 eventStartsAt:'2026-11-09T00:00:00Z',eventEndsAt:'2026-11-16T00:00:00Z',serverTime:'2026-11-10T00:00:00Z',
 family:'broken_caravan',variation:'bandits_crossing',difficulty:'standard',
 status:'active',stage:2,rosterSize:4,
 completedActions:['scout_route','secure_approach'],
 orders:[
  {stage:2,itemId:'IRON_ORE',category:'ore',kind:'required',target:12,donated:8},
  {stage:2,itemId:'OAK_LOGS',category:'wood',kind:'required',target:8,donated:4},
  {stage:2,itemId:'HEALING_HERBS',category:'herb',kind:'optional',target:5,donated:1},
 ],
 votes:{stage2:'safe_pass',stage3:null,myStage2Ballot:true,myStage3Ballot:false},
 canClaim:false,canContribute:false,canFight:false,
};
test('private status decoder accepts an enrolled flexible four-player party only without write grants',()=>{
 assert.equal(PARTY_EVENT_STATUS_MOBILE_RELEASED,false);
 const status=decode(base);
 assert.equal(status.family,'caravan');
 assert.equal(status.rosterSize,4);
 assert.equal(status.completedActions.length,2);
 assert.equal(status.votes.myStage2Ballot,true);
 assert.equal('accountId' in status,false);
});
test('supplies aggregate exact verified quantities, never default missing progress to completed',()=>{
 const status=decode(base);
 const required=progress(status,2,'required');
 assert.deepEqual({donated:required.donated,target:required.target,percent:required.percent,orders:required.orders},{donated:12,target:20,percent:60,orders:2});
 const optional=progress(status,2,'optional');
 assert.equal(optional.percent,20);
 const unavailable=progress(status,1,'required');
 assert.equal(unavailable.orders,0);assert.equal(unavailable.percent,0);
});
test('no snapshot or forged unlocks, wrong stages, duplicate evidence or invalid supplies render',()=>{
 assert.equal(decode(null),null);
 for(const data of [
  {...base,canClaim:true},{...base,canContribute:true},{...base,canFight:true},
  {...base,rosterSize:5},{...base,stage:0},{...base,family:'unknown'},
  {...base,completedActions:['scout_route','scout_route']},
  {...base,completedActions:['client_grant']},
  {...base,votes:{...base.votes,stage3:'future_choice'}},
  {...base,orders:[{...base.orders[0],donated:13}]},
  {...base,orders:[base.orders[0],base.orders[0]]},
  {...base,eventEndsAt:'2026-11-15T00:00:00Z'},
  {...base,orders:[{...base.orders[0],kind:'injected'}]},
 ])assert.equal(decode(data),null,JSON.stringify(data));
});
