'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8');
const chat=read('components/ChatOverlay.tsx');
const world=read('components/OnlineWorldChat.tsx');
const guild=read('components/GuildChat.tsx');
const party=read('components/OnlinePartyChat.tsx');
const system=read('components/SystemNoticeLog.tsx');
const emotes=read('components/ChatEmotePicker.tsx');
const composer=read('components/ChatComposer.tsx');
const rows=read('components/ChatMessageRow.tsx');
const log=read('components/ChatLog.tsx');
const messageText=read('components/ChatMessageText.tsx');
const social=read('i18n/social.ts');

assert.ok(chat.includes('accessibilityRole="tablist"')&&chat.includes('function ChatTab('),'visible mobile-first channel tabs');
assert.ok(chat.includes('accessibilityRole="tab"')&&chat.includes('accessibilityState={{selected,disabled}}'),'selected/disabled accessible tabs');
for(const id of ['world','guild','party','system'])assert.ok(chat.includes('<ChatTab channel="'+id+'"'),'retain '+id+' tab');
assert.ok(chat.includes('disabled={!guildAvailable}'),'unavailable Guild is disabled');
assert.ok(chat.includes('<PartyChatGate party={party} accountId={accountId}>'),'Party hidden unless member');
assert.ok(chat.includes('guildUnread')&&chat.includes('guildMentions')&&chat.includes('partyUnread')&&chat.includes('partyMentions'),'unread and mentions preserved');
assert.ok(chat.includes('visitedChannels.includes('),'visited conversations remain mounted');
assert.ok(chat.includes('style={s.channelMeta}')&&chat.includes('languageMenuOpen'),'language selection on secondary header');
assert.ok(chat.includes('setWorldChannel(index);setLanguageMenuOpen(false);'),'World language switching retained');
assert.ok(chat.includes('onRequestClose={()=>{if(onlinePlayersOpen)setOnlinePlayersOpen(false);else if(languageMenuOpen)setLanguageMenuOpen(false);else closeChat();}}'),'Android back closes the online roster, then the language menu, then chat');
assert.ok(chat.includes('Keyboard.addListener(')&&chat.includes("'keyboardDidShow'")&&chat.includes("'keyboardDidHide'"),'keyboard visibility lifecycle');
assert.ok(chat.includes("behavior={Platform.OS==='ios'?'padding':undefined}"),'Android handles IME clearance without double-shrinking the modal');
assert.ok(chat.includes('measureInWindow')&&chat.includes('keyboardTopRef')&&chat.includes('onLayout={measureKeyboardOverlap}'),'Android measures actual modal occlusion on keyboard and layout changes');
assert.ok(chat.includes("keyboardVisible?4+(Platform.OS==='android'?keyboardOverlap:0):Math.max(insets.bottom,8)"),'keyboard occlusion plus navigation safe area clearance');
assert.ok(chat.includes('window:{width:\'100%\',flex:1,minHeight:0'),'chat uses available viewport');
assert.ok(chat.includes('<GuildChat embedded')&&chat.includes('onTitleChange={setGuildTitle}'),'Guild embedded and identified in header');
assert.ok(chat.includes('<OnlinePartyChat expanded')&&chat.includes('<SystemNoticeLog expanded'),'Party and System fill viewport');
assert.ok(world.includes('<ChatLog expanded={embedded}')&&world.includes('embedded&&s.expandedRoot'),'World expands');
assert.ok(guild.includes('<ChatLog expanded={embedded}')&&guild.includes('embedded&&s.expandedRoot'),'Guild expands');
assert.ok(party.includes('<ChatLog expanded={expanded}')&&system.includes('<ChatLog expanded={expanded}'),'Party and System expand');
assert.ok(rows.includes('compact&&s.compactRow')&&rows.includes('compact&&s.compactMessage'),'compact rows without removing profile action');
assert.ok(rows.includes('compact={compact} style={[s.message,compact&&s.compactMessage]}'),'compact chat passes inline emote sizing to message text');
assert.ok(messageText.includes('emoteImage:{width:36,height:36},emoteImageCompact:{width:32,height:32}'),'full chat emotes are substantially larger');
assert.ok(messageText.includes('emoteLine:{lineHeight:40},emoteLineCompact:{lineHeight:36}')&&messageText.includes('Math.max(StyleSheet.flatten(baseStyle)?.lineHeight??0,minEmoteLine.lineHeight)'),'emote messages receive clipping clearance after caller styles');
assert.ok(messageText.includes('if(label&&art){\n    hasArtwork=true;')&&messageText.includes('let hasArtwork=false;'),'only resolved artwork triggers expanded message line height');
assert.ok(messageText.includes('fontSize:16,lineHeight:28')&&messageText.includes('fontSize:15,lineHeight:25')&&rows.includes('compactMessage:{fontSize:15,lineHeight:25}')&&rows.includes('fontSize:16,lineHeight:28,paddingRight:2'),'ordinary chat text is 2sp larger with matching line clearance');
assert.ok(messageText.includes('const preview=numberOfLines!==undefined;')&&messageText.includes('previewEmoteImage:{width:24,height:24},previewEmoteImageCompact:{width:21,height:21}')&&messageText.includes('preview?(compact?s.previewEmoteImageCompact:s.previewEmoteImage)'),'line-limited dock previews retain their compact artwork');
assert.ok(log.includes('inner:{paddingTop:2,paddingBottom:16}'),'chat scroll reserves safe clearance under final message');
assert.ok(log.includes('onLayout={onViewportLayout}')&&log.includes('onContentSizeChange={onContentSizeChange}')&&log.includes('followLatestAfterLayout'),'chat follows the bottom after keyboard and content resize');
assert.ok(composer.includes('<ChatEmotePicker {...emotes} compact'),'composer keeps quick emotes');
assert.ok(emotes.includes('compactTrigger&&s.floatingPicker')&&emotes.includes("bottom:touchTargetPreferred+8"),'emotes float above composer');
assert.ok(emotes.includes('if(onManageEmotes&&!settingsMode){setOpen(false);onManageEmotes();return;}'),'Edit goes to Settings');
assert.ok(emotes.includes('usedCount>=CHAT_MAX_EMOTES_PER_MESSAGE'),'emote cap kept');
for(const label of ['Global chat','Guild members','Your party','Game notifications'])assert.ok(social.includes(JSON.stringify(label)+':'),'translated label '+label);
assert.ok(read('components/coop/CoopPartyChat.tsx').includes('messageBody:{...coopTypography.body,color:coopColors.text,fontSize:18,lineHeight:26}'),'dungeon message body receives its own +2sp adjustment');
assert.ok(messageText.includes('},[body,mentionName,compact,preview,s]);'),'unchanged messages reuse parsed content');

