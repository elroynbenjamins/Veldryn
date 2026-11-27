/** End-to-end disposable fixture: real compiled V104/V106/V107/V119 plus
 * mobile V113/V115 models, no real database or public network endpoints. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {enemyV2SnapshotDigest:digest}=require('../dist/server/combat/v2/enemy-engine-authority.js');
const {planPartyRoleSwapResponseV107:plan}=require('../dist/server/party/party-role-swap-transition-review-v107.js');
const {planRoleSwapRefreshNoticesV120:planNotices}=require('../dist/server/party/party-role-swap-notification-review-v120.js');
const {readPartyRoleSwapCardV119:read,respondPartyRoleSwapCardV119:respond}=require('../dist/server/party/party-role-swap-chat-session-review-v119.js');
const modules={};
function loadModel(name){
 if(modules[name])return modules[name].exports;
 const filename=path.join(__dirname,'../../apps/mobile/src/core',name+'.ts');
 const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
 assert.deepEqual(output.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
 const mod={exports:{}};modules[name]=mod;
 new Function('module','exports','require',output.outputText)(mod,mod.exports,id=>{
  assert.equal(id,'./party-chat-card-preview-v113');return loadModel(id.slice(2));
 });
 return mod.exports;
}
const {PartyActiveRequestsPreviewV115:Active}=loadModel('party-chat-active-requests-preview-v115');
const {PartyChatRefreshPreviewV114:Refresh}=loadModel('party-chat-refresh-preview-v114');
const partyId='QA_PARTY',messageId='QA_MESSAGE';
const a={accountId:'A',characterId:'A_tank',classId:'IRONWARDEN',combatLevel:25};
const b={accountId:'B',characterId:'B_damage',classId:'WAYFINDER',combatLevel:25};
const altA={accountId:'A',characterId:'A_damage',classId:'RAVAGER',combatLevel:25};
const altB={accountId:'B',characterId:'B_tank',classId:'BASTION',combatLevel:25};
const ownedCharacters=[a,b,altA,altB];
function fixture(){
 let state={current:[a,b],revision:7,sourceRevision:1,snapshotRevision:1,serverNowMs:1000,phase:'lobby',
  proposal:{proposalId:'QA_SWAP',partyId,messageId,rosterRevision:7,createdAtMs:1000,state:'pending',
   members:[{accountId:'A',fromRole:'tank',toRole:'damage',fromCharacterId:a.characterId,toCharacterId:altA.characterId,accepted:false},
    {accountId:'B',fromRole:'damage',toRole:'tank',fromCharacterId:b.characterId,toCharacterId:altB.characterId,accepted:false}]},
  receipts:new Map(),effects:new Map(),notices:[]};
 let tail=Promise.resolve(),fault=false;
 const workflow=()=>({kind:'role_swap',proposal:state.proposal,message:{id:messageId,partyId,accountId:null,isSystem:true},
  activePartyId:partyId,activeAccountIds:state.current.map(x=>x.accountId),leaderAccountId:'A',
  rosterRevision:state.revision,currentSourceRevision:state.sourceRevision,serverNowMs:state.serverNowMs});
 const store={transact:(_scope,fn)=>{
  const run=tail.then(async()=>{
   const before=structuredClone(state);
   try{return await fn({
    readReceipt:async key=>state.receipts.get(key)??null,
    loadWorkflow:async(p,s,k)=>p===partyId&&s===state.proposal.proposalId&&k==='role_swap'?structuredClone(workflow()):null,
    dispatch:async input=>{
     assert.equal(input.workflowDigest,digest(workflow()));
     const {request,actorAccountId}=input;
     const transition=plan({scope:{...workflow(),viewerAccountId:actorAccountId},response:request.action,
      current:state.current,ownedCharacters,minimumLevel:10,phase:state.phase},true);
     state.proposal=transition.proposal;
     if(transition.roster){state.current=[...transition.roster];state.revision=transition.proposedRevision;}
     state.snapshotRevision++;
     const effect={sourceId:request.sourceId,actorAccountId,requestDigest:digest({actor:actorAccountId,request}),
      status:transition.proposal.state==='completed'?'workflow_completed':transition.proposal.state==='declined'?'workflow_declined':'response_recorded',
      effectId:'effect_'+state.snapshotRevision};
     state.effects.set(effect.effectId,effect);
     return effect;
    },
    readEffect:async key=>fault?null:state.effects.get(key)??null,
    insertReceipt:async receipt=>{
     state.receipts.set(receipt.key,structuredClone(receipt));
     state.notices.push(...planNotices({workflow:workflow(),receipt,persistedEffect:state.effects.get(receipt.effect.effectId)},true));
    },
   });}catch(error){state=before;throw error;}
  });
  tail=run.catch(()=>{});return run;
 }};
 const session=accountId=>({accountId,partyId});
 const readFor=accountId=>read({session:session(accountId),workflow:workflow(),snapshotRevision:state.snapshotRevision,
  names:{A:'Hero A',B:'Hero B'},title:'Role Swap',summary:'Exchange roles'},true);
 const send=(accountId,body)=>respond({session:session(accountId),body,store},true);
 return {readFor,send,session,workflow,state:()=>state,advance:ms=>{state.serverNowMs+=ms;},
  setFault:v=>{fault=v;},setPhase:v=>{state.phase=v;}};
}
function client(f,accountId){
 const active=new Active(true);active.setScope(f.session(accountId));active.setActive(true);
 let clock=10;
 return {active,reload:()=>{const t=active.beginRead(clock++);assert.equal(active.acceptRead(t,f.readFor(accountId).activeSnapshot,clock++),true);},
  intent:(action,requestId)=>{const intent=active.intent('QA_SWAP',action,clock++);assert.ok(intent);return {...intent,requestId};},
  view:()=>active.view(clock++)};
}
async function run(){
 const f=fixture(),A=client(f,'A'),B=client(f,'B');
 A.reload();B.reload();
 assert.equal(A.view().needsResponse,1);
 const first=A.intent('accept','REQ_A');
 const second=B.intent('accept','REQ_B');
 await assert.rejects(f.send('A',{...first,actorAccountId:'B'}),/invalid_request/);
 await assert.rejects(f.send('C',first),/chat_scope_mismatch/);
 await assert.rejects(f.send('A',{...first,partyId:'OTHER'}),/invalid_request/);
 const initial=await f.send('A',first);
 assert.equal(initial.receipt.effect.status,'response_recorded');
 assert.deepEqual(f.state().current,[a,b]);assert.equal(f.state().revision,7);
 A.reload();assert.equal(A.view().needsResponse,0);
 f.setFault(true);
 await assert.rejects(f.send('B',second),/missing_effect_readback/);
 assert.equal(f.state().revision,7);assert.equal(f.state().proposal.state,'pending');
 assert.equal(f.state().notices.length,2);assert.equal(f.state().receipts.size,1);
 assert.deepEqual(f.state().notices.filter(n=>n.needsResponse).map(n=>n.accountId),['B']);
 f.setFault(false);
 const [completed,retry]=await Promise.all([f.send('B',second),f.send('B',second)]);
 assert.equal(completed.newlyRecorded,true);assert.equal(retry.newlyRecorded,false);
 assert.equal(completed.receipt.effect.status,'workflow_completed');
 assert.deepEqual(f.state().current,[altA,altB]);assert.equal(f.state().revision,8);
 assert.equal(f.state().notices.length,4);
 assert.equal(f.state().notices.filter(n=>n.rosterChanged).length,2);
 assert.ok(f.state().notices.filter(n=>n.terminal).every(n=>!n.needsResponse&&!n.canDeliver));
 const after=f.workflow(),receipt=completed.receipt,persistedEffect=receipt.effect;
 assert.deepEqual(planNotices({workflow:after,receipt,persistedEffect},true),f.state().notices.slice(2));
 assert.throws(()=>planNotices({workflow:after,receipt,persistedEffect:{...persistedEffect,effectId:'FORGED'}},true),/receipt_scope_mismatch/);
 assert.throws(()=>planNotices({workflow:after,receipt,persistedEffect}),/unreleased/);
 assert.equal(f.readFor('A').card.status,'completed');
 A.active.invalidate();B.active.invalidate();A.reload();B.reload();
 assert.equal(A.view().requests.length,0);assert.equal(B.view().requests.length,0);
 f.advance(400000);
 assert.equal((await f.send('B',second)).newlyRecorded,false,'recover exact lost receipt after expiry');
 await assert.rejects(f.send('B',{...second,action:'decline'}),/conflicting_replay/);
 const refreshes=[];
 const refresh=new Refresh(async(scope,targets)=>{refreshes.push({scope,targets});},true);
 refresh.setScope(f.session('A'));refresh.setActive(true);await refresh.flush();refreshes.length=0;
 for(const n of f.state().notices){
  if(n.accountId!=='A'){assert.equal(refresh.invalidate(n),false);continue;}
  assert.equal(refresh.invalidate(n),true);assert.equal(refresh.invalidate(n),false);
 }
 await refresh.flush();assert.deepEqual(refreshes.map(x=>x.targets),[{feed:true,party:true}]);
 const declined=fixture(),D=client(declined,'B');D.reload();
 assert.equal((await declined.send('B',D.intent('decline','REQ_DECLINE'))).receipt.effect.status,'workflow_declined');
 assert.deepEqual(declined.state().current,[a,b]);assert.equal(declined.state().revision,7);
 const expired=fixture(),E=client(expired,'B');E.reload();const old=E.intent('accept','REQ_EXPIRED');
 expired.advance(300000);await assert.rejects(expired.send('B',old),/action_not_allowed/);
 const locked=fixture(),L=client(locked,'B');L.reload();locked.setPhase('committed_run');
 await assert.rejects(locked.send('B',L.intent('accept','REQ_LOCKED')),/roster_locked/);
 assert.equal(locked.state().receipts.size,0);
 console.log('PARTY_ROLE_SWAP_CHAT_V119_V120_E2E_PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
