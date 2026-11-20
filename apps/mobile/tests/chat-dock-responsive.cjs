'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

let width=320,fontScale=1,opened=0;
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
 '../online/useChatFeed':{useChatFeed:()=>({value:[]})},
 '../theme/theme':{typography:{caption:{}}},
 '../theme/ThemeContext':{useGameTheme:()=>({line:'#444',panel2:'#111',accentSoft:'#fff',muted:'#aaa'})},
 './ChatMessageText':{ChatMessageText:host('ChatMessageText')},
 './GuildTaggedPlayerName':{GuildTaggedPlayerName:host('GuildTaggedPlayerName')},
 './ThemedNavigationIcon':{ThemedIcon:host('ThemedIcon')},
};
const source=fs.readFileSync(path.join(__dirname,'../src/components/ChatDock.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sandbox={exports:{},require:name=>{if(!(name in deps))throw new Error('Missing mock: '+name);return deps[name];}};
vm.runInNewContext(code,sandbox);
const {ChatDock}=sandbox.exports;

(async()=>{
 let renderer;
 const render=props=>React.createElement(ChatDock,{enabled:true,onOpen:()=>opened++,...props});
 const labels=()=>renderer.root.findAllByType('Text');
 const channelText=()=>labels().find(node=>node.props.children==='WORLD'||node.props.children==='CHAT');
 const columnWidth=()=>{
  const column=renderer.root.findAllByType('View').find(node=>Array.isArray(node.props.style)&&node.props.style[0]?.borderRightWidth);
  assert.ok(column,'chat channel column present');
  const styles=column.props.style;
  return styles.at(-1)?.width??styles[0].width;
 };
 await act(async()=>{renderer=create(render())});
 assert.equal(channelText(),undefined,'narrow phone uses icon-only chat rail');
 assert.equal(columnWidth(),32,'narrow rail leaves room for the message preview');
 assert.equal(renderer.root.findAllByType('ThemedIcon').length,1,'channel icon stays visible');
 const dock=()=>renderer.root.findByType('Pressable');
 assert.equal(dock().props.accessibilityRole,'button');
 assert.equal(dock().props.accessibilityLabel,'Open chat','icon-only dock stays accessible');
 await act(async()=>dock().props.onPress());
 assert.equal(opened,1,'icon-only dock continues opening chat');

 width=420;
 await act(async()=>renderer.update(render()));
 assert.equal(columnWidth(),56,'wider phones reserve enough space for the label');
 assert.equal(channelText().props.children,'WORLD');
 assert.equal(channelText().props.numberOfLines,1,'channel name cannot wrap to two lines');
 assert.equal(channelText().props.adjustsFontSizeToFit,true);

 fontScale=1.25;
 await act(async()=>renderer.update(render()));
 assert.equal(channelText(),undefined,'large accessibility text uses icon-only layout');
 assert.equal(columnWidth(),32);

 width=320;fontScale=1;
 await act(async()=>renderer.update(render({enabled:false,unreadCount:2,mentionCount:1})));
 assert.equal(channelText(),undefined,'offline CHAT label also stays hidden when narrow');
 assert.ok(dock().props.accessibilityLabel.includes('unread'),'notifications remain accessible');

 width=420;
 await act(async()=>renderer.update(render({enabled:false})));
 assert.equal(channelText().props.children,'CHAT','offline chat label remains on wide layouts');
 await act(async()=>renderer.unmount());
 console.log('PASS: ChatDock compact/wide labels, font scaling, accessibility, unread and open behaviour');
})().catch(error=>{console.error(error);process.exitCode=1});
