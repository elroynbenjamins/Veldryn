const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const backend=path.resolve(mobile,'..','..','backend');
const read=(base,file)=>fs.readFileSync(path.join(base,file),'utf8');

test('manual UI never auto-translates messages',()=>{
 const row=read(mobile,'src/components/ChatTranslatableBody.tsx');
 assert.match(row,/onPress=\{\(\)=>void toggle\(\)\}/);
 assert.match(row,/translateChatMessage\(messageId,language\)/);
 assert.doesNotMatch(row,/useEffect\([^]*translateChatMessage\(/);
 for(const language of ['en','de','es','nl','it','fr','ru','tr'])assert.match(row,new RegExp(' '+language+':'));
});
test('translation API never sends user-supplied message text',()=>{
 const client=read(mobile,'src/online/chat-translation.ts');
 assert.match(client,/body:\{messageId,targetLanguage\}/);
 assert.doesNotMatch(client,/body:\{body/);
 const edge=read(backend,'supabase/functions/translate-chat-message/index.ts');
 assert.match(edge,/rest\/v1\/chat_messages/);
 assert.match(edge,/headers:authHeaders/);
 assert.match(edge,/rest\/v1\/rpc\/claim_chat_translation_v1/);
 assert.match(edge,/DEEPL_API_KEY/);
 assert.match(edge,/allowedTargets\[target\]/);
 assert.doesNotMatch(edge,/SUPABASE_SERVICE_ROLE_KEY/);
});
test('manual translation affordance wired to live chat rows',()=>{
 for(const file of ['ChatMessageRow.tsx','GuildChat.tsx','OnlinePartyChat.tsx','OnlineWorldChat.tsx']){
  assert.match(read(mobile,'src/components/'+file),/messageId/);
 }
 assert.match(read(mobile,'src/components/coop/CoopPartyChat.tsx'),/ChatTranslatableBody/);
});
