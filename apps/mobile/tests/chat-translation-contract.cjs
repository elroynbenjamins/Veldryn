const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const backend=path.resolve(mobile,'..','..','backend');
const read=(base,file)=>fs.readFileSync(path.join(base,file),'utf8');

test('translations only occur after a manual gesture, not when rows render',()=>{
 const row=read(mobile,'src/components/ChatTranslatableBody.tsx');
 assert.match(row,/onPress=\{\(\)=>void controller.onToggle\(\)\}/);
 assert.match(row,/work=translateChatMessage\(messageId,language\)/);
 assert.ok(row.indexOf('const onToggle=async()=>')<row.indexOf('translateChatMessage(messageId,language)'));
 assert.match(row,/if\(state.showing\)\{/);
 assert.match(row,/pending\.get\(key\)/);
 assert.match(row,/generation\.current!==request/);
 assert.match(row,/canTranslateChatBody\(body\)/);
 assert.match(row,/accessibilityRole="button"/);
 for(const language of ['en','de','es','nl','it','fr','ru','tr'])assert.match(row,new RegExp(' '+language+':'));
});
test('translation API requests only a message ID and target language',()=>{
 const client=read(mobile,'src/online/chat-translation.ts');
 assert.match(client,/body:\{messageId,targetLanguage\}/);
 assert.doesNotMatch(client,/body:\{body/);
 assert.match(client,/status===429/);
 assert.match(client,/status===404/);
 const edge=read(backend,'supabase/functions/translate-chat-message/index.ts');
 assert.match(edge,/rest\/v1\/chat_messages/);
 assert.match(edge,/headers:authHeaders/);
 assert.match(edge,/rest\/v1\/rpc\/claim_chat_translation_v1/);
 assert.match(edge,/DEEPL_API_KEY/);
 assert.match(edge,/allowedTargets\[target\]/);
 assert.match(edge,/segments=body\.split/);
 assert.doesNotMatch(edge,/SUPABASE_SERVICE_ROLE_KEY/);
});
test('chat message actions do not add height to untouched chat rows',()=>{
 const row=read(mobile,'src/components/ChatMessageRow.tsx');
 assert.match(row,/<ChatTranslateAction controller=\{translation\}\/>/);
 assert.match(row,/<ChatTranslationMessage controller=\{translation\}/);
 const action=read(mobile,'src/components/ChatTranslatableBody.tsx');
 assert.match(action,/minHeight:28/);
 assert.match(action,/hitSlop=\{8\}/);
});
test('live World, Guild, Party and dungeon rows use the same translation controller',()=>{
 for(const file of ['ChatMessageRow.tsx','GuildChat.tsx','OnlinePartyChat.tsx','OnlineWorldChat.tsx']){
  assert.match(read(mobile,'src/components/'+file),/messageId/);
 }
 const live=read(mobile,'src/components/coop/CoopPartyChat.tsx');
 assert.match(live,/useManualChatTranslation/);
 assert.match(live,/ChatTranslateAction/);
 assert.match(live,/ChatTranslationMessage/);
});
test('existing Guild chat contract points to the emote-aware translated wrapper',()=>{
 const validation=read(backend,'../tools/validate-guild-chat.mjs');
 assert.match(validation,/ChatTranslationMessage/);
 assert.match(validation,/ChatTranslatableBody\.tsx/);
});

test('manual translation release remains gated by the verified opt-in implementation',()=>{
 const flags=read(mobile,'src/core/release-flags.ts');
 assert.match(flags,/CHAT_TRANSLATION_RELEASED=true/);
 const ui=read(mobile,'src/components/ChatTranslatableBody.tsx');
 assert.match(ui,/CHAT_TRANSLATION_RELEASED&&Boolean/);
 const settings=read(mobile,'src/screens/SettingsScreen.tsx');
 assert.match(settings,/chatTranslationPrivacy\(language\)\.description/);
 const privacy=read(mobile,'src/i18n/chat-translation-privacy.ts');
 for(const code of ['en','de','es','nl','it','fr','ru','tr'])assert.match(privacy,new RegExp(' '+code+':'));
});
