'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

const files=[
  'App.tsx','src/screens/SettingsScreen.tsx','src/components/ChatOverlay.tsx',
  'src/components/ChatEmotePicker.tsx','src/components/ChatComposer.tsx',
  'src/components/OnlineWorldChat.tsx','src/components/WorldChat.tsx',
  'src/components/GuildChat.tsx','src/components/OnlinePartyChat.tsx',
];
for(const file of files){
  const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.deepEqual(tree.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[],file+' syntax');
}
const app=read('App.tsx'),settings=read('src/screens/SettingsScreen.tsx'),
  overlay=read('src/components/ChatOverlay.tsx'),picker=read('src/components/ChatEmotePicker.tsx'),
  composer=read('src/components/ChatComposer.tsx');

assert.ok(picker.includes('if(onManageEmotes&&!settingsMode){setOpen(false);onManageEmotes();return;}'),
  'Chat Edit must close the inline picker and route to Settings');
assert.ok(picker.includes('onPick(\`:\${id}:\`)')&&picker.includes('usedCount>=CHAT_MAX_EMOTES_PER_MESSAGE'),
  'Quick emote insertion and the two-emote draft limit remain intact');
assert.ok(picker.includes('useState(settingsMode&&initiallyOpen)')&&
  picker.includes('settingsMode&&initiallyOpen?[...resolved]:[]'),
  'Deep-linked Settings editor starts open with all five selected emotes');
assert.ok(composer.includes('onManageEmotes?:()=>void')&&composer.includes('<ChatEmotePicker {...emotes}'),
  'All composers can forward the management callback');
for(const file of ['OnlineWorldChat','WorldChat','OnlinePartyChat','GuildChat']){
  const source=read('src/components/'+file+'.tsx');
  assert.ok(source.includes('onManageEmotes?:()=>void')&&
    source.includes('onTrayChange,onManageEmotes,onPick:'),
    file+' must offer the Settings route while preserving the original tray callback');
}
assert.ok(overlay.includes('onManageEmotes?:()=>void')&&
  (overlay.match(/onManageEmotes={onManageEmotes}/g)||[]).length>=4,
  'World, Guild, Party, and offline chat overlay components all expose the Settings route');
assert.ok(app.includes('setShowChatOverlay(false);')&&
  app.includes("setTab('Settings');")&&
  app.includes("setSettingsSection('chat');")&&
  app.includes('setFocusChatEmotes(true);')&&
  app.includes('onManageEmotes={openChatEmoteSettings}'),
  'Chat Edit closes the overlay, navigates to Settings Chat and requests emote focus');
assert.ok(settings.includes('focusChatEmotes?:boolean;')&&
  settings.includes('onChatEmotesFocusHandled?:()=>void;')&&
  settings.includes('onLayout={event=>{emotesOffset.current=event.nativeEvent.layout.y;scrollToEmotes();}}')&&
  settings.includes('onContentSizeChange={restoreScroll}')&&
  settings.includes('<ChatEmotePicker settingsMode initiallyOpen={focusChatEmotes}'),
  'Settings expands the correct five-slot editor and scrolls its panel into view');
assert.ok(settings.includes('onTrayChange={chatEmoteTrayIds=>update({chatEmoteTrayIds})}'),
  'Settings retains normal persisted tray save behavior');
console.log('PASS chat emote Edit routes to focused Settings editor; quick insertion and saving retained');
