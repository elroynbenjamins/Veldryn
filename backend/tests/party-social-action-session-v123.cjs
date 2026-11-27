/** Disposable owner workflow integration: real V112/V123/V106 and mobile
 * V115. No external connection, recruitment join, or reward writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {enemyV2SnapshotDigest:digest}=require('../dist/server/combat/v2/enemy-engine-authority.js');
const {buildContractFocusCardV112:build}=require('../dist/server/party/party-contract-focus-vote-review-v112.js');
const {readPartySocialCardV123:read,respondPartySocialCardV123:respond,
 planContractFocusResponseV123:focus,planSocialReadinessResponseV123:ready}=require('../dist/server/party/party-social-action-session-review-v123.js');
const cache={};
function load(name){
 if(cache[name])return cache[name].exports;
 const filename=path.join(__dirname,'../../apps/mobile/src/core',name+'.ts');
 const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
 assert.deepEqual(output.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
 const mod={exports:{}};cache[name]=mod;
 new Function('module','exports','require',output.outputText)(mod,mod.exports,id=>{
  assert.equal(id,'./party-chat-card-preview-v113');return load(id.slice(2));
 });
 return mod.exports;
}
const {PartyActiveRequestsPreviewV115:Active}=load('party-chat-active-requests-preview-v115');
const week=Date.UTC(2026,10,23),partyId='QA_PARTY',messageId='QA_MESSAGE';
const common={partyId,messageId,sourceId:'QA_SOURCE',rosterRevision:7,sourceRevision:1,
 createdAtMs:week+1000,expiresAtMs:week+301000,eligibleAccountIds:['A','B','C']};
const instances=['HUNT','GATHER'].map((id,i)=>({id,partyId,definitionId:id,definitionVersion:i+1,
 cadence:'weekly',seasonKey:'2026-11-23',startsAtMs:week,endsAtMs:week+604800000,
 status:'active',labelKey:id,totalTargetPoints:100}));
function fixture(kind){
 let state={offer:{...common,weekStartsAtMs:week,weekEndsAtMs:week+604800000,
  instanceIds:['HUNT','GATHER'],ballots:[]},
  readiness:{...common,kind:'group_readiness',state:'pending',responses:[]},
  instances:structuredClone(instances),revision:7,snapshotRevision:1,now:week+2000,
  receipts:new Map(),effects:new Map()};
 let tail=Promise.resolve(),fault=false;
 const card=()=>kind==='contract_vote'?build({offer:state.offer,instances:state.instances},true):state.readiness;
 const scope=()=>({message:{id:messageId,partyId,accountId:null,isSystem:true},activePartyId:partyId,
  activeAccountIds:['A','B','C'],leaderAccountId:'A',rosterRevision:state.revision,currentSourceRevision:1,serverNowMs:state.now});
 const workflow=()=>({...scope(),kind,card:card()});
 const session=accountId=>({accountId,partyId});
 const store={transact:(_scope,fn)=>{
  const run=tail.then(async()=>{
   const before=structuredClone(state);
   try{return await fn({
    readReceipt:async key=>state.receipts.get(key)??null,
    loadWorkflow:async(p,s,k)=>p===partyId&&s===common.sourceId&&k===kind?structuredClone(workflow()):null,
    dispatch:async input=>{
     assert.equal(input.workflowDigest,digest(workflow()));
     const {request,actorAccountId}=input;
     let completed=false;
     if(kind==='contract_vote'){
      const result=focus({session:session(actorAccountId),scope:scope(),offer:state.offer,
       instances:state.instances,optionId:request.optionId},true);
      state.offer=result.offer;
      assert.equal(result.canAssignContract,false);assert.equal(result.canChangeRewards,false);
     }else{
      const result=ready({session:session(actorAccountId),scope:scope(),card:state.readiness,action:request.action},true);
      state.readiness=result.card;completed=result.completed;
      assert.equal(result.canLaunchCombat,false);
     }
     state.snapshotRevision++;
     const effect={sourceId:request.sourceId,actorAccountId,requestDigest:digest({actor:actorAccountId,request}),
      status:completed?'workflow_completed':'response_recorded',effectId:'EFFECT_'+state.snapshotRevision};
     state.effects.set(effect.effectId,effect);return effect;
    },
    readEffect:async key=>fault?null:state.effects.get(key)??null,
    insertReceipt:async receipt=>state.receipts.set(receipt.key,structuredClone(receipt)),
   });}catch(error){state=before;throw error;}
  });
  tail=run.catch(()=>{});return run;
 }};
 const readFor=accountId=>read({session:session(accountId),scope:scope(),card:card(),names:{A:'Alpha',B:'Beta',C:'Gamma'},
  optionLabels:{HUNT:'Hunt',GATHER:'Gather'},title:'Fixture',summary:'Fixture',snapshotRevision:state.snapshotRevision},true);
 const send=(accountId,body,workflowKind=kind)=>respond({session:session(accountId),kind:workflowKind,body,store},true);
 return {session,readFor,send,state:()=>state,fail:v=>{fault=v;},expire:()=>{state.now=common.expiresAtMs;}};
}
function client(f,actor){
 const active=new Active(true);active.setScope(f.session(actor));active.setActive(true);let now=10;
 return {reload:()=>{const t=active.beginRead(now++);assert.equal(active.acceptRead(t,f.readFor(actor).activeSnapshot,now++),true);},
  intent:(action,key,option)=>{const intent=active.intent(common.sourceId,action,now++,option);assert.ok(intent);return {...intent,requestId:key};},
  view:()=>active.view(now++)};
}
async function run(){
 const f=fixture('contract_vote'),a=client(f,'A'),b=client(f,'B');
 a.reload();b.reload();
 const first=a.intent('vote','A1','HUNT'),second=b.intent('vote','B1','GATHER');
 await assert.rejects(f.send('A',{...first,actorAccountId:'B'}),/invalid_request/);
 await assert.rejects(f.send('A',first,'event_vote'),/invalid_request/);
 await assert.rejects(f.send('A',first,'recruitment_request'),/invalid_request/);
 await assert.rejects(f.send('A',{...first,optionId:'FORGED'}),/invalid_option/);
 await assert.rejects(f.send('OUTSIDER',first),/chat_scope_mismatch/);
 f.fail(true);await assert.rejects(f.send('A',first),/missing_effect_readback/);
 assert.equal(f.state().offer.ballots.length,0);assert.equal(f.state().receipts.size,0);
 f.fail(false);
 const outcomes=await Promise.all([f.send('A',first),f.send('B',second),f.send('B',second)]);
 assert.equal(outcomes.filter(x=>x.newlyRecorded).length,2);
 assert.equal(f.state().offer.ballots.length,2);
 assert.deepEqual(f.state().instances,instances);
 a.reload();assert.equal(a.view().needsResponse,0);
 assert.equal(f.readFor('C').card.options[0].votes,1);
 await assert.rejects(f.send('A',{...first,requestId:'A2'}),/action_not_allowed/);
 f.expire();assert.equal(f.readFor('C').card.status,'expired');
 assert.equal((await f.send('A',first)).newlyRecorded,false);
 const g=fixture('group_readiness'),x=client(g,'A'),y=client(g,'B'),z=client(g,'C');
 x.reload();y.reload();z.reload();
 const aa=x.intent('ready','R1'),bb=y.intent('not_ready','R2'),cc=z.intent('ready','R3');
 await assert.rejects(g.send('A',{...aa,optionId:'HUNT'}),/invalid_request/);
 await g.send('A',aa);await g.send('B',bb);
 assert.equal(g.state().readiness.state,'pending');
 assert.equal(g.state().readiness.responses[1].ready,false);
 const [last,retry]=await Promise.all([g.send('C',cc),g.send('C',cc)]);
 assert.equal(last.receipt.effect.status,'workflow_completed');assert.equal(retry.newlyRecorded,false);
 assert.equal(g.state().readiness.responses.length,3);assert.equal(g.state().revision,7);
 x.reload();assert.equal(x.view().requests.length,0);
 assert.equal(g.readFor('B').card.status,'completed');
 assert.equal(g.readFor('B').card.members.filter(m=>m.ready).length,2);
 console.log('PARTY_SOCIAL_ACTION_V123_OWNER_INTEGRATION_PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
