const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.join(__dirname,'..','src');
const model=path.join(root,'core','party-chat-card-preview-v113.ts');
const component=path.join(root,'components','PartyChatActionCardPreviewV113.tsx');
function compile(file){
 const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
 assert.deepEqual(output.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
 return output.outputText;
}
const local={exports:{}};
new Function('module','exports',compile(model))(local,local.exports);
const {PARTY_CHAT_CARDS_V113_RELEASED,partyChatPreviewPresentationV113:present,
 partyChatPreviewIntentV113:intent,partyChatPreviewVotePercentV113:percent}=local.exports;
assert.equal(PARTY_CHAT_CARDS_V113_RELEASED,false);
const base={id:'card',partyId:'party',messageId:'system-message',status:'pending',
 title:'Fixture',summary:'Fixture summary',expiresAtMs:10000};
const swap={...base,kind:'role_swap',allowedActions:['accept','decline'],members:[
 {id:'a',name:'A',fromRole:'tank',toRole:'damage',accepted:false},
 {id:'b',name:'B',fromRole:'damage',toRole:'tank',accepted:true}]};
const ready={...base,kind:'group_readiness',allowedActions:['ready','not_ready'],members:[{id:'a',name:'A',ready:null}]};
const recruit={...base,kind:'recruitment_request',allowedActions:['accept','decline'],applicantName:'Fixture'};
const vote={...base,kind:'contract_vote',allowedActions:['vote'],eligibleCount:4,
 options:[{id:'hunt',label:'Hunt',votes:2},{id:'gather',label:'Gather',votes:1}]};
const event={...vote,kind:'event_vote'};
const achievement={...base,kind:'shared_achievement',status:'announcement',allowedActions:['accept']};
for(const card of [swap,ready,recruit,vote,event]){
 const action=card.allowedActions[0],optionId=action==='vote'?'hunt':undefined;
 assert.equal(present(card,9999).canPreviewRespond,false);
 assert.equal(intent(card,9999,action,optionId),null);
 assert.equal(present(card,9999,true).remainingSeconds,1);
 assert.equal(present(card,9999,true).collapsed,false);
 assert.equal(intent(card,9999,action,optionId,true).cardId,'card');
 assert.equal(intent(card,10000,action,optionId,true),null);
 assert.equal(present(card,10000,true).status,'expired');
 assert.equal(present(card,10000,true).collapsed,true);
 for(const status of ['completed','declined','cancelled','expired','stale']){
  const closed={...card,status};
  assert.equal(present(closed,9999,true).collapsed,true);
  assert.equal(intent(closed,9999,action,optionId,true),null);
 }
 assert.equal(intent({...card,allowedActions:[]},9999,action,optionId,true),null);
 assert.equal(intent(card,9999,'unknown',undefined,true),null);
}
assert.equal(intent(vote,9999,'vote','forged',true),null);
assert.equal(intent({...vote,myVote:'hunt'},9999,'vote','gather',true),null);
assert.equal(intent(swap,9999,'accept','forged',true),null);
assert.equal(intent({...swap,allowedActions:['vote']},9999,'vote','hunt',true),null);
assert.equal(present(achievement,9999,true).collapsed,true);
assert.equal(intent(achievement,9999,'accept',undefined,true),null);
assert.equal(percent(2,4),50);assert.equal(percent(5,4),100);assert.equal(percent(1,0),0);
compile(component);
const source=fs.readFileSync(component,'utf8');
assert.match(source,/width<360\|\|fontScale>1\.2/);
assert.match(source,/flexDirection:'column'/);
assert.match(source,/GameButton compact/);
assert.match(source,/C\.warning/);
assert.doesNotMatch(source,/\.\.\/online\/|supabase|fetch\(/);
const mounted=fs.readFileSync(path.join(root,'components','OnlinePartyChat.tsx'),'utf8');
assert.doesNotMatch(mounted,/PartyChatActionCardPreviewV113/);
console.log('PARTY_CHAT_CARD_PREVIEW_V113_PASS');

const refreshModule={exports:{}};
new Function('module','exports',compile(path.join(root,'core','party-chat-refresh-preview-v114.ts')))(refreshModule,refreshModule.exports);
const {PartyChatRefreshPreviewV114:Refresh,PARTY_CHAT_REFRESH_V114_RELEASED}=refreshModule.exports;
assert.equal(PARTY_CHAT_REFRESH_V114_RELEASED,false);
async function testRefresh(){
 const scope={accountId:'A',partyId:'P'},calls=[];
 let fail=false;
 const read=async(scope,targets)=>{calls.push({scope,targets});if(fail)throw Error('offline');};
 const refresh=new Refresh(read,true);
 const hint={...scope,eventId:'1',kind:'role_swap',terminal:false,rosterChanged:false};
 refresh.setScope(scope);refresh.setActive(true);await refresh.flush();
 assert.deepEqual(calls.pop().targets,{feed:true,party:true});
 assert.equal(refresh.invalidate(hint),true);
 assert.equal(refresh.invalidate(hint),false);
 assert.equal(refresh.invalidate({...hint,eventId:'2',accountId:'OTHER'}),false);
 assert.equal(refresh.invalidate({...hint,eventId:'2',rosterChanged:true}),false);
 assert.equal(refresh.invalidate({...hint,eventId:'2',terminal:true,rosterChanged:true}),true);
 await Promise.all([refresh.flush(),refresh.flush()]);
 assert.equal(calls.length,1);assert.deepEqual(calls.pop().targets,{feed:true,party:true});
 refresh.setActive(false);
 refresh.invalidate({...hint,eventId:'3'});await refresh.flush();assert.equal(calls.length,0);
 refresh.setActive(true);await refresh.flush();assert.equal(calls.length,1);calls.length=0;
 refresh.invalidate({...hint,eventId:'4'});fail=true;
 await assert.rejects(refresh.flush(),/offline/);
 fail=false;await refresh.flush();assert.equal(calls.length,2);calls.length=0;
 refresh.invalidate({...hint,eventId:'5'});const old=refresh.flush();
 refresh.setScope({accountId:'B',partyId:'Q'});await old;await refresh.flush();
 assert.equal(calls.length,1);assert.equal(calls[0].scope.accountId,'B');
 assert.equal(refresh.invalidate({...hint,eventId:'6'}),false);
 const disabled=new Refresh(read);disabled.setScope(scope);disabled.setActive(true);
 assert.equal(disabled.invalidate(hint),false);await disabled.flush();assert.equal(calls.length,1);
 console.log('PARTY_CHAT_REFRESH_V114_PASS');
}
testRefresh().catch(error=>{console.error(error);process.exitCode=1;});

const activeModule={exports:{}};
new Function('module','exports','require',compile(path.join(root,'core','party-chat-active-requests-preview-v115.ts')))(
 activeModule,activeModule.exports,id=>{assert.equal(id,'./party-chat-card-preview-v113');return local.exports;});
const {PartyActiveRequestsPreviewV115:Active,PARTY_CHAT_ACTIVE_REQUESTS_V115_RELEASED}=activeModule.exports;
assert.equal(PARTY_CHAT_ACTIVE_REQUESTS_V115_RELEASED,false);
const activePanel=path.join(root,'components','PartyActiveRequestsPanelPreviewV115.tsx');
compile(activePanel);
assert.doesNotMatch(fs.readFileSync(activePanel,'utf8'),/\.\.\/online\/|supabase|fetch\(/);
assert.doesNotMatch(mounted,/PartyActiveRequestsPanelPreviewV115/);
const activeScope={accountId:'A',partyId:'party'};
const snapshot={...activeScope,snapshotRevision:7,rosterRevision:4,serverNowMs:1000,requests:[
 {card:{...swap,id:'swap',messageId:'old-message',expiresAtMs:5000},sourceRevision:2},
 {card:{...vote,id:'vote',messageId:'vote-message',expiresAtMs:40000},sourceRevision:3},
 {card:{...ready,id:'ready',messageId:'ready-message',allowedActions:[],expiresAtMs:4000},sourceRevision:4}
]};
const activeRequests=new Active(true);
activeRequests.setScope(activeScope);activeRequests.setActive(true);
const first=activeRequests.beginRead(10),second=activeRequests.beginRead(20);
assert.equal(activeRequests.acceptRead(first,snapshot,25),false,'superseded response rejected');
assert.equal(activeRequests.acceptRead(second,snapshot,30),true);
assert.equal(activeRequests.view(30).needsResponse,2);
assert.equal(activeRequests.view(30).waiting,1);
assert.deepEqual(activeRequests.view(30).requests.map(r=>r.card.id),['swap','vote','ready']);
assert.equal(activeRequests.intent('swap','accept',30).messageId,'old-message');
assert.equal(activeRequests.intent('vote','vote',30,'hunt').sourceRevision,3);
assert.equal(activeRequests.intent('ready','ready',30),null);
assert.equal(activeRequests.intent('swap','accept',4020),null,'conservative server deadline');
assert.equal(activeRequests.view(4020).requests.length,1);
activeRequests.invalidate();
assert.equal(activeRequests.view(4020).fresh,false);
const reconnect=activeRequests.beginRead(4030);
assert.equal(activeRequests.acceptRead(reconnect,{...snapshot,snapshotRevision:6},4040),false);
const current=activeRequests.beginRead(4050);
assert.equal(activeRequests.acceptRead(current,{...snapshot,snapshotRevision:8,serverNowMs:6000,requests:[snapshot.requests[1]]},4060),true);
assert.equal(activeRequests.view(4060).needsResponse,1);
assert.equal(activeRequests.intent('swap','accept',4060),null);
assert.equal(activeRequests.view(34050).fresh,false,'freshness measured from read start');
const stale=activeRequests.beginRead(34060);
activeRequests.setScope({accountId:'B',partyId:'other'});
assert.equal(activeRequests.acceptRead(stale,snapshot,34070),false);
const foreign=activeRequests.beginRead(34080);
assert.equal(activeRequests.acceptRead(foreign,snapshot,34090),false);
activeRequests.setScope(activeScope);
const duplicate=activeRequests.beginRead(34100);
assert.equal(activeRequests.acceptRead(duplicate,{...snapshot,requests:[snapshot.requests[0],snapshot.requests[0]]},34110),false);
const invalid=activeRequests.beginRead(34120);
assert.equal(activeRequests.acceptRead(invalid,{...snapshot,requests:[{...snapshot.requests[1],card:{...snapshot.requests[1].card,eligibleCount:1}}]},34130),false);
const background=activeRequests.beginRead(34140);
activeRequests.setActive(false);
assert.equal(activeRequests.acceptRead(background,snapshot,34150),false);
activeRequests.setActive(true);
const resumed=activeRequests.beginRead(34160);
assert.equal(activeRequests.acceptRead(resumed,snapshot,34170),true);
assert.equal(activeRequests.view(34169).fresh,false,'clock reversal fails closed');
const inactiveGate=new Active();inactiveGate.setScope(activeScope);inactiveGate.setActive(true);
assert.equal(inactiveGate.beginRead(0),null);
console.log('PARTY_ACTIVE_REQUESTS_V115_V116_PASS');
