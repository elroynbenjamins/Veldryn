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
