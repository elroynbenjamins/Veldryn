'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

let width=320,fontScale=1,opened=0,feedRows=[];
const host=name=>props=>React.createElement(name,props,props.children);
const deps={
 react:React,
 'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':{
  Pressable:'Pressable',Text:'Text',View:'View',
  useWindowDimensions:()=>({width,fontScale}),
  StyleSheet:{create:styles=>styles,hairlineWidth:1},
 },
 '../i18n/social':{useSocialText:()=>key=>key},
 '../online/social':{VISIBLE_WORLD_CHANNELS:[{id:'english'}],worldMessages:()=>[]},
 '../core/world-chat-visibility':{visibleWorldChatIndex:()=>0},
 '../online/useChatFeed':{useChatFeed:()=>({value:feedRows})},
 '../theme/theme':{typography:{caption:{}}},
 '../theme/ThemeContext':{useGameTheme:()=>({line:'#444',panel2:'#111',panelRaised:'#222',accentSoft:'#fff',muted:'#aaa',info:'#bcd',text:'#fff',warning:'#fc0',warningSurface:'#432',notification:'#f40',notificationText:'#fff'})},
 './ChatMessageText':{ChatMessageText:host('ChatMessageText')},
 './PlayerStyledName':{PlayerStyledName:host('PlayerStyledName')},
 './ThemedNavigationIcon':{ThemedIcon:host('ThemedIcon')},
};
const source=fs.readFileSync(path.join(__dirname,'../src/components/ChatDock.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sandbox={exports:{},require:name=>{if(!(name in deps))throw new Error('Missing mock: '+name);return deps[name];}};
vm.runInNewContext(code,sandbox);
const {ChatDock}=sandbox.exports;

const message=(id,name,body,created_at='2026-11-22T19:45:00Z')=>({id,sender_name:name,body,created_at,account_id:id});
(async()=>{
 let renderer;
 const render=props=>React.createElement(ChatDock,{enabled:true,onOpen:()=>opened++,...props});
 const labels=()=>renderer.root.findAllByType('Text');
 const channelText=()=>labels().find(node=>node.props.children==='WORLD'||node.props.children==='CHAT');
 const dock=()=>renderer.root.findByType('Pressable');
 const iconFrame=()=>renderer.root.findAllByType('View').find(node=>{const styles=Array.isArray(node.props.style)?node.props.style: [node.props.style];return styles.some(style=>style?.width===32&&style?.height===32);});
 const preview=()=>renderer.root.findAllByType('ChatMessageText');
 const names=()=>renderer.root.findAllByType('PlayerStyledName');
 await act(async()=>{renderer=create(render())});
 assert.equal(channelText().props.children,'WORLD','channel remains visible on narrow phones');
 assert.ok(iconFrame(),'single compact icon replaces the old wide rail');
 assert.equal(renderer.root.findAllByType('ThemedIcon').length,1);
 assert.equal(names().length,0,'empty feed does not invent a sender');
 assert.ok(labels().some(x=>x.props.children==='World chat is quiet.'),'empty feed has a useful prompt');
 assert.equal(dock().props.accessibilityRole,'button');
 assert.equal(dock().props.accessibilityLabel,'Open chat');
 await act(async()=>dock().props.onPress());
 assert.equal(opened,1,'whole dock continues opening chat');

 feedRows=[message('1','IScaredMeAHat','Veldryn is a new game.\n  So I hope you can give it some time to marinate :pet_01:')];
 await act(async()=>renderer.update(render()));
 assert.equal(names().length,1);
 assert.equal(names()[0].props.name,'IScaredMeAHat');
 assert.equal(names()[0].props.numberOfLines,1,'username cannot wrap into the message area');
 assert.equal(names()[0].props.reduceMotion,true,'ticker animation is omitted from the small dock');
 assert.equal(names()[0].props.badges,undefined,'decorative badges are omitted in preview');
 assert.equal(preview()[0].props.numberOfLines,2,'default preview displays up to two message lines');
 assert.equal(preview()[0].props.body,'Veldryn is a new game. So I hope you can give it some time to marinate :pet_01:','preview collapses whitespace without stripping emote tokens');
 assert.ok(dock().props.accessibilityLabel.includes('Latest World message'),'full message remains available to screen readers');
 assert.ok(!labels().some(x=>typeof x.props.children==='string'&&x.props.children.includes(':45')),'time is hidden on narrow screens');

 width=420;
 await act(async()=>renderer.update(render()));
 assert.ok(labels().some(x=>x.props.children===new Date(feedRows[0].created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})),'wider layouts show a localized time');

 width=320;fontScale=1.25;
 await act(async()=>renderer.update(render({mentionCount:1,unreadCount:2})));
 assert.ok(channelText(),'large accessibility text still has a channel label');
 assert.equal(preview()[0].props.numberOfLines,2,'two-line preview survives large fonts');
 assert.ok(dock().props.accessibilityLabel.includes('unread'),'unread count stays accessible');
 assert.ok(labels().some(x=>Array.isArray(x.props.children)&&x.props.children.join('')==='@1'),'mentions are visible');
 assert.ok(renderer.root.findAllByType('View').some(node=>Array.isArray(node.props.style)&&node.props.style.some(style=>style?.flexDirection==='column'&&style?.gap===2)),'narrow notification badges stack to preserve sender width');
 assert.ok(labels().some(x=>x.props.children===2),'unread badge is visible');

 fontScale=1;width=420;
 feedRows=[message('1','First','First message'),message('2','Second','Second message')];
 await act(async()=>renderer.update(render({lines:2,unreadCount:0,mentionCount:0})));
 assert.equal(preview().length,2,'multi-row dock preserves both recent messages');
 assert.ok(preview().every(x=>x.props.numberOfLines===1),'multi-row mode stays compact');

 feedRows=[message('3','Broken time','Message','not-a-date')];
 await act(async()=>renderer.update(render()));
 assert.equal(preview().length,1,'bad timestamps do not suppress messages');
 assert.equal(channelText().props.children,'WORLD');

 await act(async()=>renderer.update(render({enabled:false,unreadCount:2,mentionCount:1})));
 assert.equal(channelText().props.children,'CHAT','offline dock labels the chat correctly');
 assert.equal(preview().length,0,'disabled dock does not display cached messages');
 assert.ok(labels().some(x=>x.props.children==='Tap to open chat.'));
 await act(async()=>renderer.unmount());
 console.log('PASS: ChatDock compact preview, two-line body, accessibility, narrow font scaling, notification counts, timestamps, multiple rows, and offline state');
})().catch(error=>{console.error(error);process.exitCode=1});
