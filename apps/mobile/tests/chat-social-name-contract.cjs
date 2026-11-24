const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');
const projector=read('src/core/chat-sender-projection.ts');
const compiled=ts.transpileModule(projector,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};
vm.runInNewContext(compiled,{module:mod,exports:mod.exports,Map});
const project=mod.exports.projectChatSenderNames;
const messages=[
 {id:'old',account_id:'a',sender_name:'OldHero'},
 {id:'new',account_id:'a',sender_name:'OldHero'},
 {id:'blocked',account_id:'b',sender_name:'HiddenPlayer'},
 {id:'system',account_id:null,sender_name:'System'},
];
const resolved=project(messages,[{account_id:'a',sender_name:' NewSocial '}]);
assert.deepEqual(Array.from(resolved,r=>r.sender_name),['NewSocial','NewSocial','HiddenPlayer','System']);
assert.equal(messages[0].sender_name,'OldHero','Source rows are not mutated');
assert.equal(project(messages,[])[0].sender_name,'OldHero','RPC failure/empty fallback preserves snapshots');

const social=read('src/online/social.ts');
const world=read('src/components/OnlineWorldChat.tsx');
const party=read('src/components/OnlinePartyChat.tsx');
const own=read('src/online/useOwnChatSocialName.ts');
const migration=read('../../backend/supabase/migrations/20261123223500_chat_sender_names_v1.sql');
assert.ok(social.includes('withChatIdentities')&&social.includes("rpc('chat_sender_names_v1'")&&social.includes('projectChatSenderNames('),'All three chat feeds use a common server-backed projection');
assert.ok(social.includes('ACCOUNT_SOCIAL_IDENTITY_RELEASED'),'Legacy clients remain compatible without the new RPC');
assert.ok(social.includes("return decorated;"),'Failed name lookup keeps authorized chat messages visible');
assert.ok(world.includes('useOwnChatSocialName')&&world.includes('mentionName={chatPlayerName}')&&world.includes('currentName={chatPlayerName}'),'World self mentions use current Social Name');
assert.ok(party.includes('useOwnChatSocialName')&&party.includes('currentSocialName'),'Party self mentions use current Social Name');
assert.ok(own.includes('subscribePlayerIdentityChanges'),'Saving a Social Name refreshes chat mentions');
assert.ok(migration.includes('auth.uid()')&&migration.includes('player_blocks')&&migration.includes('TOO_MANY_IDENTITIES')&&migration.includes('grant execute'),'Name RPC is scoped, bounded and authenticated');
for(const path of ['src/online/social.ts','src/components/OnlineWorldChat.tsx','src/components/OnlinePartyChat.tsx','src/online/useOwnChatSocialName.ts','src/core/chat-sender-projection.ts']){
 const source=read(path);
 const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.deepEqual(tree.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[],path+' parses');
}
console.log('PASS: current account Social Names override old chat snapshots, keep fallback, and drive mentions');