const ts=require('typescript'),vm=require('node:vm');
const jsx=(type,props,key)=>({type,props,key});
const flatten=value=>Array.isArray(value)?Object.assign({},...value.map(flatten)):value||{};
function load(source,deps){
 const sandbox={exports:{},require:name=>{if(!(name in deps))throw Error('Missing mock: '+name);return deps[name];}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,sandbox);
 return sandbox.exports;
}
const mentions=load(read('core/chat-mentions.ts'),{});
const {ChatMessageText}=load(messageText,{
 react:{useMemo:fn=>fn()},
 'react/jsx-runtime':{jsx,jsxs:jsx},
 'react-native':{Image:'Image',Text:'Text',StyleSheet:{create:v=>v,flatten}},
 '../features/chat-pilot/data/emotes.json':[{id:'wave',label:'Wave'},{id:'missing',label:'Missing'}],
 '../theme/theme':{radii:{sm:4},typography:{body:{}}},
 '../theme/ThemeContext':{useGameTheme:()=>({text:'text',accent:'accent',info:'info',infoSurface:'infoSurface',warning:'warning',warningSurface:'warningSurface'})},
 '../core/chat-mentions':mentions,
 '../theme/chat-emote-assets':{chatEmoteArtwork:id=>id==='wave'?1:undefined},
});
const render=(body,props={})=>ChatMessageText({body,compact:true,...props});
const styleOf=node=>flatten(node.props.style);
const images=node=>node.props.children.filter(child=>child.type==='Image');
const plain=render('Hello there');
assert.equal(styleOf(plain).fontSize,15);
assert.equal(styleOf(plain).lineHeight,25);
assert.equal(images(plain).length,0);
const mixed=render('Hi @Hero :wave::wave:!',{mentionName:'Hero'});
assert.equal(images(mixed).length,2);
assert.equal(images(mixed)[0].props.style.width,32);
assert.equal(images(mixed)[0].props.accessibilityLabel,'Wave');
assert.equal(styleOf(mixed).lineHeight,36);
assert.ok(mixed.props.children.some(child=>child.props.children==='@Hero'&&child.props.style.color==='warning'));
const regular=render(':wave:',{compact:false});
assert.equal(images(regular)[0].props.style.height,36);
assert.equal(styleOf(regular).lineHeight,40);
assert.equal(styleOf(regular).fontSize,16);
const preview=render(':wave:',{numberOfLines:1,style:{fontSize:12,lineHeight:20}});
assert.equal(images(preview)[0].props.style.height,21);
assert.equal(styleOf(preview).lineHeight,23);
assert.equal(styleOf(preview).fontSize,12);
assert.equal(preview.props.numberOfLines,1);
assert.equal(styleOf(render(':wave:',{style:{lineHeight:48}})).lineHeight,48);
const fallback=render(':missing: :unknown:');
assert.equal(images(fallback).length,0);
assert.equal(styleOf(fallback).lineHeight,25);
assert.ok(fallback.props.children.some(child=>child.props.children===' :unknown:')||fallback.props.children.some(child=>child.props.children===':unknown:'));
assert.ok(fallback.props.children.some(child=>child.props.style?.color==='accent'&&child.props.style.fontSize===undefined),'fallback inherits larger message typography');
console.log('PASS: expanded chat tabs, scroll, keyboard, emote rendering and accessibility contracts');