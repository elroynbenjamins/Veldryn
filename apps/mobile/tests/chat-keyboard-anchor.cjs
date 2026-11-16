'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const React=require('react'),{act,create}=require('react-test-renderer'),ts=require('typescript');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

const frames=[],scrollCalls=[];
const scrollNode={scrollToEnd:options=>scrollCalls.push({method:'end',...options}),scrollTo:options=>scrollCalls.push({method:'to',...options})};
const style={create:values=>values};
class ChatReadAcknowledgement{
 constructor(onRead){this.onRead=onRead;}
 setActive(active){this.active=active;}
 caughtUp(messageId){if(this.active)void this.onRead(messageId);}
}
const dependencies={
 react:React,'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})},Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View',StyleSheet:style},
 '../i18n/social':{useSocialText:()=>key=>key},
 '../theme/ThemeContext':{useGameTheme:()=>({muted:'#999',warning:'#fc0',selection:'#111',selectionLine:'#aaa',info:'#fff'})},
 '../core/chat-read-ack':{ChatReadAcknowledgement}
};
// Party Chat must share the same shrinkable keyboard viewport as Guild Chat.
// The ChatLog below already tests following the latest item during IME resizing.
const partyChatSource=fs.readFileSync(path.join(__dirname,'../src/components/OnlinePartyChat.tsx'),'utf8');
assert.match(partyChatSource,/useChatViewportStyle\(\)/,'Party Chat consumes the shared chat viewport sizing');
assert.match(partyChatSource,/style=\{\[s\.root,expanded&&s\.expanded,viewportStyle\]\}/,'Party Chat applies the viewport style to its root');
assert.match(partyChatSource,/root:\{[^}]*flexShrink:1[^}]*minHeight:0/,'Party Chat can shrink when the keyboard opens');
assert.match(partyChatSource,/<ChatLog expanded=\{expanded\}/,'Party Chat uses the shared latest-message scroll behavior');

const source=fs.readFileSync(path.join(__dirname,'../src/components/ChatLog.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sandbox={exports:{},require:name=>dependencies[name]??{},requestAnimationFrame:callback=>{frames.push(callback);return frames.length;}};
vm.runInNewContext(code,sandbox);

(async()=>{
 let renderer;
 const flush=async()=>{await act(async()=>{while(frames.length)frames.shift()();});};
 const items=[{id:'first'},{id:'latest'}];
 const component=rows=>React.createElement(sandbox.exports.ChatLog,{channelKey:'world:en',items:rows,expanded:true,active:true,emptyText:'Empty',renderItem:item=>React.createElement('Text',null,item.id)});
 const viewport=()=>renderer.root.findByType('ScrollView');
 const measure=(height)=>viewport().props.onLayout({nativeEvent:{layout:{height}}});
 const scroll=(y,height)=>viewport().props.onScroll({nativeEvent:{contentOffset:{y},contentSize:{height:900},layoutMeasurement:{height}}});
 try{
  await act(async()=>{renderer=create(component(items),{createNodeMock:element=>element.type==='ScrollView'?scrollNode:null});});
  await act(async()=>{viewport().props.onContentSizeChange(320,900);measure(500);});
  await flush();
  assert.ok(scrollCalls.some(call=>call.method==='end'),'initial chat opens at the newest message');
  scrollCalls.length=0;

  // Android shrinks the viewport on keyboard open. This is not a manual upward scroll.
  await act(async()=>{scroll(400,280);measure(280);});
  await flush();
  assert.ok(scrollCalls.some(call=>call.method==='end'),'keyboard resize keeps the newest message immediately above the composer');
  scrollCalls.length=0;

  // A real user drag must take priority over automatic latest-message following.
  await act(async()=>{
   viewport().props.onScrollBeginDrag();
   scroll(100,280);
   viewport().props.onScrollEndDrag();
   measure(200);
  });
  await flush();
  assert.equal(scrollCalls.length,0,'manual history reading is not interrupted by keyboard/layout changes');

  await act(async()=>{renderer.update(component([...items,{id:'newest'}]));});
  await flush();
  assert.equal(scrollCalls.length,0,'incoming messages do not yank an older history reader to the bottom');
  const jump=renderer.root.findAllByType('Pressable').find(node=>node.props.accessibilityLabel?.includes('Jump to'));
  assert.ok(jump,'older-history reader can jump to newly arrived messages');
  await act(async()=>{jump.props.onPress();});
  assert.ok(scrollCalls.some(call=>call.method==='end'),'jump restores latest-message following');
  // Opening an unread channel should show the latest messages immediately.
  // The unread divider can remain in the history, but must not anchor the view.
  const unreadRows=[{id:'unread-first'},{id:'unread-middle'},{id:'unread-latest'}];
  const unreadChat=(active,rows=unreadRows)=>React.createElement(sandbox.exports.ChatLog,{
   channelKey:'guild:123',items:rows,firstUnreadMessageId:'unread-first',
   expanded:true,active,emptyText:'Empty',
   renderItem:item=>React.createElement('Text',null,item.id)
  });
  scrollCalls.length=0;
  await act(async()=>{renderer.update(unreadChat(true));});
  await act(async()=>{viewport().props.onContentSizeChange(320,1100);measure(500);});
  await flush();
  assert.ok(scrollCalls.some(call=>call.method==='end'),'unread chat opens on latest messages');
  assert.equal(scrollCalls.some(call=>call.method==='to'),false,'first unread divider does not pull the view up');

  // Cached chat panels remain mounted across close/open. Reopening must reset
  // the initial position without stealing scroll while the player reads history.
  scrollCalls.length=0;
  await act(async()=>{
   viewport().props.onScrollBeginDrag();
   viewport().props.onScroll({nativeEvent:{contentOffset:{y:120},contentSize:{height:1100},layoutMeasurement:{height:500}}});
   viewport().props.onScrollEndDrag();
  });
  await act(async()=>{renderer.update(unreadChat(false));});
  await act(async()=>{renderer.update(unreadChat(false,[...unreadRows,{id:'unread-new'}]));});
  await flush();
  assert.equal(scrollCalls.length,0,'hidden unread chat does not scroll from incoming messages');
  await act(async()=>{renderer.update(unreadChat(true,[...unreadRows,{id:'unread-new'}]));});
  await flush();
  assert.ok(scrollCalls.some(call=>call.method==='end'),'reopening unread chat returns to the latest message');

  console.log('PASS chat keyboard + unread open anchor: latest on open/reopen, history scroll preserved');
 } finally {if(renderer)await act(async()=>renderer.unmount());}
})().catch(error=>{console.error(error);process.exitCode=1});
